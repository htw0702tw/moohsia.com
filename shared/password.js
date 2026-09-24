import { timingSafeEqualBytes } from "./session.js";

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

function hexToBytes(hex) {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/**
 * Hash a password for `wrangler secret put ADMIN_PASSWORD_HASH`.
 * Format: pbkdf2-sha256$100000$<salt hex>$<hash hex>
 * @param {string} password
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, ITERATIONS);
  return `pbkdf2-sha256$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

/**
 * @param {string} password
 * @param {string} encoded
 */
export async function verifyPassword(password, encoded) {
  const parts = String(encoded || "").split("$");
  const salt = parts.length === 4 ? hexToBytes(parts[2]) : null;
  const expected = parts.length === 4 ? hexToBytes(parts[3]) : null;
  const iterations = parts.length === 4 ? Number(parts[1]) : 0;
  const valid =
    parts[0] === "pbkdf2-sha256" &&
    iterations === ITERATIONS &&
    salt?.length === SALT_BYTES &&
    expected?.length === HASH_BYTES;
  const actual = await pbkdf2(password, valid ? salt : new Uint8Array(SALT_BYTES), ITERATIONS);
  const equal = timingSafeEqualBytes(actual, valid ? expected : actual);
  return valid && equal;
}
