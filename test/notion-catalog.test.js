import assert from "node:assert/strict";
import test from "node:test";
import { MODE_SPECS, parseHeroList, modeFromPage } from "../shared/aov-parse.js";
import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { loadCatalog } from "../shared/catalog-store.js";
import { createD1Store, createMemoryStore } from "../shared/cms-store.js";
import { applyNotionCollections, syncNotionDraft } from "../shared/notion-sync.js";
import { hashPassword } from "../shared/password.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";

const FIXTURE_HTML = `
<li class="herolist" data-tags="master" data-filter="薇菈">
  <a href="/game/hero/3">
    <div class="h_l_pic" style="background: url(//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/3/portrait.jpg)"></div>
  </a>
</li>
<li class="herolist" data-tags="tank" data-filter="渥馬爾">
  <a href="/game/hero/24">
    <div style="background: url(https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/24/portrait.jpg)"></div>
  </a>
</li>
<li class="herolist" data-tags="nope" data-filter="忽略">
  <a href="/game/hero/9">
    <div style="background: url(https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/9/portrait.jpg)"></div>
  </a>
</li>
`;

function title(text) {
  return { type: "title", title: [{ plain_text: text }] };
}
function rich(text) {
  return { type: "rich_text", rich_text: [{ plain_text: text }] };
}
function check(on) {
  return { type: "checkbox", checkbox: on };
}
function page(id, properties) {
  return { id, properties };
}

