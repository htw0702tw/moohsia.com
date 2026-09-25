/** Parse public Garena TW Arena of Valor pages. No login, no private API. */

export const HERO_LIST_URL = "https://moba.garena.tw/game/heroes/";

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

export function assembleCatalog({ heroes, modes, activities = [], fetchedAt }) {
  return {
    source: "official-snapshot",
    fetchedAt,
    attribution: {
      heroes: HERO_LIST_URL,
      images: "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/",
      publisher: "Garena Online",
      activities: ACTIVITY_LISTS.map((item) => item.url),
      note: "Hero names, role tags, and portraits come from the public Traditional Chinese hero list. English role words are translations of those on-page labels. Mode names and activity posts are copied from public Garena pages. They are not a live queue and not a private API.",
    },
    roles: roleCatalog(),
    heroes,
    modes,
    activities,
  };
}

/**
 * @param {typeof fetch} fetchImpl
 * @param {string} [fetchedAt]
 */
export async function buildOfficialCatalog(fetchImpl, fetchedAt = new Date().toISOString()) {
  const heroesResponse = await fetchImpl(HERO_LIST_URL, { headers: { "user-agent": "moohsia-com-catalog" } });
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
  return assembleCatalog({ heroes, modes, activities: activities.slice(0, 36), fetchedAt });
}
