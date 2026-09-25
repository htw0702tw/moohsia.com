import assert from "node:assert/strict";
import test from "node:test";
import { parseHeroDetail, parseItemList } from "../shared/aov-parse.js";
import { loadCatalog, mergeCatalog } from "../shared/catalog-store.js";

test("snapshot ships official items and hero skin art", async () => {
  const catalog = await loadCatalog({});
  assert.ok(catalog.items.length >= 40);
  assert.ok(catalog.heroes.some((hero) => (hero.skins || []).some((skin) => String(skin.image || "").includes("akamaihd.net"))));
  const boots = catalog.items.find((item) => item.id === "1423");
  assert.equal(boots.name.zh, "吟遊之靴");
  assert.match(boots.image, /^https:\/\/cdngarenanow-a\.akamaihd\.net\/.+\/1423\.png$/);
  const natalya = catalog.heroes.find((hero) => hero.name.zh === "娜塔亞");
  assert.ok(natalya.skins.length >= 1);
});

test("item parser keeps name, id, and description apart from farm stats", () => {
  const html = `<div class="p_box" data-tags="法術" data-filter="凝霜寶珠"><img src="https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/1242.png" /><div class="tooltip-name">凝霜寶珠</div><div class="tooltip-desc">+140 法術攻擊</div><div class="p_b_text">`;
  const items = parseItemList(html);
  assert.equal(items.length, 1);
  assert.equal(items[0].id, "1242");
  assert.equal(items[0].name.zh, "凝霜寶珠");
  assert.match(items[0].description, /法術攻擊/);
});

test("hero detail keeps skin images and does not invent a skin name", () => {
  const html = `<div class="h_skill"><img src="https://cdngarenanow-a.akamaihd.net/skill.png" /><div class="h_c_title">魔寵</div><div class="h_c_text">魔法傷害</div></div>
    <img class="hero_banner-list__item-img" src="https://cdngarenanow-a.akamaihd.net/mgames/skin/1.jpg" />
    <a class="J-hero_banner-pg-a"><img src="https://cdngarenanow-a.akamaihd.net/mgames/skin/1-thumb.jpg" /></a>`;
  const detail = parseHeroDetail(html);
  assert.equal(detail.skills[0].name, "魔寵");
  assert.equal(detail.skins.length, 1);
  assert.equal(detail.skins[0].name.zh, "");
  assert.match(detail.skins[0].image, /skin\/1\.jpg/);
});

test("merge keeps snapshot skins when a refresh has none yet", () => {
  const merged = mergeCatalog(
    { heroes: [{ id: "33", name: { zh: "娜塔亞" }, image: "https://cdngarenanow-a.akamaihd.net/h.jpg", pageUrl: "https://moba.garena.tw/game/hero/33" }], items: [], modes: [{ id: "ranked" }] },
    { heroes: [{ id: "33", skins: [{ id: "1", image: "https://cdngarenanow-a.akamaihd.net/s.jpg", name: { zh: "" } }] }], items: [{ id: "1423", name: { zh: "吟遊之靴" } }], modes: [] },
  );
  assert.equal(merged.heroes[0].skins[0].image.includes("/s.jpg"), true);
  assert.equal(merged.items[0].id, "1423");
});