test("official catalog snapshot has heroes, roles, and named modes", async () => {
  const catalog = await loadCatalog({});
  assert.equal(catalog.source, "snapshot");
  assert.ok(catalog.heroes.length >= 80);
  assert.ok(catalog.modes.length >= 8);
  assert.ok(catalog.heroes.some((hero) => hero.name.zh === "薇菈" && hero.role === "master"));
  assert.ok(catalog.roles.some((role) => role.zh === "坦克" && role.id === "tank"));
  assert.ok(catalog.modes.some((mode) => mode.name.zh === "5V5經典競技"));
  assert.equal(catalog.attribution.heroes, "https://moba.garena.tw/game/heroes/");
  for (const hero of catalog.heroes) {
    assert.match(hero.image, /^https:\/\/cdngarenanow-a\.akamaihd\.net\//);
    assert.match(hero.pageUrl, /^https:\/\/moba\.garena\.tw\/game\/hero\/\d+$/);
  }
  for (const mode of catalog.modes) {
    assert.match(mode.sourceUrl, /^https:\/\/moba\.garena\.tw\//);
    assert.equal(MODE_SPECS.some((spec) => spec.nameZh === mode.name.zh), true);
  }
  const body = await (await handleApi(new Request("https://moohsia.com/api/catalog"))).json();
  assert.equal(body.ok, true);
  assert.equal(body.heroes.length, catalog.heroes.length);
  assert.equal(JSON.stringify(body).includes("discord.gg/"), false);
});

test("hero parser keeps official role tags and drops unknown roles", () => {
  const heroes = parseHeroList(FIXTURE_HTML);
  assert.equal(heroes.length, 2);
  assert.equal(heroes[0].name.zh, "薇菈");
  assert.equal(heroes[0].roleLabel.zh, "法師");
  assert.equal(heroes[0].image.startsWith("https://cdngarenanow-a.akamaihd.net/"), true);
  const mode = modeFromPage("活動時間內，全遊戲對戰模式（三人對決）開放。", MODE_SPECS.find((spec) => spec.id === "trio"));
  assert.equal(mode.name.zh, "三人對決");
  assert.equal(modeFromPage("沒有這個模式", MODE_SPECS[0]), null);
});

test("personal record stays empty until published and blocks the reserved name", () => {
  const doc = sanitizeDocument(getDefaultDocument());
  assert.equal(doc.player.publish, false);
  assert.equal(doc.player.handle, "");
  assert.equal(toPublicDocument(doc).player, null);

  const shown = sanitizeDocument({
    ...getDefaultDocument(),
    player: {
      publish: true,
      handle: "htw0702aov",
      name: { zh: "場上", en: "" },
      rank: { zh: "", en: "" },
      stats: { kda: "4.0" },
      matches: [
        { id: "m1", label: "練習", date: "2026-09-01", hero: "薇菈", result: "勝", publish: true },
        { id: "m2", label: "隱藏", date: "2026-09-02", hero: "隱藏", publish: false },
      ],
    },
  });
  assert.equal(shown.player.handle, "htw0702aov");
  const pub = toPublicDocument(shown);
  assert.equal(pub.player.handle, "htw0702aov");
  assert.equal(pub.player.rank.zh, "");
  assert.equal(pub.player.stats.kda, "4.0");
  assert.equal(pub.player.matches.length, 1);
  assert.equal(pub.player.matches[0].hero, "薇菈");

  assert.throws(
    () =>
      sanitizeDocument({
        ...getDefaultDocument(),
        player: { publish: true, handle: "moohsia", name: { zh: "", en: "" } },
      }),
    (error) => error.code === "blocked_content",
  );
  assert.throws(
    () =>
      sanitizeDocument({
        ...getDefaultDocument(),
        player: { publish: true, handle: "ok", bio: { zh: "https://discord.gg/secret", en: "" } },
      }),
    (error) => error.code === "blocked_content",
  );
});

test("notion publish flags shape the draft and do not publish the site", async () => {
  const base = sanitizeDocument(getDefaultDocument());
  const next = applyNotionCollections(base, {
    roster: [
      page("aaaaaaaabbbbccccddddeeeeeeeeeeee", {
        Name: title("上場"),
        "Name EN": rich("Starter"),
        Role: rich("中路"),
        "Role EN": rich("Mid"),
        Publish: check(true),
        Order: { type: "number", number: 2 },
      }),
      page("bbbbbbbbccccddddeeeeffffffffffff", {
        Name: title("未公開"),
        Publish: check(false),
        Order: { type: "number", number: 1 },
      }),
      page("ccccccccccccccccccccdddddddddddd", {
        Name: title("moohsia"),
        Publish: check(true),
      }),
    ],
    news: [
      page("newsnewsnewsnewsnewsnewsnews1111", {
        Name: title("公開公告"),
        "Title EN": rich("Public"),
        Body: rich("內文"),
        Date: { type: "date", date: { start: "2026-09-24" } },
        Publish: check(true),
      }),
      page("newsnewsnewsnewsnewsnewsnews2222", {
        Name: title("草稿公告"),
        Publish: check(false),
      }),
    ],
    copy: [
      page("copycopycopycopycopycopycopy1111", {
        Name: title("zh.home.tagline"),
        Text: rich("來自 Notion"),
        Publish: check(true),
      }),
      page("copycopycopycopycopycopycopy2222", {
        Name: title("zh.about.lead"),
        Text: rich("不該蓋掉"),
        Publish: check(false),
      }),
      page("copycopycopycopycopycopycopy3333", {
        Name: title("contactEmail"),
        Text: rich("Info@moohsia.com"),
        Publish: check(true),
      }),
    ],
    player: [
      page("playerplayerplayerplayerplayer11", {
        Handle: title("htw0702aov"),
        Name: rich("場上"),
        Rank: rich(""),
        KDA: rich("2.0"),
        Publish: check(true),
        Order: { type: "number", number: 1 },
      }),
    ],
    matches: [
      page("matchmatchmatchmatchmatchmatch11", {
        Name: title("練習賽"),
        Date: { type: "date", date: { start: "2026-09-20" } },
        Hero: rich("薇菈"),
        Result: { type: "select", select: { name: "勝" } },
        Publish: check(true),
      }),
      page("matchmatchmatchmatchmatchmatch22", {
        Name: title("不公開"),
        Publish: check(false),
      }),
    ],
  });
  assert.equal(next.rosterMembers.length, 2);
  assert.equal(next.rosterMembers.some((member) => member.name.zh === "未公開"), false);
  assert.equal(next.newsPosts[0].status, "published");
  assert.equal(next.newsPosts[1].status, "draft");
  assert.equal(next.copy.zh.home.tagline, "來自 Notion");
  assert.notEqual(next.copy.zh.about.lead, "不該蓋掉");
  assert.equal(next.player.handle, "htw0702aov");
  assert.equal(next.player.publish, true);
  assert.equal(next.player.matches.length, 2);
  assert.equal(next.player.matches[0].publish, true);
  assert.throws(() => sanitizeDocument(next), (error) => error.code === "blocked_content");

  const safe = applyNotionCollections(base, {
    roster: [
      page("aaaaaaaabbbbccccddddeeeeeeeeeeee", {
        Name: title("上場"),
        Publish: check(true),
      }),
    ],
    player: [
      page("playerplayerplayerplayerplayer11", {
        Handle: title("htw0702aov"),
        Publish: check(false),
      }),
    ],
  });
  const saved = sanitizeDocument(safe);
  assert.equal(saved.player.publish, false);
  assert.equal(toPublicDocument(saved).player, null);
  assert.equal(toPublicDocument(saved).rosterMembers[0].name.zh, "上場");

  resetLoginFailuresForTests();
  const store = createMemoryStore();
  const env = {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword("correct-horse"),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: store,
    NOTION_TOKEN: "secret-token-value",
    NOTION_PLAYER_DB: "player-db",
    NOTION_FETCH: async () =>
      new Response(
        JSON.stringify({
          results: [
            page("playerplayerplayerplayerplayer11", {
              Handle: title("htw0702aov"),
              Rank: rich("測試段位"),
              Publish: check(true),
            }),
          ],
          has_more: false,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  };
  const synced = await syncNotionDraft(env);
  assert.equal(synced.ok, true);
  assert.equal(synced.counts.player, 1);
  const row = await store.get();
  assert.equal(JSON.parse(row.draft_json).player.handle, "htw0702aov");
  assert.equal(JSON.parse(row.published_json).player.publish, false);

  const loggedIn = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.40",
      },
      body: JSON.stringify({ username: "htw0702", password: "correct-horse" }),
    }),
    env,
  );
  const session = await loggedIn.json();
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];
  const denied = await handleApi(
    new Request("https://moohsia.com/api/notion/webhook", {
      method: "POST",
      headers: { authorization: "Bearer nope-not-the-secret" },
    }),
    { ...env, NOTION_WEBHOOK_SECRET: "webhook-secret-value" },
  );
  assert.equal(denied.status, 401);
  const accepted = await handleApi(
    new Request("https://moohsia.com/api/notion/webhook", {
      method: "POST",
      headers: { authorization: "Bearer webhook-secret-value" },
    }),
    { ...env, NOTION_WEBHOOK_SECRET: "webhook-secret-value" },
  );
  assert.equal(accepted.status, 200);
  const adminSync = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/notion/sync", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": session.csrf,
      },
      body: "{}",
    }),
    env,
  );
  const adminBody = await adminSync.json();
  assert.equal(adminSync.status, 200);
  assert.equal(adminBody.draft.player.handle, "htw0702aov");
  assert.equal(JSON.stringify(adminBody).includes("secret-token"), false);
  const publicBody = await (await handleApi(new Request("https://moohsia.com/api/content"), env)).json();
  assert.equal(publicBody.player, null);
});

test("publishing the player draft mirrors a D1 player row", async () => {
  const calls = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              calls.push({ sql, args });
            },
            async first() {
              calls.push({ sql, args, read: true });
              return null;
            },
          };
        },
      };
    },
  };
  const store = createD1Store(db);
  const doc = sanitizeDocument({
    ...getDefaultDocument(),
    player: { publish: true, handle: "htw0702aov", rank: { zh: "", en: "" } },
  });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const mirror = calls.find((call) => call.sql.includes("player_records"));
  assert.ok(mirror);
  assert.equal(mirror.args[0], "owner");
  assert.equal(JSON.parse(mirror.args[1]).handle, "htw0702aov");
  assert.equal(JSON.parse(mirror.args[1]).publish, true);
});
