import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { handleAdmin } from "../shared/admin-api.js";
import {
  aovPageStatus,
  applyAovImport,
  fetchFightHistory,
  fightHistoryUrl,
  parseFightHistory,
  pastedFightHistory,
} from "../shared/aov-import.js";
import worker from "../worker/index.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { hashPassword } from "../shared/password.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { cleanPlayer, emptyPlayer, toPublicPlayer } from "../shared/player.js";

const fixture = readFileSync(new URL("./fixtures/aov-fight-history.html", import.meta.url), "utf8");
const headerFixture = readFileSync(new URL("./fixtures/aov-fight-history-headers.html", import.meta.url), "utf8");
const expandedFixture = readFileSync(new URL("./fixtures/aov-fight-history-expanded.html", import.meta.url), "utf8");

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
  assert.equal(loss.result, "敗");
  assert.equal(loss.kda, "7 / 10 / 5");
  assert.equal(loss.hero, "娜塔亞");
  assert.equal(loss.kills, "7");
  assert.equal(loss.deaths, "10");
  assert.equal(loss.assists, "5");
  assert.equal(loss.mode, "排位賽");
  assert.equal(loss.map, "經典競技");
  assert.equal(loss.mvp, false);
  assert.equal(loss.badges.gold, true);
  assert.equal(loss.badges.penta, false);
  assert.match(loss.note.zh, /AOVRanking 地圖：經典競技/);
  assert.equal(loss.note.zh.includes("記分板只有自己"), false);
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
  assert.equal(owner.side, "blue");
  assert.equal(owner.heroDamagePct, "32.1");
  assert.equal(owner.takenPct, "34.0");
  assert.equal(owner.teamfightCount, "9");
  assert.equal(owner.teamfightRate, "47.4");
  assert.equal(owner.damageRatio, "1.70");
  assert.equal(owner.takenPer, "16407");
  assert.equal(owner.gpm, "538");
  assert.equal(loss.board.filter((row) => row.side === "blue").length, 2);
  assert.equal(loss.board.filter((row) => row.side === "red").length, 1);

  const win = parsed.matches.find((match) => match.externalMatchId === "1790313000-1001");
  assert.equal(win.result, "勝");
  assert.equal(win.kda, "14 / 6 / 4");
  assert.equal(win.kills, "14");
  assert.equal(win.deaths, "6");
  assert.equal(win.assists, "4");
  assert.equal(win.hero, "克里希");
  assert.equal(win.duration, "12:16");
  assert.equal(win.ownerSide, "red");
  assert.equal(win.winner, "red");
  assert.equal(win.mvp, true);
  assert.equal(win.mode, "排位賽");
  assert.equal(win.map, "經典競技");
  assert.equal(win.board.find((row) => row.owner).side, "red");
  assert.equal(win.board.find((row) => row.side === "blue").hero, "薇菈");

  const bare = parsed.matches.find((match) => match.externalMatchId === "1790200000-42");
  assert.equal(bare.result, "敗");
  assert.equal(bare.kda, "0 / 4 / 2");
  assert.equal(bare.kills, "0");
  assert.equal(bare.deaths, "4");
  assert.equal(bare.assists, "2");
  assert.equal(bare.mode, "排位賽");
  assert.equal(bare.map, "經典競技");
  assert.equal(bare.ownerSide, "blue");
  assert.equal(bare.winner, "red");
  assert.equal(bare.board.length, 1);
  assert.equal(bare.board[0].owner, true);
  assert.equal(bare.board[0].ign, "htw0702aov");
  assert.equal(bare.board[0].hero, "穆加爵");
  assert.equal(bare.board[0].kills, "0");
  assert.equal(bare.board[0].deaths, "4");
  assert.equal(bare.board[0].assists, "2");
  assert.equal(parsed.boardPartial, true);

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
  assert.equal(merged.stats.mvp, "1");
  assert.equal(merged.seasons.length, 1);
  assert.equal(merged.seasons[0].mode, "排位賽");
  assert.equal(merged.seasons[0].played, "50");
  assert.equal(merged.seasons[0].wins, "31");
  assert.equal(merged.seasons[0].winRate, "62");
  assert.equal(merged.seasons[0].mvp, "1");
  assert.equal(merged.seasons[0].medals.gold, "1");
  assert.equal(merged.seasons[0].medals.penta, "");
  assert.equal(merged.seasons[0].radar.output, "");
  assert.equal(merged.seasons[0].radar.survival, "");
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

  const keptSeason = applyAovImport(
    {
      ...emptyPlayer(),
      seasons: [
        {
          id: "keepseason1",
          label: "",
          mode: "排位賽",
          radar: { output: "90", kda: "", farm: "", teamfight: "", survival: "" },
          played: "",
          wins: "",
          winRate: "",
          mvp: "12",
          medals: { godlike: "", penta: "", quadra: "", triple: "", supreme: "", gold: "4", silver: "", loseMvp: "" },
        },
      ],
    },
    parsed,
    { keyword: "htw0702aov", searchType: "playerName", server: "1012" },
  );
  const season = cleanPlayer(keptSeason).seasons[0];
  assert.equal(season.radar.output, "90");
  assert.equal(season.mvp, "12");
  assert.equal(season.medals.gold, "4");
  assert.equal(season.played, "50");
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
  assert.equal(sample.result, "敗");
  assert.equal(sample.kda, "7 / 1 / 2");
  assert.equal(sample.kills, "7");
  assert.equal(sample.deaths, "1");
  assert.equal(sample.assists, "2");
  assert.equal(sample.mode, "排位賽");
  assert.equal(sample.map, "經典競技");
  assert.equal(sample.board.length, 1);
  assert.equal(sample.board[0].kills, "7");
  assert.equal(sample.board[0].deaths, "1");
  assert.equal(sample.board[0].assists, "2");
  const stored = cleanPlayer(applyAovImport(emptyPlayer(), parsed, { keyword: "htw0702aov", server: "1012" }));
  assert.equal(stored.matches.length, 50);
  const second = applyAovImport(stored, parsed, { keyword: "htw0702aov", server: "1012" });
  assert.equal(second.matches.length, 50);
});

