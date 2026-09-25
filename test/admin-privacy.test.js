import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { build } from "vite";
import { handleAdmin } from "../shared/admin-api.js";
import { createMemoryStore } from "../shared/cms-store.js";
import { hashPassword } from "../shared/password.js";
import { resetLoginFailuresForTests } from "../shared/rate-limit.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const ACCOUNT = "htw0702";

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

test("admin pages do not render the account name or store what was typed", async () => {
  const files = ["admin/index.html", "admin/main.js", "admin/admin.css"].map((file) => path.join(ROOT, file));
  for (const file of files) {
    const text = await readFile(file, "utf8");
    assert.equal(text.toLowerCase().includes(ACCOUNT), false, file);
    assert.doesNotMatch(text, /placeholder\s*=/i, file);
  }

  const ui = await readFile(path.join(ROOT, "admin/main.js"), "utf8");
  assert.match(ui, /autocomplete="off"/);
  assert.match(ui, /autocomplete="new-password"/);
  assert.match(ui, /id="login-form" autocomplete="off"/);
  assert.match(ui, /name="account"[^>]*autocomplete="off"/);
  assert.match(ui, /name="secret"[^>]*autocomplete="new-password"/);
  assert.doesNotMatch(ui, /name="account"[^>]*value=/);
  assert.equal((ui.match(/autocomplete="username"/g) || []).length, 1);
  assert.equal((ui.match(/autocomplete="current-password"/g) || []).length, 1);
  assert.match(ui, /class="autofill-sink"/);
  assert.match(ui, /data-cms/);
  assert.match(ui, /readonly/);
  assert.match(ui, /form\.reset\(\)/);
  assert.match(ui, /\.value = ""/);
  assert.doesNotMatch(ui, /localStorage|sessionStorage|document\.cookie/);
  assert.doesNotMatch(ui, /class="user"|state\.username|data\.username|session\.username/);
});

test("worker logs record a code and error name only", async () => {
  const shared = await walk(path.join(ROOT, "shared"));
  const files = [path.join(ROOT, "worker/index.js"), ...shared];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (file.endsWith(`${path.sep}log.js`)) {
      assert.match(text, /console\.error/);
      assert.doesNotMatch(text, /password|username|error\.message|error\.stack|\.body|cookie/i);
      continue;
    }
    assert.doesNotMatch(text, /console\.(log|debug|info|warn|error)\s*\(/, file);
  }
});

test("login does not log the password or account name", async () => {
  resetLoginFailuresForTests();
  const env = {
    ADMIN_USERNAME: ACCOUNT,
    ADMIN_PASSWORD_HASH: await hashPassword("correct-horse"),
    ADMIN_SESSION_SECRET: "test-session-secret-value",
    CMS_STORE: createMemoryStore(),
  };
  const logs = [];
  const original = console.error;
  console.error = (...args) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const ok = await handleAdmin(
      new Request("https://admin.moohsia.com/api/admin/login", {
        method: "POST",
        headers: {
          origin: "https://admin.moohsia.com",
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.93",
        },
        body: JSON.stringify({ username: ACCOUNT, password: "correct-horse" }),
      }),
      env,
    );
    assert.equal(ok.status, 200);
    const bad = await handleAdmin(
      new Request("https://admin.moohsia.com/api/admin/login", {
        method: "POST",
        headers: {
          origin: "https://admin.moohsia.com",
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.94",
        },
        body: JSON.stringify({ username: ACCOUNT, password: "not-the-password" }),
      }),
      env,
    );
    assert.equal(bad.status, 401);
  } finally {
    console.error = original;
  }
  const blob = logs.join("\n");
  assert.equal(blob.includes("correct-horse"), false);
  assert.equal(blob.toLowerCase().includes(ACCOUNT), false);
  assert.equal(blob.includes("not-the-password"), false);
});

test("built admin html and js do not contain the account name", async () => {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "mos-admin-"));
  try {
    await build({
      logLevel: "error",
      build: { outDir, emptyOutDir: true, sourcemap: false },
    });
    const built = await walk(outDir);
    assert.ok(built.some((file) => file.endsWith(".html")));
    assert.ok(built.some((file) => file.endsWith(".js")));
    for (const file of built) {
      const text = await readFile(file);
      const source = text.toString("utf8");
      assert.equal(source.toLowerCase().includes(ACCOUNT), false, path.relative(outDir, file));
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
