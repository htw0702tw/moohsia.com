import { existsSync, readFileSync } from "node:fs";
import { handleAdmin } from "./shared/admin-api.js";
import { handleApi } from "./shared/api.js";
import { createMemoryStore } from "./shared/cms-store.js";
import { isAdminHost } from "./shared/hosts.js";
import { logFailure } from "./shared/log.js";

function readDevVars() {
  if (!existsSync(".dev.vars")) return {};
  const out = {};
  for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    out[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return out;
}

const memoryStore = createMemoryStore();

function envFromLocal() {
  const file = readDevVars();
  const read = (name) => process.env[name] ?? file[name] ?? "";
  return {
    DISCORD_INVITE_URL: read("DISCORD_INVITE_URL"),
    ADMIN_USERNAME: read("ADMIN_USERNAME"),
    ADMIN_PASSWORD_HASH: read("ADMIN_PASSWORD_HASH"),
    ADMIN_SESSION_SECRET: read("ADMIN_SESSION_SECRET"),
    CMS_STORE: memoryStore,
  };
}

async function handleNodeRequest(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const host = req.headers.host || "localhost";
  const method = req.method || "GET";
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const request = new Request(`http://${host}${req.url}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  });
  const pathname = (req.url || "/").split("?")[0];
  const adminHost = isAdminHost(String(host).split(":")[0]);
  const response =
    adminHost && (pathname === "/api/admin" || pathname.startsWith("/api/admin/"))
      ? await handleAdmin(request, envFromLocal())
      : await handleApi(request, envFromLocal());
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function apiDevPlugin() {
  const routeAdminShell = (middlewares) => {
    middlewares.use((req, res, next) => {
      const host = String(req.headers.host || "").split(":")[0].toLowerCase();
      const pathOnly = (req.url || "/").split("?")[0];
      if (!isAdminHost(host)) {
        if (pathOnly === "/admin" || pathOnly.startsWith("/admin/")) {
          res.statusCode = 404;
          res.setHeader("content-type", "text/plain; charset=utf-8");
          res.end("Not found");
          return;
        }
        next();
        return;
      }
      if (
        pathOnly.startsWith("/api") ||
        pathOnly.startsWith("/@") ||
        pathOnly.startsWith("/src/") ||
        pathOnly.startsWith("/admin/") ||
        pathOnly.startsWith("/shared/") ||
        pathOnly.startsWith("/node_modules/") ||
        /\.[a-z0-9]+$/i.test(pathOnly)
      ) {
        next();
        return;
      }
      req.url = "/admin/index.html";
      next();
    });
  };

  const attach = (middlewares) => {
    routeAdminShell(middlewares);
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api")) return next();
      try {
        await handleNodeRequest(req, res);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, code: "server_error" }));
        logFailure("dev_api_failed", error);
      }
    });
  };

  return {
    name: "moohsia-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}