test("AOVRanking map labels map onto catalog modes", () => {
  const page = (mode) =>
    `<div class="accordion-item player-match-item"><span class="badge">勝利</span><img alt="娜塔亞" /> KDA: 1 / 2 / 3 | 地圖: ${mode} | 9分 01秒 對局時間: 2026-09-20 01:02:03 對局ID：1790000001-1</div>`;
  assert.equal(parseFightHistory(page("經典競技"), { keyword: "htw0702aov" }).matches[0].mode, "排位賽");
  assert.equal(parseFightHistory(page("競賽模式"), { keyword: "htw0702aov" }).matches[0].mode, "排位賽");
  assert.equal(parseFightHistory(page("傳說之巔"), { keyword: "htw0702aov" }).matches[0].mode, "巔峰對決");
  assert.equal(parseFightHistory(page("冠軍賽"), { keyword: "htw0702aov" }).matches[0].mode, "冠軍賽");
  assert.equal(parseFightHistory(page("5V5經典競技"), { keyword: "htw0702aov" }).matches[0].mode, "5V5經典競技");
  const radar = parseFightHistory(
    `<p>雷達 輸出 82 KDA 71 發育 64 團戰 58 生存 49</p>${page("經典競技")}`,
    { keyword: "htw0702aov" },
  );
  assert.equal(radar.summary.radar.output, "82");
  assert.equal(radar.summary.radar.kda, "71");
  assert.equal(radar.summary.radar.survival, "49");
  const stored = cleanPlayer(applyAovImport(emptyPlayer(), radar, { keyword: "htw0702aov", server: "1012" }));
  assert.equal(stored.seasons[0].radar.output, "82");
  assert.equal(stored.seasons[0].radar.farm, "64");
  assert.equal(stored.seasons[0].radar.teamfight, "58");
});

