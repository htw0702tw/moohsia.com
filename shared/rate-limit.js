const WINDOW_SECONDS = 15 * 60;
const MAX_FAILS = 8;

/** Per-isolate fallback when CMS_KV is not bound. Not request-scoped user data. */
const memory = new Map();

function memoryState(key) {
  const now = Date.now();
  const row = memory.get(key);
  if (!row || row.reset <= now) return { count: 0, reset: now + WINDOW_SECONDS * 1000 };
  return row;
}

function keyFor(ip) {
  return `loginfail:${ip}`;
}

/** @param {string} requestIp */
export function clientIp(request) {
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim().slice(0, 80) || "unknown";
  return "local";
}

export async function loginBlocked(env, ip) {
  const key = keyFor(ip);
  if (env?.CMS_KV) {
    const count = Number((await env.CMS_KV.get(key)) || 0);
    return Number.isFinite(count) && count >= MAX_FAILS;
  }
  return memoryState(key).count >= MAX_FAILS;
}

export async function recordLoginFailure(env, ip) {
  const key = keyFor(ip);
  if (env?.CMS_KV) {
    const count = Number((await env.CMS_KV.get(key)) || 0) + 1;
    await env.CMS_KV.put(key, String(count), { expirationTtl: WINDOW_SECONDS });
    return;
  }
  const row = memoryState(key);
  row.count += 1;
  memory.set(key, row);
}

export async function clearLoginFailures(env, ip) {
  const key = keyFor(ip);
  if (env?.CMS_KV) {
    await env.CMS_KV.delete(key);
    return;
  }
  memory.delete(key);
}

export function resetLoginFailuresForTests() {
  memory.clear();
}

async function bumpWindow(env, key, windowSeconds) {
  const now = Date.now();
  if (env?.CMS_KV) {
    const count = Number((await env.CMS_KV.get(key)) || 0) + 1;
    await env.CMS_KV.put(key, String(count), { expirationTtl: windowSeconds });
    return count;
  }
  const row = memory.get(key);
  if (!row || row.reset <= now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return 1;
  }
  row.count += 1;
  return row.count;
}

/** Basic abuse window. Returns true when the caller should be rejected. */
export async function overLimit(env, bucket, ip, max, windowSeconds) {
  const count = await bumpWindow(env, `${bucket}:${ip}`, windowSeconds);
  return count > max;
}

export { MAX_FAILS };
