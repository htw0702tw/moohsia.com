import { submitApplication } from "./applications.js";
import { CONTACT_EMAIL, WORKER_NAME } from "./brand.js";
import { loadCatalog } from "./catalog-store.js";
import { highlightKeysFromPublic, readPublishedMedia } from "./media.js";
import { syncNotionDraft } from "./notion-sync.js";
import { loadPublicPayload } from "./public-content.js";
import { clientIp, overLimit } from "./rate-limit.js";
import { timingSafeText } from "./session.js";
import { validateVerification } from "./validate.js";

const MAX_BODY = 2048;
const APPLY_MAX = 16 * 1024;

/**
 * True only for an https Discord invite. The URL itself is never returned.
 * @param {{ DISCORD_INVITE_URL?: string }} env
 */
export function inviteConfigured(env) {
  const raw = typeof env?.DISCORD_INVITE_URL === "string" ? env.DISCORD_INVITE_URL.trim() : "";
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    const allowed =
      host === "discord.gg" || host === "discord.com" || host.endsWith(".discord.com");
    return url.protocol === "https:" && allowed && url.pathname.length > 1;
  } catch {
    return false;
  }
}

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...extraHeaders,
    },
  });
}

async function readLimited(request, max = MAX_BODY) {
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

async function notionWebhook(request, env) {
  const secret = typeof env?.NOTION_WEBHOOK_SECRET === "string" ? env.NOTION_WEBHOOK_SECRET.trim() : "";
  if (secret.length < 16) return json(503, { ok: false, code: "notion_not_configured" });
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) return json(401, { ok: false, code: "unauthorized" });
  const allowed = await timingSafeText(match[1], secret);
  if (!allowed) return json(401, { ok: false, code: "unauthorized" });
  try {
    await request.body?.cancel();
  } catch {
    /* body already consumed */
  }
  const result = await syncNotionDraft(env);
  if (!result.ok) {
    const status = result.code === "blocked_content" ? 400 : result.code === "notion_sync_failed" ? 502 : 503;
    return json(status, { ok: false, code: result.code });
  }
  return json(200, { ok: true, updatedAt: result.updatedAt, counts: result.counts || {} });
}

function receipt() {
  return {
    ok: true,
    code: "received",
    status: "pending_review",
    receiptId: crypto.randomUUID(),
    stored: false,
    garenaSync: false,
    discordUnlocked: false,
  };
}

/**
 * @param {Request} request
 * @param {{ DISCORD_INVITE_URL?: string }} [env]
 */
export async function handleApi(request, env = {}) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api/admin" || path.startsWith("/api/admin/")) {
    return json(404, { ok: false, code: "not_found" });
  }

  if (path === "/api/content") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    const payload = await loadPublicPayload(env);
    if (request.method === "HEAD") {
      return new Response(null, {
        status: 200,
        headers: { "cache-control": "public, max-age=0, must-revalidate" },
      });
    }
    return json(200, payload, { "cache-control": "public, max-age=0, must-revalidate" });
  }

  if (path === "/api/catalog") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    const catalog = await loadCatalog(env);
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { "cache-control": "public, max-age=300" } });
    }
    return json(
      200,
      {
        ok: true,
        source: catalog.source,
        fetchedAt: catalog.fetchedAt,
        attribution: catalog.attribution,
        roles: catalog.roles,
        heroes: catalog.heroes,
        modes: catalog.modes,
        activities: catalog.activities || [],
      },
      { "cache-control": "public, max-age=300" },
    );
  }

  if (path === "/api/notion/webhook") {
    if (request.method !== "POST") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    }
    return notionWebhook(request, env);
  }

  if (path === "/api/health") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
    }
    return json(200, { ok: true, service: WORKER_NAME });
  }

  if (path === "/api/config") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    const published = await loadPublicPayload(env);
    const body = {
      ok: true,
      contactEmail: published.contactEmail || CONTACT_EMAIL,
      discord: {
        access: "application_only",
        inviteConfigured: inviteConfigured(env),
        cta: "website",
      },
    };
    if (request.method === "HEAD") {
      return new Response(null, { status: 200, headers: { "cache-control": "no-store" } });
    }
    return json(200, body);
  }

  if (path === "/api/verify") {
    if (request.method !== "POST") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    }
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return json(415, { ok: false, code: "unsupported_media" });
    }
    const limited = await readLimited(request);
    if (limited.error) return json(limited.error === "payload_too_large" ? 413 : 400, { ok: false, code: limited.error });

    let data;
    try {
      data = JSON.parse(limited.text || "");
    } catch {
      return json(400, { ok: false, code: "invalid_json" });
    }

    const result = validateVerification(data);
    if (!result.ok) return json(400, { ok: false, code: result.code });
    return json(202, receipt());
  }

  if (path === "/api/apply") {
    if (request.method !== "POST") return json(405, { ok: false, code: "method_not_allowed" }, { allow: "POST" });
    return receiveApplication(request, env);
  }

  const media = /^\/api\/media\/([A-Za-z0-9_-]{8,64})$/.exec(path);
  if (media) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return json(405, { ok: false, code: "method_not_allowed" }, { allow: "GET, HEAD" });
    }
    return serveMedia(request, env, media[1]);
  }

  return json(404, { ok: false, code: "not_found" });
}

function sameOrigin(request) {
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

async function receiveApplication(request, env) {
  if (!sameOrigin(request)) return json(403, { ok: false, code: "forbidden" });
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) return json(415, { ok: false, code: "unsupported_media" });
  if (await overLimit(env, "apply", clientIp(request), 5, 15 * 60)) {
    return json(429, { ok: false, code: "rate_limited" }, { "retry-after": "900" });
  }
  const limited = await readLimited(request, APPLY_MAX);
  if (limited.error) return json(limited.error === "payload_too_large" ? 413 : 400, { ok: false, code: limited.error });
  let data;
  try {
    data = JSON.parse(limited.text || "");
  } catch {
    return json(400, { ok: false, code: "invalid_json" });
  }
  const result = await submitApplication(env, data);
  if (!result.ok && result.code === "spam") return json(202, { ok: true, stored: false });
  if (!result.ok) {
    const status = result.code === "storage_unconfigured" || result.code === "storage_unavailable" ? 503 : result.code === "already_pending" ? 409 : 400;
    return json(status, { ok: false, code: result.code, field: result.field || "" });
  }
  return json(201, { ok: true, id: result.id, mailed: result.mailed === true, stored: true });
}

async function serveMedia(request, env, id) {
  const payload = await loadPublicPayload(env);
  const keys = highlightKeysFromPublic(payload.player);
  const file = await readPublishedMedia(env, id, keys);
  if (!file) return json(404, { ok: false, code: "not_found" });
  const headers = {
    "content-type": file.mime || "application/octet-stream",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff",
  };
  if (request.method === "HEAD") return new Response(null, { status: 200, headers });
  return new Response(file.bytes, { status: 200, headers });
}
