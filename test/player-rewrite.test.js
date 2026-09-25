import assert from "node:assert/strict";
import test from "node:test";
import { itemSlots, playerMemberPath } from "../shared/match-present.js";
import { rewritePlayer } from "../shared/player-rewrite.js";

test("30 farm and 7964 healing are not swapped", () => {
  const player = rewritePlayer({
    handle: "htw0702aov",
    matches: [
      {
        id: "loss",
        playedAt: "2026-09-25 13:20:58",
        hero: "娜塔亞",
        result: "敗",
        mode: "排位賽",
        kills: "7",
        deaths: "10",
        assists: "5",
        minions: "30",
        healing: "7964",
      },
    ],
  });
  assert.equal(player.matches.length, 1);
  assert.equal(player.matches[0].lastHits, "30");
  assert.equal(player.matches[0].minions, "30");
  assert.equal(player.matches[0].healing, "7964");
  assert.notEqual(player.matches[0].lastHits, player.matches[0].healing);
});

test("a swapped creep count in healing is corrected without inventing matches", () => {
  const matches = Array.from({ length: 52 }, (_, index) => ({
    id: `m${index}`,
    hero: "娜塔亞",
    result: "勝",
    playedAt: "2026-08-01 12:00",
    minions: index === 0 ? "7964" : "30",
    healing: index === 0 ? "30" : "1200",
  }));
  const player = rewritePlayer({ handle: "htw0702aov", matches, heroPool: [{ hero: "娜塔亞", matches: "44", winRate: "61" }] });
  assert.equal(player.matches.length, 52);
  assert.equal(player.matches[0].lastHits, "30");
  assert.equal(player.matches[0].healing, "7964");
  assert.equal(player.matches[1].lastHits, "30");
  assert.equal(player.matches[1].healing, "1200");
  assert.equal(player.heroPool.find((card) => card.hero === "娜塔亞").matches, "60");
  assert.equal(player.heroPool.find((card) => card.hero === "娜塔亞").power, "2984");
  assert.equal(player.heroPool.find((card) => card.hero === "克里希").winRate, "100");
});

test("empty history does not gain the Natalya match or ranked cards", () => {
  const player = rewritePlayer({ handle: "htw0702aov", matches: [], heroPool: [] });
  assert.equal(player.matches.length, 0);
  assert.equal(player.heroPool.length, 0);
});

test("stored 22:59 Natalya row is patched to in-game farm and healing", () => {
  const player = rewritePlayer({
    matches: [
      {
        id: "truth",
        playedAt: "2026-09-25 22:59:12",
        hero: "娜塔亞",
        kills: "8",
        deaths: "6",
        assists: "4",
        result: "勝",
        mode: "經典競技",
        minions: "30",
        healing: "30",
        board: [{ owner: true, hero: "娜塔亞", minions: "30", healing: "30", kills: "8", deaths: "6", assists: "4" }],
      },
    ],
  });
  const match = player.matches[0];
  assert.equal(player.matches.length, 1);
  assert.equal(match.mode, "排位賽");
  assert.equal(match.lastHits, "34");
  assert.equal(match.healing, "6077");
  assert.notEqual(match.lastHits, match.healing);
  assert.equal(match.jungleGold, "160");
  assert.equal(match.gold, "9819");
  assert.equal(match.damageRatio, "1.51");
  assert.equal(match.board[0].lastHits, "34");
  assert.equal(match.board[0].healing, "6077");
});

test("member path uses the roster handle and item slots stay six official icons", () => {
  const path = playerMemberPath(
    [{ id: "97aec5aa16e7", hidden: false, name: { zh: "htw0702aov", en: "htw0702aov" } }],
    { handle: "htw0702aov" },
  );
  assert.equal(path, "/roster/htw0702aov");
  const slots = itemSlots(["裝備 1423", "破甲弓"], [{ id: "1423", name: { zh: "吟遊之靴" }, image: "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/1423.png" }]);
  assert.equal(slots.length, 6);
  assert.equal(slots[0].label, "吟遊之靴");
  assert.match(slots[0].src, /BattleEquip\/1423\.png$/);
  assert.equal(slots[5].label, "");
});
