import { existsSync, readFileSync } from "node:fs";
import { handleApi } from "./shared/api.js";

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

function envFromLocal() {
  const file = readDevVars();
  return {
    DISCORD_INVITE_URL: process.env.DISCORD_INVITE_URL ?? file.DISCORD_INVITE_URL ?? "",
  };
}

async function handleNodeRequest(req, res) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const host = req.headers.host || "localhost";
  const method = req.method || "GET";
  const headers = new Headers();
  if (req.headers["content-type"]) headers.set("content-type", String(req.headers["content-type"]));
  if (req.headers["content-length"]) headers.set("content-length", String(req.headers["content-length"]));
  const request = new Request(`http://${host}${req.url}`, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : body,
  });
  const response = await handleApi(request, envFromLocal());
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function apiDevPlugin() {
  const attach = (middlewares) => {
    middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith("/api")) return next();
      try {
        await handleNodeRequest(req, res);
      } catch (error) {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: false, code: "server_error" }));
        console.error(error instanceof Error ? error.name : "Error");
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
