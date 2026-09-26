import { normalizeQueueMode } from "./aov-import.js";
import { logEvent, logFailure } from "./log.js";
import { emptyMatch, matchRecency, PLAYER_MATCH_LIMIT } from "./player.js";

/**
 * Official 傳說對決 match-code lookup used by
 * https://gameidsearch.moba.garena.tw/ (SPA bundle app.eb68a9b2.js,
 * source map 2026-01-21).
 *
 * Request shape, verified from src/services/api.ts, src/services/index.ts,
 * and src/services/types.ts. No query string.
 *
 *   GET /api/character
 *   GET /api/game
 *
 * The app axios interceptor sets these headers from localStorage on every call:
 *   Access-Token  ← localStorage access_token
 *   Code          ← localStorage code
 *   Partition     ← localStorage partition (1011 聖騎之王, 1012 純潔之翼; 0 if unset)
 *
 * @garenatwdev/vue-gop-authenticate also sets a separate header `accessToken`
 * (no hyphen) when an access token is present, and `code` / `partition`.
 * HTTP lowercases names, so `accessToken` is not the same header as `Access-Token`.
 * Invalid values of either form return HTTP 200 {"error":"ERROR__GOP_LOGIN_FAILED"}.
 * Missing auth headers return HTTP 200 {"error":"ERROR__BAD_REQUEST"}.
 * The SPA treats any JSON object with an `error` field as failure.
 * The browser axios client uses withCredentials. On every call, including GET,
 * it copies the `csrftoken` cookie into the `X-CSRFToken` header
 * (xsrfCookieName / xsrfHeaderName in src/services/api.ts). A logged-in
 * session therefore sends that cookie and header together with Access-Token,
 * Code, and Partition. POST /api/logout is not called.
 *
 * GOP login (client_id 100050, locale zh-TW, response_type=code) is the same
 * after Garena, Apple (platform 10), or any other button. The callback query
 * may carry access_token, gop_access_token, encodeparam, code, and partition.
 * The library copies those into localStorage access_token, code, and partition.
 * The on-screen label "2區 純潔之翼" is partition "1012", not "2".
 * Either access_token or code is enough for the SPA to call /api/character.
 *
 * A logged-in response is camelCase. Snake_case is accepted too.
 *   { characters: [{ partition, name, head_id, head_url }] }
 *   { games: [{ champion, type, kda, startTime, gameId, gameResult }] }
 * partition 1012 is a number in the live payload. gameResult 0 is defeat, 1 is victory.
 * champion is an image URL, not a hero name. This mapper does not invent one.
 * The list has no farm, healing, tower, or ten-player board. Those stay on rows
 * already filled from an AOVRanking paste.
 *
 * Worker secrets (values stay out of git):
 *   GARENA_ACCESS_TOKEN  header Access-Token / localStorage access_token
 *   GARENA_CODE          header Code / localStorage code
 *   GARENA_PARTITION     header Partition, 1011 or 1012 (default 1012)
 *   GARENA_CSRF_TOKEN    cookie csrftoken, also sent as X-CSRFToken
 */

export const GARENA_ORIGIN = "https://gameidsearch.moba.garena.tw";

const JSON_MAX = 1_000_000;
const SECRET_MAX = 12000;

const LOGIN_ERRORS = new Set([
  "ERROR__LOGIN_REQUIRED",
  "ERROR__GOP_LOGIN_FAILED",
  "ERROR__GAME_LOGIN_FAILED",
  "ERROR__LOGIN_FIRST",
]);

const UNAVAILABLE_ERRORS = new Set([
  "ERROR__UNDER_MAINTENANCE",
  "ERROR__NOT_EVENT_PERIOD",
  "ERROR__SERVER_BUSY",
  "ERROR__SERVER_ERROR",
]);

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function secretValue(env, name) {
  const raw = typeof env?.[name] === "string" ? env[name].trim() : "";
  if (!raw || raw.length > SECRET_MAX || /[\r\n\0]/.test(raw)) return "";
  return raw;
}

function rawSecret(env, name) {
  return typeof env?.[name] === "string" ? env[name].trim() : "";
}

function secretUnusable(env, name) {
  const raw = rawSecret(env, name);
  if (!raw) return false;
  return raw.length > SECRET_MAX || /[\r\n\0]/.test(raw);
}

/** True when the owner has stored an access token or an OAuth code. */
export function garenaConfigured(env) {
  return Boolean(secretValue(env, "GARENA_ACCESS_TOKEN") || secretValue(env, "GARENA_CODE"));
}

