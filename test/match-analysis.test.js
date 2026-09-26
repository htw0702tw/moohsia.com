import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultDocument } from "../src/content.js";
import { renderMatchAnalysis } from "../src/match-charts.js";
import { analyzeMatches, formatRate } from "../shared/match-analysis.js";

const page = getDefaultDocument().copy.zh.player;

function match(partial) {
  return {
    result: "勝",
    hero: "娜塔亞",
    kills: "1",
    deaths: "1",
    assists: "1",
    damage: "1000",
    gold: "100",
    mode: "排位賽",
    map: "經典競技",
    playedAt: "2026-09-01 12:00",
    ...partial,
  };
}

test("empty history has no rates, heroes, trend, or modes", () => {
  const analysis = analyzeMatches([]);
  assert.equal(analysis.recent.overall.games, 0);
  assert.equal(analysis.recent.overall.rate, null);
  assert.equal(analysis.recent.last10.rate, null);
  assert.deepEqual(analysis.heroes, []);
  assert.equal(analysis.trend.kda, false);
  assert.equal(analysis.trend.damage, false);
  assert.equal(analysis.compare.damage, null);
  assert.equal(analysis.compare.gold, null);
  assert.deepEqual(analysis.modes, []);
  assert.match(renderMatchAnalysis(page, analysis), /沒有已公開的對局/);
});

test("recent windows use newest matches and only decided results", () => {
  const matches = [
    match({ playedAt: "2026-09-03 12:00", result: "勝", id: "new" }),
    match({ playedAt: "2026-09-02 12:00", result: "平", id: "draw" }),
    match({ playedAt: "2026-09-01 12:00", result: "敗", id: "old" }),
    ...Array.from({ length: 9 }, (_, index) => match({ playedAt: `2026-08-${String(20 - index).padStart(2, "0")} 12:00`, result: "勝" })),
  ];
  const analysis = analyzeMatches(matches);
  assert.equal(analysis.recent.overall.games, 12);
  assert.equal(analysis.recent.overall.wins, 10);
  assert.equal(analysis.recent.overall.losses, 1);
  assert.equal(analysis.recent.overall.rate, 90.9);
  assert.equal(analysis.recent.last10.games, 10);
  assert.equal(analysis.recent.last10.wins, 8);
  assert.equal(analysis.recent.last10.losses, 1);
  assert.equal(analysis.recent.last10.rate, 88.9);
  assert.equal(analysis.recent.last20.games, 12);
  assert.equal(formatRate(90.9), "90.9");
  assert.equal(formatRate(100), "100");
});

test("hero win rate prefers the owner row and ranks by games", () => {
  const analysis = analyzeMatches([
    match({
      hero: "錯的英雄",
      kills: "1",
      deaths: "1",
      assists: "1",
      damage: "1",
      gold: "1",
      result: "敗",
      board: [{ owner: true, hero: "娜塔亞", kills: "4", deaths: "2", assists: "2", heroDamage: "99", gold: "50" }],
    }),
    match({ hero: "克里希", result: "勝", playedAt: "2026-09-02 12:00" }),
    match({ hero: "克里希", result: "敗", playedAt: "2026-09-03 12:00" }),
    match({ hero: "娜塔亞", result: "勝", playedAt: "2026-09-04 12:00" }),
  ]);
  const natalya = analysis.heroes.find((row) => row.hero === "娜塔亞");
  const krizz = analysis.heroes.find((row) => row.hero === "克里希");
  assert.equal(natalya.games, 2);
  assert.equal(natalya.wins, 1);
  assert.equal(natalya.losses, 1);
  assert.equal(natalya.rate, 50);
  assert.equal(krizz.games, 2);
  assert.equal(krizz.rate, 50);
  assert.ok(analysis.heroes[0].games >= analysis.heroes[1].games);
  assert.equal(analysis.trend.points.find((point) => point.damage === 99).kda, 3);
});

