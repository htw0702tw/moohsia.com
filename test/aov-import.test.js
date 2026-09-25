import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleAdmin } from "../shared/admin-api.js";
import {
  applyAovImport,
  fetchFightHistory,
  fightHistoryUrl,
  parseFightHistory,
} from "../shared/aov-import.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { hashPassword } from "../shared/password.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { cleanPlayer, emptyPlayer, toPublicPlayer } from "../shared/player.js";

const fixture = readFileSync(new URL("./fixtures/aov-fight-history.html", import.meta.url), "utf8");

test("fight history URL matches the verified AOVRanking GET", () => {
  assert.equal(
    fightHistoryUrl({ searchType: "playerName", keyword: "htw0702aov", server: "1012" }),
    "https://aovweb.azurewebsites.net/FightHistory/View?searchType=playerName&keyword=htw0702aov",
  );
  assert.equal(
    fightHistoryUrl({ searchType: "UID", keyword: "8800702", server: "1012" }),
    "https://aovweb.azurewebsites.net/FightHistory/View?searchType=UID&keyword=8800702&dwLogicWorldId=1012",
  );
  assert.equal(
    fightHistoryUrl({ searchType: "UID", keyword: "8800702", server: "1011" }),
    "https://aovweb.azurewebsites.net/FightHistory/View?searchType=UID&keyword=8800702&dwLogicWorldId=1011",
  );
});

