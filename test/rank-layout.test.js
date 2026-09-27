import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildRankHistory, sampleRankedMatches } from "../shared/ranks.js";

test("fifty-five ranked matches keep a star line and thin the history dates", async () => {
  globalThis.document = { documentElement: { lang: "zh-Hant" } };
  const { rankAxisTicks, renderRankStage } = await import("../src/rank-view.js");
  const { getCopy } = await import("../src/content.js");
  const matches = sampleRankedMatches(55);
  assert.equal(matches.length, 55);
  assert.equal(matches.every((match) => match.rankDelta && match.mode === "排位賽"), true);
  const anchor = { tier: "platinum", division: "II", stars: 3, points: 8, updatedAt: "2026-09-26" };
  const history = buildRankHistory(matches, anchor);
  assert.equal(history.code, "stars");
  assert.equal(history.bars.length, 55);
  assert.equal(history.series.length, 56);

  const width = 640;
  const pad = { l: 18, r: 118 };
  const innerW = width - pad.l - pad.r;
  const xAt = (index) => pad.l + (index / (history.series.length - 1)) * innerW;
  const ticks = rankAxisTicks(history.series.length, xAt);
  assert.ok(ticks.length >= 2);
  assert.ok(ticks.length < 16);
  assert.equal(ticks[0], 0);
  assert.equal(ticks.at(-1), history.series.length - 1);
  for (let index = 1; index < ticks.length; index += 1) {
    assert.ok(xAt(ticks[index]) - xAt(ticks[index - 1]) >= 48);
  }

  const html = renderRankStage(getCopy("zh"), { rankCard: anchor, matches, weeklyReports: [] });
  assert.match(html, /rank-stage/);
  assert.match(html, /鉑金 II ★3/);
  assert.match(html, /段位歷史/);
  assert.equal((html.match(/<circle /g) || []).length, history.series.length);
  const labels = [...html.matchAll(/<text class="rank-tick" x="([\d.]+)"/g)];
  assert.equal(labels.length, ticks.length);
  assert.match(html, />目前</);
  assert.equal((html.match(/<li class="(?:is-up|is-down)">/g) || []).length, 55);

  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  assert.match(css, /\.rank-stage\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  assert.match(css, /\.rank-bars ol\s*\{[^}]*overflow-x:\s*auto/);
});
