import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleApi } from "../shared/api.js";
import { applyAovImport } from "../shared/aov-import.js";
import { syncOwnerFightHistory } from "../shared/aov-sync.js";
import { bundledCatalog } from "../shared/catalog-store.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { DEFAULT_HIDDEN_NAMES, HIDDEN_NAME_LABEL } from "../shared/hidden-names.js";
import { emptyPlayer } from "../shared/player.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";

const expanded = readFileSync(new URL("./fixtures/aov-fight-history-expanded.html", import.meta.url), "utf8");

function row(partial) {
  return {
    side: "blue",
    hero: "弗洛倫",
    ign: "路人",
    kills: "4",
    deaths: "5",
    assists: "13",
    gold: "9930",
    items: ["裝備 1422"],
    ...partial,
  };
}

test("the hidden-name list defaults to the people who left, and an empty list stays empty", () => {
  const doc = sanitizeDocument(getDefaultDocument());
  assert.deepEqual(doc.hiddenNames, DEFAULT_HIDDEN_NAMES);
  assert.deepEqual(sanitizeDocument({ ...getDefaultDocument(), hiddenNames: undefined }).hiddenNames, DEFAULT_HIDDEN_NAMES);
  const cleared = sanitizeDocument({ ...getDefaultDocument(), hiddenNames: ["  之喝  ", "之喝", "隊友", ""] });
  assert.deepEqual(cleared.hiddenNames, ["之喝"]);
  const none = sanitizeDocument({ ...getDefaultDocument(), hiddenNames: [] });
  assert.deepEqual(none.hiddenNames, []);
  assert.equal(Object.hasOwn(toPublicDocument(doc), "hiddenNames"), false);
});

test("public content replaces hidden names and leaves scoreboard stats", () => {
  const doc = sanitizeDocument({
    ...getDefaultDocument(),
    newsPosts: [
      {
        id: "leftguild",
        date: "2026-09-01",
        title: { zh: "han.漢. 與 han.漢", en: "note" },
        body: { zh: "今天十轉連輸蟲，還有老10人。", en: "" },
        status: "published",
      },
    ],
    player: {
      ...emptyPlayer(),
      publish: true,
      handle: "htw0702aov",
      matches: [
        {
          id: "m1",
          publish: true,
          playedAt: "2026-09-20 12:00",
          mode: "排位賽",
          hero: "娜塔亞",
          result: "勝",
          kills: "8",
          deaths: "2",
          assists: "6",
          rankDelta: "15",
          note: { zh: "這場和之喝一起", en: "with 之喝" },
          board: [
            row({ ign: "之喝", kills: "4", deaths: "5", assists: "13", rankDelta: "12" }),
            row({ hero: "娜塔亞", ign: "htw0702aov", owner: true, kills: "8", deaths: "2", assists: "6", rankDelta: "15" }),
            row({ hero: "狂鐵", ign: "han.漢.", kills: "1", deaths: "2", assists: "3", gold: "100" }),
            row({ hero: "希露卡", ign: "han.漢", kills: "9", deaths: "1", assists: "4" }),
            row({ side: "red", hero: "凡恩", ign: "藍方一", kills: "3", deaths: "4", assists: "3" }),
          ],
        },
      ],
    },
  });
  const pub = toPublicDocument(doc);
  const text = JSON.stringify(pub);
  for (const name of DEFAULT_HIDDEN_NAMES) assert.equal(text.includes(name), false, name);
  const match = pub.player.matches[0];
  assert.equal(match.kills, "8");
  assert.equal(match.deaths, "2");
  assert.equal(match.assists, "6");
  assert.equal(match.rankDelta, "15");
  assert.equal(match.note.zh, "這場和隊友一起");
  assert.equal(match.note.en, "with 隊友");
  const hidden = match.board.filter((item) => item.ign === HIDDEN_NAME_LABEL);
  assert.equal(hidden.length, 3);
  assert.equal(hidden[0].kills, "4");
  assert.equal(hidden[0].deaths, "5");
  assert.equal(hidden[0].assists, "13");
  assert.equal(hidden[0].rankDelta, "12");
  assert.equal(hidden[0].gold, "9930");
  assert.equal(match.board.find((item) => item.owner).ign, "htw0702aov");
  assert.equal(match.board.find((item) => item.hero === "凡恩").ign, "藍方一");
  assert.equal(pub.newsPosts[0].title.zh, "隊友 與 隊友");
  assert.equal(pub.newsPosts[0].body.zh, "今天隊友，還有隊友。");

  const shown = toPublicDocument(sanitizeDocument({ ...doc, hiddenNames: [] }));
  assert.equal(shown.player.matches[0].board.find((item) => item.hero === "弗洛倫").ign, "之喝");
  assert.equal(shown.player.matches[0].board.find((item) => item.hero === "弗洛倫").kills, "4");
});

