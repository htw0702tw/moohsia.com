import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchIndex, querySearch, resolveItem } from "../shared/aov-assets.js";
import { handleApi } from "../shared/api.js";
import { loadCatalog } from "../shared/catalog-store.js";
import { parseHeroDetail, parseItemList } from "../shared/aov-parse.js";

const ITEM_HTML = `
<div class="p_box" data-tags="移動" data-filter="吟遊之靴">
  <div class="p_b_pic">
    <a class="J-tooltip" title='<div class="tooltip"><div class="tooltip-name">吟遊之靴</div><div class="tooltip-desc">+15%冷卻縮減&lt;br&gt;唯一被動</div><div class="tooltip-tip">移動時加快</div></div>'>
      <img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/1423.png">
    </a>
  </div>
  <div class="p_b_text">吟遊之靴</div>
</div>
<div class="p_box" data-tags="攻擊" data-filter="短劍">
  <a title='<div class="tooltip"><div class="tooltip-name">短劍</div><div class="tooltip-desc">+20物理攻擊</div><div class="tooltip-tip"></div></div>'>
    <img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/1111.png">
  </a>
  <div class="p_b_text">短劍</div>
</div>`;

const HERO_HTML = `
<div class="hero_banner-list__item-img" src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/5/base.jpg"></div>
<img class="hero_banner-list__item-img" src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/5/skin/one.jpg">
<a class="J-hero_banner-pg-a"><img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/5/thumb.jpg"></a>
<a class="J-hero_banner-pg-a"><img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/5/skin/thumb.jpg"></a>
<div class="h_skill"><img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/Dynamic/Skill/11200.png"></div>
<div class="h_content"><div class="h_c_title">怒射</div><div class="h_c_text">勇的第五次普通攻擊將會造成七段傷害。</div></div>`;

test("equipment parser keeps official id, name, icon, and description", () => {
  const items = parseItemList(ITEM_HTML);
  assert.equal(items.length, 2);
  const boots = items.find((item) => item.id === "1423");
  assert.equal(boots.name.zh, "吟遊之靴");
  assert.match(boots.image, /^https:\/\/cdngarenanow-a\.akamaihd\.net\/.*\/1423\.png$/);
  assert.match(boots.description, /冷卻縮減/);
  assert.equal(boots.category, "移動");
  const resolved = resolveItem("裝備 1423", items);
  assert.equal(resolved.name, "吟遊之靴");
  assert.match(resolved.image, /1423\.png$/);
  assert.equal(resolved.href, "/items#item-1423");
});

test("hero detail parser keeps skills and skin art", () => {
  const detail = parseHeroDetail(HERO_HTML);
  assert.equal(detail.skills[0].name, "怒射");
  assert.match(detail.skills[0].text, /七段傷害/);
  assert.match(detail.skills[0].image, /^https:\/\/cdngarenanow-a\.akamaihd\.net\//);
  assert.ok(detail.skins.length >= 2);
  assert.equal(detail.skins[0].kind, "default");
  assert.match(detail.skins[1].image, /\/skin\//);
});

test("search index finds heroes, skins, items, and site pages", async () => {
  const items = parseItemList(ITEM_HTML);
  const detail = parseHeroDetail(HERO_HTML);
  const index = buildSearchIndex({
    heroes: [{ id: "5", name: { zh: "勇" }, roleLabel: { zh: "射手" }, blurb: "怒射", image: "https://cdngarenanow-a.akamaihd.net/hero.jpg", skins: detail.skins }],
    items,
  });
  const boots = querySearch(index, "吟遊之靴");
  assert.equal(boots[0]?.type, "item");
  assert.equal(boots[0]?.href, "/items#item-1423");
  const byId = querySearch(index, "1423");
  assert.equal(byId[0]?.title, "吟遊之靴");
  const hero = querySearch(index, "勇");
  assert.equal(hero[0]?.type, "hero");
  assert.equal(hero[0]?.href, "/heroes/5");
  const skin = querySearch(index, "勇 造型");
  assert.equal(skin.some((item) => item.type === "skin" && item.href.startsWith("/heroes/5#skin-5-")), true);
  const page = querySearch(index, "Info@moohsia.com");
  assert.equal(page.some((item) => item.href === "/contact"), true);
  const catalog = await loadCatalog({});
  const body = await (await handleApi(new Request(`https://moohsia.com/api/search?q=${encodeURIComponent("勇")}`))).json();
  assert.equal(body.ok, true);
  assert.equal(body.results[0].type, "hero");
  assert.equal(body.results[0].title, "勇");
  if ((catalog.items || []).length) {
    const named = await (await handleApi(new Request(`https://moohsia.com/api/search?q=${encodeURIComponent("短劍")}`))).json();
    assert.equal(named.results[0].type, "item");
  }
});
