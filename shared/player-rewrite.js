/**
 * Rewrite stored player matches without inventing games.
 * AOVRanking `補兵 | 控場 | 治療 | 塔傷` is not in-game 補刀數. cleanPlayer moves
 * that quartet onto ranking* fields when 控場 is seconds. A swapped in-game pair
 * is corrected only when last-hits are impossibly high and healing looks like a
 * creep count. The 2026-09-25 22:59 Natalya row is patched to the screenshot
 * when that match is already stored.
 */
import { normalizeQueueMode } from "./aov-import.js";
import { cleanPlayer } from "./player.js";

/** Owner-supplied ranked hero cards from the 2026-09-25 profile screenshots. */
export const RANKED_HERO_CARDS = [
  { hero: "娜塔亞", matches: "60", winRate: "68.3", power: "2984" },
  { hero: "克里希", matches: "3", winRate: "100", power: "277" },
  { hero: "刀鋒寶貝", matches: "2", winRate: "50", power: "109" },
  { hero: "特爾安娜絲", matches: "2", winRate: "50", power: "206" },
];

function asNumber(value) {
  if (value === "" || value == null) return null;
  const number = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(number) ? number : null;
}

/**
 * Swap only the known mixup: a creep-sized healing value sitting in last-hits,
 * and a healing-sized number sitting in 補刀.
 */
export function unswapFarm(row) {
  const source = row && typeof row === "object" ? row : {};
  const farm = asNumber(source.lastHits || source.minions);
  const heal = asNumber(source.healing);
  if (farm == null || heal == null) return { ...source };
  if (farm > 400 && heal >= 0 && heal <= 400 && heal < farm) {
    const hits = String(heal);
    const healing = String(Math.trunc(farm));
    return { ...source, minions: hits, lastHits: hits, healing, farmValidated: true };
  }
  return { ...source };
}

function isNatalyaTruth(match) {
  const when = String(match?.playedAt || "");
  return (
    when.startsWith("2026-09-25 22:59") &&
    String(match?.hero || "").includes("娜塔") &&
    String(match?.kills) === "8" &&
    String(match?.deaths) === "6" &&
    String(match?.assists) === "4"
  );
}

function applyNatalyaTruth(match) {
  if (!isNatalyaTruth(match)) return match;
  const previousFarm = String(match.rankingFarm || match.minions || match.lastHits || "");
  const ownerPatch = {
    minions: "34",
    lastHits: "34",
    healing: "6077",
    jungleGold: "160",
    gold: "9819",
    heroDamage: "125875",
    taken: "113770",
    control: "6534",
    tower: "2089",
    damageRatio: "1.51",
    takenPer: "18961",
    rankingFarm: previousFarm && previousFarm !== "34" ? previousFarm : match.rankingFarm || "",
    farmValidated: true,
    mvp: true,
  };
  return {
    ...match,
    minions: "34",
    lastHits: "34",
    healing: "6077",
    rankingFarm: ownerPatch.rankingFarm,
    farmValidated: true,
    jungleGold: "160",
    gold: "9819",
    damage: "125875",
    taken: "113770",
    control: "6534",
    tower: "2089",
    damageRatio: "1.51",
    takenPer: "18961",
    mvp: true,
    mode: "排位賽",
    result: match.result === "敗" ? "勝" : match.result || "勝",
    rankDelta: match.rankDelta && match.rankDelta !== "100" && match.rankDelta !== "-100" ? match.rankDelta : "103",
    powerDelta: "63",
    blueScore: match.blueScore || "25",
    redScore: match.redScore || "17",
    board: (match.board || []).map((row) => (row?.owner ? { ...row, ...ownerPatch } : row)),
  };
}

function normalizeMode(match) {
  const raw = String(match.mode || "").trim();
  const mode = normalizeQueueMode(raw);
  if (!mode || mode === raw) return match;
  return { ...match, mode, map: match.map || raw };
}

function alignHeroCards(heroPool) {
  const list = Array.isArray(heroPool) ? heroPool.map((card) => ({ ...card })) : [];
  for (const card of RANKED_HERO_CARDS) {
    const found = list.find((item) => item.hero === card.hero);
    if (found) {
      found.matches = card.matches;
      found.winRate = card.winRate;
      found.power = card.power;
    } else {
      list.push({ id: "", ...card, note: { zh: "排位賽", en: "" } });
    }
  }
  return list;
}

/** @param {unknown} player */
export function rewritePlayer(player) {
  const source = player && typeof player === "object" ? structuredClone(player) : {};
  const matches = (Array.isArray(source.matches) ? source.matches : []).map((match) => {
    const row = unswapFarm(match);
    const board = (match.board || []).map((item) => (item?.owner ? unswapFarm(item) : item));
    return applyNatalyaTruth(normalizeMode({ ...match, ...row, board }));
  });
  return cleanPlayer({
    ...source,
    heroPool: matches.length ? alignHeroCards(source.heroPool) : source.heroPool || [],
    matches,
  });
}

/** Rewrite `player` inside a site document. Other matches are kept. */
export function rewriteSiteDocument(document) {
  const source = document && typeof document === "object" ? structuredClone(document) : {};
  if (!source.player || typeof source.player !== "object") return source;
  source.player = rewritePlayer(source.player);
  return source;
}
