/** Personal Arena of Valor record. Numbers stay blank until the owner enters them. */

import { tierById } from "./ranks.js";

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isMapIdToken(value) {
  return /^MapID_\d+$/i.test(String(value || "").trim());
}

function visibleMode(value, max) {
  const text = clip(value, max);
  return text && !isMapIdToken(text) ? text : "";
}

function visibleLabel(value, max) {
  const text = clip(value, max);
  if (!text || !/MapID_\d+/i.test(text)) return text;
  return clip(
    text
      .split("·")
      .map((part) => part.trim())
      .filter((part) => part && !isMapIdToken(part))
      .join(" · "),
    max,
  );
}

function bilingual(value, max) {
  const record = value && typeof value === "object" ? value : {};
  return { zh: clip(record.zh, max), en: clip(record.en, max) };
}

function matchId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^[A-Za-z0-9_-]{1,40}$/.test(raw)) return raw;
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function whole(value, maxDigits = 8) {
  const text = clip(typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? ""), 16).replace(/,/g, "");
  if (!text) return "";
  return new RegExp(`^\\d{1,${maxDigits}}$`).test(text) ? text : "";
}

function decimal(value, maxDigits = 8, places = 2) {
  const text = clip(typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? ""), 16).replace(/,/g, "");
  if (!text) return "";
  return new RegExp(`^\\d{1,${maxDigits}}(\\.\\d{1,${places}})?$`).test(text) ? text : "";
}

function signed(value, maxDigits = 6) {
  const text = clip(typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? ""), 16)
    .replace(/,/g, "")
    .replace(/^\+/, "");
  if (!text) return "";
  return new RegExp(`^-?\\d{1,${maxDigits}}$`).test(text) ? text : "";
}

function radarValue(value) {
  const text = decimal(value, 3);
  if (!text) return "";
  const number = Number(text);
  if (number < 0 || number > 100) return "";
  return text;
}

function cleanKey(value) {
  const text = clip(value, 96);
  const fromUrl = /^\/api\/media\/([A-Za-z0-9_-]{8,64})$/.exec(text);
  if (fromUrl) return `hl/${fromUrl[1]}`;
  if (/^hl\/[A-Za-z0-9_-]{8,64}$/.test(text)) return text;
  return "";
}

const MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "video/mp4", "video/webm"]);

export function emptyHighlight() {
  return { caption: { zh: "", en: "" }, key: "", mime: "", kind: "" };
}

export function emptyBadges() {
  return {
    godlike: false,
    penta: false,
    quadra: false,
    triple: false,
    supreme: false,
    gold: false,
    silver: false,
    loseMvp: false,
  };
}

export function emptyArcanaRow(color = "") {
  return { color, name: "", count: "" };
}

export function emptyBuild() {
  return {
    id: "",
    hero: "",
    heroId: "",
    name: { zh: "", en: "" },
    lane: "",
    skillOrder: ["", "", "", ""],
    items: ["", "", "", "", "", ""],
    boots: "",
    enchant: "",
    arcana: [emptyArcanaRow("red"), emptyArcanaRow("purple"), emptyArcanaRow("green")],
    note: { zh: "", en: "" },
    shot: emptyHighlight(),
  };
}

export function emptyBoardPlayer() {
  return {
    side: "blue",
    hero: "",
    ign: "",
    lane: "",
    badge: "",
    kills: "",
    deaths: "",
    assists: "",
    gold: "",
    score: "",
    mvp: false,
    owner: false,
    items: ["", "", "", "", "", ""],
    heroDamage: "",
    heroDamagePct: "",
    taken: "",
    takenPct: "",
    healing: "",
    teamfightCount: "",
    teamfightRate: "",
    damageRatio: "",
    takenPer: "",
    gpm: "",
    level: "",
    minions: "",
    lastHits: "",
    jungleGold: "",
    control: "",
    tower: "",
    rankingFarm: "",
    rankingControl: "",
    rankingHealing: "",
    rankingTower: "",
    farmValidated: false,
    rankDelta: "",
    reputation: "",
    powerDelta: "",
    skin: "",
  };
}

/** Career history stays past AOVRanking's rolling page of about 50. */
export const PLAYER_MATCH_LIMIT = 160;

export function emptyMatch() {
  return {
    id: "",
    label: "",
    date: "",
    playedAt: "",
    duration: "",
    mode: "",
    map: "",
    hero: "",
    skin: "",
    result: "",
    kda: "",
    kills: "",
    deaths: "",
    assists: "",
    gold: "",
    damage: "",
    taken: "",
    minions: "",
    lastHits: "",
    jungleGold: "",
    damageRatio: "",
    takenPer: "",
    control: "",
    healing: "",
    tower: "",
    rankingFarm: "",
    rankingControl: "",
    rankingHealing: "",
    rankingTower: "",
    farmValidated: false,
    lane: "",
    reputation: "",
    rankDelta: "",
    powerDelta: "",
    externalMatchId: "",
    source: "",
    blueScore: "",
    redScore: "",
    winner: "",
    ownerSide: "",
    mvp: false,
    badges: emptyBadges(),
    note: { zh: "", en: "" },
    publish: false,
    highlight: emptyHighlight(),
    board: [],
  };
}

