/**
 * Numbers for the profile 圖表 tab. Everything is computed from the public
 * matches already stored on the player, so it follows each hourly sync.
 * Only the owner's own row is read. Teammate and opponent names are never used.
 */

import { resultWord } from "./match-present.js";

export const RADAR_KEYS = ["output", "kda", "farm", "teamfight", "survival"];

/** Where each radar axis reaches 100. Written out in the chart caption. */
export const RADAR_SCALE = {
  output: 35, // average share of the team's hero damage, %
  kda: 5, // (ΣK + ΣA) / max(ΣD, 1)
  farm: 30, // average share of the team's gold, %
  teamfight: 100, // average kill participation (K + A) / team kills, %
  survival: 10, // 100 − 10 × average deaths per match
};

export const BADGE_KEYS = ["godlike", "penta", "quadra", "triple", "supreme", "gold", "silver", "loseMvp"];

const WEEKDAYS = 7;

function num(value) {
  if (value === "" || value == null || value === false || value === true) return null;
  const text = String(value).trim().replace(/,/g, "");
  if (!text) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round(value, places = 1) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** places;
  const out = Math.round(value * factor) / factor;
  return Object.is(out, -0) ? 0 : out;
}

function cleanName(value) {
  const text = String(value ?? "").trim();
  if (!text || /^MapID_\d+$/i.test(text)) return "";
  return text;
}

function rate(wins, decided) {
  return decided ? round((wins / decided) * 100, 1) : null;
}

function mean(values) {
  const list = values.filter((value) => value != null && Number.isFinite(value));
  if (!list.length) return null;
  return list.reduce((sum, value) => sum + value, 0) / list.length;
}

function when(match) {
  const raw = String(match?.playedAt || match?.date || "").trim();
  const found = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(raw);
  if (!found) return { day: "", hour: null, weekday: null, sort: "", label: "" };
  const [, y, m, d, hh, mm] = found;
  const day = `${y}-${m}-${d}`;
  // playedAt is already the owner's local clock (Taipei); read it as written.
  const js = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).getUTCDay();
  return {
    day,
    hour: hh == null ? null : Number(hh),
    weekday: (js + 6) % 7, // 0 = Monday
    sort: `${day} ${hh || "00"}:${mm || "00"}`,
    label: hh == null ? `${m}/${d}` : `${m}/${d} ${hh}:${mm}`,
  };
}

function sideOf(row) {
  return row?.side === "red" ? "red" : "blue";
}

function share(own, rows, field) {
  if (own == null) return null;
  const values = rows.map((row) => num(row?.[field]));
  if (values.length < 2 || values.some((value) => value == null)) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total > 0 ? (own / total) * 100 : null;
}

function modeLabel(match) {
  const mode = cleanName(match?.mode);
  const map = cleanName(match?.map);
  if (mode && map && mode !== map) return `${mode} · ${map}`;
  return mode || map;
}

/** One flat row per match, owner stats only. */
export function matchRow(match) {
  const board = Array.isArray(match?.board) ? match.board : [];
  const owner = board.find((row) => row?.owner) || null;
  const allies = owner ? board.filter((row) => sideOf(row) === sideOf(owner)) : [];
  const kills = num(owner?.kills) ?? num(match?.kills);
  const deaths = num(owner?.deaths) ?? num(match?.deaths);
  const assists = num(owner?.assists) ?? num(match?.assists);
  const damage = num(owner?.heroDamage) ?? num(match?.damage);
  const gold = num(owner?.gold) ?? num(match?.gold);
  const word = resultWord(match?.result);
  const time = when(match);
  const teamKills = allies.length >= 2 && allies.every((row) => num(row?.kills) != null)
    ? allies.reduce((sum, row) => sum + num(row.kills), 0)
    : null;
  const badges = match?.badges && typeof match.badges === "object" ? match.badges : {};
  const mvp = match?.mvp === true || owner?.mvp === true;
  const win = word === "VICTORY" ? true : word === "DEFEAT" ? false : null;
  const damagePct = num(owner?.heroDamagePct) ?? share(num(owner?.heroDamage), allies, "heroDamage");
  return {
    hero: cleanName(owner?.hero) || cleanName(match?.hero),
    win,
    kills,
    deaths,
    assists,
    kda: kills != null && deaths != null && assists != null ? (kills + assists) / Math.max(deaths, 1) : null,
    damage,
    damagePct,
    goldPct: owner ? share(gold, allies, "gold") : null,
    killPart: teamKills && kills != null && assists != null ? clamp(((kills + assists) / teamKills) * 100) : null,
    score: num(owner?.score),
    mvp,
    badges: Object.fromEntries(BADGE_KEYS.map((key) => [key, badges[key] === true || (key === "loseMvp" && mvp && win === false)])),
    rawBadge: BADGE_KEYS.some((key) => badges[key] === true) || Boolean(String(owner?.badge || "").trim()),
    mode: modeLabel(match),
    ...time,
  };
}

function bucketRates(rows, keyOf) {
  const buckets = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (!key) continue;
    const found = buckets.get(key) || { key, games: 0, wins: 0, losses: 0 };
    found.games += 1;
    if (row.win === true) found.wins += 1;
    else if (row.win === false) found.losses += 1;
    buckets.set(key, found);
  }
  const total = rows.length || 1;
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, share: round((bucket.games / total) * 100, 1), rate: rate(bucket.wins, bucket.wins + bucket.losses) }))
    .sort((a, b) => b.games - a.games || (b.rate ?? -1) - (a.rate ?? -1) || String(a.key).localeCompare(String(b.key), "zh-Hant"));
}

