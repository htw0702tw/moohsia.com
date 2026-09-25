import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchIndex, querySearch } from "../shared/aov-assets.js";
import { getDefaultDocument } from "../src/content.js";
import { sanitizeDocument, toPublicDocument } from "../shared/site-document.js";
import { heroSkillSlots } from "../shared/hero-skills.js";

test("guild copy and the seeded MOOHSIA team survive a round trip", () => {
  const doc = sanitizeDocument(getDefaultDocument());
  assert.equal(doc.copy.zh.nav.about, "公會");
  assert.equal(doc.copy.zh.nav.teams, "戰隊");
  assert.equal(doc.copy.zh.nav.ultimates, "奧義");
  assert.equal(doc.copy.zh.nav.heroSkills, "英雄技能");
  assert.equal(doc.copy.zh.nav.userSkills, "使用者技能");
  assert.equal(doc.copy.zh.ultimates.lead.includes("第四個技能"), true);
  assert.equal(doc.copy.zh.ultimates.method.includes("第 4 個"), false);
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

test("the fourth published skill stays a hero skill", () => {
  const slots = heroSkillSlots({
    skills: [{ name: "怒射" }, { name: "爆裂箭矢" }, { name: "百步穿楊" }, { name: "天降神箭", text: "法陣" }],
  });
  assert.equal(slots[3].zh, "三技能");
  assert.equal(slots[3].skill.name, "天降神箭");
  assert.equal(slots.some((row) => row.zh === "奧義"), false);
  const short = heroSkillSlots({ skills: [{ name: "只有一技" }, { name: "二技" }, { name: "三技" }] });
  assert.equal(short[0].zh, "技能 1");
  assert.equal(heroSkillSlots({ skills: [] }).length, 0);
});

test("search reaches teams, a hero skill, and arcana without calling skill 4 an ultimate", () => {
  const index = buildSearchIndex({
    heroes: [
      {
        id: "5",
        name: { zh: "勇" },
        skills: [{ name: "怒射" }, { name: "爆裂箭矢" }, { name: "百步穿楊" }, { name: "天降神箭", text: "勇召喚法陣" }],
      },
    ],
    items: [],
    arcana: [{ id: "40129", level: 1, name: "神劍", tags: ["攻擊"], effect: "物理攻擊+1", image: "" }],
    userSkills: [{ id: "skill_icon-11", name: "瞬移", text: "向指定方向位移一段距離", image: "" }],
  });
  assert.equal(querySearch(index, "天降神箭")[0].type, "skill");
  assert.equal(querySearch(index, "天降神箭")[0].href, "/skills#skill-5-3");
  assert.equal(querySearch(index, "天降神箭").some((row) => row.type === "ultimate"), false);
  assert.equal(querySearch(index, "神劍")[0].type, "arcana");
  assert.equal(querySearch(index, "神劍")[0].href, "/ultimates#katha-1-40129");
  assert.equal(querySearch(index, "瞬移")[0].type, "userSkill");
  assert.equal(querySearch(index, "瞬移")[0].href, "/user-skills#user-skill_icon-11");
  assert.equal(querySearch(index, "勇")[0].type, "hero");
  assert.equal(querySearch(index, "戰隊名單").some((row) => row.href === "/teams"), true);
  assert.equal(querySearch(index, "公會").some((row) => row.href === "/about"), true);
  assert.equal(querySearch(index, "英雄技能").some((row) => row.href === "/skills"), true);
});
