/** Official Garena CDN helpers and the public search index. No login, no private API. */

import { heroSkillSlots } from "./hero-skills.js";

export const ITEM_ICON_BASE =
  "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/";

export const SITE_SEARCH = [
  {
    type: "page",
    id: "player",
    title: "選手數據",
    text: "選手數據 player htw0702aov 歷史戰績 配裝 對戰資料 成員",
    href: "/roster",
    image: "",
  },
  {
    type: "page",
    id: "heroes",
    title: "英雄",
    text: "英雄 heroes 名單 造型 技能",
    href: "/heroes",
    image: "",
  },
  {
    type: "page",
    id: "skins",
    title: "造型",
    text: "造型 skins 皮膚",
    href: "/skins",
    image: "",
  },
  {
    type: "page",
    id: "items",
    title: "裝備",
    text: "裝備 items 出裝 道具",
    href: "/items",
    image: "",
  },
  {
    type: "page",
    id: "modes",
    title: "模式",
    text: "模式 modes 排位賽",
    href: "/modes",
    image: "",
  },
  {
    type: "page",
    id: "activities",
    title: "官方活動",
    text: "活動 公告 賽事 activities",
    href: "/activities",
    image: "",
  },
  {
    type: "page",
    id: "roster",
    title: "成員",
    text: "成員 roster 選手",
    href: "/roster",
    image: "",
  },
  {
    type: "page",
    id: "about",
    title: "公會",
    text: "公會 about 暮霞 MOS MOOHSIA guild",
    href: "/about",
    image: "",
  },
  {
    type: "page",
    id: "teams",
    title: "戰隊名單",
    text: "戰隊 teams 名單 MOOHSIA 暮霞",
    href: "/teams",
    image: "",
  },
  {
    type: "page",
    id: "skills",
    title: "英雄技能",
    text: "英雄技能 被動 一技能 二技能 三技能 skills",
    href: "/skills",
    image: "",
  },
  {
    type: "page",
    id: "user-skills",
    title: "使用者技能",
    text: "使用者技能 挑戰者技能 瞬移 user skills",
    href: "/user-skills",
    image: "",
  },
  {
    type: "page",
    id: "ultimates",
    title: "奧義",
    text: "奧義 魔紋 arcana katha 配裝 符文",
    href: "/ultimates",
    image: "",
  },
  {
    type: "page",
    id: "apply",
    title: "加入申請",
    text: "加入申請 apply 招募",
    href: "/apply",
    image: "",
  },
  {
    type: "page",
    id: "news",
    title: "動態",
    text: "動態 news 公告",
    href: "/news",
    image: "",
  },
  {
    type: "page",
    id: "contact",
    title: "聯絡",
    text: "聯絡 contact Info@moohsia.com",
    href: "/contact",
    image: "",
  },
];

export function itemIconUrl(id) {
  const text = String(id || "");
  if (!/^\d{3,6}$/.test(text)) return "";
  return `${ITEM_ICON_BASE}${text}.png`;
}

export function itemIdFromToken(token) {
  const text = String(token || "").trim();
  const labeled = /^裝備\s*(\d{3,6})$/.exec(text);
  if (labeled) return labeled[1];
  if (/^\d{3,6}$/.test(text)) return text;
  return "";
}

export function resolveItem(token, items) {
  const id = itemIdFromToken(token);
  const list = Array.isArray(items) ? items : [];
  const found = id
    ? list.find((item) => item?.id === id)
    : list.find((item) => item?.name?.zh === token || item?.name?.en === token);
  const resolvedId = found?.id || id;
  const name = found?.name?.zh || found?.name?.en || "";
  return {
    id: resolvedId,
    name,
    label: name || (resolvedId ? "" : String(token || "").trim()),
    image: found?.image || itemIconUrl(resolvedId),
    description: found?.description || "",
    category: found?.category || "",
    href: resolvedId ? `/items#item-${resolvedId}` : "",
  };
}

export function resolveHero(name, heroes) {
  const text = String(name || "").trim();
  const list = Array.isArray(heroes) ? heroes : [];
  const found = list.find((hero) => hero?.name?.zh === text || hero?.name?.en === text);
  return {
    id: found?.id || "",
    name: text,
    image: found?.image || "",
    href: found?.id ? `/heroes/${found.id}` : "",
    role: found?.roleLabel?.zh || "",
  };
}

