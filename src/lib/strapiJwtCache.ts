// In-memory JWT cache — avoids re-authenticating with Strapi on every operation.
// Strapi's default JWT TTL is 30 days; we cache for 29 days to stay safe.
// Cache clears on server restart — first request per user after restart re-authenticates once.
const JWT_TTL_MS = 29 * 24 * 60 * 60 * 1000;

const cache = new Map<string, { jwt: string; expiresAt: number }>();

export function getCachedJwt(key: string): string | null {
  const entry = cache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.jwt;
  cache.delete(key);
  return null;
}

export function setCachedJwt(key: string, jwt: string): void {
  cache.set(key, { jwt, expiresAt: Date.now() + JWT_TTL_MS });
}

export function invalidateCachedJwt(key: string): void {
  cache.delete(key);
}