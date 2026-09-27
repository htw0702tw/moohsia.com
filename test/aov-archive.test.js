import assert from "node:assert/strict";
import test from "node:test";
import { aovMatchKey, aovMatchRichness } from "../shared/aov-archive.js";

test("archive key prefers the external match id", () => {
  assert.equal(aovMatchKey({ id: "local", externalMatchId: "123-456" }), "external:123-456");
});

test("a complete scoreboard is richer than a collapsed owner row", () => {
  const collapsed = {
    id: "m1",
    hero: "娜塔亞",
    kills: "8",
    deaths: "6",
    assists: "4",
    board: [{ hero: "娜塔亞", ign: "htw0702aov", kills: "8", deaths: "6", assists: "4", owner: true }],
  };
  const expanded = {
    ...collapsed,
    externalMatchId: "1790348182-3038",
    damage: "125875",
    healing: "6077",
    board: Array.from({ length: 10 }, (_, index) => ({
      side: index < 5 ? "blue" : "red",
      hero: `英雄${index}`,
      ign: `玩家${index}`,
      kills: String(index),
      deaths: "1",
      assists: "2",
      gold: "10000",
      items: ["1", "2", "3", "4", "5", "6"],
    })),
  };
  assert.ok(aovMatchRichness(expanded) > aovMatchRichness(collapsed));
});
