import assert from "node:assert/strict";
import test from "node:test";
import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { createMemoryApplications } from "../shared/applications.js";
import { parseActivityList } from "../shared/aov-parse.js";
import { previewApplication, validateApplication } from "../shared/apply.js";
import { applyErrorText } from "../src/apply-state.js";
import { getCopy } from "../src/content.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { createMemoryMedia, sniffMedia } from "../shared/media.js";
import { hashPassword } from "../shared/password.js";
import { cleanPlayer, derivedKda, toPublicPlayer } from "../shared/player.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { SESSION_IDLE_SECONDS } from "../shared/session.js";

const PASSWORD = "correct-horse";
const INVITE = "https://discord.gg/OneTimeCode99";

function validApplication(patch = {}) {
  return {
    rank: "gold",
    uid: "3678000000000001",
    nickname: "暮色選手",
    email: "player@example.com",
    gender: "unspecified",
    ageBand: "21-30",
    motivation: "想跟公會一起練習",
    positions: ["mid", "roam"],
    weekday: "晚上",
    holiday: "下午",
    practice: "20:00～22:00",
    conduct: true,
    ...patch,
  };
}

async function adminEnv(extra = {}) {
  resetLoginFailuresForTests();
  return {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
    APP_STORE: createMemoryApplications(),
    MEDIA_MEMORY: createMemoryMedia(),
    RESEND_API_KEY: "re_test_key_value",
    MAIL_FROM: "MOOHSIA <Info@moohsia.com>",
    APPLICATIONS_TO: "Info@moohsia.com",
    sent: [],
    ...extra,
  };
}

function withMail(env) {
  env.MAIL_FETCH = async (_url, init) => {
    env.sent.push(JSON.parse(init.body));
    return new Response("{}", { status: 200 });
  };
  return env;
}

async function login(env, now) {
  if (now != null) {
    env.SESSION_CLOCK_FOR_TESTS = "1";
    env.SESSION_NOW = String(now);
  }
  const response = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.80",
      },
      body: JSON.stringify({ username: "htw0702", password: PASSWORD }),
    }),
    env,
  );
  const body = await response.json();
  const cookie = (response.headers.get("set-cookie") || "").split(";")[0];
  return { response, body, cookie };
}

test("client preview matches the server on positions and practice time", () => {
  assert.equal(previewApplication(validApplication({ positions: ["mid"] })).code, "positions_invalid");
  assert.equal(previewApplication(validApplication({ positions: ["mid"] })).field, "positions");
  assert.equal(previewApplication(validApplication({ positions: ["mid", "mid"] })).code, "positions_invalid");
  assert.equal(previewApplication(validApplication({ positions: ["mid", "jungle", "roam"] })).code, "positions_invalid");
  assert.equal(previewApplication(validApplication({ positions: ["mid", "nope"] })).code, "positions_invalid");
  assert.equal(previewApplication(validApplication({ practice: "晚上" })).code, "practice_time_invalid");
  assert.equal(previewApplication(validApplication({ practice: "晚上" })).field, "practice");
  assert.equal(previewApplication(validApplication({ practice: "20:00-22:00" })).ok, true);
  assert.equal(previewApplication(validApplication({ practice: "20:00～22:00" })).ok, true);
  assert.equal(previewApplication(validApplication()).ok, true);
  assert.equal(previewApplication(validApplication({ rank: "bronze" })).ok, true);
  assert.equal(validateApplication(validApplication({ rank: "bronze" })).code, "rank_below_gold");
});

test("apply errors name the failed rule and fall back only without a code", () => {
  const zh = getCopy("zh").apply;
  const en = getCopy("en").apply;
  for (const code of ["practice_time_invalid", "positions_invalid", "rank_below_gold", "uid_invalid", "motivation_invalid", "conduct_required"]) {
    assert.notEqual(applyErrorText(zh, code), zh.fail, code);
    assert.notEqual(applyErrorText(en, code), en.fail, code);
  }
  assert.match(zh.errors.positions_invalid, /2/);
  assert.match(zh.errors.practice_time_invalid, /20:00/);
  assert.match(zh.errors.rank_below_gold, /黃金/);
  assert.equal(applyErrorText(zh, ""), zh.fail);
  assert.equal(applyErrorText(zh, "not_a_code"), zh.fail);
  assert.equal(applyErrorText(en, "uid_invalid"), en.errors.uid_invalid);
});

test("applications reject bronze, bad uid, wrong position count, and missing conduct", () => {
  assert.equal(validateApplication(validApplication({ rank: "bronze" })).code, "rank_below_gold");
  assert.equal(validateApplication(validApplication({ rank: "silver" })).code, "rank_below_gold");
  assert.equal(validateApplication(validApplication({ uid: "abc12" })).code, "uid_invalid");
  assert.equal(validateApplication(validApplication({ uid: "12" })).code, "uid_invalid");
  assert.equal(validateApplication(validApplication({ positions: ["mid"] })).code, "positions_invalid");
  assert.equal(validateApplication(validApplication({ positions: ["mid", "jungle", "roam"] })).code, "positions_invalid");
  assert.equal(validateApplication(validApplication({ conduct: false })).code, "conduct_required");
  assert.equal(validateApplication(validApplication({ nickname: "moohsia" })).code, "nickname_invalid");
  assert.equal(validateApplication(validApplication({ practice: "晚上" })).code, "practice_time_invalid");
  const ok = validateApplication(validApplication({ rank: "conqueror" }));
  assert.equal(ok.ok, true);
  assert.equal(ok.value.positions.length, 2);
});

