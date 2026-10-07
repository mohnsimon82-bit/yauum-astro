// GET /api/views — page view counter for the blog articles.
//
// Two modes, both read-only-safe for the client:
//   /api/views?paths=/a/,/b/   → { counts: { "/a/": 12, "/b/": 3 } }
//   /api/views?hit=1&path=/a/  → increments that path and returns { path, count }
//
// Storage: the Cloudflare KV namespace bound as VIEWS (see wrangler.jsonc).
// Until the binding exists the endpoint answers { configured: false } and the
// front-end leaves the counters hidden, so the site never depends on it.
//
// Limits kept deliberately small: paths are pattern-checked, batches capped at
// 50, and counting is fire-and-forget from the article page (once per session).
// Server-side per-visitor dedup can be layered on later if the numbers need to
// be more conservative.

interface Env {
  VIEWS?: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
  };
}

const KEY_PREFIX = "v:";
// "/" + letters/digits/dots/dashes/underscores/slashes, no leading dot segment.
const PATH_RE = /^\/[a-z0-9][a-z0-9\-._/]*$/i;
const MAX_PATH = 120;
const MAX_BATCH = 50;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const validPath = (value: string | null): value is string =>
  !!value && value.length <= MAX_PATH && PATH_RE.test(value);

export const onRequestGet = async (context: { request: Request; env: Env }): Promise<Response> => {
  const { request, env } = context;
  if (!env.VIEWS) return json({ configured: false });

  const url = new URL(request.url);

  if (url.searchParams.get("hit") === "1") {
    const path = url.searchParams.get("path");
    if (!validPath(path)) return json({ error: "invalid path" }, 400);
    const key = KEY_PREFIX + path;
    const current = parseInt((await env.VIEWS.get(key)) ?? "0", 10) || 0;
    const next = current + 1;
    await env.VIEWS.put(key, String(next));
    return json({ path, count: next });
  }

  const paths = (url.searchParams.get("paths") ?? "")
    .split(",")
    .filter(validPath)
    .slice(0, MAX_BATCH);
  const counts: Record<string, number> = {};
  await Promise.all(
    paths.map(async (path) => {
      counts[path] = parseInt((await env.VIEWS!.get(KEY_PREFIX + path)) ?? "0", 10) || 0;
    }),
  );
  return json({ counts });
};
