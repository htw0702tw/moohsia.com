import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const css = await readFile(path.resolve(import.meta.dirname, "../src/styles.css"), "utf8");

function mediaBlock(query) {
  const start = css.indexOf(query);
  assert.notEqual(start, -1, query);
  const next = css.indexOf("@media", start + query.length);
  return css.slice(start, next === -1 ? undefined : next);
}

test("phone header lets the search field shrink so the menu stays on screen", () => {
  const phone = mediaBlock("@media (max-width: 540px)");
  assert.match(phone, /\.nav-tools\s*\{[^}]*min-width:\s*0/);
  assert.match(phone, /\.nav-tools\s*\{[^}]*flex:\s*1\s+1\s+auto/);
  assert.match(phone, /\.site-search\s*\{[^}]*min-width:\s*0/);
  assert.match(phone, /\.site-search\s*\{[^}]*flex:\s*1\s+1\s+auto/);
  assert.match(phone, /\.site-search input,\s*\.site-search input:focus\s*\{[^}]*width:\s*100%/);
  assert.match(phone, /\.site-search input,\s*\.site-search input:focus\s*\{[^}]*min-width:\s*0/);
  assert.match(phone, /\.about-crest,\s*\.about-crest \.orbit\s*\{[^}]*overflow:\s*hidden/);

  const tighter = mediaBlock("@media (max-width: 400px)");
  assert.match(tighter, /\.nav\s*\{[^}]*padding-inline:\s*0\.5rem/);
  assert.match(tighter, /\.site-search input\s*\{[^}]*background-image:/);
});

test("desktop header search keeps its fixed width", () => {
  const phone = mediaBlock("@media (max-width: 540px)");
  const desktop = css.replace(phone, "");
  assert.match(desktop, /\.site-search\s*\{\s*position:\s*relative;\s*min-width:\s*9\.5rem;\s*\}/);
  assert.match(desktop, /\.site-search input\s*\{[^}]*width:\s*11rem;/);
  assert.match(desktop, /\.site-search input:focus\s*\{\s*width:\s*14rem;\s*\}/);
});
