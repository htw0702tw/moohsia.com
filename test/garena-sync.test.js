import assert from "node:assert/strict";
import test from "node:test";
import { handleAdmin } from "../shared/admin-api.js";
import { syncOwnerFightHistory } from "../shared/aov-sync.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { applyGarenaHistory, garenaHeaders, mapGarenaGames } from "../shared/garena-sync.js";
import { hashPassword } from "../shared/password.js";
import { emptyPlayer } from "../shared/player.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { sanitizeDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";

const TOKEN = "test-access-token";
const CODE = "test-oauth-code";
const CSRF = "testcsrftokenvalue";

function challengeHtml() {
  return `<html><h1 id="turnstile-title">安全驗證</h1><form id="turnstile-form"><div class="cf-turnstile"></div></form></html>`;
}

function basePlayer() {
  return {
    ...emptyPlayer(),
    publish: true,
    handle: "htw0702aov",
    uid: "3678194289083498",
    bio: { zh: "手寫簡介", en: "" },
    stats: { ...emptyPlayer().stats, kda: "3.50", played: "50" },
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
        source: "aovweb",
        hero: "娜塔亞",
        result: "敗",
        mode: "排位賽",
        date: "2026-09-25",
        playedAt: "2026-09-25 22:59:28",
        kda: "8 / 6 / 4",
        kills: "8",
        deaths: "6",
        assists: "4",
        minions: "34",
        healing: "6077",
        tower: "2089",
        gold: "9819",
        damage: "125875",
        taken: "113770",
        publish: true,
        note: { zh: "保留這場筆記", en: "" },
      },
    ],
  };
}

function officialBody() {
  return {
    character: {
      characters: [{ name: "htw0702aov", head_id: 1, head_url: "https://example.invalid/head.jpg", partition: "1012" }],
    },
    game: {
      games: [
        {
          champion: "https://dl.ops.kgtw.garenanow.com/CHT/HeroHeadPath/301420head.jpg",
          type: "經典競技",
          kda: "8/6/4",
          start_time: "2026-09-25 22:59:28",
          game_id: "G225928",
          game_result: 0,
        },
        {
          champion: "https://dl.ops.kgtw.garenanow.com/CHT/HeroHeadPath/999head.jpg",
          type: "傳說之巔",
          kda: "3/1/9",
          start_time: "2026-09-26 01:10:00",
          game_id: "G011000",
          game_result: 1,
        },
      ],
    },
  };
}

function garenaFetch(payload, sink = []) {
  return async (url, init) => {
    sink.push({ url, headers: init.headers });
    if (String(url).endsWith("/api/character")) {
      return new Response(JSON.stringify(payload.character), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (String(url).endsWith("/api/game")) {
      return new Response(JSON.stringify(payload.game), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("nope", { status: 404 });
  };
}

test("official game JSON maps result, mode, and kda without inventing a hero", () => {
  const matches = mapGarenaGames(officialBody().game);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].externalMatchId, "G011000");
  assert.equal(matches[0].result, "勝");
  assert.equal(matches[0].mode, "巔峰對決");
  assert.equal(matches[0].map, "傳說之巔");
  assert.equal(matches[0].kda, "3 / 1 / 9");
  assert.equal(matches[0].hero, "");
  assert.equal(matches[0].minions, "");
  assert.equal(matches[1].playedAt, "2026-09-25 22:59:28");
  assert.equal(matches[1].result, "敗");
  assert.equal(matches[1].mode, "排位賽");
});

test("merge keeps the AOVRanking row for the same time and the stored uid", () => {
  const applied = applyGarenaHistory(basePlayer(), { matches: mapGarenaGames(officialBody().game), character: { name: "htw0702aov", partition: "1012", uid: "999" } }, {
    publish: true,
    keyword: "htw0702aov",
    server: "1012",
    syncedAt: "2026-09-26T01:30:00.000Z",
  });
  assert.equal(applied.applied, true);
  assert.equal(applied.player.uid, "3678194289083498");
  assert.equal(applied.player.stats.kda, "3.50");
  assert.equal(applied.player.stats.played, "50");
  assert.equal(applied.player.matches.length, 2);
  const kept = applied.player.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(kept.note.zh, "保留這場筆記");
  assert.equal(kept.hero, "娜塔亞");
  assert.equal(kept.minions, "34");
  assert.equal(kept.healing, "6077");
  assert.equal(kept.tower, "2089");
  assert.equal(kept.gold, "9819");
  assert.equal(kept.source, "aovweb");
  const added = applied.player.matches.find((match) => match.externalMatchId === "G011000");
  assert.equal(added.source, "garena");
  assert.equal(added.hero, "");
  assert.equal(added.result, "勝");
});

test("minute-precision official rows stay distinct and do not replace an older stored game", () => {
  const mapped = mapGarenaGames({
    games: [
      {
        champion: "https://dl.ops.kgtw.garenanow.com/CHT/HeroHeadPath/example.jpg",
        type: "排位賽",
        kda: "8/3/11",
        start_time: "2026-09-26 08:57",
        game_id: "seen-0857",
        game_result: 1,
      },
      {
        champion: "https://dl.ops.kgtw.garenanow.com/CHT/HeroHeadPath/example.jpg",
        type: "排位賽",
        kda: "6/10/10",
        start_time: "2026-09-26 08:35",
        game_id: "seen-0835",
        game_result: 0,
      },
    ],
  });
  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].playedAt, "2026-09-26 08:57");
  assert.equal(mapped[0].kda, "8 / 3 / 11");
  assert.equal(mapped[0].kills, "8");
  assert.equal(mapped[0].deaths, "3");
  assert.equal(mapped[0].assists, "11");
  assert.equal(mapped[0].result, "勝");
  assert.equal(mapped[0].hero, "");
  assert.equal(mapped[1].playedAt, "2026-09-26 08:35");
  assert.equal(mapped[1].kda, "6 / 10 / 10");
  assert.equal(mapped[1].result, "敗");
  const applied = applyGarenaHistory(basePlayer(), { matches: mapped, character: { name: "htw0702aov", partition: "1012" } }, {
    publish: true,
    keyword: "htw0702aov",
    server: "1012",
    syncedAt: "2026-09-26T01:00:00.000Z",
  });
  assert.equal(applied.player.matches.length, 3);
  const older = applied.player.matches.find((match) => match.playedAt === "2026-09-25 22:59:28");
  assert.equal(older.externalMatchId, "1790313541-5675");
  assert.equal(older.minions, "34");
  assert.equal(older.hero, "娜塔亞");
});

