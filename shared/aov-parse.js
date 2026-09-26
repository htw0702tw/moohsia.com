/** Parse public Garena TW Arena of Valor pages. No login, no private API. */

import { buildSearchIndex } from "./aov-assets.js";

export const HERO_LIST_URL = "https://moba.garena.tw/game/heroes/";
export const PROPS_URL = "https://moba.garena.tw/game/props";
export const KATHA_URL = "https://moba.garena.tw/game/katha";
export const USER_SKILL_URL = "https://moba.garena.tw/game/skill";

export const ROLE_LABELS = {
  tank: { zh: "坦克", en: "Tank" },
  soldier: { zh: "戰士", en: "Warrior" },
  assassin: { zh: "刺客", en: "Assassin" },
  master: { zh: "法師", en: "Mage" },
  archer: { zh: "射手", en: "Marksman" },
  aid: { zh: "輔助", en: "Support" },
};

export const ROLE_ORDER = ["tank", "soldier", "assassin", "master", "archer", "aid"];

/**
 * Official mode names and the public page that must contain that exact name.
 * English display names are left blank: the TW site publishes Chinese names.
 * `playersNeedle` is stored only when that exact text is also on the page.
 */
export const MODE_SPECS = [
  {
    id: "classic-5v5",
    nameZh: "5V5經典競技",
    url: "https://moba.garena.tw/news/show/2504",
    playersNeedle: "5V5",
    sourceKind: "official-news",
  },
  {
    id: "abyss-brawl",
    nameZh: "混沌大亂鬥",
    url: "https://moba.garena.tw/news/show/1768",
    playersNeedle: "10v10",
    sourceKind: "official-news",
  },
  {
    id: "trio",
    nameZh: "三人對決",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "death-match",
    nameZh: "死鬥競技場",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "mirror",
    nameZh: "幻影激鬥",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "football",
    nameZh: "足球總動員",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "hook-wars",
    nameZh: "飛鉤奪寶戰",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "random-mid",
    nameZh: "隨機單中",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "duel",
    nameZh: "單人對戰",
    url: "https://moba.garena.tw/news/show/2397",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "transform",
    nameZh: "幻化之戰",
    url: "https://moba.garena.tw/news/show/3148",
    playersNeedle: "",
    sourceKind: "official-news",
  },
  {
    id: "duo-ride",
    nameZh: "雙人飛車賽",
    url: "https://moba.garena.tw/news/show/2914",
    playersNeedle: "兩人一隊",
    sourceKind: "official-news",
  },
];

