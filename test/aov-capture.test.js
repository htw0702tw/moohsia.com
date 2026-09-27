import assert from "node:assert/strict";
import test from "node:test";
import { aovVisionPrompt, normalizeAovVision } from "../shared/aov-capture.js";

test("capture normalization keeps visible match and ten-player fields", () => {
  const data = normalizeAovVision(
    {
      kind: "match_scoreboard",
      confidence: 0.94,
      matches: [
        {
          externalMatchId: "1790348182-3038",
          playedAt: "2026-09-25 22:59:28",
          hero: "娜塔亞",
          result: "勝利",
          kills: "8",
          deaths: "6",
          assists: "4",
          board: [
            {
              side: "red",
              hero: "娜塔亞",
              ign: "htw0702aov",
              kills: "8",
              deaths: "6",
              assists: "4",
              gold: "9819",
              heroDamage: "125875",
              taken: "113770",
              healing: "6077",
              lastHits: "34",
              tower: "2089",
              items: ["1423", "1324"],
            },
          ],
        },
      ],
    },
    { ownerName: "htw0702aov", importId: "video-test", frameIndex: 3 },
  );

  assert.equal(data.kind, "match_scoreboard");
  assert.equal(data.matches.length, 1);
  const match = data.matches[0];
  assert.equal(match.externalMatchId, "1790348182-3038");
  assert.equal(match.source, "capture");
  assert.equal(match.result, "勝");
  assert.equal(match.kda, "8 / 6 / 4");
  assert.equal(match.healing, "6077");
  assert.equal(match.lastHits, "34");
  assert.equal(match.board[0].owner, true);
  assert.equal(match.board[0].items.length, 6);
});

test("capture prompt forbids guessing and names the owner", () => {
  const prompt = aovVisionPrompt("htw0702aov");
  assert.match(prompt, /htw0702aov/);
  assert.match(prompt, /不要猜測/);
  assert.match(prompt, /看不到的欄位/);
});

test("unseen numbers stay blank, true zeros survive, partial KDA is not invented", () => {
  const { matches } = normalizeAovVision({ matches: [{ hero: "娜塔亞", kills: "", deaths: 0, gold: "1,234", healing: "unknown", assists: "2.5" }] }, { importId: "batch", frameIndex: 1 });
  assert.equal(matches[0].kills, "");
  assert.equal(matches[0].deaths, "0");
  assert.equal(matches[0].gold, "1234");
  assert.equal(matches[0].healing, "");
  assert.equal(matches[0].assists, "");
  assert.equal(matches[0].kda, "");
});

test("partial screens of the same hero do not overwrite unrelated matches", () => {
  const raw = { matches: [{ hero: "娜塔亞" }] };
  const a = normalizeAovVision(raw, { importId: "batch", frameIndex: 1 });
  const b = normalizeAovVision(raw, { importId: "batch", frameIndex: 2 });
  assert.notEqual(a.matches[0].id, b.matches[0].id);
});

test("frame metadata and parent import exist even when AI fails", async (t) => {
  const sqlite = await import("node:sqlite").catch(() => null);
  if (!sqlite) return t.skip("SQLite integration requires Node 22+");
  const { readFileSync } = await import("node:fs");
  const { analyzeAovFrame } = await import("../shared/aov-capture.js");
  const db = new sqlite.DatabaseSync(":memory:");
  t.after(() => db.close());
  db.exec("PRAGMA foreign_keys=ON");
  for (const name of ["0001_init.sql", "0004_aov_archive.sql"]) db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  const adapter = { prepare(sql) { return { bind(...args) { return { async first() { return db.prepare(sql).get(...args); }, async run() { return db.prepare(sql).run(...args); } }; } }; } };
  const stored = new Map();
  const env = { CMS_DB: adapter, MEDIA: { async put(key, bytes) { stored.set(key, bytes); } }, AI: { async run() { throw new Error("AI unavailable"); } } };
  const result = await analyzeAovFrame(env, { image: "data:image/jpeg;base64,/9j/AA==", importId: "video-test", frameIndex: 1 });
  assert.equal(result.ok, false);
  assert.equal(result.stored, true);
  assert.equal(stored.size, 1);
  assert.equal(db.prepare("SELECT kind FROM aov_capture_frames").get().kind, "pending");
  env.AI.run = async () => ({ answer: JSON.stringify({ kind: "match_result", matches: [{ externalMatchId: "123", hero: "娜塔亞", kills: "0" }] }) });
  const retried = await analyzeAovFrame(env, { image: "data:image/jpeg;base64,/9j/AA==", importId: "video-test", frameIndex: 1 });
  assert.equal(retried.ok, true);
  assert.equal(db.prepare("SELECT kind FROM aov_capture_frames").get().kind, "match_result");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM aov_canonical_matches").get().n, 1);
});
