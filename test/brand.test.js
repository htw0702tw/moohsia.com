import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROOT = path.resolve(import.meta.dirname, "..");
const SKIP = new Set(["node_modules", "dist", ".git", ".wrangler", "test"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (/\.(js|css|html|md|json|jsonc|txt|xml|svg|webmanifest|example)$/.test(entry.name)) files.push(full);
  }
  return files;
}

test("public copy keeps a single contact and no Discord invite code", async () => {
  const files = await walk(ROOT);
  const required = ["不開放招募", "成員資訊即將公開", "通過驗證後加入內部 Discord", "Info@moohsia.com"];
  const blob = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    blob.push(text);
    const emails = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
    for (const email of emails) {
      assert.equal(email.toLowerCase(), "info@moohsia.com", `${file} has ${email}`);
    }
    assert.doesNotMatch(text, /discord\.gg\/[A-Za-z0-9-]+/i, file);
    assert.doesNotMatch(text, /discord\.com\/invite\/[A-Za-z0-9-]+/i, file);
  }
  const all = blob.join("\n");
  for (const phrase of required) {
    assert.equal(all.includes(phrase), true, phrase);
  }
});
