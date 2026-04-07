// Simple in-memory rate limiter.
// Provides meaningful protection within a single warm serverless instance.
// For persistent cross-instance rate limiting, use Upstash Redis:
//   npm install @upstash/ratelimit @upstash/redis

interface Bucket {
  failures: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 10;

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) return { allowed: true };
  if (bucket.failures >= MAX_FAILURES) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function recordFailure(key: string): void {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    store.set(key, { failures: 1, resetAt: now + WINDOW_MS });
  } else {
    existing.failures++;
  }
}

export function clearFailures(key: string): void {
  store.delete(key);
}
