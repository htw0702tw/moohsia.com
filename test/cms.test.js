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
        const html = path.endsWith(".html") || path.endsWith("/");
        return new Response(files[path], {
          status: 200,
          headers: { "content-type": html ? "text/html; charset=utf-8" : "text/plain" },
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
      "/admin/": "admin-shell",
      "/admin/index.html": "admin-shell",
      "/favicon.svg": "icon",
    }),
  };
}

function sessionPayload(setCookie) {
  const token = (setCookie || "").split(";")[0].slice("mos_admin=".length);
  const body = token.slice(0, token.lastIndexOf("."));
  const padded = body.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(body.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
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
  const deniedBody = await denied.json();
  assert.equal(denied.status, 401);
  assert.equal(deniedBody.code, "invalid_login");
  assert.equal(denied.headers.get("cache-control"), "no-store");
  assert.equal(JSON.stringify(deniedBody).includes(PASSWORD), false);
  assert.equal(JSON.stringify(deniedBody).includes("htw0702"), false);

  const loggedIn = await handleAdmin(loginRequest(PASSWORD), env);
  const session = await loggedIn.json();
  const cookie = loggedIn.headers.get("set-cookie") || "";
  assert.equal(loggedIn.status, 200);
  assert.equal(loggedIn.headers.get("cache-control"), "no-store");
  assert.equal(Object.hasOwn(session, "username"), false);
  assert.equal(JSON.stringify(session).includes("htw0702"), false);
  assert.equal(typeof session.csrf, "string");
  assert.equal(sessionPayload(cookie).u, "htw0702");
  assert.match(cookie, /mos_admin=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /Secure/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.equal(cookie.includes(PASSWORD), false);

  const token = cookie.split(";")[0];
  const who = await handleAdmin(new Request("https://admin.moohsia.com/api/admin/session", { headers: { cookie: token } }), env);
  const whoBody = await who.json();
  assert.equal(who.status, 200);
  assert.equal(who.headers.get("cache-control"), "no-store");
  assert.equal(Object.hasOwn(whoBody, "username"), false);
  assert.equal(whoBody.csrf, session.csrf);

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

test("default document and ordinary section edits can be saved", async () => {
  const env = await adminEnv();
  const loggedIn = await handleAdmin(loginRequest(PASSWORD, "203.0.113.70"), env);
  const session = await loggedIn.json();
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];
  const draft = sanitizeDocument(getDefaultDocument());
  assert.equal(draft.contactEmail, "Info@moohsia.com");
  assert.equal(draft.copy.zh.nav.recruitChip, "不開放招募");
  draft.copy.zh.home.tagline = "暮色仍在。";
  draft.copy.en.about.lead = "MOS plays Arena of Valor.";
  draft.copy.zh.roster.lead = "名單如下。";
  draft.copy.zh.news.emptyBody = "稍後公布。";
  draft.copy.zh.contact.lead = "寫信給戰隊。";
  draft.rosterMembers = [
    { id: "aabbccddeeff", name: { zh: "小明", en: "Ming" }, role: { zh: "中路", en: "Mid" }, hidden: false },
  ];
  draft.newsPosts = [
    {
      id: "112233445566",
      date: "2026-09-24",
      title: { zh: "例行公告", en: "Note" },
      body: { zh: "賽程之後公布。", en: "Schedule later." },
      status: "published",
    },
  ];

  const saved = await handleAdmin(
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
  assert.equal(saved.status, 200);

  const published = await handleAdmin(
    new Request("https://admin.moohsia.com/api/admin/publish", {
      method: "POST",
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
  assert.equal(published.status, 200);
  const body = await published.json();
  assert.equal(body.draft.copy.zh.roster.lead, "名單如下。");
  assert.equal(body.draft.rosterMembers[0].name.zh, "小明");
  assert.equal(body.draft.copy.zh.contact.only, "Info@moohsia.com");

  const live = await handleApi(new Request("https://moohsia.com/api/content"), env);
  const after = await live.json();
  assert.equal(after.source, "published");
  assert.equal(after.copy.zh.home.tagline, "暮色仍在。");
  assert.equal(after.rosterMembers[0].role.zh, "中路");
  assert.equal(after.newsPosts[0].title.zh, "例行公告");
});

test("blocked public links are rejected", async () => {
  const env = await adminEnv();
  const loggedIn = await handleAdmin(loginRequest(PASSWORD, "203.0.113.71"), env);
  const session = await loggedIn.json();
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];

  async function save(draft) {
    return handleAdmin(
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
  }

  const invite = sanitizeDocument(getDefaultDocument());
  invite.copy.zh.home.lead = "see https://discord.gg/not-allowed";
  const inviteResponse = await save(invite);
  assert.equal(inviteResponse.status, 400);
  assert.equal((await inviteResponse.json()).code, "blocked_content");

  const vanity = sanitizeDocument(getDefaultDocument());
  vanity.copy.zh.contact.writeBody = "https://discord.com/invite/team";
  const vanityResponse = await save(vanity);
  assert.equal(vanityResponse.status, 400);
  assert.equal((await vanityResponse.json()).code, "blocked_content");

  const mention = sanitizeDocument(getDefaultDocument());
  mention.copy.zh.roster.lead = "選手自行聯絡，不公開 Discord 邀請。";
  const mentionResponse = await save(mention);
  assert.equal(mentionResponse.status, 200);
  assert.equal((await mentionResponse.json()).draft.copy.zh.roster.lead, "選手自行聯絡，不公開 Discord 邀請。");
});

test("roster names may include the owner id and reject the reserved team token", async () => {
  const env = await adminEnv();
  const loggedIn = await handleAdmin(loginRequest(PASSWORD, "203.0.113.72"), env);
  const session = await loggedIn.json();
  const cookie = (loggedIn.headers.get("set-cookie") || "").split(";")[0];

  async function save(draft) {
    return handleAdmin(
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
  }

  function withRoster(name) {
    const draft = sanitizeDocument(getDefaultDocument());
    draft.rosterMembers = [
      { id: "aabbccddeeff", name, role: { zh: "中路", en: "Mid" }, hidden: false },
    ];
    return draft;
  }

  const owner = await save(withRoster({ zh: "htw0702aov", en: "htw0702" }));
  assert.equal(owner.status, 200);
  const ownerBody = await owner.json();
  assert.equal(ownerBody.draft.rosterMembers[0].name.zh, "htw0702aov");
  assert.equal(ownerBody.draft.rosterMembers[0].name.en, "htw0702");
  assert.equal(ownerBody.draft.contactEmail, "Info@moohsia.com");

  const promo = sanitizeDocument(getDefaultDocument());
  promo.copy.en.footer.blurb = "Also see htw0702 and htw0702.com";
  promo.copy.zh.home.lead = "戰隊站是 moohsia.com，信箱仍是 Info@moohsia.com。";
  const promoResponse = await save(promo);
  assert.equal(promoResponse.status, 200);
  const promoBody = await promoResponse.json();
  assert.equal(promoBody.draft.copy.en.footer.blurb, "Also see htw0702 and htw0702.com");
  assert.equal(promoBody.draft.copy.zh.home.lead, "戰隊站是 moohsia.com，信箱仍是 Info@moohsia.com。");

  for (const name of ["moohsia", "Moohsia", " moohsia ", "mooh-sia"]) {
    const blocked = await save(withRoster({ zh: name, en: "Ming" }));
    assert.equal(blocked.status, 400, name);
    assert.equal((await blocked.json()).code, "blocked_content", name);
  }

  const english = await save(withRoster({ zh: "小明", en: "MOOHSIA" }));
  assert.equal(english.status, 400);
  assert.equal((await english.json()).code, "blocked_content");

  const phrase = await save(withRoster({ zh: "moohsia 選手", en: "Ming" }));
  assert.equal(phrase.status, 200);
  assert.equal((await phrase.json()).draft.rosterMembers[0].name.zh, "moohsia 選手");
});

test("admin host serves the admin shell and public host does not", async () => {
  const env = await adminEnv();
  const loginPage = await worker.fetch(new Request("https://admin.moohsia.com/login"), env);
  assert.equal(await loginPage.text(), "admin-shell");
  assert.equal(loginPage.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(loginPage.headers.get("cache-control"), "no-store");

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

  const icon = await worker.fetch(new Request("https://admin.moohsia.com/favicon.svg"), env);
  assert.equal(icon.status, 200);
  assert.equal(await icon.text(), "icon");
});

test("admin spa routes serve the shell instead of the assets 307", async () => {
  const env = await adminEnv();
  const seen = [];
  env.ASSETS = {
    async fetch(request) {
      const path = new URL(request.url).pathname;
      seen.push(path);
      if (path === "/login" || path === "/dashboard") {
        return new Response(null, { status: 307, headers: { location: "/admin/" } });
      }
      if (path === "/admin/index.html") {
        return new Response(null, { status: 307, headers: { location: "/admin/" } });
      }
      if (path === "/admin/") {
        return new Response(null, {
          status: 307,
          headers: { location: "/admin/shell.html" },
        });
      }
      if (path === "/admin/shell.html") {
        return new Response("admin-shell", {
          status: 200,
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      return new Response("missing", { status: 404 });
    },
  };

  const dashboard = await worker.fetch(new Request("https://admin.moohsia.com/dashboard"), env);
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.headers.get("location"), null);
  assert.equal(await dashboard.text(), "admin-shell");
  assert.equal(dashboard.headers.get("x-robots-tag"), "noindex, nofollow");
  assert.equal(dashboard.headers.get("cache-control"), "no-store");
  assert.deepEqual(seen, ["/admin/", "/admin/shell.html"]);

  seen.length = 0;
  const login = await worker.fetch(new Request("https://admin.moohsia.com/login", { method: "HEAD" }), env);
  assert.equal(login.status, 200);
  assert.equal(login.headers.get("location"), null);
  assert.equal(login.headers.get("content-type"), "text/html; charset=utf-8");
  assert.deepEqual(seen, ["/admin/", "/admin/shell.html"]);
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
