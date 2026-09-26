/**
 * Rewrite stored player matches without inventing games.
 * 補兵 is 補刀數 and 治療 is 治療量. A swapped pair is corrected only when
 * last-hits are impossibly high and healing looks like a creep count.
 * The stored 2026-09-25 22:59 Natalya row is aligned to the screenshot
 * (補刀 34, 控場 6.534 seconds, 治療 6077, 塔傷 2089) and nothing else is added.
 */
import { isMapIdToken, normalizeQueueMode } from "./aov-import.js";
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
  const control = String(match.control || "") === "6534" ? "6534" : "6.534";
  const ownerPatch = {
    minions: "34",
    lastHits: "34",
    healing: "6077",
    control,
    tower: "2089",
    gold: "9819",
    heroDamage: "125875",
    taken: "113770",
    mvp: true,
  };
  return {
    ...match,
    minions: "34",
    lastHits: "34",
    healing: "6077",
    control,
    tower: "2089",
    gold: match.gold || "9819",
    damage: match.damage || "125875",
    taken: match.taken || "113770",
    mvp: true,
    board: (match.board || []).map((row) =>
      row?.owner
        ? {
            ...row,
            ...ownerPatch,
            gold: row.gold || "9819",
            heroDamage: row.heroDamage || "125875",
            taken: row.taken || "113770",
          }
        : row,
    ),
  };
}

function normalizeMode(match) {
  const raw = String(match.mode || "").trim();
  const mode = normalizeQueueMode(raw);
  const map = isMapIdToken(match.map) ? "" : String(match.map || "");
  if (mode === raw && map === String(match.map || "")) return match;
  const next = {
    ...match,
    mode,
    map: map || (mode && raw && mode !== raw && !isMapIdToken(raw) ? raw : ""),
  };
  if (/MapID_\d+/i.test(String(next.label || ""))) {
    next.label = [next.mode, next.hero].filter((part) => part && !isMapIdToken(part)).join(" · ");
  }
  return next;
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
