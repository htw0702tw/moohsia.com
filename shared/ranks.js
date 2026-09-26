/**
 * 傳說對決 rank ladder, ranked modes, and star-path math.
 *
 * Star caps for 青銅–星耀 are the per-division counts the owner read in the client.
 * The 段位介紹 screens list sub-tiers (III/II/I), not star caps. The four sparkles
 * above a selected emblem appear on every tier, including 傳說, so they are not caps.
 *
 * Legend star bands: Garena news 4760 and 4906 (0–9, 10–19, …, 50–99, 100+).
 * 100 rank points = 1 star: https://moba.garena.tw/news/show/5240 (2025-07-02).
 * Stored match `rankDelta` is the AOVRanking「排位積分」column, in those points.
 *
 * Emblems are cropped from the official Garena news strip
 * https://kgtw-cdn-garenanow-com-sh.obs.cn-east-3.myhuaweicloud.com/mgames/kgtw/NEWOfficialwebsite/1200630/Beta47-26.png
 * (news 4924, the version that added these legend bands). One extra icon on the
 * right of that strip is unlabeled, so it is not used as a fourteenth tier.
 */

export const POINTS_PER_STAR = 100;

const DIVISION_TIERS = [
  {
    id: "bronze",
    zh: "青銅",
    en: "Bronze",
    divisions: ["III", "II", "I"],
    stars: 3,
    population: "約 35% 的玩家處在該段位",
    populationEn: "About 35% of players are in this tier.",
  },
  {
    id: "silver",
    zh: "白銀",
    en: "Silver",
    divisions: ["III", "II", "I"],
    stars: 4,
    population: "處在該段位說明您實力超過了約 35% 的玩家",
    populationEn: "This tier is ahead of about 35% of players.",
  },
  {
    id: "gold",
    zh: "黃金",
    en: "Gold",
    divisions: ["IV", "III", "II", "I"],
    stars: 4,
    population: "處在該段位說明您實力超過了約 65% 的玩家",
    populationEn: "This tier is ahead of about 65% of players.",
  },
  {
    id: "platinum",
    zh: "鉑金",
    en: "Platinum",
    divisions: ["V", "IV", "III", "II", "I"],
    stars: 5,
    population: "處在該段位說明您實力超過了約 80% 的玩家",
    populationEn: "This tier is ahead of about 80% of players.",
  },
  {
    id: "diamond",
    zh: "鑽石",
    en: "Diamond",
    divisions: ["V", "IV", "III", "II", "I"],
    stars: 5,
    population: "處在該段位說明您實力超過了約 90% 的玩家",
    populationEn: "This tier is ahead of about 90% of players.",
  },
  {
    id: "glory",
    zh: "星耀",
    en: "Glory",
    divisions: ["V", "IV", "III", "II", "I"],
    stars: 5,
    population: "處在該段位說明您實力超過了約 95% 的玩家",
    populationEn: "This tier is ahead of about 95% of players.",
  },
];

/** Continuous star bands after 星耀. 永恆傳說 is a title, not its own band. */
const LEGEND_BANDS = [
  {
    id: "legend-war",
    zh: "戰場傳說",
    en: "War Legend",
    minStars: 0,
    maxStars: 9,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "",
  },
  {
    id: "legend-light",
    zh: "先鋒傳說·光影",
    en: "Vanguard · Light",
    minStars: 10,
    maxStars: 19,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "",
  },
  {
    id: "legend-sky",
    zh: "先鋒傳說·天際",
    en: "Vanguard · Sky",
    minStars: 20,
    maxStars: 29,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "",
  },
  {
    id: "legend-moon",
    zh: "先鋒傳說·新月",
    en: "Vanguard · Crescent",
    minStars: 30,
    maxStars: 39,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "",
  },
  {
    id: "legend-star",
    zh: "先鋒傳說·星域",
    en: "Vanguard · Starfield",
    minStars: 40,
    maxStars: 49,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "",
  },
  {
    id: "legend-radiant",
    zh: "璀璨傳說",
    en: "Radiant Legend",
    minStars: 50,
    maxStars: 99,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "遊戲內名稱旁寫著永恆傳說。前 50 名獲得永恆傳說稱號。",
  },
  {
    id: "legend-peerless",
    zh: "絕世傳說",
    en: "Peerless Legend",
    minStars: 100,
    maxStars: null,
    population: "處在該段位說明您實力超過了約 99% 的玩家",
    populationEn: "This tier is ahead of about 99% of players.",
    note: "遊戲內名稱旁寫著永恆傳說。前 50 名的玩家將獲得永恆傳說稱號。",
  },
];

