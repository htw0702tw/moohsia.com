export const SESSION_COOKIE = "mos_admin";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(text) {
  const padded = text.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

async function sign(secret, data) {
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(sig));
}

/**
 * @param {string} secret
 * @param {{ username: string, csrf: string }} session
 */
export async function issueSession(secret, session) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: 1,
    u: session.username,
    csrf: session.csrf,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const mac = await sign(secret, body);
  return `${body}.${mac}`;
}

/**
 * @param {string} secret
 * @param {string} token
 */
export async function readSession(secret, token) {
  try {
    if (!secret || secret.length < 16 || !token || !token.includes(".")) return null;
    const dot = token.lastIndexOf(".");
    const body = token.slice(0, dot);
    const mac = token.slice(dot + 1);
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify("HMAC", key, base64UrlToBytes(mac), new TextEncoder().encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body)));
    const now = Math.floor(Date.now() / 1000);
    if (!payload || payload.v !== 1 || typeof payload.u !== "string" || typeof payload.csrf !== "string") return null;
    if (!Number.isFinite(payload.exp) || payload.exp < now || payload.exp > now + SESSION_TTL_SECONDS + 60) return null;
    return { username: payload.u, csrf: payload.csrf, exp: payload.exp };
  } catch {
    return null;
  }
}

/** @param {Request} request */
export function readCookie(request, name) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    if (trimmed.slice(0, index) === name) return trimmed.slice(index + 1);
  }
  return "";
}

/**
 * @param {Request} request
 * @param {string} value
 * @param {number} maxAge
 */
export function sessionCookie(request, value, maxAge) {
  const secure = new URL(request.url).protocol === "https:";
  const parts = [`${SESSION_COOKIE}=${value}`, "HttpOnly", "SameSite=Lax", "Path=/", `Max-Age=${maxAge}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export async function digestBytes(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Constant-time compare. Uses the Workers helper when this runtime provides it. */
export function timingSafeEqualBytes(left, right) {
  const a = left instanceof Uint8Array ? left : new Uint8Array(left);
  const b = right instanceof Uint8Array ? right : new Uint8Array(right);
  if (a.length !== b.length) return false;
  if (typeof crypto.subtle.timingSafeEqual === "function") return crypto.subtle.timingSafeEqual(a, b);
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) diff |= a[index] ^ b[index];
  return diff === 0;
}

/** @param {string} left @param {string} right */
export async function timingSafeText(left, right) {
  const a = await digestBytes(left);
  const b = await digestBytes(right);
  return timingSafeEqualBytes(a, b);
}
