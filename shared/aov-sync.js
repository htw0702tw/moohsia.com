import { getDefaultDocument } from "../src/content.js";
import { applyAovImport, fetchFightHistory } from "./aov-import.js";
import { storeFromEnv } from "./cms-store.js";
import { logEvent, logFailure } from "./log.js";
import { sanitizeDocument } from "./site-document.js";

/** Public owner record. Server 純潔之翼 is 1012. */
export const OWNER_HISTORY = {
  searchType: "playerName",
  keyword: "htw0702aov",
  server: "1012",
};

/**
 * Pull FightHistory for the owner into the CMS draft and the published player.
 * A Turnstile challenge leaves both documents unchanged.
 * Manual match notes, highlights, and builds that already have items are kept.
 */
export async function syncOwnerFightHistory(env) {
  const fetched = await fetchFightHistory(env, OWNER_HISTORY);
  if (!fetched.ok) {
    const code = fetched.code || "aov_blocked";
    logEvent(code === "aov_challenge" || code === "aov_shell" ? "aov_sync_skipped" : "aov_sync_failed");
    return { ok: false, code, stored: false };
  }
  const store = storeFromEnv(env);
  if (!store || typeof store.savePair !== "function") {
    logEvent("aov_sync_unconfigured");
    return { ok: false, code: "storage_unconfigured", stored: false };
  }
  try {
    let row = await store.get();
    const now = new Date().toISOString();
    if (!row) {
      const seeded = JSON.stringify(sanitizeDocument(getDefaultDocument()));
      row = await store.seed(seeded, now);
    }
    const draft = JSON.parse(row.draft_json);
    const published = row.published_json ? JSON.parse(row.published_json) : sanitizeDocument(getDefaultDocument());
    const options = {
      publish: true,
      keyword: OWNER_HISTORY.keyword,
      server: OWNER_HISTORY.server,
      searchType: OWNER_HISTORY.searchType,
      syncedAt: now,
    };
    draft.player = applyAovImport(draft.player, fetched, options);
    published.player = applyAovImport(published.player, fetched, options);
    const draftDoc = sanitizeDocument(draft);
    const publishedDoc = sanitizeDocument(published);
    await store.savePair(JSON.stringify(draftDoc), JSON.stringify(publishedDoc), now);
    logEvent("aov_synced");
    return { ok: true, code: "synced", stored: true, matches: draftDoc.player.matches.length };
  } catch (error) {
    logFailure("aov_sync_failed", error);
    return { ok: false, code: "aov_sync_failed", stored: false };
  }
}