export const RANK_TIERS = DIVISION_TIERS.map((tier) => ({ ...tier, kind: "division", emblem: `/ranks/${tier.id}.webp` }));
export const LEGEND_TIERS = LEGEND_BANDS.map((tier) => ({ ...tier, kind: "legend", emblem: `/ranks/${tier.id}.webp` }));
export const LADDER = [...RANK_TIERS, ...LEGEND_TIERS];

export function tierById(id) {
  return LADDER.find((tier) => tier.id === id) || null;
}

export function legendBandForStars(stars) {
  const value = Number(stars);
  if (!Number.isInteger(value) || value < 0) return null;
  return LEGEND_TIERS.find((tier) => value >= tier.minStars && (tier.maxStars == null || value <= tier.maxStars)) || null;
}

function divisionSteps() {
  const steps = [];
  for (const tier of RANK_TIERS) {
    for (const division of tier.divisions) steps.push({ tierId: tier.id, division, cap: tier.stars });
  }
  return steps;
}

export function rankStep(tierId, division) {
  return divisionSteps().find((step) => step.tierId === tierId && step.division === division) || null;
}

/**
 * Stars above 青銅 III ★1, plus the point fraction.
 * Each division occupies `cap` steps (★1 through ★cap). ★1 of the next division
 * is the step after ★cap. That spacing matches 黃金 IV ★1 → 鉑金 III ★5 = 30 stars.
 */
export function starIndex(position) {
  const tier = tierById(position?.tier);
  if (!tier) return null;
  const points = Number(position.points);
  const fraction = Number.isInteger(points) && points >= 0 && points < POINTS_PER_STAR ? points / POINTS_PER_STAR : 0;
  if (tier.kind === "legend") {
    const stars = Number(position.stars);
    if (!Number.isInteger(stars) || stars < tier.minStars) return null;
    if (tier.maxStars != null && stars > tier.maxStars) return null;
    const base = divisionSteps().reduce((sum, step) => sum + step.cap, 0);
    return base + stars + fraction;
  }
  const stars = Number(position.stars);
  if (!Number.isInteger(stars) || stars < 1 || stars > tier.stars) return null;
  if (!tier.divisions.includes(position.division)) return null;
  let cursor = 0;
  for (const step of divisionSteps()) {
    if (step.tierId === tier.id && step.division === position.division) return cursor + (stars - 1) + fraction;
    cursor += step.cap;
  }
  return null;
}

export function formatRank(position, lang = "zh") {
  const tier = tierById(position?.tier);
  if (!tier) return "";
  const name = lang === "en" ? tier.en : tier.zh;
  if (tier.kind === "legend") {
    const stars = String(position.stars ?? "").trim();
    return stars ? `${name} ${stars}${lang === "en" ? "★" : " 星"}` : name;
  }
  const division = tier.divisions.includes(position.division) ? ` ${position.division}` : "";
  const stars = String(position.stars ?? "").trim();
  return `${name}${division}${stars ? ` ★${stars}` : ""}`.trim();
}

function copyPosition(position) {
  return {
    tier: position.tier,
    division: position.division || "",
    stars: Number(position.stars),
    points: Number(position.points) || 0,
  };
}

