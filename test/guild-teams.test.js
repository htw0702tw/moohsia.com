import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchIndex, querySearch } from "../shared/aov-assets.js";
import { getDefaultDocument } from "../src/content.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { ultimateSkill } from "../shared/ultimates.js";

test("guild copy and the seeded MOOHSIA team survive a round trip", () => {
  const doc = sanitizeDocument(getDefaultDocument());
  assert.equal(doc.copy.zh.nav.about, "公會");
  assert.equal(doc.copy.zh.nav.teams, "戰隊");
  assert.equal(doc.copy.zh.nav.ultimates, "奧義");
  assert.equal(doc.copy.zh.meta.homeTitle, "暮霞｜MOS — 傳說對決公會");
  assert.equal(doc.copy.en.nav.about, "Guild");
  assert.equal(doc.teams.length, 1);
  assert.equal(doc.teams[0].slug, "moohsia");
  assert.equal(doc.teams[0].name.zh, "MOOHSIA");
  assert.equal(doc.teams[0].aka.zh, "暮霞");
  assert.deepEqual(
    doc.teams[0].requirements.map((row) => row.zh),
    ["每個週末 20:30–21:30 訓練", "每個人至少擅長 2 路，且各路至少 5 隻熟悉英雄", "排位至少黃金以上"],
  );
  const pub = toPublicDocument(doc);
  assert.equal(pub.teams[0].slug, "moohsia");
  assert.equal(pub.rosterMembers.length, 0);
});

test("a roster member without a team publishes on MOOHSIA", () => {
  const draft = getDefaultDocument();
  draft.rosterMembers = [
    { id: "owner0702", name: { zh: "htw0702aov", en: "htw0702aov" }, role: { zh: "隊長", en: "Captain" }, hidden: false },
    { id: "other", name: { zh: "小明", en: "Ming" }, role: { zh: "打野", en: "Jungle" }, team: "nova", hidden: false },
  ];
  draft.teams.push({
    id: "nova",
    slug: "nova",
    name: { zh: "NOVA", en: "NOVA" },
    aka: { zh: "", en: "" },
    lead: { zh: "", en: "" },
    requirements: [],
  });
  const doc = sanitizeDocument(draft);
  assert.equal(doc.rosterMembers[0].team, "moohsia");
  assert.equal(doc.rosterMembers[1].team, "nova");
  const pub = toPublicDocument(doc);
  assert.equal(pub.rosterMembers[0].team, "moohsia");
  assert.equal(Object.hasOwn(pub.rosterMembers[0], "hidden"), false);
  assert.equal(pub.teams.some((team) => team.slug === "nova"), true);
});

test("old org sentences become guild copy and custom sentences stay", () => {
  const draft = getDefaultDocument();
  draft.copy.zh.nav.about = "戰隊";
  draft.copy.zh.about.title = "自訂標題";
  draft.copy.zh.meta.homeTitle = "暮霞｜MOS — 傳說對決戰隊";
  const doc = sanitizeDocument(draft);
  assert.equal(doc.copy.zh.nav.about, "公會");
  assert.equal(doc.copy.zh.about.title, "自訂標題");
  assert.equal(doc.copy.zh.meta.homeTitle, "暮霞｜MOS — 傳說對決公會");
  assert.equal(doc.copy.zh.nav.teams, "戰隊");
});

test("the fourth published skill is the ultimate", () => {
  const skill = ultimateSkill({
    skills: [{ name: "怒射" }, { name: "爆裂箭矢" }, { name: "百步穿楊" }, { name: "天降神箭", text: "法陣" }],
  });
  assert.equal(skill.name, "天降神箭");
  assert.equal(ultimateSkill({ skills: [{ name: "只有一技" }, { name: "二技" }, { name: "三技" }] }), null);
  assert.equal(ultimateSkill({ skills: [] }), null);
});

test("search reaches the teams page and an ultimate without hiding the hero", () => {
  const index = buildSearchIndex({
    heroes: [
      {
        id: "5",
        name: { zh: "勇" },
        skills: [{ name: "怒射" }, { name: "爆裂箭矢" }, { name: "百步穿楊" }, { name: "天降神箭", text: "勇召喚法陣" }],
      },
    ],
    items: [],
  });
  assert.equal(querySearch(index, "天降神箭")[0].type, "ultimate");
  assert.equal(querySearch(index, "天降神箭")[0].href, "/ultimates#ult-5");
  assert.equal(querySearch(index, "勇")[0].type, "hero");
  assert.equal(querySearch(index, "戰隊名單").some((row) => row.href === "/teams"), true);
  assert.equal(querySearch(index, "公會").some((row) => row.href === "/about"), true);
});
