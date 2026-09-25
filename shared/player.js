/** Personal Arena of Valor record. Numbers stay blank until the owner enters them. */

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

function decimal(value, maxDigits = 8) {
  const text = clip(typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? ""), 16).replace(/,/g, "");
  if (!text) return "";
  return new RegExp(`^\\d{1,${maxDigits}}(\\.\\d{1,2})?$`).test(text) ? text : "";
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
    teamfightCount: "",
    teamfightRate: "",
    damageRatio: "",
    takenPer: "",
    gpm: "",
  };
}

export function emptyMatch() {
  return {
    id: "",
    label: "",
    date: "",
    playedAt: "",
    duration: "",
    mode: "",
    hero: "",
    result: "",
    kda: "",
    kills: "",
    deaths: "",
    assists: "",
    gold: "",
    damage: "",
    taken: "",
    blueScore: "",
    redScore: "",
    winner: "",
    ownerSide: "",
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
  return { id: "", hero: "", matches: "", winRate: "", note: { zh: "", en: "" } };
}

export function emptyHonor() {
  return { id: "", title: "", season: "", note: { zh: "", en: "" } };
}

export function emptyTitle() {
  return { id: "", name: "", note: { zh: "", en: "" } };
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
    matches: [],
  };
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
      row.score ||
      row.items.some(Boolean),
  );
}

function cleanMatch(item) {
  const source = item && typeof item === "object" ? item : {};
  const playedRaw = clip(source.playedAt, 40);
  const playedMatch = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}))?/.exec(playedRaw);
  const playedAt = playedMatch ? (playedMatch[2] ? `${playedMatch[1]} ${playedMatch[2]}` : playedMatch[1]) : "";
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
    label: clip(source.label, 80),
    date: /^\d{4}-\d{2}-\d{2}$/.test(clip(source.date, 10)) ? clip(source.date, 10) : "",
    playedAt,
    duration: /^\d{1,3}:\d{2}$/.test(clip(source.duration, 8)) ? clip(source.duration, 8) : "",
    mode: clip(source.mode, 80),
    hero: clip(source.hero, 80),
    result: clip(source.result, 40),
    kda: clip(source.kda, 40),
    kills: whole(source.kills),
    deaths: whole(source.deaths),
    assists: whole(source.assists),
    gold: whole(source.gold, 9),
    damage: whole(source.damage, 9),
    taken: whole(source.taken, 9),
    blueScore: whole(source.blueScore, 4),
    redScore: whole(source.redScore, 4),
    winner,
    ownerSide,
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
    label: clip(source.label, 40),
    mode: clip(source.mode, 40),
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
    matches: whole(source.matches),
    winRate: decimal(source.winRate, 3),
    note: bilingual(source.note, 160),
  };
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

/** @param {unknown} input */
export function cleanPlayer(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const stats = source.stats && typeof source.stats === "object" ? source.stats : {};
  const matches = [];
  if (Array.isArray(source.matches)) {
    for (const item of source.matches.slice(0, 40)) {
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
      if (card.hero || card.note.zh || card.note.en) heroPool.push(card);
    }
  }
  const championships = [];
  if (Array.isArray(source.championships)) {
    for (const item of source.championships.slice(0, 16)) {
      const row = cleanHonor(item);
      if (row.title || row.note.zh || row.note.en) championships.push(row);
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
    matches,
  };
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
    blueScore: match.blueScore,
    redScore: match.redScore,
    winner: match.winner,
    ownerSide: match.ownerSide,
    note: match.note,
    highlight: publicHighlight(match.highlight),
    board: match.board,
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
    stats,
    seasons: player.seasons,
    reputation: player.reputation,
    heroPool: player.heroPool,
    championships: player.championships,
    honorTitles: player.honorTitles,
    matches: player.matches.filter((match) => match.publish).map(publicMatch),
  };
}

export function collectHighlightKeys(player) {
  const keys = new Set();
  if (!player?.publish || !Array.isArray(player.matches)) return keys;
  for (const match of player.matches) {
    if (match?.publish && match.highlight?.key) keys.add(match.highlight.key);
  }
  return keys;
}