test("an unusable token does not wipe stored matches", async () => {
  const store = createMemoryStore();
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    GARENA_ACCESS_TOKEN: `line\n${"x".repeat(20)}`,
    AOV_FETCH: async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } }),
    GARENA_FETCH: async () => {
      throw new Error("garena should not run");
    },
  });
  assert.equal(result.stored, false);
  assert.equal(result.garenaCode, "garena_secret_rejected");
  const published = JSON.parse((await store.get()).published_json);
  assert.equal(published.player.matches.length, 1);
  assert.equal(published.player.matches[0].note.zh, "保留這場筆記");
});

test("request headers match the logged-in gameidsearch client", () => {
  const headers = garenaHeaders({
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_CODE: CODE,
    GARENA_CSRF_TOKEN: CSRF,
  });
  assert.equal(headers["Access-Token"], TOKEN);
  assert.equal(headers.accessToken, TOKEN);
  assert.equal(headers.Code, CODE);
  assert.equal(headers.Partition, "1012");
  assert.equal(headers["X-CSRFToken"], CSRF);
  assert.equal(headers.Cookie, `csrftoken=${CSRF}`);
});

test("numeric partition and camelCase games match the live payload", async () => {
  const seen = [];
  const live = {
    character: { characters: [{ partition: 1012, name: "htw0702aov", headId: 1, headUrl: "https://example.invalid/head.jpg" }] },
    game: {
      games: [
        {
          champion: "https://example.invalid/champion.jpg",
          type: "排位賽",
          kda: "8/3/11",
          startTime: "2026-09-26 08:57",
          gameId: "live-0857",
          gameResult: 1,
        },
        {
          champion: "https://example.invalid/champion.jpg",
          type: "排位賽",
          kda: "6/10/10",
          startTime: "2026-09-26 08:35",
          gameId: "live-0835",
          gameResult: 0,
        },
      ],
    },
  };
  const store = createMemoryStore();
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_CODE: CODE,
    GARENA_PARTITION: "1012",
    GARENA_CSRF_TOKEN: CSRF,
    GARENA_FETCH: garenaFetch(live, seen),
    AOV_FETCH: async () => {
      throw new Error("aov should not run");
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "garena");
  assert.equal(seen[0].headers["X-CSRFToken"], CSRF);
  assert.equal(seen[0].headers.Cookie, `csrftoken=${CSRF}`);
  const published = JSON.parse((await store.get()).published_json);
  assert.equal(published.player.uid, "3678194289083498");
  const early = published.player.matches.find((match) => match.playedAt === "2026-09-26 08:57");
  const later = published.player.matches.find((match) => match.playedAt === "2026-09-26 08:35");
  const kept = published.player.matches.find((match) => match.playedAt === "2026-09-25 22:59:28");
  assert.equal(early.kda, "8 / 3 / 11");
  assert.equal(early.result, "勝");
  assert.equal(early.hero, "");
  assert.equal(early.minions, "");
  assert.equal(later.kda, "6 / 10 / 10");
  assert.equal(later.result, "敗");
  assert.equal(kept.hero, "娜塔亞");
  assert.equal(kept.minions, "34");
  assert.equal(kept.healing, "6077");
});