test("fixture HTML maps list rows, summary, and expanded stats", () => {
  const parsed = parseFightHistory(fixture, { keyword: "htw0702aov" });
  assert.equal(parsed.matches.length, 3);
  assert.equal(parsed.summary.wins, "31");
  assert.equal(parsed.summary.losses, "19");
  assert.equal(parsed.summary.played, "50");
  assert.equal(parsed.summary.winRate, "62");
  assert.deepEqual(
    parsed.summary.heroes.map((hero) => hero.hero),
    ["娜塔亞", "克里希", "穆加爵"],
  );
  assert.equal(parsed.summary.heroes[0].matches, "44");
  assert.equal(parsed.summary.heroes[0].winRate, "61");
  assert.equal(parsed.summary.heroes[2].winRate, "0");
  assert.equal(parsed.matches.some((match) => match.playedAt.startsWith("1999")), false);

  const loss = parsed.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.ok(loss);
  assert.equal(loss.result, "失敗");
  assert.equal(loss.hero, "娜塔亞");
  assert.equal(loss.kills, "7");
  assert.equal(loss.deaths, "10");
  assert.equal(loss.assists, "5");
  assert.equal(loss.mode, "經典競技");
  assert.equal(loss.duration, "17:30");
  assert.equal(loss.playedAt, "2026-09-25 13:20:58");
  assert.equal(loss.damage, "125580");
  assert.equal(loss.taken, "117292");
  assert.equal(loss.gold, "9412");
  assert.equal(loss.minions, "30");
  assert.equal(loss.control, "8.382");
  assert.equal(loss.healing, "7964");
  assert.equal(loss.tower, "2743");
  assert.equal(loss.lane, "中路");
  assert.equal(loss.rankDelta, "-9");
  assert.equal(loss.reputation, "2");
  assert.equal(loss.powerDelta, "15");
  assert.equal(loss.source, "aovweb");
  assert.equal(loss.ownerSide, "blue");
  assert.equal(loss.winner, "red");
  const owner = loss.board.find((row) => row.owner);
  assert.equal(owner.ign, "htw0702aov");
  assert.equal(owner.hero, "娜塔亞");
  assert.equal(owner.kills, "7");
  assert.equal(owner.deaths, "10");
  assert.equal(owner.assists, "5");
  assert.equal(owner.items[0], "破甲弓");
  assert.equal(owner.level, "30");
  assert.equal(owner.badge, "永恆傳說");
  assert.equal(loss.board.filter((row) => row.side === "red").length, 1);

  const win = parsed.matches.find((match) => match.externalMatchId === "1790313000-1001");
  assert.equal(win.result, "勝利");
  assert.equal(win.kills, "14");
  assert.equal(win.deaths, "6");
  assert.equal(win.assists, "4");
  assert.equal(win.hero, "克里希");
  assert.equal(win.duration, "12:16");
  assert.equal(win.winner, "blue");

  const merged = cleanPlayer(
    applyAovImport(emptyPlayer(), parsed, {
      keyword: "htw0702aov",
      searchType: "playerName",
      server: "1012",
      syncedAt: "2026-09-25T13:40:00.000Z",
    }),
  );
  assert.equal(merged.handle, "htw0702aov");
  assert.equal(merged.uid, "8800702");
  assert.equal(merged.server.zh, "純潔之翼");
  assert.equal(merged.stats.played, "50");
  assert.equal(merged.stats.wins, "31");
  assert.equal(merged.stats.winRate, "62");
  assert.equal(merged.stats.kills, "21");
  assert.equal(merged.stats.deaths, "20");
  assert.equal(merged.stats.assists, "11");
  assert.equal(merged.stats.kda, "1.60");
  assert.equal(merged.stats.gold, "19491");
  assert.equal(merged.stats.damage, "290965");
  assert.equal(merged.signatureHeroes.zh, "娜塔亞、克里希、穆加爵");
  assert.equal(merged.heroPool[0].hero, "娜塔亞");
  assert.equal(merged.heroPool[0].matches, "44");
  assert.match(merged.heroPool[0].note.zh, /8\.2/);
  assert.equal(merged.matches[0].publish, false);
  assert.equal(merged.matches[0].control, "8.382");
  assert.equal(merged.aov.server, "1012");
  assert.equal(merged.aov.count, "3");
  assert.equal(toPublicPlayer(merged), null);
  const shown = toPublicPlayer(
    cleanPlayer({
      ...merged,
      publish: true,
      matches: merged.matches.map((match) => ({ ...match, publish: true })),
    }),
  );
  assert.equal(shown.matches[0].minions, "30");
  assert.equal(shown.matches[0].control, "8.382");
  assert.equal(shown.matches[0].healing, "7964");
  assert.equal(shown.matches[0].tower, "2743");
  assert.equal(shown.matches[0].rankDelta, "-9");
  assert.equal(shown.aov, undefined);

  const again = applyAovImport(
    {
      ...merged,
      matches: merged.matches.map((match) =>
        match.externalMatchId === "1790313541-5675"
          ? { ...match, publish: true, highlight: { caption: { zh: "保留", en: "" }, key: "hl/abcd1234ef", mime: "image/png", kind: "image" }, note: { zh: "手寫", en: "" } }
          : match,
      ),
    },
    parsed,
    { keyword: "htw0702aov", searchType: "playerName", server: "1012", syncedAt: "2026-09-25T13:41:00.000Z" },
  );
  assert.equal(again.matches.length, 3);
  const kept = again.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(kept.highlight.key, "hl/abcd1234ef");
  assert.equal(kept.note.zh, "手寫");
  assert.equal(kept.publish, true);
  assert.equal(kept.kills, "7");
});

test("fifty list rows stay separate and re-import updates by match id", () => {
  const rows = Array.from({ length: 50 }, (_, index) => {
    const minute = String(index % 60).padStart(2, "0");
    const win = index % 2 === 0;
    return `<div class="accordion-item player-match-item">
      <span class="badge">${win ? "勝利" : "失敗"}</span>
      <img alt="英雄${index}" />
      KDA: ${index} / 1 / 2 | 地圖: 經典競技 | 11分 ${minute}秒
      對局時間: 2026-09-25 10:${minute}:00
      對局ID：1790313${String(index).padStart(3, "0")}-5000
    </div>`;
  }).join("");
  const parsed = parseFightHistory(`<div>近 50 場對戰統計 勝場：25 敗場：25 50%</div>${rows}`, { keyword: "htw0702aov" });
  assert.equal(parsed.count, 50);
  assert.equal(new Set(parsed.matches.map((match) => match.externalMatchId)).size, 50);
  const sample = parsed.matches.find((match) => match.externalMatchId === "1790313007-5000");
  assert.equal(sample.kills, "7");
  assert.equal(sample.deaths, "1");
  assert.equal(sample.assists, "2");
  const stored = cleanPlayer(applyAovImport(emptyPlayer(), parsed, { keyword: "htw0702aov", server: "1012" }));
  assert.equal(stored.matches.length, 50);
  const second = applyAovImport(stored, parsed, { keyword: "htw0702aov", server: "1012" });
  assert.equal(second.matches.length, 50);
});

