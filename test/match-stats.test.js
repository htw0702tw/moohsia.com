import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getDefaultDocument } from "../src/content.js";
import { RADAR_SCALE, computeMatchStats, matchRow } from "../shared/match-stats.js";
import { cleanPlayer, defaultGameSnapshot, emptyPlayer, toPublicPlayer } from "../shared/player.js";

const page = getDefaultDocument().copy.zh.player;

function side(name, kills, gold, damage, extra = {}) {
  return { side: "blue", hero: name, ign: `隊員${name}`, kills: String(kills), deaths: "2", assists: "3", gold: String(gold), heroDamage: String(damage), ...extra };
}

/** Owner on blue with four teammates (names must never reach the charts). */
function match(partial = {}, owner = {}) {
  const me = {
    side: "blue",
    owner: true,
    hero: "娜塔亞",
    ign: "htw0702aov",
    kills: "6",
    deaths: "4",
    assists: "4",
    gold: "10000",
    heroDamage: "30000",
    heroDamagePct: "30",
    score: "9.5",
    mvp: false,
    ...owner,
  };
  return {
    result: "勝",
    mode: "排位賽",
    map: "經典競技",
    playedAt: "2026-09-21 21:10:00",
    badges: { godlike: false, penta: false, quadra: false, triple: false, supreme: false, gold: false, silver: false, loseMvp: false },
    board: [
      me,
      side("甲", 2, 10000, 20000),
      side("乙", 2, 10000, 20000),
      side("丙", 5, 10000, 20000),
      side("丁", 5, 10000, 10000),
      { side: "red", hero: "敵", ign: "別公會的人", kills: "9", deaths: "5", assists: "1", gold: "12000", heroDamage: "50000" },
    ],
    ...partial,
  };
}

test("owner row feeds shares, participation and KDA", () => {
  const row = matchRow(match());
  assert.equal(row.hero, "娜塔亞");
  assert.equal(row.win, true);
  assert.equal(row.kda, 2.5);
  assert.equal(row.damagePct, 30);
  assert.equal(row.goldPct, 20);
  // (6 + 4) / (6 + 2 + 2 + 5 + 5)
  assert.equal(row.killPart, 50);
  assert.equal(row.hour, 21);
  assert.equal(row.weekday, 0); // 2026-09-21 is a Monday
  assert.equal(row.day, "2026-09-21");
});

test("summary, radar formula, trends, heroes, modes and time buckets", () => {
  const matches = [
    match({ playedAt: "2026-09-20 10:00:00", result: "敗" }, { kills: "2", deaths: "8", assists: "2", mvp: true, heroDamagePct: "20" }),
    match({ playedAt: "2026-09-21 21:10:00" }),
    match({ playedAt: "2026-09-22 21:40:00", map: "競賽模式" }, { hero: "穆加爵" }),
    match({ playedAt: "2026-09-23 23:05:00", mvp: true }),
  ];
  const stats = computeMatchStats(matches, { window: 2 });
  assert.equal(stats.total, 4);
  assert.equal(stats.summary.games, 4);
  assert.equal(stats.summary.wins, 3);
  assert.equal(stats.summary.losses, 1);
  assert.equal(stats.summary.rate, 75);
  assert.equal(stats.summary.mvp, 2);
  assert.equal(stats.summary.loseMvp, 1);
  // (20 + 14) / 20
  assert.equal(stats.summary.kda, 1.7);
  assert.equal(stats.summary.avgDeaths, 5);
  assert.equal(stats.summary.avgScore, 9.5);
  assert.equal(stats.summary.badges, null, "all-false badge flags are treated as missing, not zero");

  const { values, raw, ok } = stats.radar;
  assert.equal(ok, true);
  assert.equal(raw.damagePct, 27.5);
  assert.equal(values.output, Math.round((27.5 / RADAR_SCALE.output) * 100));
  assert.equal(values.kda, Math.round((1.7 / RADAR_SCALE.kda) * 100));
  assert.equal(values.farm, Math.round((20 / RADAR_SCALE.farm) * 100));
  assert.equal(values.survival, 100 - RADAR_SCALE.survival * 5);
  assert.ok(values.teamfight > 0 && values.teamfight <= 100);

  assert.deepEqual(stats.winTrend.map((point) => point.rolling), [0, 50, 100, 100]);
  assert.deepEqual(stats.winTrend.map((point) => point.cumulative), [0, 50, 66.7, 75]);
  assert.equal(stats.winTrend[0].label, "09/20 10:00");
  assert.equal(stats.kdaTrend.length, 4);
  assert.deepEqual(stats.kdaTrend[0], { label: "09/20 10:00", win: false, kills: 2, deaths: 8, assists: 2, kda: 0.5 });

  assert.deepEqual(stats.heroes[0], { hero: "娜塔亞", games: 3, wins: 2, losses: 1, share: 75, rate: 66.7 });
  assert.deepEqual(stats.heroes[1], { hero: "穆加爵", games: 1, wins: 1, losses: 0, share: 25, rate: 100 });
  assert.deepEqual(stats.modes.map((row) => [row.mode, row.games]), [["排位賽 · 經典競技", 3], ["排位賽 · 競賽模式", 1]]);
  assert.equal(stats.hours[21].games, 2);
  assert.equal(stats.hours[23].wins, 1);
  assert.equal(stats.weekdays[6].games, 1); // Sunday 09-20
  assert.equal(stats.weekdays.reduce((sum, day) => sum + day.games, 0), 4);

  const text = JSON.stringify(stats);
  for (const name of ["隊員甲", "隊員丁", "別公會的人", "htw0702aov"]) assert.equal(text.includes(name), false, name);
});