test("header-only HTML without accordion classes still parses", () => {
  const html = `<p>失敗 <img alt="娜塔亞"> KDA: 3 / 1 / 2 | 地圖: 經典競技 | 9分 01秒 對局時間: 2026-09-20 01:02:03 對局ID：1790000000-9</p>`;
  const parsed = parseFightHistory(html, { keyword: "htw0702aov" });
  assert.equal(parsed.matches.length, 1);
  assert.equal(parsed.matches[0].result, "敗");
  assert.equal(parsed.matches[0].kda, "3 / 1 / 2");
  assert.equal(parsed.matches[0].kills, "3");
  assert.equal(parsed.matches[0].deaths, "1");
  assert.equal(parsed.matches[0].assists, "2");
  assert.equal(parsed.matches[0].mode, "排位賽");
  assert.equal(parsed.matches[0].map, "經典競技");
  assert.equal(parsed.matches[0].hero, "娜塔亞");
  assert.equal(parsed.matches[0].duration, "9:01");
  assert.equal(parsed.matches[0].externalMatchId, "1790000000-9");
  assert.equal(parsed.matches[0].board.length, 1);
  assert.equal(parsed.matches[0].board[0].owner, true);
});

function challengeHtml() {
  return `<html><title>&#x5B89;&#x5168;&#x9A57;&#x8B49; - AOVRanking</title><h1 id="turnstile-title">安全驗證</h1><form id="turnstile-form" action="/AntiCrawler/Turnstile/Verify"><div class="cf-turnstile"></div></form></html>`;
}

test("challenge pages are detected even when the title is HTML entities", () => {
  assert.equal(aovPageStatus(200, challengeHtml()), "challenge");
  assert.equal(aovPageStatus(200, "<title>&#x5B89;&#x5168;&#x9A57;&#x8B49; - AOVRanking</title><p>請完成驗證</p>"), "challenge");
  assert.equal(aovPageStatus(200, "<html><title>Just a moment...</title><div class=\"cf-browser-verification\"></div></html>"), "challenge");
  assert.equal(aovPageStatus(200, fixture), "");
  assert.equal(aovPageStatus(200, `${fixture}<div class="cf-turnstile"></div>`), "");
  assert.equal(aovPageStatus(403, "<html>forbidden</html>"), "blocked");
  assert.equal(aovPageStatus(200, ""), "empty");
});

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

  env.AOV_FETCH = async () => new Response(challengeHtml(), { status: 200, headers: { "content-type": "text/html" } });
  const challenged = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": csrf,
        "cf-connecting-ip": "203.0.113.42",
      },
      body: JSON.stringify({ searchType: "playerName", keyword: "htw0702aov", server: "1012" }),
    }),
    env,
  );
  assert.equal(challenged.status, 502);
  assert.equal((await challenged.json()).code, "aov_challenge");

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

function fiftyHistoryPage() {
  const rows = Array.from({ length: 50 }, (_, index) => {
    const minute = String(index % 60).padStart(2, "0");
    const second = String(index % 60).padStart(2, "0");
    const win = index % 2 === 0;
    return `<div class="accordion-item player-match-item">
      <button class="accordion-button" type="button">
        <span class="badge ${win ? "bg-success" : "bg-danger"}">${win ? "勝利" : "失敗"}</span>
        <img alt="娜塔亞" />
        KDA: ${index} / 1 / 2 | 地圖: 經典競技 | 11分 ${minute}秒
        <span>對局時間: 2026-09-25 10:${minute}:${second}</span>
      </button>
      <p>對局ID：1790313${String(index).padStart(3, "0")}-5000</p>
      <h3>我方隊伍</h3>
      <table>
        <tr><th>玩家</th><th>英雄</th><th>KDA</th><th>經濟</th></tr>
        <tr><td>htw0702aov<br />UID: 8800702<br />Lv.30</td><td>娜塔亞</td><td>${index} / 1 / 2</td><td>9412</td></tr>
      </table>
    </div>`;
  }).join("");
  return `<!DOCTYPE html><html lang="zh-Hant"><head><title>歷史戰績 - AOVRanking</title></head><body>
    <!-- ${"x".repeat(340_000)} -->
    <section class="summary">
      <p>常用英雄：</p>
      <div><img alt="娜塔亞" /> 娜塔亞 (44 場，勝率 61%)<br />K/D/A：8.2 / 4.9 / 5.0</div>
      <h3>近 50 場對戰統計</h3>
      <p>勝場：25</p>
      <p>敗場：25</p>
      <div class="donut">50%</div>
    </section>
    <div class="accordion" id="history">${rows}</div>
  </body></html>`;
}