test("apply stores the form and approval emails one pasted invite without returning it", async () => {
  const env = withMail(await adminEnv());
  const submitted = await handleApi(
    new Request("https://moohsia.com/api/apply", {
      method: "POST",
      headers: {
        origin: "https://moohsia.com",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.81",
      },
      body: JSON.stringify(validApplication()),
    }),
    env,
  );
  const created = await submitted.json();
  assert.equal(submitted.status, 201);
  assert.equal(created.stored, true);
  assert.equal(created.mailed, true);
  assert.equal(env.sent[0].to[0], "Info@moohsia.com");
  assert.equal(JSON.stringify(created).includes("discord.gg"), false);

  const session = await login(env);
  assert.match(session.response.headers.get("set-cookie") || "", /Max-Age=900/);
  const missing = await handleAdmin(
    new Request(`https://admin.moohsia.com/api/admin/applications/${created.id}/approve`, {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: session.cookie,
        "x-csrf-token": session.body.csrf,
      },
      body: JSON.stringify({ note: "稍後" }),
    }),
    env,
  );
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).code, "invite_required");

  const approved = await handleAdmin(
    new Request(`https://admin.moohsia.com/api/admin/applications/${created.id}/approve`, {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: session.cookie,
        "x-csrf-token": session.body.csrf,
      },
      body: JSON.stringify({ inviteUrl: INVITE, note: "歡迎" }),
    }),
    env,
  );
  const text = await approved.text();
  const body = JSON.parse(text);
  assert.equal(approved.status, 200);
  assert.equal(body.application.status, "approved");
  assert.equal(body.application.inviteSent, true);
  assert.equal(text.includes(INVITE), false);
  assert.equal(text.includes("OneTimeCode99"), false);
  assert.equal(text.includes("discord.gg"), false);
  assert.equal(env.sent.at(-1).to[0], "player@example.com");
  assert.match(env.sent.at(-1).text, /OneTimeCode99/);

  const again = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/applications", {
      headers: { cookie: session.cookie },
    }),
    env,
  );
  const list = await again.text();
  assert.equal(list.includes("OneTimeCode99"), false);
  assert.equal(list.includes("discord.gg"), false);
});

test("a failed approval email does not change the application", async () => {
  const env = await adminEnv();
  env.MAIL_FETCH = async () => new Response("{}", { status: 200 });
  const created = await (
    await handleApi(
      new Request("https://moohsia.com/api/apply", {
        method: "POST",
        headers: {
          origin: "https://moohsia.com",
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.82",
        },
        body: JSON.stringify(validApplication({ uid: "2000000000000002", email: "other@example.com" })),
      }),
      env,
    )
  ).json();
  const session = await login(env);
  env.MAIL_FETCH = async () => new Response("no", { status: 502 });
  const denied = await handleAdmin(
    new Request(`https://admin.moohsia.com/api/admin/applications/${created.id}/approve`, {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: session.cookie,
        "x-csrf-token": session.body.csrf,
      },
      body: JSON.stringify({ inviteUrl: "https://discord.com/invite/SecondCode" }),
    }),
    env,
  );
  assert.equal(denied.status, 502);
  const row = await env.APP_STORE.get(created.id);
  assert.equal(row.status, "pending");
  assert.equal(row.invite_hash, null);
});

test("admin session expires after fifteen idle minutes", async () => {
  const env = await adminEnv();
  const start = 1_700_000_000;
  const session = await login(env, start);
  assert.equal(session.response.status, 200);
  env.SESSION_NOW = String(start + 60);
  const fresh = await handleAdmin(new Request("https://admin.moohsia.com/api/admin/session", { headers: { cookie: session.cookie } }), env);
  assert.equal(fresh.status, 200);
  assert.match(fresh.headers.get("set-cookie") || "", /Max-Age=900/);
  env.SESSION_NOW = String(start + SESSION_IDLE_SECONDS + 1);
  const stale = await handleAdmin(new Request("https://admin.moohsia.com/api/admin/session", { headers: { cookie: session.cookie } }), env);
  assert.equal(stale.status, 401);
});

