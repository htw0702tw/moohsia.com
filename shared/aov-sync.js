import { getDefaultDocument } from "../src/content.js";
import { applyAovImport, fetchFightHistory } from "./aov-import.js";
import { storeFromEnv } from "./cms-store.js";
import { applyGarenaHistory, characterMatchesOwner, fetchGarenaHistory, garenaSecretStatus } from "./garena-sync.js";
import { logEvent, logFailure } from "./log.js";
import { sanitizeDocument } from "./site-document.js";

/** Public owner record. Server 純潔之翼 is 1012. */
export const OWNER_HISTORY = {
  searchType: "playerName",
  keyword: "htw0702aov",
  server: "1012",
};

/**
 * Write the owner player on the draft and the published document.
 * Other CMS fields stay as they were. A failed mutate writes nothing.
 */
async function saveOwnerPlayer(env, mutate, logCode) {
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
    const draftNext = mutate(draft.player, now);
    const publishedNext = mutate(published.player, now);
    if (!draftNext || !publishedNext) return { ok: false, code: "garena_character_mismatch", stored: false };
    draft.player = draftNext;
    published.player = publishedNext;
    const draftDoc = sanitizeDocument(draft);
    const publishedDoc = sanitizeDocument(published);
    await store.savePair(JSON.stringify(draftDoc), JSON.stringify(publishedDoc), now);
    logEvent(logCode);
    return { ok: true, code: "synced", stored: true, matches: draftDoc.player.matches.length };
  } catch (error) {
    logFailure("aov_sync_failed", error);
    return { ok: false, code: "aov_sync_failed", stored: false };
  }
}

async function syncFromAovRanking(env, garenaCode) {
  const fetched = await fetchFightHistory(env, OWNER_HISTORY);
  if (!fetched.ok) {
    const code = fetched.code || "aov_blocked";
    logEvent(code === "aov_challenge" || code === "aov_shell" ? "aov_sync_skipped" : "aov_sync_failed");
    return { ok: false, code, stored: false, garenaCode, source: "aovweb" };
  }
  const saved = await saveOwnerPlayer(
    env,
    (player, now) =>
      applyAovImport(player, fetched, {
        publish: true,
        keyword: OWNER_HISTORY.keyword,
        server: OWNER_HISTORY.server,
        searchType: OWNER_HISTORY.searchType,
        syncedAt: now,
      }),
    "aov_synced",
  );
  return { ...saved, garenaCode, source: "aovweb", matches: saved.matches };
}

/**
 * Pull the owner's match history into the CMS draft and the published player.
 * Garena official JSON is preferred when GARENA_ACCESS_TOKEN or GARENA_CODE is set.
 * A login failure, a missing secret, or an AOVRanking Turnstile page leaves stored
 * matches in place. Manual notes, highlights, and scoreboard fields the official
 * payload does not send are kept.
 */
async function ownerHandle(env) {
  const store = storeFromEnv(env);
  if (!store || typeof store.get !== "function") return "";
  try {
    const row = await store.get();
    if (!row?.draft_json) return "";
    const handle = JSON.parse(row.draft_json)?.player?.handle;
    return typeof handle === "string" ? handle : "";
  } catch (error) {
    logFailure("aov_sync_failed", error);
    return "";
  }
}

export async function syncOwnerFightHistory(env) {
  const secretStatus = garenaSecretStatus(env);
  if (secretStatus) {
    logEvent(secretStatus === "garena_unconfigured" ? "garena_sync_unconfigured" : "garena_sync_failed");
    return syncFromAovRanking(env, secretStatus);
  }
  const fetched = await fetchGarenaHistory(env, {
    keyword: OWNER_HISTORY.keyword,
    handle: await ownerHandle(env),
  });
  if (!fetched.ok) {
    const code = fetched.code || "garena_blocked";
    logEvent(code === "garena_login_required" ? "garena_login_required" : "garena_sync_failed");
    return syncFromAovRanking(env, code);
  }
  const saved = await saveOwnerPlayer(
    env,
    (player, now) => {
      if (!characterMatchesOwner(fetched.character?.name, player, OWNER_HISTORY.keyword)) return null;
      const applied = applyGarenaHistory(player, fetched, {
        publish: true,
        keyword: OWNER_HISTORY.keyword,
        server: fetched.server || OWNER_HISTORY.server,
        syncedAt: now,
      });
      return applied.applied ? applied.player : null;
    },
    "garena_synced",
  );
  if (!saved.ok && saved.code === "garena_character_mismatch") {
    logEvent("garena_sync_failed");
    return syncFromAovRanking(env, "garena_character_mismatch");
  }
  return { ...saved, garenaCode: "garena_synced", source: "garena" };
}
