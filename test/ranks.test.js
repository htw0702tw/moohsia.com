import assert from "node:assert/strict";
import test from "node:test";
import { cleanPlayer, emptyPlayer, toPublicPlayer } from "../shared/player.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";
import {
  APEX_RULES,
  APEX_UNKNOWN,
  LEGEND_PATH_NODES,
  POINTS_PER_STAR,
  RANKED_MODES,
  addStar,
  buildRankHistory,
  compareRanks,
  formatRank,
  legendBandForStars,
  reachedLegend,
  shiftPoints,
  starIndex,
  tierById,
} from "../shared/ranks.js";

test("division star caps and legend bands match the ladder we can source", () => {
  assert.equal(tierById("bronze").stars, 3);
  assert.equal(tierById("silver").stars, 4);
  assert.equal(tierById("gold").stars, 4);
  assert.equal(tierById("platinum").stars, 5);
  assert.deepEqual(tierById("platinum").divisions, ["V", "IV", "III", "II", "I"]);
  assert.equal(tierById("diamond").stars, 5);
  assert.equal(tierById("glory").stars, 5);
  assert.equal(legendBandForStars(0).id, "legend-war");
  assert.equal(legendBandForStars(9).zh, "戰場傳說");
  assert.equal(legendBandForStars(10).zh, "先鋒傳說·光影");
  assert.equal(legendBandForStars(49).zh, "先鋒傳說·星域");
  assert.equal(legendBandForStars(50).zh, "璀璨傳說");
  assert.equal(legendBandForStars(100).zh, "絕世傳說");
  assert.equal(POINTS_PER_STAR, 100);
});

test("黃金 IV ★1 plus 30 stars lands on 鉑金 III ★5", () => {
  const next = shiftPoints({ tier: "gold", division: "IV", stars: 1, points: 0 }, 30 * POINTS_PER_STAR);
  assert.equal(formatRank(next), "鉑金 III ★5");
  assert.deepEqual(next, { tier: "platinum", division: "III", stars: 5, points: 0 });
  assert.equal(starIndex(next) - starIndex({ tier: "gold", division: "IV", stars: 1, points: 0 }), 30);
});

test("point deltas round-trip and 100 points move exactly one star", () => {
  const now = { tier: "platinum", division: "II", stars: 3, points: 8 };
  assert.deepEqual(shiftPoints(shiftPoints(now, -103), 103), now);
  assert.deepEqual(shiftPoints(now, -100), { tier: "platinum", division: "II", stars: 2, points: 8 });
  assert.deepEqual(shiftPoints(now, 100), { tier: "platinum", division: "II", stars: 4, points: 8 });
  assert.equal(addStar({ tier: "glory", division: "I", stars: 5 }), null);
});

test("star path anchors at the current rank and stops when a ranked row has no points", () => {
  const matches = [
    { id: "a", publish: true, playedAt: "2026-09-20 12:00", mode: "排位賽", hero: "娜塔亞", result: "勝", rankDelta: "103" },
    { id: "b", publish: true, playedAt: "2026-09-21 12:00", mode: "排位賽", hero: "娜塔亞", result: "敗", rankDelta: "" },
    { id: "c", publish: true, playedAt: "2026-09-22 12:00", mode: "排位賽", hero: "娜塔亞", result: "敗", rankDelta: "-9" },
    { id: "d", publish: true, playedAt: "2026-09-22 18:00", mode: "一般", hero: "娜塔亞", result: "勝", rankDelta: "" },
  ];
  const history = buildRankHistory(matches, { tier: "platinum", division: "II", stars: 3, points: 8, updatedAt: "2026-09-26" });
  assert.equal(history.code, "stars-gap");
  assert.equal(history.series.at(-1).stars, 3);
  assert.equal(history.series.at(-1).points, 8);
  assert.equal(history.series.at(-1).kind, "now");
  assert.equal(history.series.some((point) => point.id === "a"), false);
  assert.equal(history.bars.length, 2);
  assert.equal(history.bars[0].delta, 103);
  assert.ok(history.boundaries.some((line) => line.label === "鉑金 II"));
});

test("without a current rank the chart stays on the point bars", () => {
  const history = buildRankHistory(
    [{ publish: true, playedAt: "2026-09-22 12:00", mode: "排位賽", rankDelta: "-100" }],
    { tier: "", stars: "", points: "" },
  );
  assert.equal(history.code, "bars");
  assert.equal(history.series.length, 0);
  assert.equal(history.bars[0].delta, -100);
  const blank = buildRankHistory([], {});
  assert.equal(blank.code, "empty");
});

