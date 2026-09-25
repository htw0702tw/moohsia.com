import assert from "node:assert/strict";
import test from "node:test";
import { handleApi, inviteConfigured } from "../shared/api.js";
import { CONTACT_EMAIL } from "../shared/brand.js";
import { isAovId, isDiscordHandle, maskMiddle, validateVerification } from "../shared/validate.js";

const SECRET = "https://discord.gg/should-not-leak";

test("invite flag accepts only https Discord URLs and never echoes them", async () => {
  assert.equal(inviteConfigured({}), false);
  assert.equal(inviteConfigured({ DISCORD_INVITE_URL: "" }), false);
  assert.equal(inviteConfigured({ DISCORD_INVITE_URL: "https://evil.example/discord" }), false);
  assert.equal(inviteConfigured({ DISCORD_INVITE_URL: "http://discord.gg/abc" }), false);
  assert.equal(inviteConfigured({ DISCORD_INVITE_URL: SECRET }), true);

  const response = await handleApi(new Request("https://moohsia.com/api/config"), {
    DISCORD_INVITE_URL: SECRET,
  });
  const text = await response.text();
  const body = JSON.parse(text);
  assert.equal(response.status, 200);
  assert.equal(body.contactEmail, CONTACT_EMAIL);
  assert.equal(body.discord.inviteConfigured, true);
  assert.equal(body.discord.access, "application_only");
  assert.equal(body.discord.cta, "website");
  assert.equal(text.includes("should-not-leak"), false);
  assert.equal(text.includes("discord.gg"), false);
});

test("config and health reject unexpected methods", async () => {
  const health = await handleApi(new Request("https://moohsia.com/api/health"));
  assert.deepEqual(await health.json(), { ok: true, service: "moohsia-com" });

  const posted = await handleApi(new Request("https://moohsia.com/api/config", { method: "POST" }));
  assert.equal(posted.status, 405);
});

test("verification stub accepts a manual request and stays locked", async () => {
  const response = await handleApi(
    new Request("https://moohsia.com/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aovId: "暮霞Player", discordHandle: "Moohsia", ack: true }),
    }),
    { DISCORD_INVITE_URL: SECRET },
  );
  const body = await response.json();
  assert.equal(response.status, 202);
  assert.equal(body.ok, true);
  assert.equal(body.status, "pending_review");
  assert.equal(body.stored, false);
  assert.equal(body.garenaSync, false);
  assert.equal(body.discordUnlocked, false);
  assert.match(body.receiptId, /^[0-9a-f-]{36}$/);
  assert.equal(JSON.stringify(body).includes("暮霞Player"), false);
  assert.equal(JSON.stringify(body).includes("should-not-leak"), false);
});

test("verification rejects tryout-shaped bad input", async () => {
  const cases = [
    [{ aovId: "player", discordHandle: "name", ack: false }, "ack_required"],
    [{ aovId: "a@b.com", discordHandle: "name", ack: true }, "invalid_aov_id"],
    [{ aovId: "player", discordHandle: "https://discord.gg/abc", ack: true }, "invalid_discord"],
    [{ aovId: "player", discordHandle: "Info@moohsia.com", ack: true }, "invalid_discord"],
  ];
  for (const [payload, code] of cases) {
    const response = await handleApi(
      new Request("https://moohsia.com/api/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, code);
  }
});

test("oversized bodies are refused before they are parsed", async () => {
  const response = await handleApi(
    new Request("https://moohsia.com/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ aovId: "x".repeat(5000), discordHandle: "name", ack: true }),
    }),
  );
  assert.equal(response.status, 413);
});

test("identifiers allow Traditional Chinese and reject links", () => {
  assert.equal(isAovId("暮霞"), true);
  assert.equal(isAovId("a"), false);
  assert.equal(maskMiddle("暮霞"), "暮•");
  assert.equal(maskMiddle("Moohsia"), "M•••••a");
  assert.equal(isDiscordHandle("玩家#0001"), true);
  assert.equal(validateVerification({ website: "spam", ack: false }).honeypot, true);
});