export function emptySeason() {
  return {
    id: "",
    label: "",
    mode: "",
    radar: { output: "", kda: "", farm: "", teamfight: "", survival: "" },
    played: "",
    wins: "",
    winRate: "",
    mvp: "",
    medals: {
      godlike: "",
      penta: "",
      quadra: "",
      triple: "",
      supreme: "",
      gold: "",
      silver: "",
      loseMvp: "",
    },
  };
}

export function emptyPrivilege() {
  return { level: "", name: { zh: "", en: "" }, note: { zh: "", en: "" }, unlocked: false };
}

export function emptyReputation() {
  return {
    score: "",
    level: "",
    exp: "",
    expMax: "",
    note: { zh: "", en: "" },
    privileges: [],
  };
}

export function emptyHeroCard() {
  return {
    id: "",
    hero: "",
    heroId: "",
    matches: "",
    winRate: "",
    kills: "",
    deaths: "",
    assists: "",
    mvp: "",
    power: "",
    note: { zh: "", en: "" },
  };
}

export function emptySkin() {
  return { id: "", hero: "", heroId: "", name: "" };
}

export function emptyHonor() {
  return { id: "", title: "", season: "", note: { zh: "", en: "" } };
}

export function emptyTitle() {
  return { id: "", name: "", note: { zh: "", en: "" } };
}

export function emptyRankCard() {
  return {
    season: "",
    tier: "",
    division: "",
    stars: "",
    points: "",
    queueReadout: "",
    queueReadoutMax: "",
    seasonChallenge: "",
    updatedAt: "",
  };
}

export function emptyPowerBoard() {
  return { updatedAt: "", area: "", hero: "", power: "", bestPower: "", rows: [] };
}

/** Medal keys on the in-game 對戰資料 page, in screen order. */
export const GAME_SNAPSHOT_KEYS = ["played", "winRate", "mvp", "godlike", "penta", "quadra", "triple", "supreme", "gold", "silver", "loseMvp"];

export function emptyGameSnapshotRow(label = "") {
  const row = { label };
  for (const key of GAME_SNAPSHOT_KEYS) row[key] = "";
  return row;
}

export function emptyGameSnapshot() {
  return { updatedAt: "", mode: "", seasonLabel: "", seasonStart: "", rows: [] };
}

/**
 * In-game 對戰資料 (排位賽) as read off the owner's screen on 2026-09-27.
 * Used when the stored player has no snapshot yet; admin can edit or clear it.
 */
export function defaultGameSnapshot() {
  return {
    updatedAt: "2026-09-27",
    mode: "排位賽",
    seasonLabel: "2026-S4賽季",
    seasonStart: "",
    rows: [
      { label: "全部賽季", played: "96", winRate: "64.6", mvp: "30", godlike: "12", penta: "28", quadra: "7", triple: "22", supreme: "1", gold: "12", silver: "13", loseMvp: "9" },
      { label: "2026-S4賽季", played: "37", winRate: "56.8", mvp: "9", godlike: "1", penta: "0", quadra: "0", triple: "2", supreme: "0", gold: "2", silver: "3", loseMvp: "4" },
    ],
  };
}

export function emptyYearTreasure() {
  return {
    year: "",
    reward: "",
    updatedAt: "",
    seasons: ["S1", "S2", "S3", "S4"].map((id) => ({ id, active: false })),
  };
}

export function emptyWeeklyReport() {
  return {
    id: "",
    title: "",
    start: "",
    end: "",
    rankedGames: "",
    rankedWins: "",
    starDelta: "",
    powerFrom: "",
    powerTo: "",
    hero: "",
    mastery: "",
    heroGames: "",
    heroWinRate: "",
    starsEarned: "",
    starsCasual: "",
    starsRanked: "",
    fromLabel: "",
    toLabel: "",
    bestLine: "",
    mvp: "",
    goldMedals: "",
    silverMedals: "",
    winRate: "",
    winRateBeat: "",
    winRateGrade: "",
    kda: "",
    kdaBeat: "",
    kdaGrade: "",
    specialty: "",
    specialtyGames: "",
  };
}

