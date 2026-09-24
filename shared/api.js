import { CONTACT_EMAIL, WORKER_NAME } from "./brand.js";
import { validateVerification } from "./validate.js";

const MAX_BODY = 2048;

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

async function readLimited(request) {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const size = Number(declared);
    if (!Number.isFinite(size) || size < 0) return { error: "invalid_json" };
    if (size > MAX_BODY) return { error: "payload_too_large" };
  }
  if (!request.body) return { text: "" };

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) {
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
    const body = {
      ok: true,
      contactEmail: CONTACT_EMAIL,
      discord: {
        access: "verification_required",
        inviteConfigured: inviteConfigured(env),
        cta: "gated",
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

  return json(404, { ok: false, code: "not_found" });
}