test("pasted history page in the real accordion shape imports fifty matches", async () => {
  const html = fiftyHistoryPage();
  assert.ok(html.length > 300_000);
  const parsed = parseFightHistory(html, { keyword: "htw0702aov" });
  assert.equal(parsed.count, 50);

  const { env, cookie, csrf } = await adminSession();
  const response = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": csrf,
        "cf-connecting-ip": "203.0.113.50",
      },
      body: JSON.stringify({ searchType: "playerName", keyword: "htw0702aov", server: "1012", html }),
    }),
    env,
  );
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.fetched, false);
  assert.equal(body.count, 50);
  assert.equal(body.matches.length, 50);
  assert.equal(new Set(body.matches.map((match) => match.externalMatchId)).size, 50);
  assert.equal(body.boardPartial, false);
  const opened = body.matches.find((match) => match.externalMatchId === "1790313000-5000");
  assert.equal(opened.result, "勝");
  assert.equal(opened.kda, "0 / 1 / 2");
  assert.equal(opened.kills, "0");
  assert.equal(opened.deaths, "1");
  assert.equal(opened.assists, "2");
  assert.equal(opened.mode, "排位賽");
  assert.equal(opened.map, "經典競技");
  assert.ok(opened.board.length >= 1);
});

test("header-only accordion keeps 勝/敗 and header KDA without inventing a full team", () => {
  const parsed = parseFightHistory(headerFixture, { keyword: "htw0702aov" });
  assert.equal(parsed.count, 2);
  assert.equal(parsed.boardPartial, true);
  assert.equal(parsed.summary.heroes[0].kdaText.includes("8.2"), true);

  const loss = parsed.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(loss.result, "敗");
  assert.equal(loss.kda, "7 / 10 / 5");
  assert.equal(loss.kills, "7");
  assert.equal(loss.deaths, "10");
  assert.equal(loss.assists, "5");
  assert.equal(loss.mode, "排位賽");
  assert.equal(loss.map, "經典競技");
  assert.equal(loss.hero, "娜塔亞");
  assert.equal(loss.duration, "17:30");
  assert.equal(loss.playedAt, "2026-09-25 13:20:58");
  assert.equal(loss.ownerSide, "blue");
  assert.equal(loss.winner, "red");
  assert.equal(loss.board.length, 1);
  assert.equal(loss.board[0].owner, true);
  assert.equal(loss.board[0].side, "blue");
  assert.equal(loss.board[0].ign, "htw0702aov");
  assert.equal(loss.board[0].hero, "娜塔亞");
  assert.equal(loss.board[0].kills, "7");
  assert.equal(loss.board[0].deaths, "10");
  assert.equal(loss.board[0].assists, "5");
  assert.match(loss.note.zh, /AOVRanking 地圖：經典競技/);
  assert.match(loss.note.zh, /記分板只有自己的 KDA/);

  const win = parsed.matches.find((match) => match.externalMatchId === "1790313000-1001");
  assert.equal(win.result, "勝");
  assert.equal(win.kda, "14 / 6 / 4");
  assert.equal(win.kills, "14");
  assert.equal(win.deaths, "6");
  assert.equal(win.assists, "4");
  assert.equal(win.mode, "排位賽");
  assert.equal(win.winner, "blue");
  assert.equal(win.board.length, 1);
  assert.equal(win.note.zh.includes("地圖"), false);
  assert.match(win.note.zh, /記分板只有自己的 KDA/);

  const stored = cleanPlayer(applyAovImport(emptyPlayer(), parsed, { keyword: "htw0702aov", server: "1012" }));
  const kept = stored.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(kept.result, "敗");
  assert.equal(kept.kda, "7 / 10 / 5");
  assert.equal(kept.board.length, 1);
  assert.equal(kept.board[0].kills, "7");
  assert.equal(kept.board[0].deaths, "10");
  assert.equal(kept.board[0].assists, "5");
});