export function emptyPlayer() {
  return {
    publish: false,
    handle: "",
    uid: "",
    name: { zh: "", en: "" },
    role: { zh: "", en: "" },
    lane: { zh: "", en: "" },
    rank: { zh: "", en: "" },
    season: { zh: "", en: "" },
    server: { zh: "", en: "" },
    title: { zh: "", en: "" },
    bio: { zh: "", en: "" },
    signatureHeroes: { zh: "", en: "" },
    peakRank: { zh: "", en: "" },
    joinDate: "",
    avatar: emptyHighlight(),
    stats: {
      played: "",
      wins: "",
      winRate: "",
      kda: "",
      mvp: "",
      kills: "",
      deaths: "",
      assists: "",
      gold: "",
      damage: "",
    },
    seasons: [],
    reputation: emptyReputation(),
    heroPool: [],
    championships: [],
    honorTitles: [],
    builds: [],
    skins: [],
    matches: [],
    aov: { syncedAt: "", count: "", keyword: "", server: "" },
    rankCard: emptyRankCard(),
    powerBoard: emptyPowerBoard(),
    gameSnapshot: emptyGameSnapshot(),
    yearTreasure: emptyYearTreasure(),
    weeklyReports: [],
  };
}

function flag(value) {
  return value === true;
}

/**
 * AOVRanking `補兵 | 控場 | 治療 | 塔傷` is the farm cell, four values in that order.
 * 補兵 is 補刀數. 控場 is stored in seconds (6.534); the public page shows ×1000.
 * 治療 is 治療量. 塔傷 is 對塔傷害. Empty lastHits falls back to minions.
 */
function separateInGameStats(source) {
  const raw = source && typeof source === "object" ? source : {};
  const hits = whole(raw.lastHits, 6) || whole(raw.minions, 6) || whole(raw.rankingFarm, 6);
  return {
    farmValidated: raw.farmValidated === true,
    lastHits: hits,
    minions: hits,
    rankingFarm: whole(raw.rankingFarm, 6),
    rankingControl: decimal(raw.rankingControl, 6, 3),
    rankingHealing: whole(raw.rankingHealing, 9),
    rankingTower: whole(raw.rankingTower, 9),
    control: decimal(raw.control, 6, 3) || decimal(raw.rankingControl, 6, 3),
    healing: whole(raw.healing, 9) || whole(raw.rankingHealing, 9),
    tower: whole(raw.tower, 9) || whole(raw.rankingTower, 9),
  };
}

