import { logFailure } from "./log.js";

const SITE_ID = "site";
const PLAYER_ID = "owner";

function playerJson(json) {
  try {
    const doc = JSON.parse(json);
    return JSON.stringify(doc?.player ?? {});
  } catch {
    return "{}";
  }
}

async function mirrorPlayer(db, json, now, mode) {
  const payload = playerJson(json);
  try {
    if (mode === "publish") {
      await db
        .prepare(
          `INSERT INTO player_records (id, draft_json, published_json, updated_at, published_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             draft_json = excluded.draft_json,
             published_json = excluded.published_json,
             updated_at = excluded.updated_at,
             published_at = excluded.published_at`,
        )
        .bind(PLAYER_ID, payload, payload, now, now)
        .run();
      return;
    }
    if (mode === "discard") {
      await db
        .prepare(
          `UPDATE player_records
           SET draft_json = COALESCE(published_json, draft_json), updated_at = ?
           WHERE id = ?`,
        )
        .bind(now, PLAYER_ID)
        .run();
      return;
    }
    await db
      .prepare(
        `INSERT INTO player_records (id, draft_json, published_json, updated_at, published_at)
         VALUES (?, ?, NULL, ?, NULL)
         ON CONFLICT(id) DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at`,
      )
      .bind(PLAYER_ID, payload, now)
      .run();
  } catch (error) {
    logFailure("player_mirror_failed", error);
  }
}

export function createMemoryStore() {
  /** @type {{ draft_json: string, published_json: string | null, updated_at: string, published_at: string | null } | null} */
  let row = null;
  return {
    async get() {
      return row ? { ...row } : null;
    },
    async seed(json, now) {
      if (!row) {
        row = { draft_json: json, published_json: json, updated_at: now, published_at: now };
      }
      return { ...row };
    },
    async saveDraft(json, now) {
      if (!row) row = { draft_json: json, published_json: null, updated_at: now, published_at: null };
      else row = { ...row, draft_json: json, updated_at: now };
      return { ...row };
    },
    async publish(json, now) {
      row = { draft_json: json, published_json: json, updated_at: now, published_at: now };
      return { ...row };
    },
    async discard(now) {
      if (!row) return null;
      row = { ...row, draft_json: row.published_json ?? row.draft_json, updated_at: now };
      return { ...row };
    },
  };
}

/** @param {D1Database} db */
export function createD1Store(db) {
  const select = () =>
    db
      .prepare(
        "SELECT draft_json, published_json, updated_at, published_at FROM site_documents WHERE id = ?",
      )
      .bind(SITE_ID)
      .first();

  return {
    get: select,
    async seed(json, now) {
      await db
        .prepare(
          "INSERT OR IGNORE INTO site_documents (id, draft_json, published_json, updated_at, published_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(SITE_ID, json, json, now, now)
        .run();
      await mirrorPlayer(db, json, now, "publish");
      return select();
    },
    async saveDraft(json, now) {
      await db
        .prepare(
          `INSERT INTO site_documents (id, draft_json, published_json, updated_at, published_at)
           VALUES (?, ?, NULL, ?, NULL)
           ON CONFLICT(id) DO UPDATE SET draft_json = excluded.draft_json, updated_at = excluded.updated_at`,
        )
        .bind(SITE_ID, json, now)
        .run();
      await mirrorPlayer(db, json, now, "draft");
      return select();
    },
    async publish(json, now) {
      await db
        .prepare(
          `INSERT INTO site_documents (id, draft_json, published_json, updated_at, published_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             draft_json = excluded.draft_json,
             published_json = excluded.published_json,
             updated_at = excluded.updated_at,
             published_at = excluded.published_at`,
        )
        .bind(SITE_ID, json, json, now, now)
        .run();
      await mirrorPlayer(db, json, now, "publish");
      return select();
    },
    async discard(now) {
      await db
        .prepare(
          `UPDATE site_documents
           SET draft_json = COALESCE(published_json, draft_json), updated_at = ?
           WHERE id = ?`,
        )
        .bind(now, SITE_ID)
        .run();
      await mirrorPlayer(db, "", now, "discard");
      return select();
    },
  };
}

export function storeFromEnv(env) {
  if (env?.CMS_STORE) return env.CMS_STORE;
  if (env?.CMS_DB) return createD1Store(env.CMS_DB);
  return null;
}