/**
 * A present but unusable token or code (too long, or an embedded newline).
 * Empty secrets are `garena_unconfigured`. A usable secret returns "".
 */
export function garenaSecretStatus(env) {
  if (garenaConfigured(env)) return "";
  if (secretUnusable(env, "GARENA_ACCESS_TOKEN") || secretUnusable(env, "GARENA_CODE")) return "garena_secret_rejected";
  return "garena_unconfigured";
}

/** 1011 or 1012. Unset uses the owner's server, 純潔之翼. */
export function garenaPartition(env) {
  const raw = secretValue(env, "GARENA_PARTITION");
  if (raw === "1011" || raw === "1012") return raw;
  return "1012";
}

/**
 * Headers the browser actually sends. Access-Token and accessToken are both
 * included when a token is set, because the app and the GOP library disagree
 * on the name and both are present in a logged-in session.
 */
export function garenaHeaders(env) {
  const token = secretValue(env, "GARENA_ACCESS_TOKEN");
  const code = secretValue(env, "GARENA_CODE");
  const partition = garenaPartition(env);
  const headers = {
    accept: "application/json",
    "accept-language": "zh-Hant,zh;q=0.9,en;q=0.5",
    "user-agent": "moohsia-com/1.0 (owner match sync; +https://moohsia.com)",
    "Access-Token": token,
    Code: code,
    Partition: partition,
  };
  if (token) headers.accessToken = token;
  const csrf = secretValue(env, "GARENA_CSRF_TOKEN");
  if (csrf && !/[\s;,]/.test(csrf)) {
    headers["X-CSRFToken"] = csrf;
    headers.Cookie = `csrftoken=${csrf}`;
  }
  return headers;
}

function camelizeStr(value) {
  return String(value).replace(/[_.-](\w|$)/g, (_, char) => char.toUpperCase());
}

function camelizeKeys(value) {
  if (Array.isArray(value)) return value.map((item) => camelizeKeys(item));
  if (value && typeof value === "object") {
    const next = {};
    for (const key of Object.keys(value)) next[camelizeStr(key)] = camelizeKeys(value[key]);
    return next;
  }
  return value;
}

function garenaFailure(serverCode) {
  const code = String(serverCode || "");
  if (LOGIN_ERRORS.has(code)) return "garena_login_required";
  if (code === "ERROR__NO_CHARACTER") return "garena_no_character";
  if (UNAVAILABLE_ERRORS.has(code)) return "garena_unavailable";
  return "garena_rejected";
}

function concatBytes(chunks) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function readBounded(response) {
  const declared = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > JSON_MAX) return "";
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    return text.length > JSON_MAX ? "" : text;
  }
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > JSON_MAX) {
      await reader.cancel();
      return "";
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(concatBytes(chunks));
}

