import { getDefaultDocument } from "../src/content.js";
import { storeFromEnv } from "./cms-store.js";
import { logFailure } from "./log.js";
import { verifyPassword } from "./password.js";
import { clearLoginFailures, clientIp, loginBlocked, recordLoginFailure } from "./rate-limit.js";
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  issueSession,
  readCookie,
  readSession,
  sessionCookie,
  timingSafeText,
} from "./session.js";
import { ContentRejected, sanitizeDocument } from "./site-document.js";

/** The only admin account. Not a secret. Password and session key stay in Worker secrets. */
export const ADMIN_USERNAME = "htw0702";

const LOGIN_MAX = 8 * 1024;
const DOC_MAX = 480 * 1024;

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      ...extraHeaders,
    },
  });
}

function usernameAllowed(env) {
  const configured = typeof env?.ADMIN_USERNAME === "string" ? env.ADMIN_USERNAME.trim() : "";
  return configured === "" || configured === ADMIN_USERNAME;
}

function adminReady(env) {
  return Boolean(
    usernameAllowed(env) &&
      typeof env?.ADMIN_PASSWORD_HASH === "string" &&
      env.ADMIN_PASSWORD_HASH.startsWith("pbkdf2-sha256$") &&
      typeof env?.ADMIN_SESSION_SECRET === "string" &&
      env.ADMIN_SESSION_SECRET.length >= 16,
  );
}

function originAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const source = new URL(origin);
    const target = new URL(request.url);
    return source.host === target.host && (source.protocol === "https:" || source.protocol === "http:");
  } catch {
    return false;
  }
}

async function readLimited(request, max) {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0) return { error: "invalid_json" };
    if (size > max) return { error: "payload_too_large" };
  }
  if (!request.body) return { text: "" };
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      return { error: "payload_too_large" };
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { text: new TextDecoder().decode(buffer) };
}

async function readJson(request, max) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: json(415, { ok: false, code: "unsupported_media" }) };
  }
  const limited = await readLimited(request, max);
  if (limited.error) {
    return { error: json(limited.error === "payload_too_large" ? 413 : 400, { ok: false, code: limited.error }) };
  }
  try {
    return { data: JSON.parse(limited.text || "") };
  } catch {
    return { error: json(400, { ok: false, code: "invalid_json" }) };
  }
}

async function currentSession(request, env) {
  if (!adminReady(env)) return null;
  return readSession(env.ADMIN_SESSION_SECRET, readCookie(request, SESSION_COOKIE));
}

function csrfToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requireCsrf(request, session) {
  if (!originAllowed(request)) return json(403, { ok: false, code: "forbidden" });
  const header = request.headers.get("x-csrf-token") || "";
  const matches = header ? await timingSafeText(header, session.csrf) : false;
  if (!matches) return json(403, { ok: false, code: "forbidden" });
  return null;
}

async function openStore(env) {
  const store = storeFromEnv(env);
  if (!store) return { error: json(503, { ok: false, code: "storage_unconfigured" }) };
  try {
    let row = await store.get();
    if (!row) {
      const seeded = JSON.stringify(sanitizeDocument(getDefaultDocument()));
      row = await store.seed(seeded, new Date().toISOString());
    }
    if (!row?.draft_json) return { error: json(503, { ok: false, code: "storage_unavailable" }) };
    return { store, row };
  } catch (error) {
    logFailure("cms_store_failed", error);
    return { error: json(503, { ok: false, code: "storage_unavailable" }) };
  }
}

function editorPayload(row) {
  const draft = sanitizeDocument(JSON.parse(row.draft_json));
  let published = null;
  if (row.published_json) published = sanitizeDocument(JSON.parse(row.published_json));
  return {
    ok: true,
    dirty: row.draft_json !== row.published_json,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
    draft,
    published,
  };
}

