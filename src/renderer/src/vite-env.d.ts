/// <reference types="vite/client" />

type MentorKeyStatus = {
  hasKey: boolean;
  encrypted: boolean;
  storageMode: 'safeStorage' | 'base64Fallback' | null;
};

type MentorGeneratePayload = {
  system: string;
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
};

type MentorGenerateResult = {
  text: string;
  model: string;
};

interface Window {
  mentorAI: {
    getKeyStatus: () => Promise<MentorKeyStatus>;
    saveKey: (apiKey: string) => Promise<MentorKeyStatus>;
    deleteKey: () => Promise<{ hasKey: boolean }>;
    generate: (payload: MentorGeneratePayload) => Promise<MentorGenerateResult>;
  };
}