function radar(rows) {
  const damagePct = mean(rows.map((row) => row.damagePct));
  const goldPct = mean(rows.map((row) => row.goldPct));
  const killPart = mean(rows.map((row) => row.killPart));
  const kdaRows = rows.filter((row) => row.kda != null);
  const kda = kdaRows.length
    ? kdaRows.reduce((sum, row) => sum + row.kills + row.assists, 0) / Math.max(kdaRows.reduce((sum, row) => sum + row.deaths, 0), 1)
    : null;
  const deaths = mean(rows.map((row) => row.deaths));
  const raw = { damagePct, kda, goldPct, killPart, deaths };
  const scores = {
    output: damagePct == null ? null : clamp((damagePct / RADAR_SCALE.output) * 100),
    kda: kda == null ? null : clamp((kda / RADAR_SCALE.kda) * 100),
    farm: goldPct == null ? null : clamp((goldPct / RADAR_SCALE.farm) * 100),
    teamfight: killPart == null ? null : clamp((killPart / RADAR_SCALE.teamfight) * 100),
    survival: deaths == null ? null : clamp(100 - RADAR_SCALE.survival * deaths),
  };
  const values = Object.fromEntries(RADAR_KEYS.map((key) => [key, round(scores[key], 0)]));
  const available = RADAR_KEYS.filter((key) => values[key] != null).length;
  return {
    values,
    raw: Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, round(value, key === "kda" ? 2 : 1)])),
    available,
    ok: available >= 3,
  };
}

function rolling(rows, size) {
  const points = [];
  let wins = 0;
  let decided = 0;
  rows.forEach((row, index) => {
    if (row.win != null) {
      decided += 1;
      if (row.win) wins += 1;
    }
    const window = rows.slice(Math.max(0, index - size + 1), index + 1).filter((item) => item.win != null);
    const windowWins = window.filter((item) => item.win).length;
    points.push({
      label: row.label,
      win: row.win,
      rolling: rate(windowWins, window.length),
      cumulative: rate(wins, decided),
    });
  });
  return points;
}

function distribution(rows, size, keyOf) {
  const out = Array.from({ length: size }, (_, index) => ({ index, games: 0, wins: 0, losses: 0, rate: null }));
  let any = false;
  for (const row of rows) {
    const key = keyOf(row);
    if (key == null || key < 0 || key >= size) continue;
    any = true;
    out[key].games += 1;
    if (row.win === true) out[key].wins += 1;
    else if (row.win === false) out[key].losses += 1;
  }
  for (const item of out) item.rate = rate(item.wins, item.wins + item.losses);
  return any ? out : [];
}

/**
 * @param {unknown[]} matches public matches (any order)
 * @param {{ since?: string, window?: number }} [options] since = YYYY-MM-DD, inclusive
 */
export function computeMatchStats(matches, options = {}) {
  const all = (Array.isArray(matches) ? matches : []).map(matchRow).sort((a, b) => a.sort.localeCompare(b.sort));
  const since = /^\d{4}-\d{2}-\d{2}$/.test(String(options.since || "")) ? options.since : "";
  const rows = since ? all.filter((row) => row.day && row.day >= since) : all;
  const size = Number.isInteger(options.window) && options.window > 1 ? options.window : 10;
  const wins = rows.filter((row) => row.win === true).length;
  const losses = rows.filter((row) => row.win === false).length;
  // Badge flags exist on every synced match but the source leaves them all false.
  // Only count them when at least one stored match actually carries one.
  const badgesKnown = all.some((row) => row.rawBadge);
  const badges = badgesKnown ? Object.fromEntries(BADGE_KEYS.map((key) => [key, rows.filter((row) => row.badges[key]).length])) : null;
  const kdaRows = rows.filter((row) => row.kda != null);
  const totals = kdaRows.reduce((sum, row) => ({ k: sum.k + row.kills, d: sum.d + row.deaths, a: sum.a + row.assists }), { k: 0, d: 0, a: 0 });
  return {
    since,
    total: all.length,
    summary: {
      games: rows.length,
      wins,
      losses,
      rate: rate(wins, wins + losses),
      mvp: rows.filter((row) => row.mvp).length,
      loseMvp: rows.filter((row) => row.mvp && row.win === false).length,
      kda: kdaRows.length ? round((totals.k + totals.a) / Math.max(totals.d, 1), 2) : null,
      avgKills: kdaRows.length ? round(totals.k / kdaRows.length, 1) : null,
      avgDeaths: kdaRows.length ? round(totals.d / kdaRows.length, 1) : null,
      avgAssists: kdaRows.length ? round(totals.a / kdaRows.length, 1) : null,
      avgScore: round(mean(rows.map((row) => row.score)), 1),
      badges,
    },
    radar: radar(rows),
    winTrend: rows.some((row) => row.win != null) ? rolling(rows, size) : [],
    window: size,
    kdaTrend: kdaRows.length >= 2
      ? rows.map((row) => ({ label: row.label, win: row.win, kills: row.kills, deaths: row.deaths, assists: row.assists, kda: row.kda == null ? null : round(row.kda, 2) }))
      : [],
    heroes: bucketRates(rows, (row) => row.hero).map(({ key, ...rest }) => ({ hero: key, ...rest })),
    modes: bucketRates(rows, (row) => row.mode).map(({ key, ...rest }) => ({ mode: key, ...rest })),
    hours: distribution(rows, 24, (row) => row.hour),
    weekdays: distribution(rows, WEEKDAYS, (row) => row.weekday),
  };
}