test("public player keeps in-game detail only after publish", () => {
  assert.equal(derivedKda("9", "3", "5"), "4.67");
  assert.equal(derivedKda("", "3", "5"), "");
  const hidden = toPublicPlayer(cleanPlayer({ handle: "sample", kills: "1", deaths: "1", assists: "1" }));
  assert.equal(hidden, null);
  const player = cleanPlayer({
    publish: true,
    handle: "sample",
    uid: "1000000000000008",
    stats: { kills: "14", deaths: "6", assists: "4", played: "7", winRate: "71.4", mvp: "3" },
    reputation: { score: "100", level: "3", exp: "210", expMax: "270", note: { zh: "滿分", en: "" } },
    seasons: [
      {
        label: "2026-S4",
        mode: "排位賽",
        played: "7",
        wins: "5",
        winRate: "71.4",
        mvp: "3",
        radar: { output: "80", kda: "70", farm: "60", teamfight: "75", survival: "55" },
        medals: { godlike: "0", penta: "0", quadra: "0", triple: "1", supreme: "0", gold: "0", silver: "3", loseMvp: "0" },
      },
    ],
    matches: [
      {
        id: "match1",
        date: "2026-09-25",
        playedAt: "2026-09-25 12:25",
        duration: "12:16",
        mode: "排位賽",
        result: "勝",
        blueScore: "38",
        redScore: "18",
        winner: "blue",
        ownerSide: "blue",
        publish: true,
        highlight: { caption: { zh: "精彩對局", en: "" }, key: "hl/abcd1234ef", mime: "image/png", kind: "image" },
        board: [
          { side: "blue", hero: "娜塔亞", ign: "sample", kills: "14", deaths: "6", assists: "4", gold: "10079", score: "11.7", mvp: true, owner: true, items: ["破甲", "靴子"], heroDamage: "165385", heroDamagePct: "36.8", taken: "98447", takenPct: "34.0", teamfightRate: "47.4", damageRatio: "1.70", takenPer: "16407" },
          { side: "red", hero: "卡莉", ign: "other", kills: "2", deaths: "8", assists: "6", gold: "6222", publish: false },
        ],
      },
      { id: "hidden", hero: "隱藏", publish: false, kills: "9", deaths: "1", assists: "1" },
    ],
  });
  const shown = toPublicPlayer(player);
  assert.equal(shown.stats.kda, "3.00");
  assert.equal(shown.reputation.score, "100");
  assert.equal(shown.seasons[0].medals.silver, "3");
  assert.equal(shown.seasons[0].medals.godlike, "0");
  assert.equal(shown.matches.length, 1);
  assert.equal(shown.matches[0].board[0].kills, "14");
  assert.equal(shown.matches[0].board[0].items[0], "破甲");
  assert.equal(shown.matches[0].highlight.url, "/api/media/abcd1234ef");
  assert.equal(shown.matches[0].highlight.key, undefined);
  assert.equal(JSON.stringify(shown).includes("隱藏"), false);
});

test("activity lists keep public posts and drop third-party mail", () => {
  const html = `
    <a href="/news/show/5678"><img src="https://kgtw.cdn.garenanow.com/banner.png"></a>
    <a href="/news/show/5678" class="event_content">
      <div class="event_title event_title_text">聯名活動</div>
      <div class="event_text">問題請洽 redbulltwevent@gmail.com</div>
    </a>
    <a href="/news/show/5714" class="event_list">
      <div class="event_list_title">錢櫃主題聯名</div>
      <div class="event_list_date">09/18</div>
    </a>`;
  const rows = parseActivityList(html, { kind: "activity", url: "https://moba.garena.tw/news/Activity" }, new Date("2026-09-25T00:00:00Z"));
  assert.equal(rows[0].id, "5678");
  assert.equal(rows[0].image.includes("garenanow.com"), true);
  assert.equal(rows[0].excerpt.includes("@"), false);
  assert.equal(rows.some((row) => row.id === "5714" && row.date === "2026-09-18"), true);
});

function applyRequest(body, ip) {
  return new Request("https://moohsia.com/api/apply", {
    method: "POST",
    headers: {
      origin: "https://moohsia.com",
      "content-type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify(body),
  });
}

test("apply validation names the code and field", async () => {
  const env = await adminEnv();
  const response = await handleApi(applyRequest(validApplication({ positions: ["mid"], practice: "晚上" }), "203.0.113.83"), env);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.code, "positions_invalid");
  assert.equal(body.field, "positions");
});

test("mail failure still stores the application", async () => {
  const env = await adminEnv({ RESEND_API_KEY: "" });
  const unconfigured = await handleApi(applyRequest(validApplication({ uid: "2000000000000091" }), "203.0.113.84"), env);
  const quiet = await unconfigured.json();
  assert.equal(unconfigured.status, 201);
  assert.equal(quiet.ok, true);
  assert.equal(quiet.stored, true);
  assert.equal(quiet.mailed, false);

  const failing = await adminEnv();
  failing.MAIL_FETCH = async () => new Response("no", { status: 502 });
  const response = await handleApi(applyRequest(validApplication({ uid: "2000000000000092", email: "later@example.com" }), "203.0.113.85"), failing);
  const body = await response.json();
  assert.equal(response.status, 201);
  assert.equal(body.stored, true);
  assert.equal(body.mailed, false);
});

test("highlight uploads accept real image bytes only", () => {
  assert.equal(sniffMedia(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])).mime, "image/jpeg");
  assert.equal(sniffMedia(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])).mime, "image/png");
  assert.equal(sniffMedia(new TextEncoder().encode("<html></html>")), null);
});
