import assert from "node:assert/strict";
import test from "node:test";
import { handleAdmin } from "../shared/admin-api.js";
import { handleApi } from "../shared/api.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { hashPassword } from "../shared/password.js";
import { MAX_FAILS, resetLoginFailuresForTests } from "../shared/rate-limit.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { getDefaultDocument } from "../src/content.js";
import worker from "../worker/index.js";

const PASSWORD = "correct-horse";

function assets(files) {
  return {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      if (files[path]) {
        return new Response(files[path], {
          status: 200,
          headers: { "content-type": path.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain" },
        });
      }
      return new Response("missing", { status: 404 });
    },
  };
}

async function adminEnv() {
  resetLoginFailuresForTests();
  return {
    ADMIN_USERNAME: "htw0702",
    ADMIN_PASSWORD_HASH: await hashPassword(PASSWORD),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
    ASSETS: assets({
      "/index.html": "public-shell",
      "/admin/index.html": "admin-shell",
      "/favicon.svg": "icon",
    }),
  };
}

function loginRequest(password, ip = "203.0.113.10") {
  return new Request("https://admin.moohsia.com/api/admin/login", {
    method: "POST",
    headers: {
      origin: "https://admin.moohsia.com",
      "content-type": "application/json",
      "cf-connecting-ip": ip,
    },
    body: JSON.stringify({ username: "htw0702", password }),
  });
}

test("built-in document round-trips and publishes an empty roster", () => {
  const doc = sanitizeDocument(getDefaultDocument());
  assert.equal(doc.contactEmail, "Info@moohsia.com");
  assert.equal(doc.placeholderSlots, 5);
  assert.equal(doc.rosterMembers.length, 0);
  assert.equal(doc.newsPosts.length, 0);
  assert.equal(doc.copy.zh.nav.recruitChip, "不開放招募");
  assert.equal(doc.copy.zh.home.fixtures[0].title, "尚未公布");
  assert.deepEqual(doc.copy, getDefaultDocument().copy);
  const publicDoc = toPublicDocument(doc);
  assert.equal(JSON.stringify(publicDoc).includes("draft"), false);
});

test("public content falls back to defaults and hides admin routes", async () => {
  const content = await handleApi(new Request("https://moohsia.com/api/content"));
  const body = await content.json();
  assert.equal(content.status, 200);
  assert.equal(body.ok, true);
  assert.equal(body.source, "default");
  assert.equal(body.contactEmail, "Info@moohsia.com");
  assert.equal(body.rosterMembers.length, 0);
  assert.equal(body.copy.zh.home.tagline, "暮色未歇，戰線仍在。");
  assert.equal(JSON.stringify(body).includes("password"), false);
  assert.equal(Object.hasOwn(body, "draft"), false);

  const admin = await handleApi(loginRequest("nope"));
  assert.equal(admin.status, 404);
});

test("login cookie, csrf, draft publish, and public projection", async () => {
  const env = await adminEnv();
  const denied = await handleAdmin(loginRequest("wrong-password"), env);
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).code, "invalid_login");

  const loggedIn = await handleAdmin(loginRequest(PASSWORD), env);
  const session = await loggedIn.json();
  const cookie = loggedIn.headers.get("set-cookie") || "";
  assert.equal(loggedIn.status, 200);
  assert.equal(session.username, "htw0702");
  assert.match(cookie, /mos_admin=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(cookie.includes(PASSWORD), false);

  const token = cookie.split(";")[0];
  const draft = sanitizeDocument(getDefaultDocument());
  draft.copy.zh.home.tagline = "已發布標語";
  draft.contactEmail = "Info@moohsia.com";
  draft.rosterMembers = [
    { id: "shown", name: { zh: "上場選手", en: "Starter" }, role: { zh: "中路", en: "Mid" }, hidden: false },
    { id: "benched", name: { zh: "隱藏選手", en: "Hidden" }, role: { zh: "打野", en: "Jungle" }, hidden: true },
  ];
  draft.newsPosts = [
    { id: "live", date: "2026-09-24", title: { zh: "公開公告", en: "Public note" }, body: { zh: "內文", en: "Body" }, status: "published" },
    { id: "quiet", date: "2026-09-24", title: { zh: "草稿公告", en: "Draft note" }, body: { zh: "", en: "" }, status: "draft" },
  ];

  const saved = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/content", {
      method: "PUT",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: token,
        "x-csrf-token": session.csrf,
      },
      body: JSON.stringify(draft),
    }),
    env,
  );
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).dirty, true);

  const sneak = await handleApi(new Request("https://moohsia.com/api/content"), env);
  const before = await sneak.json();
  assert.equal(before.copy.zh.home.tagline, "暮色未歇，戰線仍在。");
  assert.equal(JSON.stringify(before).includes("隱藏選手"), false);
  assert.equal(JSON.stringify(before).includes("草稿公告"), false);
  assert.equal(JSON.stringify(before).includes("上場選手"), false);

  const missingCsrf = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/publish", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: token,
      },
      body: JSON.stringify(draft),
    }),
    env,
  );
  assert.equal(missingCsrf.status, 403);

  const published = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/publish", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie: token,
        "x-csrf-token": session.csrf,
      },
      body: JSON.stringify(draft),
    }),
    env,
  );
  assert.equal(published.status, 200);
  assert.equal((await published.json()).dirty, false);

  const live = await handleApi(new Request("https://moohsia.com/api/content"), env);
  const after = await live.json();
  assert.equal(after.source, "published");
  assert.equal(after.copy.zh.home.tagline, "已發布標語");
  assert.equal(after.rosterMembers.length, 1);
  assert.equal(after.rosterMembers[0].name.zh, "上場選手");
  assert.equal(after.newsPosts.length, 1);
  assert.equal(after.newsPosts[0].title.zh, "公開公告");
  assert.equal(JSON.stringify(after).includes("隱藏選手"), false);
  assert.equal(JSON.stringify(after).includes("草稿公告"), false);
  assert.equal(Object.hasOwn(after.rosterMembers[0], "hidden"), false);

  const outsider = await handleAdmin(new Request("https://admin.moohsia.com/api/admin/content"), env);
  assert.equal(outsider.status, 401);
  assert.equal(JSON.stringify(await outsider.json()).includes("已發布標語"), false);
});