test("clean player keeps an owner rank card and does not invent one", () => {
  const empty = cleanPlayer({ publish: true, handle: "htw0702aov" });
  assert.equal(empty.rankCard.tier, "");
  assert.equal(empty.rankCard.stars, "");
  assert.equal(empty.powerBoard.power, "");
  assert.equal(empty.weeklyReports.length, 0);
  const cleaned = cleanPlayer({
    publish: true,
    handle: "htw0702aov",
    rankCard: {
      season: "S4 2026",
      tier: "platinum",
      division: "II",
      stars: "3",
      points: "8",
      queueReadout: "88",
      queueReadoutMax: "100",
      seasonChallenge: "10/10",
      updatedAt: "2026-09-26",
    },
    powerBoard: {
      updatedAt: "",
      area: "臺灣/新北市/永和區",
      hero: "娜塔亞",
      power: "2759",
      bestPower: "2984",
      rows: [
        { scope: "永和區", place: "90", gap: "" },
        { scope: "新北市", place: "", gap: "823" },
      ],
    },
    yearTreasure: { year: "2026", reward: "朔月銀衛", updatedAt: "", seasons: [{ id: "S4", active: false }] },
    weeklyReports: [{ title: "我的戰報", start: "2026-09-14", end: "2026-09-21", rankedGames: "8", rankedWins: "5", starDelta: "10" }],
  });
  assert.equal(cleaned.rankCard.tier, "platinum");
  assert.equal(cleaned.rankCard.division, "II");
  assert.equal(cleaned.rankCard.stars, "3");
  assert.equal(cleaned.rankCard.points, "8");
  assert.equal(cleaned.powerBoard.rows[1].gap, "823");
  assert.equal(cleaned.powerBoard.rows[1].place, "");
  assert.equal(cleaned.yearTreasure.seasons.find((row) => row.id === "S1").active, false);
  assert.equal(cleaned.weeklyReports[0].starDelta, "10");
  const shown = toPublicPlayer(cleaned);
  assert.equal(shown.rankCard.season, "S4 2026");
  assert.equal(shown.powerBoard.hero, "娜塔亞");
  assert.equal(reachedLegend(shown.rankCard), false);
  assert.equal(toPublicPlayer({ ...cleaned, publish: false }), null);
  assert.deepEqual(emptyPlayer().rankCard.tier, "");
});

test("invalid division is dropped instead of being shown", () => {
  const cleaned = cleanPlayer({ publish: true, rankCard: { tier: "bronze", division: "V", stars: "9", points: "8" } });
  assert.equal(cleaned.rankCard.division, "");
  assert.equal(cleaned.rankCard.stars, "");
});

test("guild members can carry a rank onto the public roster", () => {
  const doc = sanitizeDocument({
    ...getDefaultDocument(),
    rosterMembers: [
      { id: "owner0702", name: { zh: "htw0702aov", en: "htw0702aov" }, role: { zh: "隊長", en: "Captain" }, team: "moohsia", rankTier: "platinum", rankDivision: "II", rankStars: "3" },
      { id: "other", name: { zh: "路人", en: "lane" }, role: { zh: "", en: "" }, team: "moohsia", hidden: true, rankTier: "gold", rankDivision: "I", rankStars: "1" },
    ],
  });
  const pub = toPublicDocument(doc);
  assert.equal(pub.rosterMembers.length, 1);
  assert.equal(pub.rosterMembers[0].rankTier, "platinum");
  assert.equal(pub.rosterMembers[0].rankStars, "3");
  assert.ok(compareRanks({ tier: "diamond", division: "V", stars: 1, points: 0 }, { tier: "platinum", division: "II", stars: 3, points: 8 }) < 0);
});

test("ranked modes are only the ones named in the client and official posts", () => {
  assert.deepEqual(
    RANKED_MODES.map((mode) => mode.name.zh),
    ["排位賽", "傳說之巔", "賽季挑戰", "傳說之路", "賽年寶藏"],
  );
  assert.equal(APEX_RULES.length, 8);
  assert.match(APEX_RULES[2], /16–24/);
  assert.equal(APEX_UNKNOWN.some((line) => /週末/.test(line)), true);
  assert.deepEqual(LEGEND_PATH_NODES, [10, 20, 30, 40, 50]);
  assert.equal(RANKED_MODES.some((mode) => mode.name.zh === "巔峰賽"), false);
});