async function login(request, env) {
  if (!originAllowed(request)) return json(403, { ok: false, code: "forbidden" });
  if (!adminReady(env)) return json(503, { ok: false, code: "admin_not_configured" });
  const ip = clientIp(request);
  if (await loginBlocked(env, ip)) {
    return json(429, { ok: false, code: "rate_limited" }, { "retry-after": "900" });
  }
  const parsed = await readJson(request, LOGIN_MAX);
  if (parsed.error) return parsed.error;
  const username = typeof parsed.data?.username === "string" ? parsed.data.username.slice(0, 64) : "";
  const password = typeof parsed.data?.password === "string" ? parsed.data.password.slice(0, 200) : "";
  const userOk = await timingSafeText(username, ADMIN_USERNAME);
  const passOk = await verifyPassword(password, env.ADMIN_PASSWORD_HASH);
  if (!userOk || !passOk) {
    await recordLoginFailure(env, ip);
    return json(401, { ok: false, code: "invalid_login" });
  }
  await clearLoginFailures(env, ip);
  const csrf = csrfToken();
  const token = await issueSession(env.ADMIN_SESSION_SECRET, { username: ADMIN_USERNAME, csrf });
  return json(200, { ok: true, csrf }, { "set-cookie": sessionCookie(request, token, SESSION_TTL_SECONDS) });
}

async function logout(request, env) {
  const session = await currentSession(request, env);
  if (!session) return json(401, { ok: false, code: "unauthorized" });
  const denied = await requireCsrf(request, session);
  if (denied) return denied;
  return json(200, { ok: true }, { "set-cookie": sessionCookie(request, "", 0) });
}

async function sessionInfo(request, env) {
  if (!adminReady(env)) return json(503, { ok: false, code: "admin_not_configured" });
  const session = await currentSession(request, env);
  if (!session) return json(401, { ok: false, code: "unauthorized" });
  return json(200, { ok: true, csrf: session.csrf });
}

async function readContent(request, env) {
  const session = await currentSession(request, env);
  if (!session) return json(401, { ok: false, code: "unauthorized" });
  const opened = await openStore(env);
  if (opened.error) return opened.error;
  try {
    return json(200, editorPayload(opened.row));
  } catch (error) {
    if (error instanceof ContentRejected) return json(400, { ok: false, code: error.code });
    return json(500, { ok: false, code: "invalid_content" });
  }
}

async function writeContent(request, env, mode) {
  const session = await currentSession(request, env);
  if (!session) return json(401, { ok: false, code: "unauthorized" });
  const denied = await requireCsrf(request, session);
  if (denied) return denied;
  const opened = await openStore(env);
  if (opened.error) return opened.error;

  try {
    const now = new Date().toISOString();
    if (mode === "discard") {
      const row = await opened.store.discard(now);
      return json(200, editorPayload(row));
    }
    const parsed = await readJson(request, DOC_MAX);
    if (parsed.error) return parsed.error;
    const doc = sanitizeDocument(parsed.data);
    const jsonText = JSON.stringify(doc);
    const row = mode === "publish" ? await opened.store.publish(jsonText, now) : await opened.store.saveDraft(jsonText, now);
    return json(200, editorPayload(row));
  } catch (error) {
    if (error instanceof ContentRejected) return json(400, { ok: false, code: error.code });
    logFailure("cms_write_failed", error);
    return json(503, { ok: false, code: "storage_unavailable" });
  }
}

/**
 * Admin API. Call this only for the admin host.
 * @param {Request} request
 * @param {Record<string, unknown>} env
 */
export async function handleAdmin(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/admin/session") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    if (request.method === "HEAD") return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
    return sessionInfo(request, env);
  }
  if (path === "/api/admin/login") {
    if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    return login(request, env);
  }
  if (path === "/api/admin/logout") {
    if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    return logout(request, env);
  }
  if (path === "/api/admin/content") {
    if (request.method === "GET" || request.method === "HEAD") {
      if (request.method === "HEAD") return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
      return readContent(request, env);
    }
    if (request.method === "PUT") return writeContent(request, env, "draft");
    return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD, PUT" });
  }
  if (path === "/api/admin/publish") {
    if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    return writeContent(request, env, "publish");
  }
  if (path === "/api/admin/discard") {
    if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    return writeContent(request, env, "discard");
  }
  return json(404, { ok: false, code: "not_found" });
}
