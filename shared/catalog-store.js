import snapshot from "../data/aov-catalog.json" with { type: "json" };
import { buildOfficialCatalog } from "./aov-parse.js";
import { logFailure } from "./log.js";

const KV_KEY = "aov-catalog";
const ROW_ID = "current";

export function bundledCatalog() {
  return structuredClone(snapshot);
}

function usable(payload) {
  return Boolean(payload && Array.isArray(payload.heroes) && payload.heroes.length >= 40 && Array.isArray(payload.modes));
}

function withActivities(payload) {
  return {
    ...payload,
    activities: Array.isArray(payload.activities) ? payload.activities : [],
  };
}

/** Public catalog. Live D1/KV wins; the committed snapshot is the fallback. */
export async function loadCatalog(env) {
  try {
    if (env?.CMS_KV && typeof env.CMS_KV.get === "function") {
      const cached = await env.CMS_KV.get(KV_KEY, "json");
      if (usable(cached)) return { ...withActivities(cached), source: "stored" };
    }
  } catch (error) {
    logFailure("catalog_kv_failed", error);
  }
  try {
    if (env?.CMS_DB) {
      const row = await env.CMS_DB
        .prepare("SELECT payload_json FROM aov_catalog WHERE id = ?")
        .bind(ROW_ID)
        .first();
      if (row?.payload_json) {
        const parsed = JSON.parse(row.payload_json);
        if (usable(parsed)) return { ...withActivities(parsed), source: "stored" };
      }
    }
  } catch (error) {
    logFailure("catalog_d1_failed", error);
  }
  return { ...withActivities(bundledCatalog()), source: "snapshot" };
}

export async function storeCatalog(env, payload) {
  const text = JSON.stringify(payload);
  let stored = false;
  if (env?.CMS_KV && typeof env.CMS_KV.put === "function") {
    await env.CMS_KV.put(KV_KEY, text);
    stored = true;
  }
  if (env?.CMS_DB) {
    await env.CMS_DB
      .prepare(
        `INSERT INTO aov_catalog (id, payload_json, source, fetched_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           payload_json = excluded.payload_json,
           source = excluded.source,
           fetched_at = excluded.fetched_at`,
      )
      .bind(ROW_ID, text, "live", payload.fetchedAt || "")
      .run();
    stored = true;
  }
  return stored;
}

/**
 * Refetch the official public pages into D1/KV.
 * Does nothing persistent when neither store is bound.
 */
export async function refreshCatalog(env) {
  const fetchImpl = typeof env?.CATALOG_FETCH === "function" ? env.CATALOG_FETCH : fetch;
  try {
    const payload = await buildOfficialCatalog(fetchImpl);
    payload.source = "live";
    const stored = await storeCatalog(env, payload);
    return {
      ok: true,
      stored,
      heroes: payload.heroes.length,
      modes: payload.modes.length,
      fetchedAt: payload.fetchedAt,
    };
  } catch (error) {
    logFailure("catalog_refresh_failed", error);
    return { ok: false, code: "catalog_refresh_failed" };
  }
}
