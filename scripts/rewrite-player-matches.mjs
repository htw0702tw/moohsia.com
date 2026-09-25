/**
 * Rewrite farm/healing fields on a CMS site document.
 * Does not invent matches and does not call the network.
 *
 *   node scripts/rewrite-player-matches.mjs < site.json > site.rewritten.json
 *
 * Export the live row first (owner machine, already logged in to wrangler):
 *
 *   npx wrangler d1 execute moohsia-cms --remote --json \
 *     --command "SELECT published_json FROM site_documents WHERE id = 'site'"
 *
 * Pass that JSON on stdin. The script accepts either the site document itself
 * or a wrangler JSON payload whose first result has published_json.
 * Write the printed document back with a bound parameter, for example a local
 * file read by your own update command. Do not paste the document into the
 * shell history if it contains notes you do not want stored there.
 *
 * The fresh import is 50 matches. This script does not add games.
 * 補兵 is 補刀數. 控場 stays in seconds; the site shows seconds × 1000.
 * A stored 2026-09-25 22:59 Natalya 8/6/4 row is aligned to 補刀 34,
 * 控場 6.534, 治療 6077, and 塔傷 2089.
 */
import { readFileSync } from "node:fs";
import { rewriteSiteDocument } from "../shared/player-rewrite.js";

function readStdin() {
  return readFileSync(0, "utf8");
}

function unwrap(payload) {
  if (Array.isArray(payload) && payload[0]?.results?.[0]?.published_json) {
    return JSON.parse(payload[0].results[0].published_json);
  }
  if (payload?.results?.[0]?.published_json) return JSON.parse(payload.results[0].published_json);
  if (typeof payload?.published_json === "string") return JSON.parse(payload.published_json);
  return payload;
}

const raw = readStdin().trim();
if (!raw) {
  console.error("stdin was empty. Pass a site document or a wrangler JSON export.");
  process.exit(1);
}
const document = unwrap(JSON.parse(raw));
if (!document?.player) {
  console.error("No player object in that JSON. Nothing was rewritten.");
  process.exit(1);
}
const before = document.player.matches?.length || 0;
const rewritten = rewriteSiteDocument(document);
const after = rewritten.player.matches?.length || 0;
if (after < before) {
  console.error("Refusing to drop matches.");
  process.exit(1);
}
process.stderr.write(`Rewrote ${after} matches. No matches were added or removed.\n`);
process.stdout.write(`${JSON.stringify(rewritten)}\n`);