test("import writes 隊友 instead of a hidden name and will not restore a stored 隊友", () => {
  const incoming = {
    id: "game-1",
    externalMatchId: "game-1",
    playedAt: "2026-09-20 12:00",
    mode: "排位賽",
    hero: "娜塔亞",
    result: "勝",
    kills: "8",
    deaths: "2",
    assists: "6",
    rankDelta: "15",
    gold: "9819",
    note: { zh: "地圖備註 十轉連輸蟲", en: "" },
    board: [
      row({ ign: "之喝", kills: "4", deaths: "5", assists: "13", gold: "9930", rankDelta: "12" }),
      row({ hero: "娜塔亞", ign: "htw0702aov", owner: true, kills: "8", deaths: "2", assists: "6" }),
      row({ hero: "狂鐵", ign: "老10人", kills: "2", deaths: "1", assists: "9", gold: "8000" }),
    ],
  };
  const first = applyAovImport(emptyPlayer(), { matches: [incoming], summary: {} }, { keyword: "htw0702aov" });
  const stored = first.matches[0];
  assert.equal(stored.board.find((item) => item.hero === "弗洛倫").ign, HIDDEN_NAME_LABEL);
  assert.equal(stored.board.find((item) => item.hero === "弗洛倫").kills, "4");
  assert.equal(stored.board.find((item) => item.hero === "弗洛倫").gold, "9930");
  assert.equal(stored.board.find((item) => item.hero === "狂鐵").ign, HIDDEN_NAME_LABEL);
  assert.equal(stored.board.find((item) => item.hero === "狂鐵").assists, "9");
  assert.equal(stored.board.find((item) => item.owner).ign, "htw0702aov");
  assert.equal(stored.kills, "8");
  assert.equal(stored.rankDelta, "15");
  assert.equal(stored.note.zh, "地圖備註 隊友");

  const again = applyAovImport(
    { ...emptyPlayer(), matches: [stored], hiddenNames: ["別人"] },
    { matches: [{ ...incoming, kills: "9", board: incoming.board.map((item) => ({ ...item, kills: item.owner ? "9" : item.kills })) }], summary: {} },
    { keyword: "htw0702aov", hiddenNames: ["別人"] },
  );
  const kept = again.matches[0];
  assert.equal(kept.board.find((item) => item.hero === "弗洛倫").ign, HIDDEN_NAME_LABEL);
  assert.equal(kept.board.find((item) => item.hero === "弗洛倫").kills, "4");
  assert.equal(kept.board.find((item) => item.hero === "弗洛倫").deaths, "5");
  assert.equal(kept.kills, "9");
  assert.equal(kept.board.find((item) => item.owner).kills, "9");
  assert.equal(JSON.stringify(kept).includes("之喝"), false);
});