function dateOnly(value) {
  const text = clip(value, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function heroId(value) {
  const text = clip(value, 8);
  return /^\d{1,6}$/.test(text) ? text : "";
}

function cleanSkillOrder(value) {
  const raw = Array.isArray(value) ? value : String(value ?? "").split(/[^1-4]+/);
  const order = [];
  for (const item of raw) {
    const token = String(item ?? "").trim();
    if (token === "1" || token === "2" || token === "3" || token === "4") order.push(token);
    if (order.length === 4) break;
  }
  while (order.length < 4) order.push("");
  return order;
}

function cleanArcana(value) {
  const rows = [];
  const source = Array.isArray(value) ? value : [];
  for (const item of source.slice(0, 6)) {
    const row = item && typeof item === "object" ? item : {};
    const color = row.color === "red" || row.color === "purple" || row.color === "green" ? row.color : "";
    const name = clip(row.name, 40);
    const count = whole(row.count, 2);
    if (!name && !count) continue;
    rows.push({ color, name, count });
  }
  return rows;
}

function cleanBadges(value) {
  const source = value && typeof value === "object" ? value : {};
  const badges = emptyBadges();
  for (const key of Object.keys(badges)) badges[key] = flag(source[key]);
  return badges;
}

function cleanHighlight(value) {
  const source = value && typeof value === "object" ? value : {};
  const mime = MIME.has(source.mime) ? source.mime : "";
  const kind = source.kind === "video" || source.kind === "image" ? source.kind : mime.startsWith("video/") ? "video" : mime.startsWith("image/") ? "image" : "";
  const key = cleanKey(source.key || source.url || "");
  return {
    caption: bilingual(source.caption, 200),
    key: kind && mime ? key : "",
    mime: key ? mime : "",
    kind: key ? kind : "",
  };
}

function cleanBoardPlayer(value) {
  const source = value && typeof value === "object" ? value : {};
  const side = source.side === "red" ? "red" : "blue";
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    side,
    hero: clip(source.hero, 40),
    ign: clip(source.ign, 40),
    lane: clip(source.lane, 24),
    badge: clip(source.badge, 24),
    kills: whole(source.kills),
    deaths: whole(source.deaths),
    assists: whole(source.assists),
    gold: whole(source.gold, 9),
    score: decimal(source.score, 3),
    mvp: source.mvp === true,
    owner: source.owner === true,
    items: Array.from({ length: 6 }, (_, index) => clip(items[index], 40)),
    heroDamage: whole(source.heroDamage, 9),
    heroDamagePct: radarValue(source.heroDamagePct),
    taken: whole(source.taken, 9),
    takenPct: radarValue(source.takenPct),
    teamfightCount: whole(source.teamfightCount),
    teamfightRate: radarValue(source.teamfightRate),
    damageRatio: decimal(source.damageRatio, 3),
    takenPer: whole(source.takenPer, 9),
    gpm: whole(source.gpm, 6),
    level: whole(source.level, 3),
    ...separateInGameStats(source),
    jungleGold: whole(source.jungleGold, 9),
    rankDelta: signed(source.rankDelta),
    reputation: signed(source.reputation),
    powerDelta: signed(source.powerDelta),
    skin: clip(source.skin, 40),
  };
}

function boardFilled(row) {
  return Boolean(
    row.hero ||
      row.ign ||
      row.kills ||
      row.deaths ||
      row.assists ||
      row.gold ||
      row.heroDamage ||
      row.healing ||
      row.minions ||
      row.lastHits ||
      row.rankingFarm ||
      row.jungleGold ||
      row.score ||
      row.skin ||
      row.items.some(Boolean),
  );
}

function cleanExternalId(value) {
  const text = clip(value, 40);
  return /^[A-Za-z0-9_-]{1,40}$/.test(text) ? text : "";
}

function cleanAov(value) {
  const source = value && typeof value === "object" ? value : {};
  const synced = clip(source.syncedAt, 40);
  const server = source.server === "1011" || source.server === "1012" ? source.server : "";
  return {
    syncedAt: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(synced) ? synced : "",
    count: whole(source.count, 3),
    keyword: clip(source.keyword, 100),
    server,
  };
}

function cleanMatch(item) {
  const source = item && typeof item === "object" ? item : {};
  const playedRaw = clip(source.playedAt, 40);
  const playedMatch = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?/.exec(playedRaw);
  const playedAt = playedMatch
    ? playedMatch[2]
      ? `${playedMatch[1]} ${playedMatch[2]}${playedMatch[3] ? `:${playedMatch[3]}` : ""}`
      : playedMatch[1]
    : "";
  const board = [];
  if (Array.isArray(source.board)) {
    for (const row of source.board.slice(0, 10)) {
      const cleaned = cleanBoardPlayer(row);
      if (boardFilled(cleaned)) board.push(cleaned);
    }
  }
  const winner = source.winner === "blue" || source.winner === "red" ? source.winner : "";
  const ownerSide = source.ownerSide === "blue" || source.ownerSide === "red" ? source.ownerSide : "";
  return {
    id: matchId(source.id),
    label: visibleLabel(source.label, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(clip(source.date, 10)) ? clip(source.date, 10) : "",
    playedAt,
    duration: /^\d{1,3}:\d{2}$/.test(clip(source.duration, 8)) ? clip(source.duration, 8) : "",
    mode: visibleMode(source.mode, 80),
    map: visibleMode(source.map, 80),
    hero: clip(source.hero, 80),
    skin: clip(source.skin, 80),
    result: clip(source.result, 40),
    kda: clip(source.kda, 40),
    kills: whole(source.kills),
    deaths: whole(source.deaths),
    assists: whole(source.assists),
    gold: whole(source.gold, 9),
    damage: whole(source.damage, 9),
    taken: whole(source.taken, 9),
    ...separateInGameStats(source),
    jungleGold: whole(source.jungleGold, 9),
    damageRatio: decimal(source.damageRatio, 4, 2),
    takenPer: whole(source.takenPer, 9),
    lane: clip(source.lane, 24),
    reputation: signed(source.reputation),
    rankDelta: signed(source.rankDelta),
    powerDelta: signed(source.powerDelta),
    externalMatchId: cleanExternalId(source.externalMatchId),
    source: source.source === "aovweb" || source.source === "garena" ? source.source : "",
    blueScore: whole(source.blueScore, 4),
    redScore: whole(source.redScore, 4),
    winner,
    ownerSide,
    mvp: flag(source.mvp),
    badges: cleanBadges(source.badges),
    note: bilingual(source.note, 400),
    publish: source.publish === true,
    highlight: cleanHighlight(source.highlight),
    board,
  };
}

function matchFilled(match) {
  return Boolean(
    match.label ||
      match.date ||
      match.playedAt ||
      match.duration ||
      match.mode ||
      match.hero ||
      match.result ||
      match.kda ||
      match.kills ||
      match.deaths ||
      match.assists ||
      match.gold ||
      match.damage ||
      match.minions ||
      match.lastHits ||
      match.rankingFarm ||
      match.jungleGold ||
      match.healing ||
      match.tower ||
      match.externalMatchId ||
      match.taken ||
      match.skin ||
      match.map ||
      match.mvp ||
      Object.values(match.badges).some(Boolean) ||
      match.note.zh ||
      match.note.en ||
      match.highlight.key ||
      match.highlight.caption.zh ||
      match.highlight.caption.en ||
      match.board.length,
  );
}

function cleanSeason(item) {
  const source = item && typeof item === "object" ? item : {};
  const radar = source.radar && typeof source.radar === "object" ? source.radar : {};
  const medals = source.medals && typeof source.medals === "object" ? source.medals : {};
  return {
    id: matchId(source.id || source.label),
    label: visibleLabel(source.label, 40),
    mode: visibleMode(source.mode, 40),
    radar: {
      output: radarValue(radar.output),
      kda: radarValue(radar.kda),
      farm: radarValue(radar.farm),
      teamfight: radarValue(radar.teamfight),
      survival: radarValue(radar.survival),
    },
    played: whole(source.played),
    wins: whole(source.wins),
    winRate: decimal(source.winRate, 3),
    mvp: whole(source.mvp),
    medals: {
      godlike: whole(medals.godlike),
      penta: whole(medals.penta),
      quadra: whole(medals.quadra),
      triple: whole(medals.triple),
      supreme: whole(medals.supreme),
      gold: whole(medals.gold),
      silver: whole(medals.silver),
      loseMvp: whole(medals.loseMvp),
    },
  };
}

function seasonFilled(season) {
  const radar = Object.values(season.radar).some(Boolean);
  const medals = Object.values(season.medals).some(Boolean);
  return Boolean(season.label || season.mode || radar || medals || season.played || season.wins || season.winRate || season.mvp);
}

function cleanPrivilege(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    level: clip(source.level, 12),
    name: bilingual(source.name, 80),
    note: bilingual(source.note, 200),
    unlocked: source.unlocked === true,
  };
}

function cleanReputation(value) {
  const source = value && typeof value === "object" ? value : {};
  const privileges = [];
  if (Array.isArray(source.privileges)) {
    for (const item of source.privileges.slice(0, 8)) {
      const row = cleanPrivilege(item);
      if (row.level || row.name.zh || row.name.en || row.note.zh || row.note.en) privileges.push(row);
    }
  }
  return {
    score: whole(source.score, 4),
    level: whole(source.level, 2),
    exp: whole(source.exp, 6),
    expMax: whole(source.expMax, 6),
    note: bilingual(source.note, 400),
    privileges,
  };
}

function cleanHeroCard(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: matchId(source.id || source.hero),
    hero: clip(source.hero, 40),
    heroId: heroId(source.heroId),
    matches: whole(source.matches),
    winRate: decimal(source.winRate, 3),
    kills: whole(source.kills, 9),
    deaths: whole(source.deaths, 9),
    assists: whole(source.assists, 9),
    mvp: whole(source.mvp),
    power: whole(source.power, 6),
    note: bilingual(source.note, 160),
  };
}