export function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&rarr;/gi, "→")
    .replace(/&hellip;/gi, "…")
    .replace(/&quot;/gi, '"')
    .replace(/&middot;/gi, "·")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => {
      const value = Number(code);
      return Number.isFinite(value) ? String.fromCodePoint(value) : "";
    })
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function excerptAround(text, needle) {
  const parts = String(text || "")
    .split(/(?<=[。！？])/)
    .map((part) => part.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const candidates = parts.filter(
    (part) =>
      part.includes(needle) &&
      part.length >= needle.length + 6 &&
      !part.includes("目前位置") &&
      !part.includes("YouTube"),
  );
  const best = candidates.sort((a, b) => b.length - a.length)[0];
  const chosen = best || parts.find((part) => part.includes(needle)) || "";
  if (!chosen) return "";
  return chosen.length > 180 ? `${chosen.slice(0, 178)}…` : chosen;
}

function decodeName(value) {
  return htmlToText(value).slice(0, 40);
}

const HERO_RE =
  /<li class="herolist" data-tags="([^"]+)" data-filter="([^"]*)"[\s\S]*?href="\/game\/hero\/(\d+)"[\s\S]*?background:\s*url\(([^)]+)\)/gi;

/** @param {string} html */
export function parseHeroList(html) {
  const heroes = [];
  const seen = new Set();
  for (const match of String(html || "").matchAll(HERO_RE)) {
    const role = match[1];
    const name = decodeName(match[2]);
    const id = match[3];
    if (!ROLE_LABELS[role] || !name || seen.has(id)) continue;
    let image = match[4].trim().replace(/^['"]|['"]$/g, "");
    if (image.startsWith("//")) image = `https:${image}`;
    if (!image.startsWith("https://cdngarenanow-a.akamaihd.net/")) continue;
    seen.add(id);
    heroes.push({
      id,
      name: { zh: name, en: "" },
      role,
      roleLabel: { ...ROLE_LABELS[role] },
      image,
      pageUrl: `https://moba.garena.tw/game/hero/${id}`,
    });
  }
  return heroes;
}

export function roleCatalog() {
  return ROLE_ORDER.map((id) => ({ id, ...ROLE_LABELS[id] }));
}

/**
 * @param {string} html
 * @param {(typeof MODE_SPECS)[number]} spec
 */
export function modeFromPage(html, spec) {
  const text = htmlToText(html);
  if (!text.includes(spec.nameZh)) return null;
  const players = spec.playersNeedle && text.includes(spec.playersNeedle) ? spec.playersNeedle : "";
  return {
    id: spec.id,
    name: { zh: spec.nameZh, en: "" },
    players,
    excerpt: excerptAround(text, spec.nameZh),
    sourceUrl: spec.url,
    sourceKind: spec.sourceKind,
  };
}

export const ACTIVITY_LISTS = [
  { kind: "activity", url: "https://moba.garena.tw/news/Activity" },
  { kind: "announcement", url: "https://moba.garena.tw/news/" },
  { kind: "esports", url: "https://moba.garena.tw/news/Esports" },
];

function stripEmails(value) {
  return String(value || "")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "")
    .replace(/https?:\/\/(?:discord\.gg|discord\.com\/invite)\/\S+/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function safeImage(value) {
  const text = String(value || "").trim();
  if (!text.startsWith("https://")) return "";
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (host.endsWith(".garenanow.com") || host.endsWith(".akamaihd.net") || host === "akamaihd.net") return url.href;
  } catch {
    return "";
  }
  return "";
}

function isoFromLabel(label, now) {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(label || "").trim());
  if (!match) return "";
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  let year = now.getUTCFullYear();
  const candidate = Date.UTC(year, month - 1, day);
  if (candidate - now.getTime() > 1000 * 60 * 60 * 24 * 45) year -= 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * First page of a public Garena news/activity list.
 * @param {string} html
 * @param {{ kind: string, url: string }} source
 * @param {Date} [now]
 */
export function parseActivityList(html, source, now = new Date()) {
  const page = String(html || "");
  const found = new Map();
  const remember = (id, titleHtml, textHtml, image) => {
    const title = stripEmails(htmlToText(titleHtml)).slice(0, 140);
    if (!title || found.has(id)) return;
    found.set(id, {
      id,
      title,
      dateLabel: "",
      date: "",
      kind: source.kind,
      excerpt: stripEmails(htmlToText(textHtml)).slice(0, 180),
      image: safeImage(image),
      sourceUrl: `https://moba.garena.tw/news/show/${id}`,
      listUrl: source.url,
    });
  };
  const splitFeature =
    /<a href="\/news\/show\/(\d+)"[^>]*>\s*<img[^>]+src="([^"]+)"[\s\S]{0,900}?<a href="\/news\/show\/\1"[^>]*class="event_content"[\s\S]*?class="event_title[^"]*">([\s\S]*?)<\/div>\s*<div class="event_text">([\s\S]*?)<\/div>/i.exec(
      page,
    );
  if (splitFeature) remember(splitFeature[1], splitFeature[3], splitFeature[4], splitFeature[2]);
  const feature =
    /<a href="\/news\/show\/(\d+)"[\s\S]{0,500}?<img[^>]+src="([^"]+)"[\s\S]{0,800}?class="event_title[^"]*">([\s\S]*?)<\/div>\s*<div class="event_text">([\s\S]*?)<\/div>/i.exec(
      page,
    );
  if (feature) remember(feature[1], feature[3], feature[4], feature[2]);
  const rowRe =
    /<a href="\/news\/show\/(\d+)"[^>]*class="event_list"[\s\S]*?<div class="event_list_title">([\s\S]*?)<\/div>\s*<div class="event_list_date">([^<]*)<\/div>/gi;
  for (const match of page.matchAll(rowRe)) {
    const title = stripEmails(htmlToText(match[2])).slice(0, 140);
    if (!title) continue;
    if (found.has(match[1])) {
      const existing = found.get(match[1]);
      if (!existing.dateLabel) {
        const dateLabel = htmlToText(match[3]).slice(0, 8);
        existing.dateLabel = dateLabel;
        existing.date = isoFromLabel(dateLabel, now);
      }
      continue;
    }
    const dateLabel = htmlToText(match[3]).slice(0, 8);
    found.set(match[1], {
      id: match[1],
      title,
      dateLabel,
      date: isoFromLabel(dateLabel, now),
      kind: source.kind,
      excerpt: "",
      image: "",
      sourceUrl: `https://moba.garena.tw/news/show/${match[1]}`,
      listUrl: source.url,
    });
  }
  return [...found.values()].slice(0, 24);
}

function absCdn(value) {
  let image = String(value || "").trim().replace(/^['"]|['"]$/g, "");
  if (image.startsWith("//")) image = `https:${image}`;
  if (!image.startsWith("https://")) return "";
  try {
    const host = new URL(image).hostname.toLowerCase();
    if (host.endsWith(".akamaihd.net") || host.endsWith(".garenanow.com")) return image;
  } catch {
    return "";
  }
  return "";
}

/** Official page icons that live on moba.garena.tw, plus the CDN. */
function absOfficial(value) {
  const cdn = absCdn(value);
  if (cdn) return cdn;
  let image = String(value || "").trim().replace(/^['"]|['"]$/g, "");
  if (image.startsWith("//")) image = `https:${image}`;
  if (image.startsWith("/")) image = `https://moba.garena.tw${image}`;
  if (!image.startsWith("https://")) return "";
  try {
    const url = new URL(image);
    if (url.hostname === "moba.garena.tw" && url.pathname.startsWith("/static/")) return url.href;
  } catch {
    return "";
  }
  return "";
}

function plainTip(html) {
  return htmlToText(String(html || "").replace(/&lt;\s*br\s*\/?\s*&gt;/gi, " ").replace(/<br\s*\/?>/gi, " "));
}

const ITEM_BOX_RE = /<div class="p_box" data-tags="([^"]*)" data-filter="([^"]*)">([\s\S]*?)<div class="p_b_text">/gi;

/** Official equipment list: id, name, icon, and the public tooltip text. */
export function parseItemList(html) {
  const items = [];
  const seen = new Set();
  for (const match of String(html || "").matchAll(ITEM_BOX_RE)) {
    const box = match[3];
    const image = absCdn(/<img src="([^"]+)"/i.exec(box)?.[1] || "");
    const id = /\/(\d{3,6})\.png/.exec(image)?.[1] || "";
    const name = plainTip(/class="tooltip-name">([\s\S]*?)<\/div>/i.exec(box)?.[1] || match[2]).slice(0, 40);
    if (!id || !name || seen.has(id) || !image) continue;
    const desc = plainTip(/class="tooltip-desc">([\s\S]*?)<\/div>/i.exec(box)?.[1] || "");
    const tip = plainTip(/class="tooltip-tip">([\s\S]*?)<\/div>/i.exec(box)?.[1] || "");
    const category = plainTip(match[1]);
    seen.add(id);
    items.push({
      id,
      name: { zh: name, en: "" },
      category: category && category !== "None" ? category.slice(0, 16) : "",
      description: [desc, tip].filter(Boolean).join(" ").slice(0, 360),
      image,
      pageUrl: PROPS_URL,
    });
  }
  return items;
}

const SKILL_RE =
  /<div class="h_skill"><img src="([^"]+)"[\s\S]*?<div class="h_c_title">([\s\S]*?)<\/div>\s*<div class="h_c_text">([\s\S]*?)<\/div>/gi;

/** Hero page: skill text and skin art. Skin names are kept only when the page prints them. */
export function parseHeroDetail(html) {
  const page = String(html || "");
  const skills = [];
  for (const match of page.matchAll(SKILL_RE)) {
    const name = htmlToText(match[2]).slice(0, 40);
    const text = htmlToText(match[3]).slice(0, 220);
    const image = absCdn(match[1]);
    if (!name || !text) continue;
    skills.push({ name, text, image });
    if (skills.length === 6) break;
  }
  const banners = [...page.matchAll(/hero_banner-list__item-img" src="([^"]+)"/gi)].map((match) => absCdn(match[1]));
  const thumbs = [...page.matchAll(/J-hero_banner-pg-a"><img src="([^"]+)"/gi)].map((match) => absCdn(match[1]));
  const skins = [];
  const count = Math.max(banners.length, thumbs.length);
  for (let index = 0; index < count && skins.length < 16; index += 1) {
    const image = banners[index] || thumbs[index];
    if (!image) continue;
    const named = "";
    skins.push({
      id: String(index),
      name: { zh: named, en: "" },
      image,
      thumb: thumbs[index] || image,
      kind: index === 0 && !/\/skin\//.test(image) ? "default" : "skin",
    });
  }
  return {
    blurb: skills[0]?.text?.slice(0, 180) || "",
    skills,
    skins,
  };
}

async function mapPool(items, size, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

const KATHA_BOX_RE =
  /<div class="k_box" data-tags="([^"]*)" data-filter="([^"]*)">([\s\S]*?)<div class="k_b_text">/gi;

/** Official 奧義 list: level, attribute tags, name, and the published effect. */
export function parseKathaList(html) {
  const rows = [];
  const seen = new Set();
  for (const match of String(html || "").matchAll(KATHA_BOX_RE)) {
    const tags = match[1]
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const level = Number(/^lv(\d)$/.exec(tags.find((tag) => /^lv\d$/.test(tag)) || "")?.[1] || 0);
    const attrs = tags.filter((tag) => !/^lv\d$/.test(tag));
    const block = match[3];
    const image = absCdn(/<img src="([^"]+)"/i.exec(block)?.[1] || "");
    const id = /\/(\d+)\.png/i.exec(image)?.[1] || "";
    const label = htmlToText(match[2]).slice(0, 40);
    const name = label.replace(/^[1-3]級奧義[:：]\s*/, "").trim();
    const effect = plainTip(/tooltip-desc">([\s\S]*?)<\/div>/i.exec(block)?.[1] || "").slice(0, 240);
    const key = `${level}:${id || name}`;
    if (!name || !level || !id || seen.has(key)) continue;
    seen.add(key);
    rows.push({ id, name, level, tags: attrs, effect, image, pageUrl: KATHA_URL });
  }
  return rows;
}

const USER_SKILL_RE =
  /<div class="s_deta">\s*<div class="s_icon"><img src="([^"]+)"[^>]*>\s*<\/div>\s*<div class="s_title">([\s\S]*?)<\/div>\s*<div class="s_text">([\s\S]*?)<\/div>/gi;

/** Official 挑戰者技能 page. These are player skills, not hero abilities. */
export function parseChallengerSkills(html) {
  const rows = [];
  const seen = new Set();
  for (const match of String(html || "").matchAll(USER_SKILL_RE)) {
    const image = absOfficial(match[1]);
    const name = htmlToText(match[2]).slice(0, 40);
    const text = plainTip(match[3]).slice(0, 240);
    const id = /\/([^/]+)\.png$/i.exec(image)?.[1] || "";
    if (!name || !text || !id || seen.has(id)) continue;
    seen.add(id);
    rows.push({ id, name, text, image, pageUrl: USER_SKILL_URL });
  }
  return rows;
}

export function assembleCatalog({ heroes, modes, activities = [], items = [], arcana = [], userSkills = [], fetchedAt }) {
  const payload = {
    source: "official-snapshot",
    fetchedAt,
    attribution: {
      heroes: HERO_LIST_URL,
      items: PROPS_URL,
      arcana: KATHA_URL,
      userSkills: USER_SKILL_URL,
      glyphs: "https://moba.garena.tw/news/show/1854",
      images: "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/",
      itemImages: "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/",
      publisher: "Garena Online",
      activities: ACTIVITY_LISTS.map((item) => item.url),
      note: "Hero names, role tags, portraits, skill text, and skin art come from public Garena Traditional Chinese pages. Equipment names, icons, and descriptions come from the public equipment list. English role words are translations of those on-page labels. Mode names and activity posts are copied from public Garena pages. They are not a live queue and not a private API. Skin art is shown when the hero page publishes it; the page often has no skin name. Arcana names, levels, tags, and effects come from the public katha list. Challenger skills come from the public skill page. Hero skill 4 is not arcana.",
    },
    roles: roleCatalog(),
    heroes,
    items,
    arcana,
    userSkills,
    modes,
    activities,
  };
  payload.search = buildSearchIndex(payload);
  return payload;
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} [fetchedAt]
 */
export async function buildOfficialCatalog(fetchImpl, fetchedAt = new Date().toISOString(), options = {}) {
  const headers = { "user-agent": "moohsia-com-catalog" };
  const heroesResponse = await fetchImpl(HERO_LIST_URL, { headers });
  if (!heroesResponse.ok) {
    const error = new Error("CatalogFetch");
    error.name = "CatalogFetch";
    throw error;
  }
  const heroes = parseHeroList(await heroesResponse.text());
  if (heroes.length < 40) {
    const error = new Error("CatalogShort");
    error.name = "CatalogShort";
    throw error;
  }
  const propsResponse = await fetchImpl(PROPS_URL, { headers });
  if (!propsResponse.ok) {
    const error = new Error("CatalogItems");
    error.name = "CatalogItems";
    throw error;
  }
  const items = parseItemList(await propsResponse.text());
  if (items.length < 40) {
    const error = new Error("CatalogItems");
    error.name = "CatalogItems";
    throw error;
  }
  const detailLimit = options.detailLimit == null ? 0 : options.detailLimit;
  if (detailLimit > 0 && heroes.length) {
    const offset = Math.max(0, Number(options.detailOffset) || 0) % heroes.length;
    const chosen = [];
    for (let index = 0; index < Math.min(detailLimit, heroes.length); index += 1) {
      chosen.push((offset + index) % heroes.length);
    }
    await mapPool(chosen, 6, async (index) => {
      const hero = heroes[index];
      try {
        const response = await fetchImpl(hero.pageUrl, { headers });
        if (!response.ok) return;
        const detail = parseHeroDetail(await response.text());
        heroes[index] = { ...hero, ...detail, skillsUrl: hero.pageUrl };
      } catch {
        /* keep the list row if one public hero page fails */
      }
    });
  }
  const modes = [];
  const seenUrls = new Map();
  for (const spec of MODE_SPECS) {
    let html = seenUrls.get(spec.url);
    if (!html) {
      const response = await fetchImpl(spec.url, { headers: { "user-agent": "moohsia-com-catalog" } });
      if (!response.ok) continue;
      html = await response.text();
      seenUrls.set(spec.url, html);
    }
    const mode = modeFromPage(html, spec);
    if (mode) modes.push(mode);
  }
  if (modes.length < 8) {
    const error = new Error("CatalogModes");
    error.name = "CatalogModes";
    throw error;
  }
  const activities = [];
  const seen = new Set();
  for (const source of ACTIVITY_LISTS) {
    try {
      const response = await fetchImpl(source.url, { headers: { "user-agent": "moohsia-com-catalog" } });
      if (!response.ok) continue;
      for (const item of parseActivityList(await response.text(), source)) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        activities.push(item);
      }
    } catch {
      /* keep heroes and modes if a public list is temporarily unreadable */
    }
  }
  let arcana = [];
  let userSkills = [];
  try {
    const kathaResponse = await fetchImpl(KATHA_URL, { headers });
    if (kathaResponse.ok) arcana = parseKathaList(await kathaResponse.text());
  } catch {
    /* merge keeps the bundled katha list if the public page is unreadable */
  }
  try {
    const skillResponse = await fetchImpl(USER_SKILL_URL, { headers });
    if (skillResponse.ok) userSkills = parseChallengerSkills(await skillResponse.text());
  } catch {
    /* merge keeps the bundled challenger skills */
  }
  return assembleCatalog({
    heroes,
    modes,
    activities: activities.slice(0, 36),
    items,
    arcana,
    userSkills,
    fetchedAt,
  });
}