test("trend is chronological inside the recent window and skips blank numbers", () => {
  const analysis = analyzeMatches([
    match({ playedAt: "2026-09-25 22:00", result: "勝", damage: "10", gold: "100", kills: "1", deaths: "1", assists: "1" }),
    match({ playedAt: "2026-09-20 10:00", result: "敗", damage: "30", gold: "50", kills: "2", deaths: "1", assists: "0" }),
    match({ playedAt: "2026-09-22 10:00", result: "勝", damage: "", gold: "80", kills: "3", deaths: "0", assists: "0" }),
  ]);
  assert.deepEqual(
    analysis.trend.points.map((point) => point.damage),
    [30, null, 10],
  );
  assert.deepEqual(
    analysis.trend.points.map((point) => point.label),
    ["09/20 10:00", "09/22 10:00", "09/25 22:00"],
  );
  assert.equal(analysis.trend.points[1].kda, 3);
  assert.equal(analysis.trend.kda, true);
  assert.equal(analysis.trend.damage, true);
  assert.equal(analysis.compare.damage.win.avg, 10);
  assert.equal(analysis.compare.damage.win.n, 1);
  assert.equal(analysis.compare.damage.loss.avg, 30);
  assert.equal(analysis.compare.gold.win.avg, 90);
  assert.equal(analysis.compare.gold.win.n, 2);
  assert.equal(analysis.compare.gold.loss.n, 1);
});

test("a single metric sample does not invent the other side", () => {
  const analysis = analyzeMatches([
    match({ result: "勝", damage: "100", gold: "" }),
    match({ result: "勝", damage: "", gold: "80", playedAt: "2026-09-02 12:00" }),
  ]);
  assert.equal(analysis.compare.damage, null);
  assert.equal(analysis.compare.gold, null);
  assert.equal(analysis.trend.damage, false);
  assert.equal(analysis.modes.length, 0);
});

test("mode chart keeps queue and map, and hides a single bucket or MapID", () => {
  const one = analyzeMatches([match({ mode: "排位賽", map: "MapID_7" }), match({ mode: "排位賽", map: "" })]);
  assert.deepEqual(one.modes, []);
  const split = analyzeMatches([
    match({ mode: "排位賽", map: "經典競技", result: "勝" }),
    match({ mode: "排位賽", map: "冠軍賽", result: "敗", playedAt: "2026-09-02 12:00" }),
    match({ mode: "一般", map: "", result: "勝", playedAt: "2026-09-03 12:00" }),
    match({ mode: "", map: "MapID_3", result: "敗", playedAt: "2026-09-04 12:00" }),
  ]);
  assert.deepEqual(
    split.modes.map((row) => row.mode).sort(),
    ["一般", "排位賽 · 冠軍賽", "排位賽 · 經典競技"].sort(),
  );
  assert.equal(split.modes[0].games, 1);
});

test("charts render Traditional Chinese labels and degrade without crashing", () => {
  const html = renderMatchAnalysis(
    page,
    analyzeMatches([
      match({ hero: "<script>", result: "勝", damage: "125875", gold: "9819", playedAt: "2026-09-02 12:00" }),
      match({ hero: "克里希", result: "敗", damage: "80000", gold: "7000", mode: "一般", map: "經典競技", playedAt: "2026-09-01 12:00" }),
    ]),
  );
  assert.match(html, /近況勝率/);
  assert.match(html, /常用英雄勝率/);
  assert.match(html, /KDA／輸出趨勢/);
  assert.match(html, /勝敗對比/);
  assert.match(html, /模式分布/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /125,875/);
  assert.match(html, /由左到右是較早到較近的對局/);

  const thin = renderMatchAnalysis(page, analyzeMatches([match({ kills: "", deaths: "", assists: "", damage: "", gold: "", mode: "排位賽", map: "" })]));
  assert.match(thin, /資料不足/);
  assert.doesNotMatch(thin, /模式分布/);
});

test("english copy still names the analysis section", () => {
  const english = getDefaultDocument().copy.en.player;
  assert.equal(english.sections.analysis, "Analysis");
  const html = renderMatchAnalysis(english, analyzeMatches([match(), match({ result: "敗", playedAt: "2026-09-02 12:00", mode: "一般" })]));
  assert.match(html, /Recent win rate/);
  assert.match(html, /Wins vs losses/);
  assert.match(html, /1W · 1L/);
});
