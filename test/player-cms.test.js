import assert from "node:assert/strict";
import test from "node:test";
import { ensurePlayerRecord, renderPlayerEditor, runPlayerAction } from "../admin/player-editor.js";
import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { createMemoryMedia } from "../shared/media.js";
import { highlightKeysFromPublic } from "../shared/media.js";
import { applyNotionCollections } from "../shared/notion-sync.js";
import { hashPassword } from "../shared/password.js";
import { cleanPlayer, derivedKda, toPublicPlayer } from "../shared/player.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { sanitizeDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";
import worker from "../worker/index.js";

test("sparse player records still read, and new sections stay empty", () => {
  const cleaned = cleanPlayer({ publish: true, handle: "sample" });
  assert.equal(cleaned.avatar.key, "");
  assert.deepEqual(cleaned.builds, []);
  assert.equal(cleaned.peakRank.zh, "");
  assert.equal(cleaned.joinDate, "");
  assert.equal(cleaned.matches.length, 0);
  const shown = toPublicPlayer(cleaned);
  assert.equal(shown.avatar, null);
  assert.deepEqual(shown.builds, []);
  assert.equal(shown.handle, "sample");
  assert.equal(toPublicPlayer(cleanPlayer({ handle: "hidden", builds: [{ hero: "勇" }] })), null);
});

test("builds, separate KDA, and media survive cleaning and public view", () => {
  const cleaned = cleanPlayer({
    publish: true,
    handle: "sample",
    uid: "1234567890123456",
    peakRank: { zh: "永恆傳說", en: "Eternal" },
    joinDate: "2024-03-01",
    avatar: { key: "hl/avatar1234", mime: "image/png", kind: "image", caption: { zh: "頭像", en: "" } },
    builds: [
      {
        hero: "娜塔亞",
        heroId: "112",
        name: { zh: "輸出裝", en: "" },
        skillOrder: "1>3>2>4",
        items: ["破甲弓", "無盡戰刃"],
        boots: "戰靴",
        enchant: "極限法穿",
        arcana: [
          { color: "red", name: "異變", count: "10" },
          { color: "purple", name: "", count: "" },
        ],
        shot: { key: "hl/buildshot1", mime: "image/jpeg", kind: "image", caption: { zh: "出裝", en: "" } },
      },
      { hero: "", items: ["", "", "", "", "", ""], arcana: [{ color: "red", name: "", count: "" }] },
    ],
    heroPool: [{ hero: "娜塔亞", matches: "10", winRate: "70", kills: "9", deaths: "3", assists: "6" }],
    seasons: [{ label: "2026-S4", radar: { output: "150", kda: "80", farm: "60", teamfight: "75", survival: "55" } }],
    matches: [
      {
        id: "match1",
        publish: true,
        date: "2026-09-25",
        hero: "娜塔亞",
        skin: "星元",
        map: "經典",
        result: "勝",
        kills: "14",
        deaths: "6",
        assists: "4",
        gold: "10079",
        damage: "165385",
        taken: "98447",
        healing: "1200",
        mvp: true,
        badges: { gold: true, penta: "yes" },
        highlight: { key: "hl/matchclip1", mime: "video/mp4", kind: "video", caption: { zh: "精彩", en: "" } },
        board: [{ side: "blue", hero: "娜塔亞", owner: true, kills: "14", deaths: "6", assists: "4", healing: "1200", items: ["破甲弓"] }],
      },
    ],
  });
  assert.equal(cleaned.builds.length, 1);
  assert.deepEqual(cleaned.builds[0].skillOrder, ["1", "3", "2", "4"]);
  assert.equal(cleaned.builds[0].items[0], "破甲弓");
  assert.equal(cleaned.builds[0].items.length, 6);
  assert.equal(cleaned.builds[0].boots, "戰靴");
  assert.equal(cleaned.builds[0].arcana.length, 1);
  assert.equal(cleaned.builds[0].arcana[0].name, "異變");
  assert.equal(cleaned.seasons[0].radar.output, "");
  assert.equal(cleaned.seasons[0].radar.kda, "80");
  assert.equal(cleaned.joinDate, "2024-03-01");
  const shown = toPublicPlayer(cleaned);
  assert.equal(shown.avatar.url, "/api/media/avatar1234");
  assert.equal(shown.avatar.key, undefined);
  assert.equal(shown.peakRank.zh, "永恆傳說");
  assert.equal(shown.builds[0].shot.url, "/api/media/buildshot1");
  assert.equal(shown.builds[0].shot.key, undefined);
  assert.equal(shown.matches[0].kills, "14");
  assert.equal(shown.matches[0].deaths, "6");
  assert.equal(shown.matches[0].assists, "4");
  assert.equal(shown.matches[0].kda, derivedKda("14", "6", "4"));
  assert.equal(shown.matches[0].healing, "1200");
  assert.equal(shown.matches[0].skin, "星元");
  assert.equal(shown.matches[0].mvp, true);
  assert.equal(shown.matches[0].badges.gold, true);
  assert.equal(shown.matches[0].badges.penta, false);
  assert.equal(shown.matches[0].board[0].healing, "1200");
  assert.equal(shown.heroPool[0].kda, "5.00");
  const keys = highlightKeysFromPublic(shown);
  assert.equal(keys.has("hl/avatar1234"), true);
  assert.equal(keys.has("hl/buildshot1"), true);
  assert.equal(keys.has("hl/matchclip1"), true);
  assert.equal(JSON.stringify(shown).includes("hl/"), false);
});