function cleanSkin(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: matchId(source.id || source.name || source.hero),
    hero: clip(source.hero, 40),
    heroId: heroId(source.heroId),
    name: clip(source.name, 80),
  };
}

function cleanBuild(item) {
  const source = item && typeof item === "object" ? item : {};
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    id: matchId(source.id || source.hero || source.name?.zh),
    hero: clip(source.hero, 40),
    heroId: heroId(source.heroId),
    name: bilingual(source.name, 80),
    lane: clip(source.lane, 24),
    skillOrder: cleanSkillOrder(source.skillOrder),
    items: Array.from({ length: 6 }, (_, index) => clip(items[index], 40)),
    boots: clip(source.boots, 40),
    enchant: clip(source.enchant, 40),
    arcana: cleanArcana(source.arcana),
    note: bilingual(source.note, 400),
    shot: cleanHighlight(source.shot),
  };
}

function buildFilled(build) {
  return Boolean(
    build.hero ||
      build.heroId ||
      build.name.zh ||
      build.name.en ||
      build.lane ||
      build.skillOrder.some(Boolean) ||
      build.items.some(Boolean) ||
      build.boots ||
      build.enchant ||
      build.arcana.length ||
      build.note.zh ||
      build.note.en ||
      build.shot.key,
  );
}

function cleanHonor(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: matchId(source.id || source.title),
    title: clip(source.title, 80),
    season: clip(source.season, 40),
    note: bilingual(source.note, 200),
  };
}

function cleanTitle(item) {
  const source = item && typeof item === "object" ? item : {};
  return {
    id: matchId(source.id || source.name),
    name: clip(source.name, 80),
    note: bilingual(source.note, 200),
  };
}