test("hourly sync prefers Garena and does not call AOVRanking", async () => {
  const store = createMemoryStore();
  const draft = sanitizeDocument({
    ...getDefaultDocument(),
    player: basePlayer(),
    newsPosts: [{ id: "draftpost", date: "2026-09-01", title: { zh: "草稿公告", en: "" }, body: { zh: "只在草稿", en: "" }, status: "draft" }],
  });
  const published = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.savePair(JSON.stringify(draft), JSON.stringify(published), "2026-09-25T00:00:00.000Z");
  const seen = [];
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_CODE: CODE,
    GARENA_PARTITION: "1012",
    GARENA_FETCH: garenaFetch(officialBody(), seen),
    AOV_FETCH: async () => {
      throw new Error("aov should not run");
    },
  });
  assert.equal(result.ok, true);
  assert.equal(result.stored, true);
  assert.equal(result.source, "garena");
  assert.equal(seen.length, 2);
  assert.equal(seen[0].headers["Access-Token"], TOKEN);
  assert.equal(seen[0].headers.Partition, "1012");
  const row = await store.get();
  const nextPublic = JSON.parse(row.published_json);
  const nextDraft = JSON.parse(row.draft_json);
  assert.equal(nextPublic.player.bio.zh, "手寫簡介");
  assert.equal(nextPublic.player.uid, "3678194289083498");
  assert.equal(nextPublic.player.builds[0].items[0], "破甲弓");
  assert.equal(nextPublic.player.matches.length, 2);
  const kept = nextPublic.player.matches.find((match) => match.playedAt === "2026-09-25 22:59:28");
  assert.equal(kept.externalMatchId, "1790313541-5675");
  assert.equal(kept.minions, "34");
  assert.equal(kept.note.zh, "保留這場筆記");
  assert.equal(kept.source, "aovweb");
  assert.equal(nextDraft.newsPosts[0].title.zh, "草稿公告");
  assert.notEqual(nextPublic.newsPosts[0]?.title?.zh, "草稿公告");
});

test("login_required falls back to AOVRanking and does not wipe the CMS", async () => {
  const store = createMemoryStore();
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_FETCH: async () => new Response(JSON.stringify({ error: "ERROR__LOGIN_REQUIRED" }), { status: 200 }),
    AOV_FETCH: async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.stored, false);
  assert.equal(result.code, "aov_challenge");
  assert.equal(result.garenaCode, "garena_login_required");
  const published = JSON.parse((await store.get()).published_json);
  assert.equal(published.player.matches.length, 1);
  assert.equal(published.player.matches[0].note.zh, "保留這場筆記");
  assert.equal(published.player.uid, "3678194289083498");
});

test("a mismatched Garena character is not imported", async () => {
  const store = createMemoryStore();
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await store.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const payload = officialBody();
  payload.character.characters[0].name = "someoneelse";
  const seen = [];
  const result = await syncOwnerFightHistory({
    CMS_STORE: store,
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_FETCH: garenaFetch(payload, seen),
    AOV_FETCH: async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } }),
  });
  assert.equal(result.stored, false);
  assert.equal(result.garenaCode, "garena_character_mismatch");
  assert.equal(seen.some((call) => String(call.url).endsWith("/api/game")), false);
  const published = JSON.parse((await store.get()).published_json);
  assert.equal(published.player.matches.length, 1);
  assert.equal(published.player.matches.some((match) => match.externalMatchId === "G011000"), false);
});

test("admin sync is session-only and runs the Garena path once", async () => {
  resetLoginFailuresForTests();
  const env = {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword("correct-horse"),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
    GARENA_ACCESS_TOKEN: TOKEN,
    GARENA_PARTITION: "1012",
    GARENA_FETCH: garenaFetch(officialBody()),
    AOV_FETCH: async () => {
      throw new Error("aov should not run");
    },
  };
  const doc = sanitizeDocument({ ...getDefaultDocument(), player: basePlayer() });
  await env.CMS_STORE.publish(JSON.stringify(doc), "2026-09-25T00:00:00.000Z");
  const guest = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/sync", {
      method: "POST",
      headers: { origin: "https://admin.moohsia.com", "content-type": "application/json" },
      body: "{}",
    }),
    env,
  );
  assert.equal(guest.status, 401);

  const loggedIn = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.77",
      },
      body: JSON.stringify({ username: "htw0702", password: "correct-horse" }),
    }),
    env,
  );
  const session = await loggedIn.json();
  const cookie = loggedIn.headers.get("set-cookie").split(";")[0];
  const synced = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/sync", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": session.csrf,
        "cf-connecting-ip": "203.0.113.77",
      },
      body: "{}",
    }),
    env,
  );
  const body = await synced.json();
  assert.equal(synced.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.garenaSync.source, "garena");
  assert.equal(body.draft.player.matches.length, 2);
  assert.equal(JSON.stringify(body).includes(TOKEN), false);
  const kept = body.draft.player.matches.find((match) => match.playedAt === "2026-09-25 22:59:28");
  assert.equal(kept.minions, "34");
  assert.equal(kept.note.zh, "保留這場筆記");
});