/** One star up. Stops at 星耀 I ★cap; crossing into 傳說 is left unresolved. */
export function addStar(position) {
  const tier = tierById(position?.tier);
  if (!tier || tier.kind === "legend") return null;
  const step = rankStep(position.tier, position.division);
  if (!step) return null;
  const stars = Number(position.stars);
  if (!Number.isInteger(stars) || stars < 1) return null;
  if (stars < step.cap) return { tier: position.tier, division: position.division, stars: stars + 1 };
  const steps = divisionSteps();
  const index = steps.findIndex((item) => item.tierId === step.tierId && item.division === step.division);
  const next = steps[index + 1];
  if (!next) return null;
  return { tier: next.tierId, division: next.division, stars: 1 };
}

export function subStar(position) {
  const tier = tierById(position?.tier);
  if (!tier || tier.kind === "legend") return null;
  const step = rankStep(position.tier, position.division);
  if (!step) return null;
  const stars = Number(position.stars);
  if (!Number.isInteger(stars) || stars < 1) return null;
  if (stars > 1) return { tier: position.tier, division: position.division, stars: stars - 1 };
  const steps = divisionSteps();
  const index = steps.findIndex((item) => item.tierId === step.tierId && item.division === step.division);
  const prev = steps[index - 1];
  if (!prev) return null;
  return { tier: prev.tierId, division: prev.division, stars: prev.cap };
}

/** Apply a rank-point delta. Returns null if the walk leaves the division ladder. */
export function shiftPoints(position, delta) {
  const start = Number(position?.points);
  const change = Number(delta);
  if (!Number.isInteger(start) || start < 0 || start >= POINTS_PER_STAR) return null;
  if (!Number.isInteger(change)) return null;
  let points = start + change;
  let cursor = { tier: position.tier, division: position.division || "", stars: Number(position.stars) };
  if (starIndex({ ...cursor, points: 0 }) == null) return null;
  while (points >= POINTS_PER_STAR) {
    const next = addStar(cursor);
    if (!next) return null;
    cursor = next;
    points -= POINTS_PER_STAR;
  }
  while (points < 0) {
    const next = subStar(cursor);
    if (!next) return null;
    cursor = next;
    points += POINTS_PER_STAR;
  }
  return { ...cursor, points };
}

