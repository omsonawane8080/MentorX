import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

type SecretFile = {
  openaiKey?: string;
  storageMode?: 'safeStorage' | 'base64Fallback';
  updatedAt?: string;
};

type GeneratePayload = {
  system: string;
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const defaultModel = process.env.VITE_OPENAI_MODEL || 'gpt-5.4-mini';

function getSecretsPath() {
  return join(app.getPath('userData'), 'mentor-secrets.json');
}

async function readSecrets(): Promise<SecretFile> {
  try {
    const raw = await readFile(getSecretsPath(), 'utf8');
    return JSON.parse(raw) as SecretFile;
  } catch {
    return {};
  }
}

async function writeSecrets(secrets: SecretFile) {
  await mkdir(dirname(getSecretsPath()), { recursive: true });
  await writeFile(getSecretsPath(), JSON.stringify(secrets, null, 2), 'utf8');
}

function encryptSecret(value: string): Pick<SecretFile, 'openaiKey' | 'storageMode'> {
  if (safeStorage.isEncryptionAvailable()) {
    return {
      openaiKey: safeStorage.encryptString(value).toString('base64'),
      storageMode: 'safeStorage'
    };
  }

  return {
    openaiKey: Buffer.from(value, 'utf8').toString('base64'),
    storageMode: 'base64Fallback'
  };
}

function decryptSecret(secrets: SecretFile): string | null {
  if (!secrets.openaiKey) {
    return null;
  }

  const buffer = Buffer.from(secrets.openaiKey, 'base64');

  if (secrets.storageMode === 'safeStorage') {
    return safeStorage.decryptString(buffer);
  }

  return buffer.toString('utf8');
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 700,
    title: 'AI Interview Mentor',
    backgroundColor: '#f6f4ef',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  const devServerUrl = process.env.ELECTRON_RENDERER_URL;

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

function extractOutputText(data: unknown): string {
  const record = data as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };

  if (typeof record.output_text === 'string') {
    return record.output_text;
  }

  for (const item of record.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }

  return '';
}

ipcMain.handle('openai:key-status', async () => {
  const secrets = await readSecrets();

  return {
    hasKey: Boolean(secrets.openaiKey),
    encrypted: secrets.storageMode === 'safeStorage',
    storageMode: secrets.storageMode ?? null
  };
});

ipcMain.handle('openai:set-key', async (_event, apiKey: string) => {
  const trimmed = apiKey.trim();
  if (!trimmed.startsWith('sk-')) {
    throw new Error('OpenAI API key format looks invalid.');
  }

  await writeSecrets({
    ...encryptSecret(trimmed),
    updatedAt: new Date().toISOString()
  });

  return {
    hasKey: true,
    encrypted: safeStorage.isEncryptionAvailable()
  };
});

ipcMain.handle('openai:delete-key', async () => {
  await rm(getSecretsPath(), { force: true });
  return { hasKey: false };
});

ipcMain.handle('openai:generate', async (_event, payload: GeneratePayload) => {
  const apiKey = decryptSecret(await readSecrets());

  if (!apiKey) {
    throw new Error('OpenAI API key is not configured in Settings.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: payload.model || defaultModel,
      instructions: payload.system,
      input: payload.prompt,
      max_output_tokens: payload.maxOutputTokens ?? 1800
    })
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      data?.error?.message ||
      `OpenAI request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const text = extractOutputText(data);
  if (!text) {
    throw new Error('OpenAI returned an empty response.');
  }

  return { text, model: payload.model || defaultModel };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
