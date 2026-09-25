import snapshot from "../data/aov-catalog.json" with { type: "json" };
import { buildSearchIndex } from "./aov-assets.js";
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
    items: Array.isArray(payload.items) ? payload.items : [],
    arcana: Array.isArray(payload.arcana) ? payload.arcana : [],
    userSkills: Array.isArray(payload.userSkills) ? payload.userSkills : [],
  };
}

function preferList(next, prev) {
  return Array.isArray(next) && next.length ? next : Array.isArray(prev) ? prev : [];
}

function richerHero(fallback, primary) {
  const base = fallback && typeof fallback === "object" ? fallback : {};
  const next = primary && typeof primary === "object" ? primary : {};
  return {
    ...base,
    ...next,
    blurb: next.blurb || base.blurb || "",
    skills: Array.isArray(next.skills) && next.skills.length ? next.skills : base.skills || [],
    skins: Array.isArray(next.skins) && next.skins.length ? next.skins : base.skins || [],
    skillsUrl: next.skillsUrl || base.skillsUrl || next.pageUrl || base.pageUrl || "",
  };
}

/** Fill missing skins, skills, and items from the other copy, then rebuild search. */
export function mergeCatalog(primary, fallback) {
  const next = withActivities(primary || {});
  const prev = withActivities(fallback || {});
  const previousHeroes = new Map((prev.heroes || []).map((hero) => [String(hero.id), hero]));
  const seen = new Set();
  const heroes = [];
  for (const hero of next.heroes || []) {
    seen.add(String(hero.id));
    heroes.push(richerHero(previousHeroes.get(String(hero.id)), hero));
  }
  for (const hero of prev.heroes || []) {
    if (!seen.has(String(hero.id))) heroes.push(hero);
  }
  const items = next.items.length ? next.items : prev.items;
  const modes = Array.isArray(next.modes) && next.modes.length ? next.modes : prev.modes || [];
  const activities = next.activities.length ? next.activities : prev.activities;
  const merged = {
    ...prev,
    ...next,
    heroes,
    items,
    arcana: preferList(next.arcana, prev.arcana),
    userSkills: preferList(next.userSkills, prev.userSkills),
    modes,
    activities,
    attribution: next.attribution || prev.attribution || null,
    roles: Array.isArray(next.roles) && next.roles.length ? next.roles : prev.roles || [],
  };
  merged.search = buildSearchIndex(merged);
  return merged;
}

async function readStoredCatalog(env) {
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
  return null;
}

/** Public catalog. Stored D1/KV wins, then the committed snapshot fills any missing skins or items. */
export async function loadCatalog(env) {
  const bundled = ensureSearch({ ...withActivities(bundledCatalog()), source: "snapshot" });
  const stored = await readStoredCatalog(env);
  if (!stored) return bundled;
  return ensureSearch({ ...mergeCatalog(stored, bundled), source: "stored" });
}

function ensureSearch(catalog) {
  return { ...catalog, search: buildSearchIndex(catalog) };
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
    const previous = await loadCatalog(env);
    const offset = Number(previous?.detailCursor) || 0;
    const detailLimit = Number(env?.CATALOG_DETAIL_LIMIT) || 12;
    const payload = await buildOfficialCatalog(fetchImpl, new Date().toISOString(), {
      detailLimit,
      detailOffset: offset,
    });
    const merged = mergeCatalog(payload, previous);
    merged.source = "live";
    merged.detailCursor = merged.heroes.length ? (offset + detailLimit) % merged.heroes.length : 0;
    const stored = await storeCatalog(env, merged);
    const skins = merged.heroes.reduce((sum, hero) => sum + (hero.skins?.length || 0), 0);
    return {
      ok: true,
      stored,
      heroes: merged.heroes.length,
      items: merged.items.length,
      skins,
      modes: merged.modes.length,
      fetchedAt: merged.fetchedAt,
    };
  } catch (error) {
    logFailure("catalog_refresh_failed", error);
    return { ok: false, code: "catalog_refresh_failed" };
  }
}
