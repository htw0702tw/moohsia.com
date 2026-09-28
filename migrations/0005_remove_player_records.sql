-- Remove the owner's Arena of Valor performance/history records.
-- Keep the basic player profile and current rank card used by /roster/htw0702aov.
-- This migration is idempotent and intentionally clears both draft and published copies.

UPDATE site_documents
SET
  draft_json = json_set(
    draft_json,
    '$.player.stats', json('{"played":"","wins":"","winRate":"","kda":"","mvp":"","kills":"","deaths":"","assists":"","gold":"","damage":""}'),
    '$.player.seasons', json('[]'),
    '$.player.reputation', json('{"score":"","level":"","exp":"","expMax":"","note":{"zh":"","en":""},"privileges":[]}'),
    '$.player.heroPool', json('[]'),
    '$.player.championships', json('[]'),
    '$.player.honorTitles', json('[]'),
    '$.player.builds', json('[]'),
    '$.player.skins', json('[]'),
    '$.player.matches', json('[]'),
    '$.player.aov', json('{"syncedAt":"","count":"","keyword":"","server":""}'),
    '$.player.powerBoard', json('{"updatedAt":"","area":"","hero":"","power":"","bestPower":"","rows":[]}'),
    '$.player.gameSnapshot', json('{"updatedAt":"","mode":"","seasonLabel":"","seasonStart":"","rows":[]}'),
    '$.player.yearTreasure', json('{"year":"","reward":"","updatedAt":"","seasons":[]}'),
    '$.player.weeklyReports', json('[]')
  ),
  published_json = CASE
    WHEN published_json IS NULL OR json_valid(published_json) = 0 THEN published_json
    ELSE json_set(
      published_json,
      '$.player.stats', json('{"played":"","wins":"","winRate":"","kda":"","mvp":"","kills":"","deaths":"","assists":"","gold":"","damage":""}'),
      '$.player.seasons', json('[]'),
      '$.player.reputation', json('{"score":"","level":"","exp":"","expMax":"","note":{"zh":"","en":""},"privileges":[]}'),
      '$.player.heroPool', json('[]'),
      '$.player.championships', json('[]'),
      '$.player.honorTitles', json('[]'),
      '$.player.builds', json('[]'),
      '$.player.skins', json('[]'),
      '$.player.matches', json('[]'),
      '$.player.aov', json('{"syncedAt":"","count":"","keyword":"","server":""}'),
      '$.player.powerBoard', json('{"updatedAt":"","area":"","hero":"","power":"","bestPower":"","rows":[]}'),
      '$.player.gameSnapshot', json('{"updatedAt":"","mode":"","seasonLabel":"","seasonStart":"","rows":[]}'),
      '$.player.yearTreasure', json('{"year":"","reward":"","updatedAt":"","seasons":[]}'),
      '$.player.weeklyReports', json('[]')
    )
  END
WHERE id = 'site' AND json_valid(draft_json) = 1;

UPDATE player_records
SET
  draft_json = json_set(
    draft_json,
    '$.stats', json('{"played":"","wins":"","winRate":"","kda":"","mvp":"","kills":"","deaths":"","assists":"","gold":"","damage":""}'),
    '$.seasons', json('[]'),
    '$.reputation', json('{"score":"","level":"","exp":"","expMax":"","note":{"zh":"","en":""},"privileges":[]}'),
    '$.heroPool', json('[]'),
    '$.championships', json('[]'),
    '$.honorTitles', json('[]'),
    '$.builds', json('[]'),
    '$.skins', json('[]'),
    '$.matches', json('[]'),
    '$.aov', json('{"syncedAt":"","count":"","keyword":"","server":""}'),
    '$.powerBoard', json('{"updatedAt":"","area":"","hero":"","power":"","bestPower":"","rows":[]}'),
    '$.gameSnapshot', json('{"updatedAt":"","mode":"","seasonLabel":"","seasonStart":"","rows":[]}'),
    '$.yearTreasure', json('{"year":"","reward":"","updatedAt":"","seasons":[]}'),
    '$.weeklyReports', json('[]')
  ),
  published_json = CASE
    WHEN published_json IS NULL OR json_valid(published_json) = 0 THEN published_json
    ELSE json_set(
      published_json,
      '$.stats', json('{"played":"","wins":"","winRate":"","kda":"","mvp":"","kills":"","deaths":"","assists":"","gold":"","damage":""}'),
      '$.seasons', json('[]'),
      '$.reputation', json('{"score":"","level":"","exp":"","expMax":"","note":{"zh":"","en":""},"privileges":[]}'),
      '$.heroPool', json('[]'),
      '$.championships', json('[]'),
      '$.honorTitles', json('[]'),
      '$.builds', json('[]'),
      '$.skins', json('[]'),
      '$.matches', json('[]'),
      '$.aov', json('{"syncedAt":"","count":"","keyword":"","server":""}'),
      '$.powerBoard', json('{"updatedAt":"","area":"","hero":"","power":"","bestPower":"","rows":[]}'),
      '$.gameSnapshot', json('{"updatedAt":"","mode":"","seasonLabel":"","seasonStart":"","rows":[]}'),
      '$.yearTreasure', json('{"year":"","reward":"","updatedAt":"","seasons":[]}'),
      '$.weeklyReports', json('[]')
    )
  END
WHERE id = 'owner' AND json_valid(draft_json) = 1;

-- Purge the separate match/archive database. Child rows are deleted first.
DELETE FROM aov_capture_frames;
DELETE FROM aov_match_versions;
DELETE FROM aov_canonical_matches;
DELETE FROM aov_imports;