function clip(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

export function buildSearchIndex(catalog) {
  const entries = [];
  for (const hero of catalog?.heroes || []) {
    const name = hero?.name?.zh || "";
    if (!name) continue;
    entries.push({
      type: "hero",
      id: String(hero.id),
      title: name,
      text: clip([name, hero.roleLabel?.zh, hero.roleLabel?.en, hero.blurb].filter(Boolean).join(" "), 220),
      href: `/heroes/${hero.id}`,
      image: hero.image || "",
    });
    for (const row of heroSkillSlots(hero)) {
      const skillName = String(row.skill?.name || "").trim();
      if (!skillName) continue;
      entries.push({
        type: "skill",
        id: `skill-${hero.id}-${row.index}`,
        title: skillName,
        text: clip(`${name} 英雄技能 ${row.zh} ${skillName} ${row.skill?.text || ""}`, 220),
        href: `/skills#skill-${hero.id}-${row.index}`,
        image: row.skill?.image || hero.image || "",
      });
    }
    (hero.skins || []).forEach((skin, index) => {
      if (skin?.kind === "default") return;
      const skinName = skin?.name?.zh || "";
      entries.push({
        type: "skin",
        id: `${hero.id}-${skin.id ?? index}`,
        title: skinName || `${name} 造型`,
        text: clip(`${name} 造型 ${skinName}`, 80),
        href: `/heroes/${hero.id}#skin-${hero.id}-${skin.id ?? index}`,
        image: skin.thumb || skin.image || "",
      });
    });
  }
  for (const row of catalog?.arcana || []) {
    const arcanaName = String(row?.name || "").trim();
    if (!arcanaName || !row.id) continue;
    entries.push({
      type: "arcana",
      id: `katha-${row.level}-${row.id}`,
      title: arcanaName,
      text: clip(
        [`奧義`, `魔紋`, `${row.level}級`, arcanaName, ...(row.tags || []), row.effect].filter(Boolean).join(" "),
        220,
      ),
      href: `/ultimates#katha-${row.level}-${row.id}`,
      image: row.image || "",
    });
  }
  for (const row of catalog?.userSkills || []) {
    const skillName = String(row?.name || "").trim();
    if (!skillName || !row.id) continue;
    entries.push({
      type: "userSkill",
      id: `user-${row.id}`,
      title: skillName,
      text: clip(`使用者技能 挑戰者技能 ${skillName} ${row.text || ""}`, 220),
      href: `/user-skills#user-${row.id}`,
      image: row.image || "",
    });
  }
  for (const item of catalog?.items || []) {
    const name = item?.name?.zh || "";
    if (!name || !item.id) continue;
    entries.push({
      type: "item",
      id: String(item.id),
      title: name,
      text: clip([name, item.category, item.description, `裝備 ${item.id}`, item.id].filter(Boolean).join(" "), 220),
      href: `/items#item-${item.id}`,
      image: item.image || itemIconUrl(item.id),
    });
  }
  return entries.concat(SITE_SEARCH);
}

export function querySearch(index, query, limit = 12) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle || needle.length > 40) return [];
  const ranked = [];
  for (const entry of index || []) {
    const title = String(entry.title || "").toLowerCase();
    const text = String(entry.text || "").toLowerCase();
    const id = String(entry.id || "").toLowerCase();
    let score = 0;
    if (title === needle || id === needle || `裝備 ${id}` === needle) score = 100;
    else if (title.startsWith(needle)) score = 80;
    else if (title.includes(needle)) score = 60;
    else if (text.includes(needle)) score = 30;
    if (!score) continue;
    if (entry.type === "hero" && title === needle) score += 5;
    ranked.push({ score, entry });
  }
  ranked.sort((a, b) => b.score - a.score || String(a.entry.title).localeCompare(String(b.entry.title), "zh-Hant"));
  return ranked.slice(0, limit).map((row) => ({
    type: row.entry.type,
    id: row.entry.id,
    title: row.entry.title,
    href: row.entry.href,
    image: row.entry.image || "",
  }));
}