test("header-only HTML without accordion classes still parses", () => {
  const html = `<p>失敗 <img alt="娜塔亞"> KDA: 3 / 1 / 2 | 地圖: 經典競技 | 9分 01秒 對局時間: 2026-09-20 01:02:03 對局ID：1790000000-9</p>`;
  const parsed = parseFightHistory(html, { keyword: "htw0702aov" });
  assert.equal(parsed.matches.length, 1);
  assert.equal(parsed.matches[0].kills, "3");
  assert.equal(parsed.matches[0].hero, "娜塔亞");
  assert.equal(parsed.matches[0].duration, "9:01");
  assert.equal(parsed.matches[0].externalMatchId, "1790000000-9");
});

function challengeHtml() {
  return `<html><title>安全驗證 - AOVRanking</title><form id="turnstile-form"><div class="cf-turnstile"></div></form></html>`;
}

test("worker fetch reports the challenge page and accepts pasted HTML", async () => {
  const challenged = await fetchFightHistory(
    {
      AOV_FETCH: async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } }),
    },
    { searchType: "playerName", keyword: "htw0702aov", server: "1012" },
  );
  assert.equal(challenged.ok, false);
  assert.equal(challenged.code, "aov_challenge");

  let calls = 0;
  const limited = await fetchFightHistory(
    {
      AOV_SLEEP: async () => {},
      AOV_FETCH: async () => {
        calls += 1;
        return new Response("slow", { status: 429, headers: { "retry-after": "60" } });
      },
    },
    { searchType: "playerName", keyword: "htw0702aov", server: "1012" },
  );
  assert.equal(limited.code, "aov_rate_limited");
  assert.equal(calls, 1);

  calls = 0;
  const retried = await fetchFightHistory(
    {
      AOV_SLEEP: async () => {},
      AOV_FETCH: async () => {
        calls += 1;
        if (calls === 1) return new Response("slow", { status: 429, headers: { "retry-after": "1" } });
        return new Response(fixture, { status: 200, headers: { "content-type": "text/html" } });
      },
    },
    { searchType: "playerName", keyword: "htw0702aov", server: "1012" },
  );
  assert.equal(retried.ok, true);
  assert.equal(retried.count, 3);
  assert.equal(calls, 2);
});

async function adminSession() {
  resetLoginFailuresForTests();
  const env = {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword("correct-horse"),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
  };
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
  return { env, cookie: loggedIn.headers.get("set-cookie").split(";")[0], csrf: session.csrf };
}

test("admin import is session-only and does not publish by itself", async () => {
  const guest = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: { origin: "https://admin.moohsia.com", "content-type": "application/json" },
      body: JSON.stringify({ html: fixture, keyword: "htw0702aov" }),
    }),
    { ADMIN_SESSION_SECRET: "test-session-secret-value", ADMIN_PASSWORD_HASH: await hashPassword("correct-horse") },
  );
  assert.equal(guest.status, 401);

  const { env, cookie, csrf } = await adminSession();
  env.AOV_FETCH = async () => {
    throw new Error("network down");
  };
  const blocked = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": csrf,
        "cf-connecting-ip": "203.0.113.41",
      },
      body: JSON.stringify({ searchType: "playerName", keyword: "htw0702aov", server: "1012" }),
    }),
    env,
  );
  assert.equal(blocked.status, 502);
  assert.equal((await blocked.json()).code, "aov_blocked");

  const pasted = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": csrf,
        "cf-connecting-ip": "203.0.113.41",
      },
      body: JSON.stringify({ searchType: "playerName", keyword: "htw0702aov", server: "1012", html: fixture }),
    }),
    env,
  );
  const body = await pasted.json();
  assert.equal(pasted.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.fetched, false);
  assert.equal(body.count, 3);
  assert.equal(body.matches[0].publish, false);
  assert.equal(JSON.stringify(body).includes("correct-horse"), false);
});