function taipeiStamp(ms) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const pick = (type) => parts.find((part) => part.type === type)?.value || "";
  const date = `${pick("year")}-${pick("month")}-${pick("day")}`;
  const clock = `${pick("hour")}:${pick("minute")}:${pick("second")}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}:\d{2}$/.test(clock)) return "";
  return `${date} ${clock}`;
}

/** Wall time as stored on existing CMS rows: `YYYY-MM-DD HH:mm:ss`. */
export function garenaPlayedAt(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value > 1e9 ? value * 1000 : 0;
    return ms ? taipeiStamp(ms) : "";
  }
  const text = clip(value, 40);
  if (/^\d{10,13}$/.test(text)) return garenaPlayedAt(Number(text));
  const stamp = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(text);
  if (!stamp) return "";
  const date = `${stamp[1]}-${stamp[2]}-${stamp[3]}`;
  if (!stamp[4]) return date;
  return `${date} ${stamp[4]}:${stamp[5]}${stamp[6] ? `:${stamp[6]}` : ""}`;
}

function externalId(value) {
  const text = clip(value, 40);
  return /^[A-Za-z0-9_-]{1,40}$/.test(text) ? text : "";
}

function stableToken(parts) {
  const text = parts.filter(Boolean).join("|");
  if (!text) return "";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `g${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function kdaParts(value) {
  const match = /(?<![\d.])(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)(?![\d.])/.exec(String(value || ""));
  if (!match) return { kills: "", deaths: "", assists: "", kda: "" };
  return {
    kills: match[1],
    deaths: match[2],
    assists: match[3],
    kda: `${match[1]} / ${match[2]} / ${match[3]}`,
  };
}

function heroName(champion) {
  const text = clip(champion, 80);
  if (!text || /[/:]/.test(text) || /^https?:/i.test(text)) return "";
  return text;
}

function resultOf(value) {
  if (value === 1 || value === "1") return "勝";
  if (value === 0 || value === "0") return "敗";
  return "";
}

function timeKey(value) {
  const text = garenaPlayedAt(value);
  return text;
}

/**
 * Map one official /api/game payload into CMS match rows.
 * Rows without a game id and without a parseable time are dropped.
 * @param {unknown} body camelized or snake_case JSON
 */
export function mapGarenaGames(body) {
  const data = camelizeKeys(body);
  const games = Array.isArray(data?.games) ? data.games : [];
  const matches = [];
  const seen = new Set();
  for (const game of games) {
    if (!game || typeof game !== "object") continue;
    const playedAt = garenaPlayedAt(game.startTime);
    const officialId = externalId(game.gameId);
    const id = officialId || stableToken([playedAt, clip(game.kda, 40), clip(game.type, 40)]);
    if (!id || (!officialId && !playedAt)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    const kda = kdaParts(game.kda);
    const mapped = normalizeQueueMode(game.type);
    const rawMode = clip(game.type, 80);
    const hero = heroName(game.champion);
    const row = emptyMatch();
    row.id = id;
    row.externalMatchId = id;
    row.source = "garena";
    row.date = playedAt.slice(0, 10);
    row.playedAt = playedAt;
    row.mode = mapped;
    row.map = rawMode && rawMode !== mapped ? rawMode : "";
    row.hero = hero;
    row.result = resultOf(game.gameResult);
    row.kda = kda.kda;
    row.kills = kda.kills;
    row.deaths = kda.deaths;
    row.assists = kda.assists;
    row.label = [mapped || rawMode, hero].filter(Boolean).join(" · ");
    row.publish = false;
    matches.push(row);
  }
  matches.sort((a, b) => matchRecency(b) - matchRecency(a));
  return matches;
}

function characterOf(body, partition) {
  const data = camelizeKeys(body);
  const list = Array.isArray(data?.characters) ? data.characters : [];
  const found = list.find((row) => String(row?.partition ?? "") === String(partition));
  if (!found) return null;
  const uid = /^\d{1,20}$/.test(String(found.uid ?? "")) ? String(found.uid) : "";
  return {
    name: clip(found.name, 40),
    partition: String(partition),
    uid,
  };
}

/**
 * The published handle wins. A Garena IGN may fill it only when the CMS handle
 * is still empty. A non-empty CMS uid is never replaced. The character payload
 * has no uid in the SPA types; a digit `uid` field is kept only to fill a blank.
 */
export function characterMatchesOwner(name, player, keyword) {
  const ign = clip(name, 40).toLowerCase();
  if (!ign) return true;
  const expected = clip(keyword, 40).toLowerCase();
  if (expected && ign === expected) return true;
  const handle = clip(player?.handle, 40).toLowerCase();
  return Boolean(handle) && ign === handle;
}

function sameRow(match, incoming, timeCounts) {
  const incomingId = incoming.externalMatchId || incoming.id;
  if (incomingId && (match.externalMatchId === incomingId || match.id === incomingId)) return true;
  const key = timeKey(incoming.playedAt);
  if (!key || timeKey(match.playedAt) !== key) return false;
  return timeCounts.get(key) === 1;
}

const FILL_IF_PRESENT = [
  "date",
  "playedAt",
  "mode",
  "map",
  "hero",
  "result",
  "kda",
  "kills",
  "deaths",
  "assists",
];

function mergeRow(prev, incoming, publish) {
  if (!prev) {
    return { ...incoming, publish: publish === true, source: "garena" };
  }
  const match = structuredClone(prev);
  for (const key of FILL_IF_PRESENT) {
    if (incoming[key]) match[key] = incoming[key];
  }
  if (!match.externalMatchId && incoming.externalMatchId) match.externalMatchId = incoming.externalMatchId;
  if (!match.id) match.id = incoming.id || incoming.externalMatchId;
  if (!match.label && incoming.label) match.label = incoming.label;
  if (prev.note?.zh || prev.note?.en) match.note = prev.note;
  if (prev.highlight?.key || prev.highlight?.caption?.zh || prev.highlight?.caption?.en) match.highlight = prev.highlight;
  if (Array.isArray(prev.board) && prev.board.length) match.board = prev.board;
  if (prev.source === "aovweb") match.source = "aovweb";
  match.publish = publish === true ? true : prev.publish === true;
  return match;
}

/**
 * Merge official rows into the CMS player. Same game id, or a unique playedAt,
 * updates the existing row and keeps scoreboard fields the official payload
 * does not send. Other stored matches stay. Career stats are left as they are.
 */
export function applyGarenaHistory(player, parsed, options = {}) {
  const base = player && typeof player === "object" ? structuredClone(player) : {};
  const keyword = clip(options.keyword, 40);
  const character = parsed?.character || {};
  if (!characterMatchesOwner(character.name, base, keyword)) {
    return { player: base, applied: false, reason: "garena_character_mismatch", imported: 0 };
  }
  const publish = options.publish === true;
  const existing = Array.isArray(base.matches) ? base.matches : [];
  const timeCounts = new Map();
  for (const match of existing) {
    const key = timeKey(match?.playedAt);
    if (!key) continue;
    timeCounts.set(key, (timeCounts.get(key) || 0) + 1);
  }
  const used = new Set();
  const imported = [];
  for (const raw of parsed?.matches || []) {
    const index = existing.findIndex((match, item) => !used.has(item) && sameRow(match, raw, timeCounts));
    if (index >= 0) used.add(index);
    imported.push(mergeRow(index >= 0 ? existing[index] : null, raw, publish));
  }
  const leftover = existing.filter((_, index) => !used.has(index));
  const matches = [...imported, ...leftover].sort((a, b) => matchRecency(b) - matchRecency(a)).slice(0, PLAYER_MATCH_LIMIT);
  const serverId = options.server === "1011" || options.server === "1012" ? options.server : "";
  const server = { zh: base.server?.zh || "", en: base.server?.en || "" };
  if (!server.zh && serverId === "1012") server.zh = "純潔之翼";
  if (!server.zh && serverId === "1011") server.zh = "聖騎之王";
  let handle = base.handle || "";
  if (!handle && characterMatchesOwner(character.name, base, keyword)) handle = clip(character.name, 40) || keyword;
  let uid = base.uid || "";
  if (!uid && character.uid) uid = character.uid;
  const syncedAt = clip(options.syncedAt || new Date().toISOString(), 40);
  return {
    applied: true,
    imported: imported.length,
    player: {
      ...base,
      publish: publish ? true : base.publish === true,
      handle,
      uid,
      server,
      matches,
      aov: {
        syncedAt,
        count: String(imported.length),
        keyword: keyword || clip(base.aov?.keyword, 100),
        server: serverId,
      },
    },
  };
}

async function garenaGet(env, path) {
  const fetchImpl = typeof env?.GARENA_FETCH === "function" ? env.GARENA_FETCH : fetch;
  const url = new URL(path, GARENA_ORIGIN).toString();
  const response = await fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: garenaHeaders(env),
  });
  if (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308) {
    return { ok: false, code: "garena_login_required" };
  }
  if (response.status === 401) return { ok: false, code: "garena_login_required" };
  const text = await readBounded(response);
  if (!text) return { ok: false, code: response.status >= 400 ? "garena_rejected" : "garena_blocked" };
  let body;
  try {
    body = JSON.parse(text);
  } catch (error) {
    logFailure("garena_parse_failed", error);
    return { ok: false, code: "garena_blocked" };
  }
  if (body && typeof body === "object" && "error" in body && body.error) {
    return { ok: false, code: garenaFailure(body.error) };
  }
  if (response.status >= 400) return { ok: false, code: "garena_rejected" };
  return { ok: true, body };
}

