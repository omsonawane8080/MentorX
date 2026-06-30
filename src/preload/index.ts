import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('mentorAI', {
  getKeyStatus: () => ipcRenderer.invoke('openai:key-status'),
  saveKey: (apiKey: string) => ipcRenderer.invoke('openai:set-key', apiKey),
  deleteKey: () => ipcRenderer.invoke('openai:delete-key'),
  generate: (payload: {
    system: string;
    prompt: string;
    model?: string;
    maxOutputTokens?: number;
  }) => ipcRenderer.invoke('openai:generate', payload)
});