test("login locks out after repeated failures", async () => {
  const env = await adminEnv();
  const ip = "203.0.113.44";
  for (let attempt = 0; attempt < MAX_FAILS; attempt += 1) {
    const response = await handleAdmin(loginRequest("nope", ip), env);
    assert.equal(response.status, 401);
  }
  const locked = await handleAdmin(loginRequest(PASSWORD, ip), env);
  assert.equal(locked.status, 429);
  assert.equal(locked.headers.get("retry-after"), "900");
});

test("blocked public links are rejected", async () => {
  const env = await adminEnv();
  const loggedIn = await handleAdmin(loginRequest(PASSWORD, "203.0.113.70"), env);
  const session = await loggedIn.json();
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];
  const draft = sanitizeDocument(getDefaultDocument());
  draft.copy.zh.home.lead = "see https://discord.gg/not-allowed";
  const response = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/content", {
      method: "PUT",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        cookie,
        "x-csrf-token": session.csrf,
      },
      body: JSON.stringify(draft),
    }),
    env,
  );
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "blocked_content");
});

test("admin host serves the admin shell and public host does not", async () => {
  const env = await adminEnv();
  const loginPage = await worker.fetch(new Request("https://admin.moohsia.com/login"), env);
  assert.equal(await loginPage.text(), "admin-shell");
  assert.equal(loginPage.headers.get("x-robots-tag"), "noindex, nofollow");

  const root = await worker.fetch(new Request("https://admin.moohsia.com/"), env);
  assert.equal(root.status, 302);
  assert.equal(root.headers.get("location"), "/login");

  const leaked = await worker.fetch(new Request("https://moohsia.com/admin/index.html"), env);
  assert.equal(leaked.status, 404);

  const about = await worker.fetch(new Request("https://moohsia.com/about"), env);
  assert.equal(await about.text(), "public-shell");

  const loggedIn = await handleAdmin(loginRequest(PASSWORD, "203.0.113.80"), env);
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];
  const home = await worker.fetch(new Request("https://admin.moohsia.com/", { headers: { cookie } }), env);
  assert.equal(home.status, 302);
  assert.equal(home.headers.get("location"), "/dashboard");
});

test("admin is not configured when secrets are missing", async () => {
  const response = await handleAdmin(loginRequest(PASSWORD, "203.0.113.90"), { CMS_STORE: createMemoryStore() });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "admin_not_configured");
});

test("only the fixed admin username can sign in", async () => {
  const env = await adminEnv();
  const other = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/login", {
      method: "POST",
      headers: {
        origin: "https://admin.moohsia.com",
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.91",
      },
      body: JSON.stringify({ username: "owner", password: PASSWORD }),
    }),
    env,
  );
  assert.equal(other.status, 401);

  const overridden = await handleAdmin(loginRequest(PASSWORD, "203.0.113.92"), {
    ...env,
    ADMIN_USERNAME: "someone-else",
  });
  assert.equal(overridden.status, 503);
  assert.equal((await overridden.json()).code, "admin_not_configured");
});
