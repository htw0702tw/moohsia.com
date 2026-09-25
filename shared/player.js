/** Personal Arena of Valor record stored with the CMS document. */

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

export function emptyPlayer() {
  return {
    publish: false,
    handle: "",
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
    },
    matches: [],
  };
}

/** @param {unknown} input */
export function cleanPlayer(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const stats = source.stats && typeof source.stats === "object" ? source.stats : {};
  const matches = [];
  if (Array.isArray(source.matches)) {
    for (const item of source.matches.slice(0, 60)) {
      if (!item || typeof item !== "object") continue;
      const match = {
        id: matchId(item.id),
        label: clip(item.label, 80),
        date: /^\d{4}-\d{2}-\d{2}$/.test(clip(item.date, 10)) ? clip(item.date, 10) : "",
        mode: clip(item.mode, 80),
        hero: clip(item.hero, 80),
        result: clip(item.result, 40),
        kda: clip(item.kda, 40),
        note: bilingual(item.note, 400),
        publish: item.publish === true,
      };
      const filled =
        match.label ||
        match.date ||
        match.mode ||
        match.hero ||
        match.result ||
        match.kda ||
        match.note.zh ||
        match.note.en;
      if (filled) matches.push(match);
    }
  }
  return {
    publish: source.publish === true,
    handle: clip(source.handle, 40),
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
    },
    matches,
  };
}

/** Names checked against the reserved team token. */
export function playerNameKeys(player) {
  return [player?.handle, player?.name?.zh, player?.name?.en];
}

/** Public view. Unpublished profiles and matches are omitted. */
export function toPublicPlayer(player) {
  if (!player?.publish) return null;
  return {
    handle: player.handle,
    name: player.name,
    role: player.role,
    lane: player.lane,
    rank: player.rank,
    season: player.season,
    server: player.server,
    title: player.title,
    bio: player.bio,
    signatureHeroes: player.signatureHeroes,
    stats: player.stats,
    matches: player.matches
      .filter((match) => match.publish)
      .map(({ id, label, date, mode, hero, result, kda, note }) => ({
        id,
        label,
        date,
        mode,
        hero,
        result,
        kda,
        note,
      })),
  };
}