test("player lists reject entries past the cap", () => {
  const builds = Array.from({ length: 25 }, (_, index) => ({ hero: `英雄${index}`, items: ["破甲弓"] }));
  const matches = Array.from({ length: 81 }, (_, index) => ({ hero: `場${index}`, kills: "1", deaths: "1", assists: "1", publish: true }));
  const cleaned = cleanPlayer({ publish: true, handle: "sample", builds, matches });
  assert.equal(cleaned.builds.length, 24);
  assert.equal(cleaned.matches.length, 80);
});

test("notion sync keeps admin builds, avatar, and match extras", () => {
  const base = getDefaultDocument();
  base.player = cleanPlayer({
    publish: true,
    handle: "keep",
    avatar: { key: "hl/avatar1234", mime: "image/png", kind: "image", caption: { zh: "頭像", en: "" } },
    peakRank: { zh: "星耀", en: "" },
    joinDate: "2024-03-01",
    builds: [{ hero: "勇", items: ["破甲弓"], boots: "戰靴" }],
    matches: [
      {
        id: "matchmatchmatchmatchmatchmatch11",
        hero: "勇",
        skin: "星元",
        healing: "90",
        mvp: true,
        publish: true,
        highlight: { key: "hl/matchclip1", mime: "image/png", kind: "image", caption: { zh: "舊說明", en: "" } },
      },
    ],
    heroPool: [{ id: "herocardherocardherocardherocard", hero: "勇", kills: "8", deaths: "2", assists: "3" }],
  });
  const next = applyNotionCollections(base, {
    player: [
      {
        id: "playerplayerplayerplayerplayer11",
        properties: {
          Handle: { type: "title", title: [{ plain_text: "from-notion" }] },
          Publish: { type: "checkbox", checkbox: true },
        },
      },
    ],
    matches: [
      {
        id: "matchmatchmatchmatchmatchmatch11",
        properties: {
          Name: { type: "title", title: [{ plain_text: "練習賽" }] },
          Hero: { type: "rich_text", rich_text: [{ plain_text: "薇菈" }] },
          Publish: { type: "checkbox", checkbox: true },
        },
      },
    ],
    heroes: [
      {
        id: "herocardherocardherocardherocard",
        properties: {
          Name: { type: "title", title: [{ plain_text: "勇" }] },
          Played: { type: "rich_text", rich_text: [{ plain_text: "12" }] },
          Publish: { type: "checkbox", checkbox: true },
        },
      },
    ],
  });
  const saved = sanitizeDocument(next);
  assert.equal(saved.player.handle, "from-notion");
  assert.equal(saved.player.avatar.key, "hl/avatar1234");
  assert.equal(saved.player.peakRank.zh, "星耀");
  assert.equal(saved.player.joinDate, "2024-03-01");
  assert.equal(saved.player.builds[0].hero, "勇");
  assert.equal(saved.player.builds[0].boots, "戰靴");
  assert.equal(saved.player.matches[0].hero, "薇菈");
  assert.equal(saved.player.matches[0].skin, "星元");
  assert.equal(saved.player.matches[0].healing, "90");
  assert.equal(saved.player.matches[0].mvp, true);
  assert.equal(saved.player.matches[0].highlight.key, "hl/matchclip1");
  assert.equal(saved.player.heroPool[0].kills, "8");
  assert.equal(saved.player.heroPool[0].matches, "12");
});

