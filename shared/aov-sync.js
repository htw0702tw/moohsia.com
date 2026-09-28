import { logEvent } from "./log.js";

export const OWNER_HISTORY = {
  searchType: "playerName",
  keyword: "htw0702aov",
  server: "1012",
};

/** Owner fight history now lives on htw0702.com. MOS keeps guild pages only. */
export async function syncOwnerFightHistory() {
  logEvent("aov_sync_skipped");
  return {
    ok: true,
    code: "moved_to_htw0702",
    stored: false,
    matches: 0,
    source: "htw0702.com",
    garenaCode: "moved_to_htw0702",
  };
}