/**
 * Load the owner's character on the configured partition, then that character's games.
 * A character name that matches neither the owner keyword nor the stored handle
 * stops before /api/game. Does not follow redirects.
 * @param {{ handle?: string, keyword?: string }} [owner]
 */
export async function fetchGarenaHistory(env, owner = {}) {
  if (!garenaConfigured(env)) return { ok: false, code: "garena_unconfigured" };
  if (!secretValue(env, "GARENA_CSRF_TOKEN")) logEvent("garena_csrf_missing");
  const partition = garenaPartition(env);
  try {
    const characters = await garenaGet(env, "/api/character");
    if (!characters.ok) return characters;
    const character = characterOf(characters.body, partition);
    if (!character) return { ok: false, code: "garena_no_character" };
    if (!characterMatchesOwner(character.name, { handle: owner.handle || "" }, owner.keyword || "")) {
      return { ok: false, code: "garena_character_mismatch", character };
    }
    const games = await garenaGet(env, "/api/game");
    if (!games.ok) return games;
    const listed = camelizeKeys(games.body);
    if (!Array.isArray(listed?.games)) return { ok: false, code: "garena_blocked" };
    const matches = mapGarenaGames(listed);
    return { ok: true, code: "garena_synced", character, matches, count: matches.length, server: partition };
  } catch (error) {
    logFailure("garena_fetch_failed", error);
    return { ok: false, code: "garena_blocked" };
  }
}