test("admin editor exposes builds and separate KDA without raw JSON", () => {
  const player = ensurePlayerRecord({ handle: "sample", uid: "abc" });
  const ui = { tab: "profile", openMatch: "", catalog: { heroes: [{ id: "5", name: { zh: "勇" }, roleLabel: { zh: "射手" } }], modes: [], roles: [] } };
  const profile = renderPlayerEditor(player, ui, { text: 'data-cms autocomplete="off"', choice: "" });
  assert.match(profile, /配裝/);
  assert.match(profile, /歷史戰績/);
  assert.match(profile, /UID 只能是數字/);
  runPlayerAction(player, "season-add", { dataset: {} }, ui);
  ui.tab = "battle";
  const battle = renderPlayerEditor(player, ui, { text: 'data-cms autocomplete="off"', choice: "" });
  assert.match(battle, /輸出/);
  assert.match(battle, /發育/);
  assert.match(battle, /團戰/);
  assert.match(battle, /生存/);
  assert.match(battle, /信譽積分/);
  assert.doesNotMatch(profile, /<textarea[^>]*>(\s|\{)/);
  const added = runPlayerAction(player, "match-add", { dataset: {} }, ui);
  added.player.matches[0].minions = "30";
  added.player.matches[0].healing = "7964";
  added.player.matches[0].board[0].minions = "30";
  added.player.matches[0].board[0].healing = "7964";
  ui.tab = "matches";
  ui.openMatch = added.player.matches[0].id;
  const matches = renderPlayerEditor(added.player, ui, { text: 'data-cms autocomplete="off"', choice: "" });
  assert.match(matches, /data-field="kills"/);
  assert.match(matches, /value="30"[^>]*data-field="minions"/);
  assert.match(matches, /value="7964"[^>]*data-field="healing"/);
  assert.doesNotMatch(matches, /value="30"[^>]*data-field="healing"/);
  assert.ok(matches.indexOf('data-field="minions"') < matches.indexOf('data-field="healing"'));
  assert.match(matches, /data-field="deaths"/);
  assert.match(matches, /data-field="assists"/);
  assert.match(matches, /這列是自己/);
  assert.match(matches, /拖放/);
  const built = runPlayerAction(added.player, "build-add", { dataset: {} }, ui);
  ui.tab = "builds";
  const builds = renderPlayerEditor(built.player, ui, { text: 'data-cms autocomplete="off"', choice: "" });
  assert.match(builds, /六件裝備/);
  assert.match(builds, /技能 1/);
  assert.match(builds, /紅銘文/);
  assert.match(builds, /勇/);
  assert.equal(built.player.matches[0].board[0].owner, true);
});

test("admin host can read the hero catalog and a logged-in media preview", async () => {
  resetLoginFailuresForTests();
  const env = {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword("correct-horse"),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
    MEDIA_MEMORY: createMemoryMedia(),
    ASSETS: { async fetch() { return new Response("missing", { status: 404 }); } },
  };
  const catalog = await worker.fetch(new Request("https://admin.moohsia.com/api/catalog"), env);
  assert.equal(catalog.status, 200);
  const body = await catalog.json();
  assert.equal(body.ok, true);
  assert.ok(body.heroes.some((hero) => hero.name?.zh === "勇"));

  const login = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/login", {
      method: "POST",
      headers: { origin: "https://admin.moohsia.com", "content-type": "application/json", "cf-connecting-ip": "203.0.113.91" },
      body: JSON.stringify({ username: "htw0702", password: "correct-horse" }),
    }),
    env,
  );
  const session = await login.json();
  const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const form = new FormData();
  form.set("file", new File([png], "shot.png", { type: "image/png" }));
  const uploaded = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/media", {
      method: "POST",
      headers: { origin: "https://admin.moohsia.com", cookie, "x-csrf-token": session.csrf, "cf-connecting-ip": "203.0.113.91" },
      body: form,
    }),
    env,
  );
  const stored = await uploaded.json();
  assert.equal(stored.ok, true);
  assert.match(stored.key, /^hl\//);
  const preview = await handleAdmin(new Request(`https://admin.moohsia.com/api/admin/media/${stored.key.slice(3)}`, { headers: { cookie } }), env);
  assert.equal(preview.status, 200);
  assert.equal(preview.headers.get("content-type"), "image/png");
  assert.equal(preview.headers.get("cache-control"), "private, no-store");
  const hidden = await handleApi(new Request(`https://moohsia.com/api/media/${stored.key.slice(3)}`), env);
  assert.equal(hidden.status, 404);
});
