const PURGE_KEY = "player-records-purged-v3";

const OWNER_TOKENS = ["htw0702aov", "htw0702"];

function isOwnerToken(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return false;
  return OWNER_TOKENS.some((token) => text === token || text.includes(token));
}

function isOwnerMember(member) {
  if (!member || typeof member !== "object") return false;
  return [member.id, member.slug, member.handle, member.name?.zh, member.name?.en].some(isOwnerToken);
}

function emptyPlayerShell() {
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
    avatar: { caption: { zh: "", en: "" }, key: "", mime: "", kind: "" },
    stats: { played: "", wins: "", winRate: "", kda: "", mvp: "", kills: "", deaths: "", assists: "", gold: "", damage: "" },
    seasons: [],
    reputation: { score: "", level: "", exp: "", expMax: "", note: { zh: "", en: "" }, privileges: [] },
    heroPool: [],
    championships: [],
    honorTitles: [],
    builds: [],
    skins: [],
    matches: [],
    aov: { syncedAt: "", count: "", keyword: "", server: "" },
    rankCard: { season: "", tier: "", division: "", stars: "", points: "", queueReadout: "", queueReadoutMax: "", seasonChallenge: "", updatedAt: "" },
    powerBoard: { updatedAt: "", area: "", hero: "", power: "", bestPower: "", rows: [] },
    gameSnapshot: { updatedAt: "", mode: "", seasonLabel: "", seasonStart: "", rows: [] },
    yearTreasure: { year: "", reward: "", updatedAt: "", seasons: [] },
    weeklyReports: [],
  };
}

function rewriteSiteJson(value) {
  if (typeof value !== "string" || !value) return value;
  try {
    const doc = JSON.parse(value);
    if (doc && typeof doc === "object") {
      doc.player = emptyPlayerShell();
      if (Array.isArray(doc.rosterMembers)) {
        doc.rosterMembers = doc.rosterMembers.filter((member) => !isOwnerMember(member));
      }
    }
    return JSON.stringify(doc);
  } catch {
    return value;
  }
}

function rewritePlayerJson() {
  return JSON.stringify(emptyPlayerShell());
}

async function deleteTableRows(db, table) {
  try {
    await db.prepare(`DELETE FROM ${table}`).run();
  } catch {
    // Older deployments may not have the archive tables. Nothing to purge there.
  }
}

export async function purgePlayerRecords(env) {
  const db = env?.CMS_DB;
  if (!db) return { ok: false, code: "storage_unconfigured" };

  try {
    if (env?.CMS_KV && (await env.CMS_KV.get(PURGE_KEY)) === "1") return { ok: true, already: true };
  } catch {
    // KV is only an optimization; D1 cleanup below is idempotent.
  }

  try {
    const site = await db
      .prepare("SELECT draft_json, published_json FROM site_documents WHERE id = ?")
      .bind("site")
      .first();
    if (site) {
      await db
        .prepare("UPDATE site_documents SET draft_json = ?, published_json = ? WHERE id = ?")
        .bind(rewriteSiteJson(site.draft_json), site.published_json == null ? null : rewriteSiteJson(site.published_json), "site")
        .run();
    }
  } catch {
    // Site table can be absent on a brand-new deployment.
  }

  try {
    await db.prepare("DELETE FROM player_records WHERE id = ?").bind("owner").run();
  } catch {
    // Player mirror can be absent before its migration.
  }

  await deleteTableRows(db, "aov_capture_frames");
  await deleteTableRows(db, "aov_match_versions");
  await deleteTableRows(db, "aov_canonical_matches");
  await deleteTableRows(db, "aov_imports");

  try {
    await env?.CMS_KV?.put(PURGE_KEY, "1");
  } catch {
    // The cleanup itself already completed.
  }
  return { ok: true };
}
