import assert from "node:assert/strict";
import test from "node:test";
import { GENERIC_FAILURE, adminMessage, aovNeedsPaste, choosePastedHtml, importFailureMessage } from "../admin/messages.js";

test("known admin codes use Traditional Chinese instead of the generic fallback", () => {
  for (const code of ["not_found", "method_not_allowed", "unsupported_media", "invalid_json", "media_invalid", "server_error"]) {
    const text = adminMessage(code, 400);
    assert.notEqual(text, GENERIC_FAILURE);
    assert.equal(text.includes(GENERIC_FAILURE), false, code);
  }
  const challenge = adminMessage("aov_challenge", 502);
  assert.match(challenge, /人機驗證/);
  assert.match(challenge, /用貼上的頁面匯入/);
  assert.equal(challenge.includes(GENERIC_FAILURE), false);
  assert.match(adminMessage("aov_blocked", 502), /用貼上的頁面匯入/);
});

test("unknown codes and bare HTTP failures keep the machine detail visible", () => {
  assert.equal(adminMessage("no_such_code", 418), `${GENERIC_FAILURE}（no_such_code，HTTP 418）`);
  assert.equal(adminMessage("no_such_code"), `${GENERIC_FAILURE}（no_such_code）`);
  assert.equal(adminMessage(undefined, 500), `${GENERIC_FAILURE}（HTTP 500）`);
  assert.equal(adminMessage("", 0), GENERIC_FAILURE);
  assert.equal(importFailureMessage(undefined, 502).includes(GENERIC_FAILURE), false);
  assert.match(importFailureMessage(undefined, 502), /HTTP 502/);
  assert.match(importFailureMessage("bad_response", 500), /bad_response/);
  assert.match(importFailureMessage("aov_challenge", 502), /人機驗證/);
  assert.equal(aovNeedsPaste("aov_challenge"), true);
  assert.equal(aovNeedsPaste("aov_blocked"), true);
  assert.equal(aovNeedsPaste(undefined), true);
  assert.equal(aovNeedsPaste("aov_invalid"), false);
  assert.match(adminMessage("aov_shell", 422), /空殼/);
  assert.equal(adminMessage("aov_shell", 422).includes(GENERIC_FAILURE), false);
  assert.equal(aovNeedsPaste("aov_shell"), true);
});

test("paste import prefers the live textarea and otherwise keeps stored HTML", () => {
  const stored = "<html>已貼上的歷史戰績頁</html>";
  assert.equal(choosePastedHtml("<html>live</html>", stored), "<html>live</html>");
  assert.equal(choosePastedHtml("   ", stored), stored);
  assert.equal(choosePastedHtml("", stored), stored);
  assert.equal(choosePastedHtml(undefined, stored), stored);
});
