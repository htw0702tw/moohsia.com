import assert from "node:assert/strict";
import test from "node:test";
import { aovVisionPrompt, normalizeAovVision } from "../shared/aov-capture.js";

test("capture normalization keeps visible match and ten-player fields", () => {
  const data = normalizeAovVision(
    {
      kind: "match_scoreboard",
      confidence: 0.94,
      matches: [
        {
          externalMatchId: "1790348182-3038",
          playedAt: "2026-09-25 22:59:28",
          hero: "娜塔亞",
          result: "勝利",
          kills: "8",
          deaths: "6",
          assists: "4",
          board: [
            {
              side: "red",
              hero: "娜塔亞",
              ign: "htw0702aov",
              kills: "8",
              deaths: "6",
              assists: "4",
              gold: "9819",
              heroDamage: "125875",
              taken: "113770",
              healing: "6077",
              lastHits: "34",
              tower: "2089",
              items: ["1423", "1324"],
            },
          ],
        },
      ],
    },
    { ownerName: "htw0702aov", importId: "video-test", frameIndex: 3 },
  );

  assert.equal(data.kind, "match_scoreboard");
  assert.equal(data.matches.length, 1);
  const match = data.matches[0];
  assert.equal(match.externalMatchId, "1790348182-3038");
  assert.equal(match.source, "capture");
  assert.equal(match.result, "勝");
  assert.equal(match.kda, "8 / 6 / 4");
  assert.equal(match.healing, "6077");
  assert.equal(match.lastHits, "34");
  assert.equal(match.board[0].owner, true);
  assert.equal(match.board[0].items.length, 6);
});

test("capture prompt forbids guessing and names the owner", () => {
  const prompt = aovVisionPrompt("htw0702aov");
  assert.match(prompt, /htw0702aov/);
  assert.match(prompt, /不要猜測/);
  assert.match(prompt, /看不到的欄位/);
});
