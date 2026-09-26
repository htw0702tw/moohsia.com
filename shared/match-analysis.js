/** Aggregates already stored on each match. Missing numbers stay missing. */

import { resultWord } from "./match-present.js";
import { derivedKda, matchRecency } from "./player.js";

function cleanName(value) {
  const text = String(value ?? "").trim();
  if (!text || /^MapID_\d+$/i.test(text)) return "";
  return text;
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === "" || value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    const number = Number(text);
    if (Number.isFinite(number)) return number;
  }
  return null;
}

function ownerRow(match) {
  const board = Array.isArray(match?.board) ? match.board : [];
  return board.find((row) => row?.owner) || null;
}

function roundRate(wins, decided) {
  if (!decided) return null;
  const pct = Math.round((wins / decided) * 1000) / 10;
  return Object.is(pct, -0) ? 0 : pct;
}

function kdaOf(kills, deaths, assists) {
  if (kills == null || deaths == null || assists == null) return null;
  const text = derivedKda(String(kills), String(deaths), String(assists));
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function playedLabel(match) {
  const raw = String(match?.playedAt || match?.date || "").trim();
  const matched = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(raw);
  if (!matched) return "";
  const day = `${matched[2]}/${matched[3]}`;
  return matched[4] ? `${day} ${matched[4]}:${matched[5]}` : day;
}

function modeKey(match) {
  const mode = cleanName(match?.mode);
  const map = cleanName(match?.map);
  if (mode && map && mode !== map) return `${mode} · ${map}`;
  return mode || map;
}

function toRow(match) {
  const owner = ownerRow(match);
  const kills = firstNumber(owner?.kills, match?.kills);
  const deaths = firstNumber(owner?.deaths, match?.deaths);
  const assists = firstNumber(owner?.assists, match?.assists);
  const word = resultWord(match?.result);
  return {
    hero: cleanName(owner?.hero) || cleanName(match?.hero),
    win: word === "VICTORY" ? true : word === "DEFEAT" ? false : null,
    kda: kdaOf(kills, deaths, assists),
    damage: firstNumber(owner?.heroDamage, match?.damage),
    gold: firstNumber(owner?.gold, match?.gold),
    mode: modeKey(match),
    label: playedLabel(match),
    recency: matchRecency(match),
  };
}

function newestFirst(matches) {
  return (Array.isArray(matches) ? matches : [])
    .map((match, index) => ({ row: toRow(match), index }))
    .sort((a, b) => b.row.recency - a.row.recency || a.index - b.index)
    .map((item) => item.row);
}

function windowRate(rows) {
  let wins = 0;
  let losses = 0;
  for (const row of rows) {
    if (row.win === true) wins += 1;
    else if (row.win === false) losses += 1;
  }
  return {
    games: rows.length,
    wins,
    losses,
    rate: roundRate(wins, wins + losses),
  };
}

function heroRates(rows, limit) {
  const buckets = new Map();
  for (const row of rows) {
    if (!row.hero) continue;
    const found = buckets.get(row.hero) || { hero: row.hero, games: 0, wins: 0, losses: 0 };
    found.games += 1;
    if (row.win === true) found.wins += 1;
    else if (row.win === false) found.losses += 1;
    buckets.set(row.hero, found);
  }
  return [...buckets.values()]
    .map((bucket) => ({
      hero: bucket.hero,
      games: bucket.games,
      wins: bucket.wins,
      losses: bucket.losses,
      rate: roundRate(bucket.wins, bucket.wins + bucket.losses),
    }))
    .sort((a, b) => b.games - a.games || (b.rate ?? -1) - (a.rate ?? -1) || a.hero.localeCompare(b.hero, "zh-Hant"))
    .slice(0, limit);
}

function trendPoints(rows, limit) {
  const points = rows
    .slice(0, limit)
    .slice()
    .reverse()
    .map((row) => ({
      label: row.label,
      kda: row.kda,
      damage: row.damage,
      win: row.win,
    }));
  return {
    points,
    kda: points.filter((point) => point.kda != null).length >= 2,
    damage: points.filter((point) => point.damage != null).length >= 2,
  };
}

function average(rows, field, win) {
  const sample = rows.filter((row) => row.win === win && row[field] != null);
  if (!sample.length) return null;
  const sum = sample.reduce((total, row) => total + row[field], 0);
  return { avg: Math.round(sum / sample.length), n: sample.length };
}

function pair(rows, field) {
  const win = average(rows, field, true);
  const loss = average(rows, field, false);
  if (!win || !loss) return null;
  return { win, loss };
}

function modeRates(rows) {
  const buckets = new Map();
  for (const row of rows) {
    if (!row.mode) continue;
    const found = buckets.get(row.mode) || { mode: row.mode, games: 0, wins: 0, losses: 0 };
    found.games += 1;
    if (row.win === true) found.wins += 1;
    else if (row.win === false) found.losses += 1;
    buckets.set(row.mode, found);
  }
  if (buckets.size < 2) return [];
  return [...buckets.values()]
    .map((bucket) => ({
      mode: bucket.mode,
      games: bucket.games,
      wins: bucket.wins,
      losses: bucket.losses,
      rate: roundRate(bucket.wins, bucket.wins + bucket.losses),
    }))
    .sort((a, b) => b.games - a.games || a.mode.localeCompare(b.mode, "zh-Hant"));
}

/**
 * Charts for the member match history. Windows are newest-first;
 * the trend series is oldest → newest inside the recent window.
 * @param {unknown[]} matches
 * @param {{ heroLimit?: number, trendLimit?: number }} [options]
 */
export function analyzeMatches(matches, options = {}) {
  const heroLimit = Number.isInteger(options.heroLimit) && options.heroLimit > 0 ? options.heroLimit : 8;
  const trendLimit = Number.isInteger(options.trendLimit) && options.trendLimit > 0 ? options.trendLimit : 20;
  const rows = newestFirst(matches);
  return {
    recent: {
      last10: windowRate(rows.slice(0, 10)),
      last20: windowRate(rows.slice(0, 20)),
      overall: windowRate(rows),
    },
    heroes: heroRates(rows, heroLimit),
    trend: trendPoints(rows, trendLimit),
    compare: {
      damage: pair(rows, "damage"),
      gold: pair(rows, "gold"),
    },
    modes: modeRates(rows),
  };
}

export function formatRate(rate) {
  if (rate == null || !Number.isFinite(Number(rate))) return "";
  const rounded = Math.round(Number(rate) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