test("season filter keeps the total and counts only matches from the start date", () => {
  const matches = [
    match({ playedAt: "2026-09-10 12:00:00", result: "敗" }),
    match({ playedAt: "2026-09-16 12:00:00" }),
    match({ playedAt: "2026-09-26 12:00:00" }),
  ];
  const stats = computeMatchStats(matches, { since: "2026-09-15" });
  assert.equal(stats.total, 3);
  assert.equal(stats.summary.games, 2);
  assert.equal(stats.summary.rate, 100);
  assert.equal(computeMatchStats(matches, { since: "bogus" }).summary.games, 3);
});

test("badge counts appear once the source flags any badge", () => {
  const stats = computeMatchStats([
    match({ badges: { penta: true, gold: true } }),
    match({ badges: { triple: true } }),
    match(),
  ]);
  assert.equal(stats.summary.badges.penta, 1);
  assert.equal(stats.summary.badges.triple, 1);
  assert.equal(stats.summary.badges.gold, 1);
  assert.equal(stats.summary.badges.godlike, 0);
});

test("missing fields skip one chart, not the whole tab", async () => {
  globalThis.document = { documentElement: { lang: "zh-Hant" } };
  const { renderChartsTab } = await import("../src/charts-view.js");
  const bare = [
    { result: "勝", hero: "娜塔亞", mode: "排位賽", playedAt: "2026-09-21 21:00:00" },
    { result: "敗", hero: "娜塔亞", mode: "排位賽", playedAt: "2026-09-22 21:00:00" },
  ];
  const stats = computeMatchStats(bare);
  assert.equal(stats.radar.ok, false);
  assert.deepEqual(stats.kdaTrend, []);
  assert.equal(stats.winTrend.length, 2);
  const html = renderChartsTab(page, { matches: bare, gameSnapshot: defaultGameSnapshot() }, {});
  assert.match(html, /勝率走勢/);
  assert.match(html, /英雄使用比例/);
  assert.match(html, /同步的對局沒有這項欄位/);
  assert.doesNotMatch(html, /這個範圍還沒有對局/);
});

test("charts tab renders real charts and the in-game reference card", async () => {
  globalThis.document = { documentElement: { lang: "zh-Hant" } };
  const { renderChartsTab } = await import("../src/charts-view.js");
  const matches = Array.from({ length: 30 }, (_, index) =>
    match({ playedAt: `2026-09-${String(1 + (index % 27)).padStart(2, "0")} ${String(10 + (index % 12)).padStart(2, "0")}:00:00`, result: index % 3 ? "勝" : "敗" }),
  );
  const player = { matches, gameSnapshot: defaultGameSnapshot() };
  const html = renderChartsTab(page, player, {});
  assert.match(html, /class="chart-radar"/);
  assert.match(html, /輸出＝平均輸出占全隊比/);
  assert.match(html, /勝率走勢/);
  assert.match(html, /每場 K \/ D \/ A/);
  assert.match(html, /英雄使用比例/);
  assert.match(html, /時段分布/);
  assert.match(html, /本站已同步的 30 場/);
  assert.match(html, /遊戲內對戰資料（參考）/);
  assert.match(html, /2026-09-27 · 排位賽/);
  assert.match(html, /<b>96<\/b><span>場次/);
  assert.match(html, /<b>64\.6%<\/b>/);
  assert.match(html, /<b>28<\/b><span>五殺/);
  assert.match(html, /<b>12<\/b><span>超神/);
  assert.match(html, /<b>56\.8%<\/b>/);
  assert.match(html, /2026-S4賽季/);
  assert.equal((html.match(/class="chart-scroll"/g) || []).length >= 2, true);
  assert.doesNotMatch(html, /data-chart-season="season"/, "no season button without a start date");
  for (const name of ["隊員甲", "別公會的人"]) assert.equal(html.includes(name), false);

  const seasonal = { matches, gameSnapshot: { ...defaultGameSnapshot(), seasonStart: "2026-09-15" } };
  const filtered = renderChartsTab(page, seasonal, { chartSeason: "season" });
  assert.match(filtered, /data-chart-season="season"/);
  assert.match(filtered, /class="is-on" data-chart-season="season"/);
  assert.match(filtered, /2026-09-15 起的對局/);
});

