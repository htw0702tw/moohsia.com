import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { refreshCatalog } from "../shared/catalog-store.js";
import { isAdminHost } from "../shared/hosts.js";
import { logFailure } from "../shared/log.js";
import { syncNotionDraft } from "../shared/notion-sync.js";
import { readCookie, readSession, SESSION_COOKIE, sessionNow } from "../shared/session.js";

/**
 * Marketing site for moohsia.com (暮霞｜MOS) plus the private admin host.
 * This Worker is `moohsia-com`. It does not replace `moohsia-cloud`,
 * the separate AI/chat API Worker.
 *
 * @typedef {Object} Env
 * @property {Fetcher} ASSETS
 * @property {string} [DISCORD_INVITE_URL]
 * @property {string} [ADMIN_USERNAME]
 * @property {string} [ADMIN_PASSWORD_HASH]
 * @property {string} [ADMIN_SESSION_SECRET]
 * @property {D1Database} [CMS_DB]
 * @property {KVNamespace} [CMS_KV]
 * @property {string} [NOTION_TOKEN]
 * @property {string} [NOTION_WEBHOOK_SECRET]
 * @property {string} [NOTION_ROSTER_DB]
 * @property {string} [NOTION_NEWS_DB]
 * @property {string} [NOTION_COPY_DB]
 * @property {string} [NOTION_PROFILE_DB]
 * @property {string} [NOTION_PLAYER_DB]
 * @property {string} [NOTION_MATCH_DB]
 * @property {string} [NOTION_SEASON_DB]
 * @property {string} [NOTION_HONOR_DB]
 * @property {string} [NOTION_TITLE_DB]
 * @property {string} [NOTION_HERO_DB]
 * @property {string} [RESEND_API_KEY]
 * @property {string} [MAIL_FROM]
 * @property {string} [APPLICATIONS_TO]
 * @property {R2Bucket} [MEDIA]
 */

const PUBLIC_FALLBACK = "/index.html";
const ADMIN_FALLBACK = "/admin/";

function isFilePath(pathname) {
  return /\.[a-z0-9]{1,8}$/i.test(pathname);
}

function text(status, body, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function jsonError(status, code) {
  return new Response(JSON.stringify({ ok: false, code }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function redirect(pathname) {
  return new Response(null, {
    status: 302,
    headers: {
      location: pathname,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

async function adminSession(request, env) {
  const secret = env?.ADMIN_SESSION_SECRET;
  if (typeof secret !== "string" || secret.length < 16) return null;
  return readSession(secret, readCookie(request, SESSION_COOKIE), sessionNow(env));
}

async function serveAsset(request, env, fallbackPath) {
  const url = new URL(request.url);
  const assetResponse = await env.ASSETS.fetch(request);
  if (assetResponse.status !== 404 || isFilePath(url.pathname)) return assetResponse;
  if (request.method !== "GET" && request.method !== "HEAD") return assetResponse;
  const fallback = new URL(fallbackPath, url.origin);
  return env.ASSETS.fetch(new Request(fallback, request));
}

/** Fetch a shell and follow one Assets redirect (index.html → /) inside the Worker. */
async function fetchAssetShell(request, env, shellPath) {
  const url = new URL(request.url);
  let shell = await env.ASSETS.fetch(new Request(new URL(shellPath, url.origin), request));
  const location = shell.headers.get("location");
  if ((shell.status === 301 || shell.status === 302 || shell.status === 307 || shell.status === 308) && location) {
    shell = await env.ASSETS.fetch(new Request(new URL(location, url.origin), request));
  }
  return shell;
}

function withAdminPageHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex, nofollow");
  headers.set("x-frame-options", "DENY");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "same-origin");
  return new Response(response.body, { status: response.status, headers });
}

async function serveAdmin(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/api" || path.startsWith("/api/")) {
    if (path === "/api/admin" || path.startsWith("/api/admin/")) return handleAdmin(request, env);
    if (path === "/api/health" || path === "/api/content" || path === "/api/catalog") return handleApi(request, env);
    return jsonError(404, "not_found");
  }

  if (path === "/robots.txt") {
    return text(200, "User-agent: *\nDisallow: /\n", { "content-type": "text/plain; charset=utf-8" });
  }

  if ((request.method === "GET" || request.method === "HEAD") && !isFilePath(path)) {
    const session = await adminSession(request, env);
    if (path === "/") return redirect(session ? "/dashboard" : "/login");
    if (path === "/login" && session) return redirect("/dashboard");
    // Assets 307s /admin/index.html and extensionless client routes (/login, /dashboard) to /admin/.
    // Fetch the directory shell, and follow one Assets redirect, so the browser stays on the SPA path.
    return withAdminPageHeaders(await fetchAssetShell(request, env, ADMIN_FALLBACK));
  }

  const response = await serveAsset(request, env, ADMIN_FALLBACK);
  if ((response.headers.get("content-type") || "").includes("text/html")) return withAdminPageHeaders(response);
  return response;
}

async function servePublic(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/api" || path.startsWith("/api/")) return handleApi(request, env);
  if (path === "/admin" || path.startsWith("/admin/")) return text(404, "Not found");
  // Assets 307s extensionless client routes (/apply, /player, /activities, …) to /.
  // Serve index.html and follow that redirect inside the Worker so a refresh stays on the path.
  // Missing files (a real .js/.css/.svg 404) still pass through serveAsset.
  if ((request.method === "GET" || request.method === "HEAD") && !isFilePath(url.pathname)) {
    return fetchAssetShell(request, env, PUBLIC_FALLBACK);
  }
  return serveAsset(request, env, PUBLIC_FALLBACK);
}

async function runScheduled(env) {
  try {
    await syncNotionDraft(env);
  } catch (error) {
    logFailure("notion_cron_failed", error);
  }
  try {
    await refreshCatalog(env);
  } catch (error) {
    logFailure("catalog_cron_failed", error);
  }
}

export default {
  /** @param {Request} request @param {Env} env */
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (isAdminHost(url.hostname)) return await serveAdmin(request, env);
      return await servePublic(request, env);
    } catch (error) {
      logFailure("worker_error", error);
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return jsonError(500, "server_error");
      return text(500, "Service unavailable");
    }
  },

  /** Draft-only Notion sync and official catalog refresh. Does not publish the site. */
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(runScheduled(env));
  },
};
