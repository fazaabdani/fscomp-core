const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Attempt = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & { fscompLoginAttempts?: Map<string, Attempt> };
const attempts = globalStore.fscompLoginAttempts ?? new Map<string, Attempt>();
globalStore.fscompLoginAttempts = attempts;

export function isLoginRateLimited(key: string) {
  const current = attempts.get(key);
  if (!current) return false;
  if (current.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }
  return current.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string) {
  const current = attempts.get(key);
  if (!current || current.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
    return;
  }
  current.count += 1;
}

export function clearFailedLogins(key: string) {
  attempts.delete(key);
}
