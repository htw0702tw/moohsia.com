import { getDefaultDocument } from "../src/content.js";
import { storeFromEnv } from "./cms-store.js";
import { namesForImport } from "./hidden-names.js";
import { logFailure } from "./log.js";
import { projectDefault, sanitizeDocument, toPublicDocument } from "./site-document.js";

function nowIso() {
  return new Date().toISOString();
}

function withoutPlayerRecords(payload) {
  if (!payload || typeof payload !== "object") return payload;
  if (!payload.player || typeof payload.player !== "object") return payload;
  return {
    ...payload,
    player: {
      ...payload.player,
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
      powerBoard: { updatedAt: "", area: "", hero: "", power: "", bestPower: "", rows: [] },
      gameSnapshot: { updatedAt: "", mode: "", seasonLabel: "", seasonStart: "", rows: [] },
      yearTreasure: { year: "", reward: "", updatedAt: "", seasons: [] },
      weeklyReports: [],
    },
  };
}

/**
 * Published content for the public site.
 * Falls back to built-in defaults when storage is empty or unavailable.
 * @param {{ CMS_DB?: D1Database, CMS_STORE?: ReturnType<import("./cms-store.js").createMemoryStore> }} env
 */
/** Names omitted from public pages. Missing storage uses the built-in list. */
export async function publishedHiddenNames(env) {
  const store = storeFromEnv(env);
  if (!store) return namesForImport(undefined);
  try {
    const row = await store.get();
    if (!row?.published_json) return namesForImport(undefined);
    const parsed = JSON.parse(row.published_json);
    return namesForImport(parsed?.hiddenNames);
  } catch (error) {
    logFailure("cms_read_failed", error);
    return namesForImport(undefined);
  }
}

export async function loadPublicPayload(env) {
  const store = storeFromEnv(env);
  if (!store) return withoutPlayerRecords(projectDefault());
  try {
    let row = await store.get();
    if (!row) {
      const seeded = JSON.stringify(sanitizeDocument(getDefaultDocument()));
      row = await store.seed(seeded, nowIso());
    }
    if (!row?.published_json) return withoutPlayerRecords(projectDefault());
    const doc = sanitizeDocument(JSON.parse(row.published_json));
    return withoutPlayerRecords({ ok: true, source: "published", ...toPublicDocument(doc) });
  } catch (error) {
    logFailure("cms_read_failed", error);
    return withoutPlayerRecords(projectDefault());
  }
}
