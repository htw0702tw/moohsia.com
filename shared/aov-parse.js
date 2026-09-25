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

export function assembleCatalog({ heroes, modes, fetchedAt }) {
  return {
    source: "official-snapshot",
    fetchedAt,
    attribution: {
      heroes: HERO_LIST_URL,
      images: "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/client/GameData/Hero/",
      publisher: "Garena Online",
      note: "Hero names, role tags, and portraits come from the public Traditional Chinese hero list. English role words are translations of those on-page labels. Mode names are copied from public Garena news pages and are not a live queue.",
    },
    roles: roleCatalog(),
    heroes,
    modes,
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
  return assembleCatalog({ heroes, modes, fetchedAt });
}
