import { logFailure } from "./log.js";

const IMAGE_MAX = 8 * 1024 * 1024;
const VIDEO_MAX = 32 * 1024 * 1024;

const TYPES = [
  { mime: "image/jpeg", kind: "image", max: IMAGE_MAX },
  { mime: "image/png", kind: "image", max: IMAGE_MAX },
  { mime: "image/webp", kind: "image", max: IMAGE_MAX },
  { mime: "image/gif", kind: "image", max: IMAGE_MAX },
  { mime: "video/mp4", kind: "video", max: VIDEO_MAX },
  { mime: "video/webm", kind: "video", max: VIDEO_MAX },
];

function startsWith(bytes, signature, offset = 0) {
  if (bytes.length < offset + signature.length) return false;
  for (let index = 0; index < signature.length; index += 1) {
    if (bytes[offset + index] !== signature[index]) return false;
  }
  return true;
}

export function sniffMedia(bytes) {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return TYPES[0];
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return TYPES[1];
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return TYPES[3];
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return TYPES[2];
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return TYPES[5];
  if (bytes.length > 12) {
    const brand = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    if (brand === "ftyp") return TYPES[4];
  }
  return null;
}

export function createMemoryMedia() {
  const objects = new Map();
  return {
    async put(key, bytes, mime) {
      objects.set(key, { bytes, mime });
    },
    async get(key) {
      const row = objects.get(key);
      return row ? { bytes: row.bytes, mime: row.mime } : null;
    },
  };
}

async function putObject(env, key, bytes, mime) {
  if (env?.MEDIA && typeof env.MEDIA.put === "function") {
    await env.MEDIA.put(key, bytes, { httpMetadata: { contentType: mime } });
    return;
  }
  if (env?.MEDIA_MEMORY && typeof env.MEDIA_MEMORY.put === "function") {
    await env.MEDIA_MEMORY.put(key, bytes, mime);
    return;
  }
  const error = new Error("MediaUnconfigured");
  error.name = "MediaUnconfigured";
  throw error;
}

async function readObject(env, key) {
  if (env?.MEDIA && typeof env.MEDIA.get === "function") {
    const object = await env.MEDIA.get(key);
    if (!object) return null;
    const mime = object.httpMetadata?.contentType || "application/octet-stream";
    const buffer = new Uint8Array(await new Response(object.body).arrayBuffer());
    return { bytes: buffer, mime };
  }
  if (env?.MEDIA_MEMORY && typeof env.MEDIA_MEMORY.get === "function") return env.MEDIA_MEMORY.get(key);
  return null;
}

export async function storeHighlight(env, file) {
  if (!file || typeof file.arrayBuffer !== "function") return { ok: false, code: "media_invalid" };
  const declared = typeof file.size === "number" ? file.size : 0;
  if (declared > VIDEO_MAX) return { ok: false, code: "media_too_large" };
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > VIDEO_MAX) return { ok: false, code: "media_too_large" };
  const sniffed = sniffMedia(bytes);
  if (!sniffed || bytes.byteLength > sniffed.max) return { ok: false, code: sniffed ? "media_too_large" : "media_type" };
  const id = crypto.randomUUID().replaceAll("-", "");
  const key = `hl/${id}`;
  try {
    await putObject(env, key, bytes, sniffed.mime);
  } catch (error) {
    if (error instanceof Error && error.name === "MediaUnconfigured") return { ok: false, code: "media_unconfigured" };
    logFailure("media_store_failed", error);
    return { ok: false, code: "media_unconfigured" };
  }
  return { ok: true, key, mime: sniffed.mime, kind: sniffed.kind };
}

function keyFromPublicUrl(url) {
  const found = /^\/api\/media\/([A-Za-z0-9_-]{8,64})$/.exec(url || "");
  return found ? `hl/${found[1]}` : "";
}

export function highlightKeysFromPublic(player) {
  const keys = new Set();
  const avatar = keyFromPublicUrl(player?.avatar?.url);
  if (avatar) keys.add(avatar);
  for (const build of player?.builds || []) {
    const shot = keyFromPublicUrl(build?.shot?.url);
    if (shot) keys.add(shot);
  }
  for (const match of player?.matches || []) {
    const highlight = keyFromPublicUrl(match?.highlight?.url);
    if (highlight) keys.add(highlight);
  }
  return keys;
}

export async function readStoredMedia(env, id) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  try {
    return await readObject(env, `hl/${id}`);
  } catch (error) {
    logFailure("media_read_failed", error);
    return null;
  }
}

export async function readPublishedMedia(env, id, keys) {
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return null;
  const key = `hl/${id}`;
  if (!keys.has(key)) return null;
  try {
    return await readObject(env, key);
  } catch (error) {
    logFailure("media_read_failed", error);
    return null;
  }
}