test("expanded accordion tables fill both teams and the owner row", () => {
  assert.equal(expandedFixture.includes("ticket="), false);
  assert.equal(expandedFixture.includes("CfDJ"), false);
  const pasted = pastedFightHistory(expandedFixture, { keyword: "htw0702aov" });
  assert.equal(pasted.ok, true);
  assert.equal(pasted.count, 2);
  assert.equal(pasted.boardPartial, true);
  assert.equal(pasted.summary.wins, "31");
  assert.equal(pasted.summary.played, "50");
  assert.equal(pasted.summary.uid, "3678194289083498");

  const loss = pasted.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(loss.result, "敗");
  assert.equal(loss.mode, "排位賽");
  assert.equal(loss.map, "經典競技");
  assert.equal(loss.hero, "娜塔亞");
  assert.equal(loss.kda, "7 / 10 / 5");
  assert.equal(loss.kills, "7");
  assert.equal(loss.deaths, "10");
  assert.equal(loss.assists, "5");
  assert.equal(loss.ownerSide, "red");
  assert.equal(loss.winner, "blue");
  assert.equal(loss.gold, "9412");
  assert.equal(loss.damage, "125580");
  assert.equal(loss.taken, "117292");
  assert.equal(loss.minions, "30");
  assert.equal(loss.control, "8.382");
  assert.equal(loss.healing, "7964");
  assert.equal(loss.tower, "2743");
  assert.equal(loss.lane, "中路");
  assert.equal(loss.rankDelta, "-100");
  assert.equal(loss.powerDelta, "-18");
  assert.equal(loss.reputation, "100");
  assert.equal(loss.board.length, 10);
  assert.equal(loss.board.filter((row) => row.side === "blue").length, 5);
  assert.equal(loss.board.filter((row) => row.side === "red").length, 5);
  assert.equal(loss.note.zh.includes("記分板只有自己"), false);
  const owner = loss.board.find((row) => row.owner);
  assert.equal(loss.board.filter((row) => row.owner).length, 1);
  assert.equal(owner.ign, "htw0702aov");
  assert.equal(owner.hero, "娜塔亞");
  assert.equal(owner.side, "red");
  assert.equal(owner.kills, "7");
  assert.equal(owner.deaths, "10");
  assert.equal(owner.assists, "5");
  assert.equal(owner.score, "8.7");
  assert.equal(owner.items[0], "裝備 1423");
  assert.equal(owner.items[5], "裝備 1242");
  assert.equal(owner.heroDamage, "125580");
  assert.equal(owner.heroDamagePct, "27.4");
  assert.equal(owner.taken, "117292");
  assert.equal(owner.takenPct, "27.9");
  assert.equal(owner.gold, "9412");
  assert.equal(owner.minions, "30");
  assert.equal(owner.control, "8.382");
  assert.equal(owner.healing, "7964");
  assert.equal(owner.tower, "2743");
  assert.equal(owner.lane, "中路");
  assert.equal(owner.rankDelta, "-100");
  assert.equal(owner.powerDelta, "-18");
  assert.equal(owner.reputation, "100");
  assert.equal(owner.level, "15");
  assert.equal(owner.uid, undefined);
  assert.equal(loss.board[0].side, "blue");
  assert.equal(loss.board[0].hero, "弗洛倫");
  assert.equal(loss.board[0].ign, "藍方一");

  const collapsed = pasted.matches.find((match) => match.kda === "14 / 6 / 4");
  assert.equal(collapsed.result, "勝");
  assert.equal(collapsed.mode, "排位賽");
  assert.equal(collapsed.board.length, 1);
  assert.equal(collapsed.board[0].owner, true);
  assert.equal(collapsed.board[0].kills, "14");
  assert.match(collapsed.note.zh, /記分板只有自己的 KDA/);

  const stored = cleanPlayer(
    applyAovImport(emptyPlayer(), pasted, { keyword: "htw0702aov", searchType: "playerName", server: "1012" }),
  );
  const kept = stored.matches.find((match) => match.externalMatchId === "1790313541-5675");
  assert.equal(kept.ownerSide, "red");
  assert.equal(kept.winner, "blue");
  assert.equal(kept.kda, "7 / 10 / 5");
  assert.equal(kept.board.length, 10);
  assert.equal(kept.board.find((row) => row.owner).powerDelta, "-18");
  assert.equal(kept.board.find((row) => row.owner).rankDelta, "-100");
  assert.equal(stored.uid, "3678194289083498");
});

