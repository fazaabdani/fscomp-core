const WINDOW_MS = 5 * 60 * 1000;
const MAX_MESSAGES = 20;

type Window = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & { fscompAiAssistantRate?: Map<string, Window> };
const windows = globalStore.fscompAiAssistantRate ?? new Map<string, Window>();
globalStore.fscompAiAssistantRate = windows;

export function isAiAssistantRateLimited(username: string) {
  const current = windows.get(username);
  if (!current || current.resetAt <= Date.now()) {
    windows.set(username, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > MAX_MESSAGES;
}
