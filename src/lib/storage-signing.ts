// Shared signed-URL helper used by server functions across multiple buckets.

const SIGNED_TTL_SECONDS = 60 * 60 * 24; // 24h
const CACHE_TTL_MS = 60 * 60 * 12 * 1000; // 12h
type Entry = { url: string; expiresAt: number };
const caches = new Map<string, Map<string, Entry>>();

function getBucketCache(bucket: string) {
  let c = caches.get(bucket);
  if (!c) {
    c = new Map();
    caches.set(bucket, c);
  }
  return c;
}

export async function signMany(
  bucket: string,
  paths: string[],
  ttlSeconds: number = SIGNED_TTL_SECONDS,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const now = Date.now();
  const cache = getBucketCache(bucket);
  const toFetch: string[] = [];

  for (const p of paths) {
    if (!p) continue;
    const hit = cache.get(p);
    if (hit && hit.expiresAt > now) {
      out.set(p, hit.url);
    } else {
      toFetch.push(p);
    }
  }

  if (toFetch.length === 0) return out;

  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrls(toFetch, ttlSeconds);
  if (!data) return out;
  for (const entry of data) {
    if (entry.signedUrl && entry.path) {
      out.set(entry.path, entry.signedUrl);
      cache.set(entry.path, {
        url: entry.signedUrl,
        expiresAt: now + CACHE_TTL_MS,
      });
    }
  }
  return out;
}

export async function signOne(
  bucket: string,
  path: string | null | undefined,
  ttlSeconds?: number,
): Promise<string | null> {
  if (!path) return null;
  const m = await signMany(bucket, [path], ttlSeconds);
  return m.get(path) ?? null;
}