function timeOf(match) {
  const raw = String(match?.playedAt || match?.date || "")
    .trim()
    .replace(" ", "T");
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

function deltaOf(match) {
  const text = String(match?.rankDelta ?? "").trim();
  return /^-?\d+$/.test(text) ? Number(text) : null;
}

function anchorPosition(anchor) {
  if (!anchor?.tier) return null;
  const points = String(anchor.points ?? "").trim() === "" ? 0 : Number(anchor.points);
  const position = {
    tier: anchor.tier,
    division: anchor.division || "",
    stars: Number(anchor.stars),
    points,
  };
  if (starIndex(position) == null) return null;
  return position;
}

function boundaryRows(points) {
  const ys = points.map((point) => point.y);
  const low = Math.min(...ys);
  const high = Math.max(...ys);
  const seen = new Set(points.map((point) => `${point.tier}|${point.division}`));
  const rows = [];
  let cursor = 0;
  for (const step of divisionSteps()) {
    const key = `${step.tierId}|${step.division}`;
    if (seen.has(key) || (cursor >= low - 0.01 && cursor <= high + 0.01)) {
      const tier = tierById(step.tierId);
      rows.push({ y: cursor, tierId: step.tierId, division: step.division, label: `${tier.zh} ${step.division}` });
    }
    cursor += step.cap;
  }
  return rows;
}

/**
 * Walk stored matches backward from the current rank.
 * `rankDelta` is rank points. A ranked row with no points stops the star line.
 * Bars always list the rows that do have a number.
 */
export function buildRankHistory(matches, anchor) {
  const rows = (Array.isArray(matches) ? matches : [])
    .filter((match) => match && match.publish !== false)
    .map((match) => ({
      id: String(match.id || ""),
      at: String(match.playedAt || match.date || ""),
      time: timeOf(match),
      mode: String(match.mode || ""),
      hero: String(match.hero || ""),
      result: String(match.result || ""),
      delta: deltaOf(match),
    }))
    .sort((a, b) => a.time - b.time || a.at.localeCompare(b.at));
  const bars = rows.filter((row) => row.delta != null);
  const placed = anchorPosition(anchor);
  if (!placed) {
    return {
      code: bars.length ? "bars" : "empty",
      bars,
      series: [],
      boundaries: [],
    };
  }
  const newestFirst = [...rows].sort((a, b) => b.time - a.time || b.at.localeCompare(a.at));
  let cursor = copyPosition(placed);
  const series = [
    {
      ...cursor,
      y: starIndex(cursor),
      at: String(anchor?.updatedAt || ""),
      kind: "now",
      delta: null,
      hero: "",
      result: "",
      id: "",
    },
  ];
  let code = "stars";
  for (const row of newestFirst) {
    if (row.delta == null) {
      if (/排位/.test(row.mode)) {
        code = "stars-gap";
        break;
      }
      continue;
    }
    const before = shiftPoints(cursor, -row.delta);
    if (!before) {
      code = "stars-gap";
      break;
    }
    series.push({
      ...before,
      y: starIndex(before),
      at: row.at,
      kind: "before",
      delta: row.delta,
      hero: row.hero,
      result: row.result,
      id: row.id,
    });
    cursor = before;
  }
  series.reverse();
  const boundaries = boundaryRows(series);
  return { code, bars, series, boundaries };
}

export function compareRanks(a, b) {
  const left = starIndex(a);
  const right = starIndex(b);
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  return right - left;
}

export function reachedLegend(position) {
  const tier = tierById(position?.tier);
  return tier?.kind === "legend";
}

/** In-game 傳說之巔規則, plus the lobby hours. Weekend clock and reward ratios are not on the screen. */
export const APEX_RULES = [
  "每個賽季，排位賽進行一段時間後，開啟傳說之巔模式。",
  "傳說之巔開啟後，當下段位需達到星耀等級以上，才符合參加資格。",
  "傳說之巔每天限時開放，週末的開放時間將延長。排位大廳的入口寫著 16–24 點開放。",
  "傳說之巔中玩家只能進行預選位單排，並且從選角介面開始，所有玩家名稱將更改為代號「傳說挑戰者」，玩家名稱將在本局遊戲結算時顯示。",
  "傳說之巔中每隊能禁用 3 個英雄，分別由 3、4、5 樓選擇本局禁用的英雄。",
  "玩家能夠在傳說之巔中獲得額外的傳說戰力和全英雄傳說戰力加成，加成上限和比例取決於玩家的傳說積分。",
  "玩家傳說積分和個人排名在賽季結算時達到要求可獲得相應獎勵。",
  "傳說之巔中不可使用一級熟練度的英雄。",
];

export const APEX_UNKNOWN = [
  "週末延長後的具體時段",
  "傳說積分的加成上限與比例",
  "賽季結算獎勵的項目",
  "巔峰週榜的計分方式",
];

export const LEGEND_PATH_NODES = [10, 20, 30, 40, 50];

export const RANKED_MODES = [
  {
    id: "ranked",
    name: { zh: "排位賽", en: "Ranked" },
    players: "5V5",
    kind: "queue",
  },
  {
    id: "apex",
    name: { zh: "傳說之巔", en: "Apex" },
    players: "5V5",
    kind: "queue",
  },
  {
    id: "season-challenge",
    name: { zh: "賽季挑戰", en: "Season challenges" },
    players: "",
    kind: "track",
  },
  {
    id: "legend-path",
    name: { zh: "傳說之路", en: "Legend path" },
    players: "",
    kind: "reward",
  },
  {
    id: "year-treasure",
    name: { zh: "賽年寶藏", en: "Season-year treasure" },
    players: "",
    kind: "reward",
  },
];

export function rankedMode(id) {
  return RANKED_MODES.find((mode) => mode.id === id) || null;
}