test("hourly import uses the stored list and does not write a removed name back", async () => {
  const store = createMemoryStore();
  const player = {
    ...emptyPlayer(),
    publish: true,
    handle: "htw0702aov",
    matches: [
      {
        id: "1790313541-5675",
        externalMatchId: "1790313541-5675",
        hero: "娜塔亞",
        result: "敗",
        publish: true,
        note: { zh: "保留這場筆記", en: "" },
        board: [row({ ign: HIDDEN_NAME_LABEL, kills: "1", deaths: "1", assists: "1", items: [] })],
      },
    ],
  };
  const doc = sanitizeDocument({ ...getDefaultDocument(), hiddenNames: ["別人"], player });
  await store.savePair(JSON.stringify(doc), JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const html = expanded.replaceAll("藍方一", "之喝");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    AOV_FETCH: async () => new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.ok, true);
  const published = JSON.parse((await store.get()).published_json);
  const match = published.player.matches.find((item) => item.externalMatchId === "1790313541-5675");
  const florin = match.board.find((item) => item.hero === "弗洛倫");
  assert.equal(florin.ign, HIDDEN_NAME_LABEL);
  assert.equal(florin.kills, "4");
  assert.equal(florin.deaths, "5");
  assert.equal(florin.assists, "13");
  assert.equal(florin.gold, "9930");
  assert.equal(match.note.zh, "保留這場筆記");
  assert.equal(match.board.find((item) => item.owner).ign, "htw0702aov");
  assert.equal(JSON.stringify(match).includes("之喝"), false);
  assert.equal(published.hiddenNames.includes("之喝"), false);
});

test("content, search, and catalog responses omit hidden names", async () => {
  const store = createMemoryStore();
  const doc = sanitizeDocument({
    ...getDefaultDocument(),
    player: {
      ...emptyPlayer(),
      publish: true,
      handle: "htw0702aov",
      matches: [
        {
          id: "m1",
          publish: true,
          hero: "娜塔亞",
          kills: "3",
          deaths: "1",
          assists: "2",
          rankDelta: "-9",
          board: [row({ ign: "十轉連輸蟲", kills: "6", deaths: "2", assists: "1" })],
        },
      ],
    },
  });
  await store.publish(JSON.stringify(doc), "2026-09-26T00:00:00.000Z");
  const catalog = bundledCatalog();
  catalog.activities = [{ id: "act", title: "之喝的活動" }];
  catalog.heroes = catalog.heroes.map((hero, index) =>
    index === 0 ? { ...hero, name: { ...hero.name, zh: "老10人" }, blurb: "跟老10人一起" } : hero,
  );
  const env = {
    CMS_STORE: store,
    CMS_KV: {
      async get(key) {
        return key === "aov-catalog" ? catalog : null;
      },
    },
  };
  const content = await handleApi(new Request("https://moohsia.com/api/content"), env);
  const contentText = await content.text();
  assert.equal(content.status, 200);
  assert.equal(contentText.includes("十轉連輸蟲"), false);
  assert.equal(contentText.includes(HIDDEN_NAME_LABEL), true);
  const payload = JSON.parse(contentText);
  assert.equal(payload.player.matches[0].board[0].ign, HIDDEN_NAME_LABEL);
  assert.equal(payload.player.matches[0].board[0].kills, "6");
  assert.equal(payload.player.matches[0].kills, "3");
  assert.equal(payload.player.matches[0].rankDelta, "-9");
  assert.equal(Object.hasOwn(payload, "hiddenNames"), false);

  const found = await handleApi(new Request("https://moohsia.com/api/search?q=老10人"), env);
  const foundText = await found.text();
  assert.equal(found.status, 200);
  assert.equal(foundText.includes("老10人"), false);
  const search = JSON.parse(foundText);
  assert.equal(search.query, HIDDEN_NAME_LABEL);
  assert.equal(search.results.some((item) => item.title === HIDDEN_NAME_LABEL), true);

  const listed = await handleApi(new Request("https://moohsia.com/api/catalog"), env);
  const listedText = await listed.text();
  assert.equal(listed.status, 200);
  assert.equal(listedText.includes("之喝"), false);
  assert.equal(listedText.includes("老10人"), false);
  const body = JSON.parse(listedText);
  assert.equal(body.activities[0].title, "之喝的活動".replace("之喝", HIDDEN_NAME_LABEL));
  assert.equal(body.heroes[0].name.zh, HIDDEN_NAME_LABEL);
  assert.equal(body.heroes[0].blurb, "跟隊友一起");
});