test("game snapshot: code default, admin edits, cleared stays cleared, public copy", () => {
  const fallback = cleanPlayer({ publish: true, handle: "htw0702aov" });
  assert.deepEqual(fallback.gameSnapshot, defaultGameSnapshot());
  assert.equal(fallback.gameSnapshot.rows[0].penta, "28");
  assert.equal(fallback.gameSnapshot.rows[0].godlike, "12");
  assert.equal(fallback.gameSnapshot.rows[1].winRate, "56.8");

  const edited = cleanPlayer({
    publish: true,
    gameSnapshot: { updatedAt: "2026/10/01", mode: "排位賽", seasonStart: "2026-09-16", rows: [{ label: "全部賽季", played: "1,234", winRate: "140", mvp: "x" }, {}] },
  });
  assert.equal(edited.gameSnapshot.updatedAt, "2026-10-01");
  assert.equal(edited.gameSnapshot.seasonStart, "2026-09-16");
  assert.equal(edited.gameSnapshot.rows.length, 1);
  assert.equal(edited.gameSnapshot.rows[0].played, "1234");
  assert.equal(edited.gameSnapshot.rows[0].winRate, "");
  assert.equal(edited.gameSnapshot.rows[0].mvp, "");

  const cleared = cleanPlayer({ publish: true, gameSnapshot: { rows: [] } });
  assert.deepEqual(cleared.gameSnapshot.rows, []);
  assert.deepEqual(emptyPlayer().gameSnapshot.rows, []);
  assert.deepEqual(toPublicPlayer(fallback).gameSnapshot, defaultGameSnapshot());
});

test("profile nav lists 圖表 and wide charts scroll inside their card", () => {
  assert.equal(page.sections.charts, "圖表");
  assert.equal(getDefaultDocument().copy.en.player.sections.charts, "Charts");
  const source = readFileSync(new URL("../src/player-page.js", import.meta.url), "utf8");
  assert.match(source, /"rank", "charts"/);
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.chart-scroll\s*\{[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.chart-card\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.chart-grid-2\s*\{[^}]*minmax\(0,\s*1fr\)/);
});

test("trend date ticks never repeat a day or crowd the last label", async () => {
  globalThis.document = { documentElement: { lang: "zh-Hant" } };
  const { tickIndexes } = await import("../src/charts-view.js");
  const labels = ["09/13 10:00", "09/13 11:00", "09/14 09:00", "09/26 10:00", "09/26 11:00", "09/26 12:00", "09/27 09:00", "09/27 10:00"];
  const xAt = (index) => index * 40;
  const ticks = tickIndexes(labels, xAt);
  const days = ticks.map((index) => labels[index].split(" ")[0]);
  assert.equal(new Set(days).size, days.length);
  assert.equal(ticks.at(-1), labels.length - 1);
  for (let index = 1; index < ticks.length; index += 1) assert.ok(xAt(ticks[index]) - xAt(ticks[index - 1]) >= 56);
});

test("admin rank tab edits the in-game snapshot next to the rank card", async () => {
  const { renderPlayerEditor, runPlayerAction } = await import("../admin/player-editor.js");
  const player = { publish: true, handle: "htw0702aov" };
  const html = renderPlayerEditor(player, { tab: "rank" }, {});
  assert.match(html, /遊戲內對戰資料（參考）/);
  assert.match(html, /value="28" data-game-row="0" data-field="penta"/);
  assert.match(html, /value="56\.8" data-game-row="1" data-field="winRate"/);
  assert.match(html, /data-game-snap="seasonStart"/);
  assert.ok(html.indexOf("目前段位") < html.indexOf("遊戲內對戰資料"));
  const edited = { ...player, gameSnapshot: { rows: [{ label: "全部賽季", played: "1" }] } };
  const outcome = runPlayerAction(edited, "game-snapshot-default", null, { tab: "rank" });
  assert.equal(outcome.dirty, true);
  assert.equal(outcome.player.gameSnapshot.rows[0].played, "96");
});