test("pasted challenge page and view-source shell are distinct errors", async () => {
  const shell = `<!DOCTYPE html><html><head><title>歷史戰績 - AOVRanking</title></head><body><div class="accordion" id="history"></div><p>FightHistory</p></body></html>`;
  const { env, cookie, csrf } = await adminSession();
  const headers = {
    origin: "https://admin.moohsia.com",
    "content-type": "application/json",
    cookie,
    "x-csrf-token": csrf,
    "cf-connecting-ip": "203.0.113.60",
  };
  const challenged = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers,
      body: JSON.stringify({ html: challengeHtml(), keyword: "htw0702aov" }),
    }),
    env,
  );
  assert.equal(challenged.status, 422);
  assert.equal((await challenged.json()).code, "aov_challenge");

  const emptyShell = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: { ...headers, "cf-connecting-ip": "203.0.113.61" },
      body: JSON.stringify({ html: shell, keyword: "htw0702aov" }),
    }),
    env,
  );
  assert.equal(emptyShell.status, 422);
  assert.equal((await emptyShell.json()).code, "aov_shell");

  const unrelated = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/aov/import", {
      method: "POST",
      headers: { ...headers, "cf-connecting-ip": "203.0.113.62" },
      body: JSON.stringify({ html: "<p>這只是一段夠長的說明文字，沒有對局列表，也不是那個戰績站的頁面。</p>", keyword: "htw0702aov" }),
    }),
    env,
  );
  assert.equal(unrelated.status, 422);
  assert.equal((await unrelated.json()).code, "aov_empty");

  const fetched = await fetchFightHistory(
    { AOV_FETCH: async () => new Response(shell, { status: 200, headers: { "content-type": "text/html" } }) },
    { searchType: "playerName", keyword: "htw0702aov", server: "1012" },
  );
  assert.equal(fetched.ok, false);
  assert.equal(fetched.code, "aov_shell");

  const viewSource = `<!DOCTYPE html><html><body>
    <div id="aov-protected-query-root">正在載入歷史戰績…</div>
    <div id="aov-protected-query-result" data-query-result=""></div>
    <script src="/_aov/releases/fight-history.bundle.js"></script>
    <div class="cf-turnstile"></div>
  </body></html>`;
  const protectedShell = pastedFightHistory(viewSource, { keyword: "htw0702aov" });
  assert.equal(protectedShell.ok, false);
  assert.equal(protectedShell.code, "aov_shell");
  const loaded = pastedFightHistory(
    `<div id="aov-protected-query-root"><div id="aov-protected-query-result" data-query-result="">
      <div class="accordion-item player-match-item"><span class="badge">失敗</span><img alt="娜塔亞" />
      KDA: 7 / 10 / 5 | 地圖: 經典競技 | 17分 30秒 對局時間: 2026-09-25 13:20:58 對局ID：1790313541-5675
      </div></div></div>`,
    { keyword: "htw0702aov" },
  );
  assert.equal(loaded.ok, true);
  assert.equal(loaded.matches[0].result, "敗");
  assert.equal(loaded.matches[0].kda, "7 / 10 / 5");
});

test("admin paste box does not write stored HTML back into the page", () => {
  const ui = readFileSync(new URL("../admin/main.js", import.meta.url), "utf8");
  assert.match(ui, /data-aov="html"/);
  assert.match(ui, /querySelector\("\[data-aov=html\]"\)/);
  assert.match(ui, /data-aov-file/);
  assert.match(ui, /已貼上 \$\{text\.length\} 字元，可按匯入/);
  assert.match(ui, /記分板只填自己的 KDA/);
  assert.doesNotMatch(ui, /\$\{esc\(form\.html\)\}/);
  assert.doesNotMatch(ui, /<textarea data-aov="html"[^>]*>\$\{/);
});

test("admin API crashes return a JSON code and do not log the error text", async () => {
  const logs = [];
  const original = console.error;
  console.error = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const response = await worker.fetch(
      new Request("https://admin.moohsia.com/api/admin/aov/import", { method: "POST" }),
      new Proxy(
        {},
        {
          get() {
            throw new Error("boom-secret");
          },
        },
      ),
    );
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
    assert.deepEqual(await response.json(), { ok: false, code: "server_error" });
  } finally {
    console.error = original;
  }
  const blob = logs.join("\n");
  assert.equal(blob.includes("boom-secret"), false);
  assert.match(blob, /worker_error/);
});
