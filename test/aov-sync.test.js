import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { syncOwnerFightHistory } from "../shared/aov-sync.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { emptyPlayer } from "../shared/player.js";
import { sanitizeDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";

const expanded = readFileSync(new URL("./fixtures/aov-fight-history-expanded.html", import.meta.url), "utf8");

function challengeHtml() {
  return `<html><h1 id="turnstile-title">安全驗證</h1><form id="turnstile-form"><div class="cf-turnstile"></div></form></html>`;
}

function basePlayer() {
  return {
    ...emptyPlayer(),
    publish: true,
    handle: "htw0702aov",
    bio: { zh: "手寫簡介", en: "" },
    builds: [
      {
        hero: "娜塔亞",
        name: { zh: "手寫出裝", en: "" },
        items: ["破甲弓", "無盡", "破曉", "復活", "魔女", "聖劍"],
      },
    ],
    matches: [
      {
        id: "1790313541-5675",
        externalMatchId: "1790313541-5675",
        hero: "娜塔亞",
        result: "敗",
        date: "2026-09-25",
        publish: true,
        note: { zh: "保留這場筆記", en: "" },
      },
    ],
  };
}

test("hourly sync leaves the CMS unchanged when AOVRanking challenges", async () => {
  const store = createMemoryStore();
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    AOV_FETCH: async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "aov_challenge");
  assert.equal(result.stored, false);
  const published = JSON.parse((await store.get()).published_json);
  assert.equal(published.player.bio.zh, "手寫簡介");
  assert.equal(published.player.matches.length, 1);
  assert.equal(published.player.matches[0].note.zh, "保留這場筆記");
  assert.deepEqual(published.newsPosts, doc.newsPosts);
});

test("hourly sync merges fight history into draft and published player", async () => {
  const store = createMemoryStore();
  const draft = sanitizeDocument({
    ...getDefaultDocument(),
    player: basePlayer(),
    newsPosts: [{ id: "draftpost", date: "2026-09-01", title: { zh: "草稿公告", en: "" }, body: { zh: "只在草稿", en: "" }, status: "draft" }],
  });
  const published = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.savePair(JSON.stringify(draft), JSON.stringify(published), "2026-09-25T00:00:00.000Z");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    AOV_FETCH: async () => new Response(expanded, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.stored, true);
  const row = await store.get();
  const nextDraft = JSON.parse(row.draft_json);
  const nextPublic = JSON.parse(row.published_json);
  assert.equal(nextDraft.player.bio.zh, "手寫簡介");
  assert.equal(nextPublic.player.bio.zh, "手寫簡介");
  const match = nextPublic.player.matches.find((item) => item.externalMatchId === "1790313541-5675");
  assert.equal(match.note.zh, "保留這場筆記");
  assert.equal(match.minions, "30");
  assert.equal(match.healing, "7964");
  assert.equal(match.mode, "排位賽");
  assert.equal(match.result, "敗");
  assert.equal(nextPublic.player.builds[0].name.zh, "手寫出裝");
  assert.equal(nextPublic.player.builds[0].items[0], "破甲弓");
  assert.equal(nextDraft.newsPosts[0]?.title?.zh, "草稿公告");
  assert.notEqual(nextPublic.newsPosts[0]?.title?.zh, "草稿公告");
});