function flexDate(value) {
  const text = clip(value, 10).replaceAll("/", "-");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanRankCard(value) {
  const source = value && typeof value === "object" ? value : {};
  const tier = tierById(clip(source.tier, 40));
  const divisionRaw = clip(source.division, 8).toUpperCase();
  const division = tier?.kind === "division" && tier.divisions.includes(divisionRaw) ? divisionRaw : "";
  let stars = whole(source.stars, 4);
  if (!tier) stars = "";
  else if (tier.kind === "division") {
    const count = Number(stars);
    if (!division || !stars || count < 1 || count > tier.stars) stars = "";
  } else {
    const count = Number(stars);
    const above = tier.maxStars == null || count <= tier.maxStars;
    if (!stars || count < tier.minStars || !above) stars = "";
  }
  let points = whole(source.points, 3);
  if (points !== "" && Number(points) >= 100) points = "";
  return {
    season: clip(source.season, 24),
    tier: tier ? tier.id : "",
    division: tier?.kind === "division" ? division : "",
    stars,
    points,
    queueReadout: whole(source.queueReadout, 4),
    queueReadoutMax: whole(source.queueReadoutMax, 4),
    seasonChallenge: clip(source.seasonChallenge, 16),
    updatedAt: dateOnly(source.updatedAt),
  };
}

function cleanPowerBoard(value) {
  const source = value && typeof value === "object" ? value : {};
  const rows = [];
  const list = Array.isArray(source.rows) ? source.rows : [];
  for (const item of list.slice(0, 8)) {
    const row = item && typeof item === "object" ? item : {};
    const scope = clip(row.scope, 24);
    const place = whole(row.place, 6);
    const gap = whole(row.gap, 6);
    if (!scope && !place && !gap) continue;
    rows.push({ scope, place, gap });
  }
  return {
    updatedAt: dateOnly(source.updatedAt),
    area: clip(source.area, 80),
    hero: clip(source.hero, 40),
    power: whole(source.power, 6),
    bestPower: whole(source.bestPower, 6),
    rows,
  };
}

function cleanGameSnapshot(value) {
  if (value === undefined) return defaultGameSnapshot();
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const rows = [];
  for (const item of (Array.isArray(source.rows) ? source.rows : []).slice(0, 4)) {
    const raw = item && typeof item === "object" ? item : {};
    const row = { label: clip(raw.label, 24) };
    for (const key of GAME_SNAPSHOT_KEYS) row[key] = key === "winRate" ? decimal(raw[key], 3, 1) : whole(raw[key], 6);
    if (row.winRate !== "" && Number(row.winRate) > 100) row.winRate = "";
    if (!row.label && GAME_SNAPSHOT_KEYS.every((key) => row[key] === "")) continue;
    rows.push(row);
  }
  return {
    updatedAt: flexDate(source.updatedAt),
    mode: clip(source.mode, 24),
    seasonLabel: clip(source.seasonLabel, 24),
    seasonStart: flexDate(source.seasonStart),
    rows,
  };
}

function cleanYearTreasure(value) {
  const source = value && typeof value === "object" ? value : {};
  const incoming = Array.isArray(source.seasons) ? source.seasons : [];
  return {
    year: /^\d{4}$/.test(clip(source.year, 4)) ? clip(source.year, 4) : "",
    reward: clip(source.reward, 40),
    updatedAt: dateOnly(source.updatedAt),
    seasons: ["S1", "S2", "S3", "S4"].map((id) => ({
      id,
      active: incoming.some((row) => row && row.id === id && row.active === true),
    })),
  };
}

function cleanWeeklyReport(value) {
  const source = value && typeof value === "object" ? value : {};
  const blank = emptyWeeklyReport();
  const report = { ...blank, id: "" };
  const textKeys = ["title", "hero", "mastery", "fromLabel", "toLabel", "bestLine", "winRateGrade", "kdaGrade", "specialty"];
  const wholeKeys = ["rankedGames", "rankedWins", "powerFrom", "powerTo", "heroGames", "starsEarned", "starsCasual", "starsRanked", "mvp", "goldMedals", "silverMedals", "specialtyGames"];
  const decimalKeys = ["heroWinRate", "winRate", "winRateBeat", "kda", "kdaBeat"];
  for (const key of textKeys) report[key] = clip(source[key], key === "bestLine" || key === "title" || key === "specialty" ? 80 : 40);
  for (const key of wholeKeys) report[key] = whole(source[key], 8);
  for (const key of decimalKeys) report[key] = decimal(source[key], 4, 1) || decimal(source[key], 4, 2);
  report.starDelta = signed(source.starDelta, 4);
  report.start = flexDate(source.start);
  report.end = flexDate(source.end);
  const filled = Object.entries(report).some(([key, item]) => key !== "id" && item);
  if (!filled) return null;
  report.id = matchId(source.id || report.title || report.start);
  return report;
}

/** @param {unknown} input */
export function cleanPlayer(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const stats = source.stats && typeof source.stats === "object" ? source.stats : {};
  const matches = [];
  if (Array.isArray(source.matches)) {
    for (const item of source.matches.slice(0, PLAYER_MATCH_LIMIT)) {
      const match = cleanMatch(item);
      if (matchFilled(match)) matches.push(match);
    }
  }
  const seasons = [];
  if (Array.isArray(source.seasons)) {
    for (const item of source.seasons.slice(0, 12)) {
      const season = cleanSeason(item);
      if (seasonFilled(season)) seasons.push(season);
    }
  }
  const heroPool = [];
  if (Array.isArray(source.heroPool)) {
    for (const item of source.heroPool.slice(0, 16)) {
      const card = cleanHeroCard(item);
      if (card.hero || card.matches || card.winRate || card.kills || card.deaths || card.assists || card.mvp || card.power || card.note.zh || card.note.en) heroPool.push(card);
    }
  }
  const championships = [];
  if (Array.isArray(source.championships)) {
    for (const item of source.championships.slice(0, 16)) {
      const row = cleanHonor(item);
      if (row.title || row.note.zh || row.note.en) championships.push(row);
    }
  }
  const builds = [];
  if (Array.isArray(source.builds)) {
    for (const item of source.builds.slice(0, 24)) {
      const build = cleanBuild(item);
      if (buildFilled(build)) builds.push(build);
    }
  }
  const skins = [];
  if (Array.isArray(source.skins)) {
    for (const item of source.skins.slice(0, 24)) {
      const skin = cleanSkin(item);
      if (skin.hero || skin.name) skins.push(skin);
    }
  }
  const honorTitles = [];
  if (Array.isArray(source.honorTitles)) {
    for (const item of source.honorTitles.slice(0, 16)) {
      const row = cleanTitle(item);
      if (row.name || row.note.zh || row.note.en) honorTitles.push(row);
    }
  }
  const uid = whole(source.uid, 20);
  return {
    publish: source.publish === true,
    handle: clip(source.handle, 40),
    uid,
    name: bilingual(source.name, 80),
    role: bilingual(source.role, 80),
    lane: bilingual(source.lane, 80),
    rank: bilingual(source.rank, 80),
    season: bilingual(source.season, 80),
    server: bilingual(source.server, 80),
    title: bilingual(source.title, 120),
    bio: bilingual(source.bio, 2000),
    signatureHeroes: bilingual(source.signatureHeroes, 200),
    peakRank: bilingual(source.peakRank, 80),
    joinDate: dateOnly(source.joinDate),
    avatar: cleanHighlight(source.avatar),
    stats: {
      played: clip(stats.played, 32),
      wins: clip(stats.wins, 32),
      winRate: clip(stats.winRate, 32),
      kda: clip(stats.kda, 32),
      mvp: clip(stats.mvp, 32),
      kills: whole(stats.kills, 9),
      deaths: whole(stats.deaths, 9),
      assists: whole(stats.assists, 9),
      gold: whole(stats.gold, 12),
      damage: whole(stats.damage, 12),
    },
    seasons,
    reputation: cleanReputation(source.reputation),
    heroPool,
    championships,
    honorTitles,
    builds,
    skins,
    matches,
    aov: cleanAov(source.aov),
    rankCard: cleanRankCard(source.rankCard),
    powerBoard: cleanPowerBoard(source.powerBoard),
    gameSnapshot: cleanGameSnapshot(source.gameSnapshot),
    yearTreasure: cleanYearTreasure(source.yearTreasure),
    weeklyReports: (Array.isArray(source.weeklyReports) ? source.weeklyReports : [])
      .slice(0, 8)
      .map(cleanWeeklyReport)
      .filter(Boolean),
  };
}

/** Newest dated matches sort first. Undated rows stay after dated ones. */
export function matchRecency(match) {
  const raw = String(match?.playedAt || match?.date || "")
    .trim()
    .replace(" ", "T");
  const time = Date.parse(raw);
  return Number.isFinite(time) ? time : 0;
}

/** (K+A)/max(D,1), only when all three numbers were entered. */
export function derivedKda(kills, deaths, assists) {
  if (kills === "" || deaths === "" || assists === "") return "";
  const k = Number(kills);
  const d = Number(deaths);
  const a = Number(assists);
  if (![k, d, a].every((n) => Number.isFinite(n))) return "";
  return ((k + a) / Math.max(d, 1)).toFixed(2);
}

function publicHighlight(highlight) {
  if (!highlight?.key) return null;
  const id = highlight.key.slice(3);
  return {
    caption: highlight.caption,
    kind: highlight.kind,
    mime: highlight.mime,
    url: `/api/media/${id}`,
  };
}

function publicBoardRow(row) {
  return {
    side: row.side,
    hero: row.hero,
    ign: row.ign,
    lane: row.lane,
    badge: row.badge,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    gold: row.gold,
    score: row.score,
    mvp: row.mvp,
    owner: row.owner,
    items: row.items,
    heroDamage: row.heroDamage,
    heroDamagePct: row.heroDamagePct,
    taken: row.taken,
    takenPct: row.takenPct,
    healing: row.healing,
    teamfightCount: row.teamfightCount,
    teamfightRate: row.teamfightRate,
    damageRatio: row.damageRatio,
    takenPer: row.takenPer,
    gpm: row.gpm,
    level: row.level,
    minions: row.lastHits,
    lastHits: row.lastHits,
    jungleGold: row.jungleGold,
    control: row.control,
    tower: row.tower,
    rankDelta: row.rankDelta,
    reputation: row.reputation,
    powerDelta: row.powerDelta,
    skin: row.skin,
  };
}

function publicMatch(match) {
  const kda = match.kda || derivedKda(match.kills, match.deaths, match.assists);
  return {
    id: match.id,
    label: match.label,
    date: match.date,
    playedAt: match.playedAt,
    duration: match.duration,
    mode: match.mode,
    hero: match.hero,
    result: match.result,
    kda,
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    gold: match.gold,
    damage: match.damage,
    taken: match.taken,
    minions: match.lastHits,
    lastHits: match.lastHits,
    jungleGold: match.jungleGold,
    damageRatio: match.damageRatio,
    takenPer: match.takenPer,
    control: match.control,
    healing: match.healing,
    tower: match.tower,
    lane: match.lane,
    reputation: match.reputation,
    rankDelta: match.rankDelta,
    powerDelta: match.powerDelta,
    blueScore: match.blueScore,
    redScore: match.redScore,
    winner: match.winner,
    ownerSide: match.ownerSide,
    map: match.map,
    skin: match.skin,
    mvp: match.mvp,
    badges: match.badges,
    note: match.note,
    highlight: publicHighlight(match.highlight),
    board: (match.board || []).map(publicBoardRow),
  };
}

function publicBuild(build) {
  return {
    id: build.id,
    hero: build.hero,
    heroId: build.heroId,
    name: build.name,
    lane: build.lane,
    skillOrder: build.skillOrder,
    items: build.items,
    boots: build.boots,
    enchant: build.enchant,
    arcana: build.arcana,
    note: build.note,
    shot: publicHighlight(build.shot),
  };
}

function publicHero(card) {
  return {
    id: card.id,
    hero: card.hero,
    heroId: card.heroId,
    matches: card.matches,
    winRate: card.winRate,
    kills: card.kills,
    deaths: card.deaths,
    assists: card.assists,
    mvp: card.mvp,
    power: card.power,
    note: card.note,
    kda: derivedKda(card.kills, card.deaths, card.assists),
  };
}

/** Names checked against the reserved team token. */
export function playerNameKeys(player) {
  return [player?.handle, player?.name?.zh, player?.name?.en];
}

/** Public view. Unpublished profiles and matches are omitted. */
export function toPublicPlayer(player) {
  if (!player?.publish) return null;
  const stats = { ...player.stats };
  if (!stats.kda) stats.kda = derivedKda(stats.kills, stats.deaths, stats.assists);
  return {
    handle: player.handle,
    uid: player.uid,
    name: player.name,
    role: player.role,
    lane: player.lane,
    rank: player.rank,
    season: player.season,
    server: player.server,
    title: player.title,
    bio: player.bio,
    signatureHeroes: player.signatureHeroes,
    peakRank: player.peakRank,
    joinDate: player.joinDate,
    avatar: publicHighlight(player.avatar),
    stats,
    seasons: player.seasons,
    reputation: player.reputation,
    heroPool: player.heroPool.map(publicHero),
    championships: player.championships,
    honorTitles: player.honorTitles,
    skins: player.skins,
    builds: player.builds.map(publicBuild),
    matches: player.matches.filter((match) => match.publish).map(publicMatch),
    rankCard: player.rankCard,
    powerBoard: player.powerBoard,
    gameSnapshot: player.gameSnapshot,
    yearTreasure: player.yearTreasure,
    weeklyReports: player.weeklyReports,
  };
}

export function collectHighlightKeys(player) {
  const keys = new Set();
  if (!player?.publish) return keys;
  if (player.avatar?.key) keys.add(player.avatar.key);
  for (const build of player.builds || []) {
    if (build?.shot?.key) keys.add(build.shot.key);
  }
  for (const match of player.matches || []) {
    if (match?.publish && match.highlight?.key) keys.add(match.highlight.key);
  }
  return keys;
}
