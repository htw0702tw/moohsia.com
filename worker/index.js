import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { isAdminHost } from "../shared/hosts.js";
import { logFailure } from "../shared/log.js";
import { purgePlayerRecords } from "../shared/player-record-purge.js";
import { readCookie, readSession, SESSION_COOKIE, sessionNow } from "../shared/session.js";

const PUBLIC_FALLBACK = "/index.html";
const ADMIN_FALLBACK = "/admin/";
const PERSONAL_AOV = "https://htw0702.com/tw/games/aov/htw0702aov";

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
    return withAdminPageHeaders(await fetchAssetShell(request, env, ADMIN_FALLBACK));
  }

  const response = await serveAsset(request, env, ADMIN_FALLBACK);
  if ((response.headers.get("content-type") || "").includes("text/html")) return withAdminPageHeaders(response);
  return response;
}

async function servePublic(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (/\/roster\/htw0702aov$/i.test(path) || path === "/player" || path.endsWith("/player")) {
    return new Response(null, {
      status: 302,
      headers: {
        location: PERSONAL_AOV,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (path === "/api" || path.startsWith("/api/")) return handleApi(request, env);
  if (path === "/admin" || path.startsWith("/admin/")) return text(404, "Not found");
  if ((request.method === "GET" || request.method === "HEAD") && !isFilePath(url.pathname)) {
    return fetchAssetShell(request, env, PUBLIC_FALLBACK);
  }
  return serveAsset(request, env, PUBLIC_FALLBACK);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      await purgePlayerRecords(env);
      if (isAdminHost(url.hostname)) return await serveAdmin(request, env);
      return await servePublic(request, env);
    } catch (error) {
      logFailure("worker_error", error);
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return jsonError(500, "server_error");
      return text(500, "Service unavailable");
    }
  },
};
