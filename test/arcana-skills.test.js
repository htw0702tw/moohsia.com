import assert from "node:assert/strict";
import test from "node:test";
import { GLYPH_FACTIONS } from "../shared/arcana.js";
import { parseChallengerSkills, parseKathaList } from "../shared/aov-parse.js";
import { handleApi } from "../shared/api.js";
import { loadCatalog } from "../shared/catalog-store.js";
import { getDefaultDocument } from "../src/content.js";
import { sanitizeDocument } from "../shared/site-document.js";

const KATHA_HTML = `
<div class="k_box" data-tags="攻擊,lv1" data-filter="1級奧義:神劍">
  <div class="k_b_pic">
    <a href="javascript:;" class="J-tooltip" title='<div class="tooltip tooltip-katha"><div class="tooltip-name">1級奧義:神劍</div><div class="tooltip-desc">物理攻擊+1&lt;br&gt;&lt;br&gt;</div></div>'>
      <img src="//cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/Dynamic/Icon/40129.png">
    </a>
  </div>
  <div class="k_b_text">1級奧義:神劍</div>
</div>`;

const SKILL_HTML = `
<div class="s_deta">
  <div class="s_icon"><img src="/static/web/img/page/skill_icon-11.png"></div>
  <div class="s_title">瞬移</div>
  <div class="s_text">120秒CD：<br />向指定方向位移一段距離</div>
</div>`;

test("katha parser keeps the official arcana name, level, tag, and effect", () => {
  const rows = parseKathaList(KATHA_HTML);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "神劍");
  assert.equal(rows[0].level, 1);
  assert.deepEqual(rows[0].tags, ["攻擊"]);
  assert.match(rows[0].effect, /物理攻擊\+1/);
  assert.match(rows[0].image, /^https:\/\/cdngarenanow-a\.akamaihd\.net\/.+\/40129\.png$/);
});

test("challenger skill parser keeps teleport and does not invent extras", () => {
  const rows = parseChallengerSkills(SKILL_HTML);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "瞬移");
  assert.match(rows[0].text, /向指定方向位移/);
  assert.equal(rows[0].image, "https://moba.garena.tw/static/web/img/page/skill_icon-11.png");
});

test("glyph factions are the four announced groups and have no invented effects", () => {
  assert.deepEqual(
    GLYPH_FACTIONS.map((row) => row.name.zh),
    ["魔能深淵", "光明聖殿", "暗影森林", "起源聯盟"],
  );
  assert.equal(GLYPH_FACTIONS.some((row) => "effect" in row || "stats" in row), false);
});

test("snapshot ships the public arcana list and challenger skills", async () => {
  const catalog = await loadCatalog({});
  assert.ok(catalog.arcana.length >= 80);
  const sword = catalog.arcana.find((row) => row.name === "神劍" && row.level === 1);
  assert.equal(sword.tags.includes("攻擊"), true);
  assert.match(sword.effect, /物理攻擊/);
  assert.equal(catalog.userSkills.some((row) => row.name === "瞬移"), true);
  assert.equal(catalog.userSkills.some((row) => row.name === "疾走"), true);
  const body = await (await handleApi(new Request("https://moohsia.com/api/catalog"))).json();
  assert.equal(body.arcana.length, catalog.arcana.length);
  assert.equal(body.userSkills.some((row) => row.name === "瞬移"), true);
  const teleport = await (await handleApi(new Request("https://moohsia.com/api/search?q=瞬移"))).json();
  assert.equal(teleport.results[0].type, "userSkill");
  const heroSkill = await (await handleApi(new Request("https://moohsia.com/api/search?q=天降神箭"))).json();
  assert.equal(heroSkill.results[0].type, "skill");
  assert.equal(heroSkill.results.some((row) => row.type === "ultimate"), false);
});

test("published copy that still calls hero skill 4 奧義 is rewritten", () => {
  const draft = getDefaultDocument();
  draft.copy.zh.ultimates.lead = "傳說對決英雄的奧義，整理自 Garena 公開英雄頁。";
  draft.copy.zh.ultimates.method =
    "官方頁沒有單獨的「奧義」欄位。技能順序是被動、一技、二技、奧義，本頁取第 4 個。說明裡的 {0} 這類符號是官方頁的數值占位，本站不另填冷卻或傷害。技能數不是 4 的英雄不會猜測哪一個是奧義。";
  draft.copy.en.nav.ultimates = "Ultimates";
  draft.copy.zh.player.arcana = "銘文";
  const doc = sanitizeDocument(draft);
  assert.equal(doc.copy.zh.ultimates.method.includes("第 4 個"), false);
  assert.match(doc.copy.zh.ultimates.lead, /魔紋/);
  assert.equal(doc.copy.en.nav.ultimates, "Arcana");
  assert.equal(doc.copy.zh.player.arcana, "奧義");
  assert.equal(doc.copy.zh.nav.teams, "戰隊");
});
