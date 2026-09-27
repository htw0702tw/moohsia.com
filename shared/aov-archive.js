import { logFailure } from "./log.js";

function text(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function filled(value) {
  return String(value ?? "").trim() !== "";
}

function archiveSource(value) {
  const source = text(value, 24).toLowerCase();
  if (source === "garena" || source === "aovweb" || source === "capture") return source;
  return "manual";
}

function fallbackKey(match) {
  const parts = [
    text(match?.playedAt, 40),
    text(match?.date, 10),
    text(match?.hero, 80),
    text(match?.kills, 8),
    text(match?.deaths, 8),
    text(match?.assists, 8),
    text(match?.duration, 8),
  ].filter(Boolean);
  if (parts.length) return `derived:${parts.join("|")}`.slice(0, 220);
  return `generated:${crypto.randomUUID()}`;
}

export function aovMatchKey(match) {
  const external = text(match?.externalMatchId, 80);
  if (external) return `external:${external}`;
  const id = text(match?.id, 80);
  if (id) return `id:${id}`;
  return fallbackKey(match);
}

const MATCH_DETAIL_KEYS = [
  "playedAt",
  "date",
  "duration",
  "mode",
  "map",
  "hero",
  "skin",
  "result",
  "kills",
  "deaths",
  "assists",
  "gold",
  "damage",
  "taken",
  "minions",
  "lastHits",
  "jungleGold",
  "damageRatio",
  "takenPer",
  "control",
  "healing",
  "tower",
  "lane",
  "reputation",
  "rankDelta",
  "powerDelta",
  "blueScore",
  "redScore",
  "winner",
  "ownerSide",
];

const BOARD_DETAIL_KEYS = [
  "hero",
  "ign",
  "lane",
  "badge",
  "kills",
  "deaths",
  "assists",
  "gold",
  "score",
  "heroDamage",
  "heroDamagePct",
  "taken",
  "takenPct",
  "healing",
  "teamfightCount",
  "teamfightRate",
  "damageRatio",
  "takenPer",
  "gpm",
  "level",
  "minions",
  "lastHits",
  "jungleGold",
  "control",
  "tower",
  "rankDelta",
  "reputation",
  "powerDelta",
  "skin",
];

export function aovMatchRichness(match) {
  let score = 0;
  for (const key of MATCH_DETAIL_KEYS) if (filled(match?.[key])) score += 2;
  if (match?.mvp === true) score += 1;
  if (match?.externalMatchId) score += 20;
  const board = Array.isArray(match?.board) ? match.board : [];
  score += board.length * 100;
  for (const row of board) {
    if (!row || typeof row !== "object") continue;
    for (const key of BOARD_DETAIL_KEYS) if (filled(row[key])) score += 3;
    if (Array.isArray(row.items)) score += row.items.filter(filled).length * 4;
    if (row.owner === true) score += 1;
    if (row.mvp === true) score += 1;
  }
  return score;
}

function dbFromEnv(env) {
  return env?.CMS_DB && typeof env.CMS_DB.prepare === "function" ? env.CMS_DB : null;
}

export async function archiveAovMatches(env, matches, options = {}) {
  const db = dbFromEnv(env);
  if (!db) return { ok: false, code: "aov_archive_unavailable", archived: 0, importId: "" };

  const list = Array.isArray(matches) ? matches.filter((item) => item && typeof item === "object") : [];

  const source = archiveSource(options.source);
  const now = text(options.capturedAt || new Date().toISOString(), 40);
  const importId = text(options.importId, 80) || crypto.randomUUID();
  const note = text(options.note, 500);

  try {
    await db
      .prepare(
        `INSERT INTO aov_imports (id, source, created_at, match_count, note)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           match_count = aov_imports.match_count + excluded.match_count,
           note = CASE WHEN aov_imports.note = '' THEN excluded.note ELSE aov_imports.note END`,
      )
      .bind(importId, source, now, list.length, note)
      .run();

    let archived = 0;
    if (!list.length) return { ok: true, archived, importId };
    for (const match of list) {
      const key = aovMatchKey(match);
      const richness = aovMatchRichness(match);
      const data = JSON.stringify({ ...match, source: match.source || source });
      const external = text(match.externalMatchId, 80);
      const playedAt = text(match.playedAt || match.date, 40);
      const hero = text(match.hero, 80);
      const result = text(match.result, 40);

      await db
        .prepare(
          `INSERT INTO aov_match_versions
             (import_id, match_key, source, captured_at, external_match_id, played_at, hero, result, richness, data_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(importId, key, source, now, external, playedAt, hero, result, richness, data)
        .run();

      await db
        .prepare(
          `INSERT INTO aov_canonical_matches
             (match_key, external_match_id, played_at, hero, result, source, richness, data_json, first_seen_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(match_key) DO UPDATE SET
             external_match_id = excluded.external_match_id,
             played_at = excluded.played_at,
             hero = excluded.hero,
             result = excluded.result,
             source = excluded.source,
             richness = excluded.richness,
             data_json = excluded.data_json,
             updated_at = excluded.updated_at
           WHERE excluded.richness >= aov_canonical_matches.richness`,
        )
        .bind(key, external, playedAt, hero, result, source, richness, data, now, now)
        .run();
      archived += 1;
    }
    return { ok: true, archived, importId };
  } catch (error) {
    logFailure("aov_archive_failed", error);
    return { ok: false, code: "aov_archive_unavailable", archived: 0, importId };
  }
}

export async function bootstrapAovArchive(env) {
  const db = dbFromEnv(env);
  if (!db) return { ok: false, code: "aov_archive_unavailable", archived: 0 };
  try {
    const seeded = await db.prepare("SELECT id FROM aov_imports WHERE id = ?").bind("cms-bootstrap-v1").first();
    if (seeded?.id) return { ok: true, archived: 0, seeded: true };
    const row = await db
      .prepare("SELECT draft_json, published_json FROM site_documents WHERE id = ?")
      .bind("site")
      .first();
    const raw = row?.published_json || row?.draft_json || "";
    let matches = [];
    try {
      const doc = raw ? JSON.parse(raw) : {};
      matches = Array.isArray(doc?.player?.matches) ? doc.player.matches : [];
    } catch {
      matches = [];
    }
    if (!matches.length) {
      await db
        .prepare("INSERT INTO aov_imports (id, source, created_at, match_count, note) VALUES (?, ?, ?, 0, ?) ON CONFLICT(id) DO NOTHING")
        .bind("cms-bootstrap-v1", "manual", new Date().toISOString(), "CMS bootstrap had no matches")
        .run();
      return { ok: true, archived: 0, seeded: true };
    }
    const result = await archiveAovMatches(env, matches, {
      source: "manual",
      importId: "cms-bootstrap-v1",
      note: "Seeded from the existing CMS player before video imports",
    });
    return { ...result, seeded: result.ok };
  } catch (error) {
    logFailure("aov_archive_bootstrap_failed", error);
    return { ok: false, code: "aov_archive_unavailable", archived: 0 };
  }
}

export async function aovArchiveSummary(env) {
  const db = dbFromEnv(env);
  if (!db) return { ok: false, code: "aov_archive_unavailable", matches: 0, versions: 0 };
  try {
    const canonical = await db.prepare("SELECT COUNT(*) AS n FROM aov_canonical_matches").first();
    const versions = await db.prepare("SELECT COUNT(*) AS n FROM aov_match_versions").first();
    return {
      ok: true,
      matches: Number(canonical?.n || 0),
      versions: Number(versions?.n || 0),
    };
  } catch (error) {
    logFailure("aov_archive_failed", error);
    return { ok: false, code: "aov_archive_unavailable", matches: 0, versions: 0 };
  }
}
