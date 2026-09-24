const AOV_ID = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,22}[\p{L}\p{N}]$/u;
const DISCORD_HANDLE = /^[\p{L}\p{N}][\p{L}\p{N}._ ]{0,30}[\p{L}\p{N}](?:#\d{4})?$/u;

function looksUnsafe(value) {
  return (
    /[@/\\]/.test(value) ||
    /https?:/i.test(value) ||
    /discord\.gg/i.test(value) ||
    /discord\.com/i.test(value)
  );
}

export function isAovId(value) {
  return value.length >= 2 && value.length <= 24 && !looksUnsafe(value) && AOV_ID.test(value);
}

export function isDiscordHandle(value) {
  return (
    value.length >= 2 &&
    value.length <= 37 &&
    !looksUnsafe(value) &&
    DISCORD_HANDLE.test(value)
  );
}

/**
 * @param {unknown} input
 * @returns {{ ok: true, honeypot: boolean, value: { aovId: string, discordHandle: string } | null } | { ok: false, code: string }}
 */
export function validateVerification(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, code: "invalid_json" };
  }

  const record = /** @type {Record<string, unknown>} */ (input);
  if (typeof record.website === "string" && record.website.trim() !== "") {
    return { ok: true, honeypot: true, value: null };
  }

  if (record.ack !== true) {
    return { ok: false, code: "ack_required" };
  }

  const aovId = typeof record.aovId === "string" ? record.aovId.trim() : "";
  const discordHandle = typeof record.discordHandle === "string" ? record.discordHandle.trim() : "";

  if (!isAovId(aovId)) return { ok: false, code: "invalid_aov_id" };
  if (!isDiscordHandle(discordHandle)) return { ok: false, code: "invalid_discord" };

  return { ok: true, honeypot: false, value: { aovId, discordHandle } };
}

export function maskMiddle(value) {
  const text = String(value ?? "");
  if (text.length <= 1) return "•";
  if (text.length === 2) return `${text.slice(0, 1)}•`;
  return `${text.slice(0, 1)}${"•".repeat(Math.min(6, text.length - 2))}${text.slice(-1)}`;
}
