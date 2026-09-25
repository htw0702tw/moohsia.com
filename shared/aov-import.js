import { derivedKda, emptyBadges, emptyBoardPlayer, emptySeason, PLAYER_MATCH_LIMIT } from "./player.js";
import { logFailure } from "./log.js";

export const AOV_ORIGIN = "https://aovweb.azurewebsites.net";
export const AOV_USER_AGENT = "moohsia-com/1.0 (owner match import; personal research; +https://moohsia.com)";
export const AOV_SERVERS = {
  1011: "聖騎之王",
  1012: "純潔之翼",
};

const HTML_MAX = 1_500_000;

function clip(value, max) {
  return String(value ?? "").trim().slice(0, max);
}

function decode(value) {
  return String(value ?? "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => safeCode(Number(num)))
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function safeCode(code) {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function stripTags(html) {
  return decode(
    String(html ?? "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|tr|li|h[1-6]|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function withoutNoise(html) {
  return String(html ?? "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

export function fightHistoryUrl({ searchType, keyword, server }) {
  const type = searchType === "UID" ? "UID" : "playerName";
  const name = clip(keyword, 100);
  const url = new URL("/FightHistory/View", AOV_ORIGIN);
  url.searchParams.set("searchType", type);
  url.searchParams.set("keyword", name);
  if (type === "UID") url.searchParams.set("dwLogicWorldId", server === "1011" ? "1011" : "1012");
  return url.toString();
}

export function aovPageStatus(status, html) {
  if (status === 429) return "rate_limited";
  if (status === 301 || status === 302 || status === 303 || status === 307 || status === 308) return "blocked";
  const text = String(html || "");
  const readable = decode(text);
  const hasHistory = /player-match-item|對局時間|常用英雄/.test(text) || /player-match-item|對局時間|常用英雄/.test(readable);
  const challenge = /cf-turnstile|turnstile-form|turnstile-title|安全驗證|anticrawler\/turnstile|just a moment|cf-browser-verification|challenge-platform|__cf_chl|cf-chl/i.test(readable);
  if ((status === 403 || status === 503) && !hasHistory) return "blocked";
  if (challenge && !hasHistory) return "challenge";
  if (!text.trim()) return "empty";
  if (status >= 400 && !hasHistory) return "blocked";
  return "";
}

function columnKey(text) {
  const label = String(text || "").replace(/\s+/g, "");
  if (label.includes("|") || (label.includes("補兵") && label.includes("治療")) || (label.includes("輸出") && label.includes("承傷"))) return "";
  const rules = [
    ["輸出占比", "heroDamagePct"],
    ["輸出%", "heroDamagePct"],
    ["傷害轉化比", "damageRatio"],
    ["輸出轉化", "damageRatio"],
    ["承傷占比", "takenPct"],
    ["承傷%", "takenPct"],
    ["每次承傷", "takenPer"],
    ["總輸出", "heroDamage"],
    ["英雄輸出", "heroDamage"],
    ["輸出", "heroDamage"],
    ["總承傷", "taken"],
    ["承受傷害", "taken"],
    ["承傷", "taken"],
    ["參團率", "teamfightRate"],
    ["參團次數", "teamfightCount"],
    ["評價", "award"],
    ["勳章", "award"],
    ["榮譽", "award"],
    ["對塔傷害", "tower"],
    ["對塔", "tower"],
    ["塔傷", "tower"],
    ["控制效果", "control"],
    ["控制時間", "control"],
    ["控場", "control"],
    ["控制", "control"],
    ["治療量", "healing"],
    ["治療", "healing"],
    ["排位積分變化", "rankDelta"],
    ["排位積分", "rankDelta"],
    ["積分變化", "rankDelta"],
    ["積分", "rankDelta"],
    ["戰力變化詳情", "powerDetail"],
    ["補刀數", "lastHits"],
    ["補刀", "lastHits"],
    ["補兵", "minions"],
    ["分均經濟", "gpm"],
    ["GPM", "gpm"],
    ["野怪經濟", "jungleGold"],
    ["打野經濟", "jungleGold"],
    ["總經濟", "gold"],
    ["經濟", "gold"],
    ["金幣", "gold"],
    ["出裝", "items"],
    ["裝備", "items"],
    ["評分", "score"],
    ["段位", "badge"],
    ["分路", "lane"],
    ["路線", "lane"],
    ["信譽", "reputation"],
    ["戰力", "powerDelta"],
    ["等級", "level"],
    ["英雄", "hero"],
    ["玩家", "ign"],
    ["暱稱", "ign"],
    ["名稱", "ign"],
    ["K/D/A", "kda"],
    ["KDA", "kda"],
  ];
  for (const [needle, key] of rules) {
    if (label.includes(needle)) return key;
  }
  return "";
}

function attrValue(tag, name) {
  const found = new RegExp(`\\b${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, "i").exec(tag);
  return found ? decode(found[2]).trim() : "";
}

function isItemId(value) {
  return /^裝備\s*\d+$/.test(String(value || "").trim());
}

function isStatIcon(value) {
  return /^(輸出|承傷|經濟|補兵|控場|治療|塔傷)$/.test(String(value || "").trim());
}

function imageFacts(html) {
  const alts = [];
  const labels = [];
  const gear = [];
  const re = /<img\b([^>]*)>/gi;
  let match;
  while ((match = re.exec(html))) {
    const alt = attrValue(match[1], "alt");
    const title =
      attrValue(match[1], "title") || attrValue(match[1], "aria-label") || attrValue(match[1], "data-bs-original-title");
    const srcId = /\/item\/(\d+)\./.exec(attrValue(match[1], "src"))?.[1] || "";
    const altId = /^裝備\s*(\d+)$/.exec(alt)?.[1] || "";
    const id = srcId || altId;
    if (alt) alts.push(alt);
    const name = [title, alt].find((value) => value && !isItemId(value) && !isStatIcon(value));
    if (id) gear.push(`裝備 ${id}`);
    else if (name) gear.push(name);
    const label = name || [title, alt].find((value) => value && !isStatIcon(value));
    if (label) labels.push(label);
  }
  return { alts, labels, gear };
}

function portraitName(cell) {
  const alt = cell?.alts?.[0] || "";
  if (alt && !isItemId(alt) && !isStatIcon(alt)) return alt;
  const labels = cell?.labels || [];
  return labels.find((label) => label && !isItemId(label) && !isStatIcon(label)) || "";
}

function parseTables(html) {
  const tables = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = re.exec(html))) {
    const rows = [];
    const rowRe = /<tr\b([^>]*)>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(match[1]))) {
      const cells = [];
      const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cell;
      while ((cell = cellRe.exec(row[2]))) {
        const images = imageFacts(cell[1]);
        cells.push({
          text: stripTags(cell[1]),
          alts: images.alts,
          labels: images.labels,
          gear: images.gear,
          mvp: /MVP/i.test(cell[1]),
        });
      }
      if (!cells.length) continue;
      cells.marked = /table-warning/.test(row[1]);
      rows.push(cells);
    }
    if (rows.length) tables.push(rows);
  }
  return tables;
}

function ignFrom(text) {
  const lines = String(text || "")
    .split(/\n| /)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    lines.find((line) => !/^\d+$/.test(line) && !/^UID/i.test(line) && !/^Lv\.?/i.test(line) && !/^等級/.test(line)) || ""
  );
}

function uidFrom(text) {
  return /UID\s*[:：]?\s*(\d{4,20})/i.exec(String(text || ""))?.[1] || "";
}

function numberFrom(text, { places = 0, signed = false } = {}) {
  const raw = String(text || "").replace(/,/g, "");
  const match = signed ? /([+-]?\d+(?:\.\d+)?)/.exec(raw) : /(\d+(?:\.\d+)?)/.exec(raw);
  if (!match) return "";
  let value = match[1].replace(/^\+/, "");
  if (!signed) value = value.replace(/^-/, "");
  const negative = value.startsWith("-");
  const body = negative ? value.slice(1) : value;
  const [whole, frac = ""] = body.split(".");
  if (!whole) return "";
  if (places <= 0 || !frac) return `${negative ? "-" : ""}${whole}`;
  return `${negative ? "-" : ""}${whole}.${frac.slice(0, places)}`.replace(/\.$/, "");
}

function itemsFrom(cell) {
  if (!cell) return [];
  if (cell.gear?.length) return cell.gear.slice(0, 6);
  const labels = cell.labels?.length ? cell.labels : cell.alts || [];
  const ids = labels
    .map((label) => {
      const id = /^裝備\s*(\d+)$/.exec(label)?.[1];
      return id ? `裝備 ${id}` : "";
    })
    .filter(Boolean);
  if (ids.length) return ids.slice(0, 6);
  const named = labels.filter((label) => label && !isItemId(label) && !isStatIcon(label));
  if (named.length) return named.slice(0, 6);
  return String(cell.text || "")
    .split(/[、,，]/)
    .map((part) => part.trim())
    .filter((part) => part && !isStatIcon(part))
    .slice(0, 6);
}

function kdaParts(text) {
  const match = /(?<![\d.])(\d+)\s*\/\s*(?<![\d.])(\d+)\s*\/\s*(?<![\d.])(\d+)(?![\d.])/.exec(String(text || ""));
  if (!match) return { kills: "", deaths: "", assists: "" };
  return { kills: match[1], deaths: match[2], assists: match[3] };
}

/** Names the admin mode list already offers. Exact labels are kept. */
const CATALOG_MODES = new Set([
  "排位賽",
  "巔峰對決",
  "5V5經典競技",
  "混沌大亂鬥",
  "三人對決",
  "死鬥競技場",
  "幻影激鬥",
  "足球總動員",
  "飛鉤奪寶戰",
  "隨機單中",
  "單人對戰",
  "幻化之戰",
  "雙人飛車賽",
]);

/**
 * AOVRanking 地圖 labels are not the same strings as the site catalog.
 * This owner's 經典競技 / 競賽模式 / 冠軍賽 games are ranked.
 */
const MODE_RULES = [
  [/傳說之巔|巔峰/, "巔峰對決"],
  [/經典競技|競賽模式|冠軍賽/, "排位賽"],
  [/5\s*v\s*5/i, "5V5經典競技"],
  [/大亂鬥|混沌/, "混沌大亂鬥"],
  [/三人/, "三人對決"],
  [/死鬥/, "死鬥競技場"],
  [/幻影/, "幻影激鬥"],
  [/足球/, "足球總動員"],
  [/飛鉤/, "飛鉤奪寶戰"],
  [/單中/, "隨機單中"],
  [/1\s*v\s*1|單人對戰/i, "單人對戰"],
  [/幻化/, "幻化之戰"],
  [/飛車/, "雙人飛車賽"],
  [/排位/, "排位賽"],
];

export function normalizeQueueMode(raw) {
  return catalogMode(raw).mode;
}

function catalogMode(raw) {
  const text = clip(raw, 80);
  if (!text) return { mode: "", raw: "" };
  if (CATALOG_MODES.has(text)) return { mode: text, raw: text };
  for (const [pattern, name] of MODE_RULES) {
    if (pattern.test(text)) return { mode: name, raw: text };
  }
  return { mode: text, raw: text };
}

function rowMedals(cells) {
  const bits = Object.values(cells)
    .map((cell) => `${cell?.text || ""} ${(cell?.alts || []).join(" ")}`)
    .join(" ");
  const badges = emptyBadges();
  const loseMvp = /敗方\s*MVP/i.test(bits);
  if (/超神/.test(bits)) badges.godlike = true;
  if (/五殺/.test(bits)) badges.penta = true;
  if (/四殺/.test(bits)) badges.quadra = true;
  if (/三殺/.test(bits)) badges.triple = true;
  if (/頂級/.test(bits)) badges.supreme = true;
  if (/金牌/.test(bits)) badges.gold = true;
  if (/銀牌/.test(bits)) badges.silver = true;
  if (loseMvp) badges.loseMvp = true;
  return { mvp: /MVP/i.test(bits) && !loseMvp, badges };
}

function deltaFrom(text) {
  const source = String(text || "");
  const paren = /\(([+-]\d+)\)/.exec(source);
  if (paren) return paren[1].replace(/^\+/, "");
  return numberFrom(source, { signed: true });
}

function pctOf(text) {
  return /\(([\d.]+)\s*%\)/.exec(String(text || ""))?.[1] || "";
}

function notesFromCells(cells) {
  const text = Object.values(cells)
    .map((cell) => cell?.text || "")
    .join("\n");
  return {
    lane: /分路(?:\([^)]*\))?\s*[:：]\s*([^\s\n]+)/.exec(text)?.[1] || "",
    reputation: /信譽分\s*[:：]\s*([+-]?\d+)/.exec(text)?.[1]?.replace(/^\+/, "") || "",
    level: /Lv\.?\s*(\d+)/i.exec(text)?.[1] || "",
  };
}

function materialize(row) {
  const cells = row.cells || {};
  const kda = kdaParts(cells.kda?.text || "");
  const medals = rowMedals(cells);
  const notes = notesFromCells(cells);
  const heroAlt = portraitName(cells.hero) || portraitName(cells.ign);
  return {
    side: row.side === "red" ? "red" : "blue",
    hero: clip(row.hero || heroAlt || cells.hero?.text || "", 40),
    ign: clip(row.ign || ignFrom(cells.ign?.text || ""), 40),
    marked: row.marked === true,
    uid: row.uid || uidFrom(cells.ign?.text || ""),
    lane: clip(cells.lane?.text || notes.lane, 24),
    badge: clip(cells.badge?.text || "", 24),
    kills: kda.kills,
    deaths: kda.deaths,
    assists: kda.assists,
    gold: numberFrom(cells.gold?.text),
    score: numberFrom(cells.score?.text, { places: 2 }),
    mvp: medals.mvp,
    owner: false,
    items: itemsFrom(cells.items),
    heroDamage: numberFrom(cells.heroDamage?.text),
    heroDamagePct: numberFrom(cells.heroDamagePct?.text, { places: 2 }) || pctOf(cells.heroDamage?.text),
    taken: numberFrom(cells.taken?.text),
    takenPct: numberFrom(cells.takenPct?.text, { places: 2 }) || pctOf(cells.taken?.text),
    level: numberFrom(cells.level?.text) || notes.level,
    minions: numberFrom(cells.minions?.text) || numberFrom(cells.lastHits?.text),
    lastHits: numberFrom(cells.lastHits?.text) || numberFrom(cells.minions?.text),
    jungleGold: numberFrom(cells.jungleGold?.text),
    control: numberFrom(cells.control?.text, { places: 3 }),
    healing: numberFrom(cells.healing?.text),
    tower: numberFrom(cells.tower?.text),
    rankingFarm: "",
    rankingControl: "",
    rankingHealing: "",
    rankingTower: "",
    farmValidated: false,
    rankDelta: deltaFrom(cells.rankDelta?.text),
    reputation: numberFrom(cells.reputation?.text, { signed: true }) || notes.reputation,
    powerDelta: deltaFrom(cells.powerDelta?.text),
    gpm: numberFrom(cells.gpm?.text),
    teamfightCount: numberFrom(cells.teamfightCount?.text),
    teamfightRate: numberFrom(cells.teamfightRate?.text, { places: 2 }),
    damageRatio: numberFrom(cells.damageRatio?.text, { places: 2 }),
    takenPer: numberFrom(cells.takenPer?.text),
    badges: medals.badges,
  };
}

function splitPipeValues(labels, text) {
  const raw = String(text || "");
  const lines = raw
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length >= labels.length) return lines.slice(0, labels.length);
  const flat = raw.replace(/\s+/g, " ").trim();
  const joined = labels.join("");
  if (/輸出/.test(joined) && /承傷/.test(joined)) {
    const bits = [...flat.matchAll(/\d[\d,]*(?:\.\d+)?(?:\s*\([^)]*%\))?/g)].map((item) => item[0].trim());
    if (bits.length >= labels.length) return bits.slice(0, labels.length);
  }
  if ((/補兵|補刀/.test(joined)) && (/控場|控制/.test(joined)) && /治療/.test(joined)) {
    const match = /^(\d+)\s+(\d+(?:\.\d+)?)\s*秒?\s+(\d+)\s+(\d+)/.exec(flat);
    if (match && labels.length >= 4) return [match[1], match[2], match[3], match[4]];
  }
  if ((/經濟|金幣/.test(joined)) && /野怪/.test(joined) && /補/.test(joined)) {
    const match = /(\d+)\s+(\d+)\s+(\d+)/.exec(flat);
    if (match && labels.length >= 3) return [match[1], match[2], match[3]];
  }
  return lines;
}

function pipeKeys(parts) {
  const norm = parts.map((part) => part.replace(/\s+/g, ""));
  if (
    norm.length === 4 &&
    norm[0].includes("補兵") &&
    !norm[0].includes("補刀") &&
    norm[1].includes("控場") &&
    norm[2].includes("治療") &&
    norm[3].includes("塔")
  ) {
    return ["minions", "control", "healing", "tower"];
  }
  if (
    norm.length === 4 &&
    norm[0].includes("補刀") &&
    norm[1].includes("控制") &&
    norm[2].includes("治療") &&
    norm[3].includes("塔")
  ) {
    return ["lastHits", "control", "healing", "tower"];
  }
  if (norm.length === 3 && norm[1].includes("野怪") && norm[2].includes("補") && (norm[0].includes("經濟") || norm[0].includes("金幣"))) {
    return ["gold", "jungleGold", "lastHits"];
  }
  if (norm.length === 3 && norm[0].includes("輸出") && norm[1].includes("承傷") && norm[2].includes("經濟")) {
    return ["heroDamage", "taken", "gold"];
  }
  return parts.map((label) => columnKey(label));
}

function assignHeaderCell(cells, headerText, cell) {
  if (!cell) return;
  const parts = String(headerText || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    const values = splitPipeValues(parts, cell.text || "");
    pipeKeys(parts).forEach((key, index) => {
      if (!key || cells[key]) return;
      cells[key] = { text: values[index] || "", alts: [], mvp: false };
    });
    return;
  }
  const key = columnKey(headerText);
  if (key && !cells[key]) cells[key] = cell;
}

function rowsFromHtml(html, side) {
  const byKey = new Map();
  const order = [];
  for (const table of parseTables(html)) {
    const header = table[0].map((cell) => cell.text || "");
    if (!header.some((text) => columnKey(text) || text.includes("|"))) continue;
    for (const raw of table.slice(1)) {
      const cells = {};
      header.forEach((text, index) => assignHeaderCell(cells, text, raw[index]));
      const ign = ignFrom(cells.ign?.text || "");
      const hero = portraitName(cells.hero) || stripTags(cells.hero?.text || "") || portraitName(cells.ign);
      const uid = uidFrom(cells.ign?.text || "");
      if (!ign && !hero) continue;
      const id = `${ign}|${hero}`;
      if (!byKey.has(id)) {
        byKey.set(id, { side, ign, hero, uid: "", marked: false, cells: {} });
        order.push(id);
      }
      const row = byKey.get(id);
      if (hero) row.hero = hero;
      if (ign) row.ign = ign;
      if (uid) row.uid = uid;
      if (raw.marked) row.marked = true;
      Object.assign(row.cells, cells);
    }
  }
  return order.map((id) => materialize(byKey.get(id)));
}

function teamSide(name) {
  return name === "紅方" || name === "敵方隊伍" ? "red" : "blue";
}

function teamMarks(chunk) {
  const found = [];
  const re = /藍方|紅方|我方隊伍|敵方隊伍/g;
  let match;
  while ((match = re.exec(chunk))) found.push({ index: match.index, name: match[0] });
  const sided = found.some((item) => item.name === "藍方" || item.name === "紅方");
  return found.filter((item) => (sided ? item.name === "藍方" || item.name === "紅方" : item.name === "我方隊伍" || item.name === "敵方隊伍"));
}

/** Split scoreboard HTML by 藍方 / 紅方. Returns null only when those labels are absent. */
function teamHtml(chunk) {
  const marks = teamMarks(chunk);
  if (!marks.length) return null;
  const grouped = { blue: "", red: "" };
  const tableRe = /<table\b[\s\S]*?<\/table>/gi;
  let table;
  let sidedTables = 0;
  while ((table = tableRe.exec(chunk))) {
    const prior = marks.filter((item) => item.index < table.index).pop();
    if (!prior) continue;
    sidedTables += 1;
    grouped[teamSide(prior.name)] += table[0];
  }
  if (sidedTables) return grouped;
  const ordered = [...marks].sort((a, b) => a.index - b.index);
  for (let index = 0; index < ordered.length; index += 1) {
    const start = ordered[index].index;
    const end = ordered[index + 1]?.index ?? chunk.length;
    grouped[teamSide(ordered[index].name)] += chunk.slice(start, end);
  }
  return grouped;
}

function durationFrom(text) {
  const head = String(text).split(/對局時間/)[0];
  const zh = /(\d{1,3})\s*分\s*(\d{1,2})\s*秒/.exec(head);
  if (zh) return `${Number(zh[1])}:${String(zh[2]).padStart(2, "0")}`;
  const clock = /(\d{1,3}):(\d{2})/.exec(head);
  if (clock) return `${Number(clock[1])}:${clock[2]}`;
  return "";
}

function playedAtFrom(text) {
  const match = /對局時間\s*[:：]?\s*(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2})(?::(\d{2}))?)?/.exec(text);
  if (!match) return "";
  if (!match[2]) return match[1];
  return `${match[1]} ${match[2]}${match[3] ? `:${match[3]}` : ""}`;
}

function headerAlts(html) {
  const head = headerHtml(html);
  return [...head.matchAll(/<img\b[^>]*\balt=(["'])([\s\S]*?)\1/gi)].map((item) => decode(item[2]).trim()).filter(Boolean);
}

function resultFrom(source) {
  let result = "";
  const re = /失敗|敗北|勝利/g;
  let match;
  while ((match = re.exec(source))) result = match[0] === "勝利" ? "勝" : "敗";
  return result;
}

function headerHtml(chunk) {
  const source = String(chunk);
  const bodyAt = source.search(/accordion-body/i);
  const cut = bodyAt >= 0 ? bodyAt : source.search(/<table\b|我方隊伍|敵方隊伍|藍方|紅方/i);
  return cut < 0 ? source : source.slice(0, cut);
}

function headerResult(chunk) {
  const head = headerHtml(chunk);
  const badges = [...head.matchAll(/<span\b[^>]*badge[^>]*>([\s\S]*?)<\/span>/gi)];
  if (badges.length) return resultFrom(stripTags(badges[badges.length - 1][1]));
  return resultFrom(stripTags(head).split(/對局時間/)[0]);
}

function headerKda(text) {
  const head = String(text).split(/對局時間/)[0];
  const re = /(?<![\d.])(\d+)\s*\/\s*(?<![\d.])(\d+)\s*\/\s*(?<![\d.])(\d+)(?![\d.])/g;
  let found = null;
  let match;
  while ((match = re.exec(head))) found = match;
  if (!found) return { kills: "", deaths: "", assists: "" };
  return { kills: found[1], deaths: found[2], assists: found[3] };
}

function headerMode(text) {
  const head = String(text).split(/對局時間/)[0];
  const re = /地圖\s*[:：]\s*([^\n|<]+)/g;
  let found = "";
  let match;
  while ((match = re.exec(head))) found = match[1].trim();
  return found;
}

function headerOwnerRow(keyword, hero, kda) {
  const name = clip(keyword, 40);
  const row = emptyBoardPlayer();
  row.side = "blue";
  row.owner = true;
  row.hero = clip(hero, 40);
  row.ign = name && !/^\d+$/.test(name) ? name : "";
  row.kills = kda.kills;
  row.deaths = kda.deaths;
  row.assists = kda.assists;
  if (/^\d+$/.test(name)) row.uid = name;
  return row;
}

function stableId(parts) {
  const text = parts.filter(Boolean).join("|");
  if (!text) return "";
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `aov${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sameIgn(ign, keyword) {
  const left = String(ign || "").trim().toLowerCase();
  const right = String(keyword || "").trim().toLowerCase();
  return Boolean(left && right && left === right);
}

function pickOwner(rows, keyword, headerHero) {
  const name = clip(keyword, 100);
  if (name && !/^\d+$/.test(name)) {
    const byName = rows.find((row) => sameIgn(row.ign, name));
    if (byName) return byName;
  }
  if (name && /^\d+$/.test(name)) {
    const byUid = rows.find((row) => row.uid === name);
    if (byUid) return byUid;
  }
  const marked = rows.find((row) => row.marked);
  if (marked) return marked;
  if (headerHero) {
    const byHero = rows.find((row) => row.hero === headerHero && row.side !== "red") || rows.find((row) => row.hero === headerHero);
    if (byHero) return byHero;
  }
  return null;
}

function copyOwner(match, owner) {
  if (!owner) return;
  owner.owner = true;
  match.hero = owner.hero || match.hero;
  match.kills = owner.kills || match.kills;
  match.deaths = owner.deaths || match.deaths;
  match.assists = owner.assists || match.assists;
  match.gold = owner.gold || match.gold;
  match.damage = owner.heroDamage || match.damage;
  match.taken = owner.taken || match.taken;
  const farm = owner.lastHits || owner.minions || match.lastHits || match.minions;
  match.minions = farm;
  match.lastHits = farm;
  match.jungleGold = owner.jungleGold || match.jungleGold;
  match.damageRatio = owner.damageRatio || match.damageRatio;
  match.takenPer = owner.takenPer || match.takenPer;
  match.control = owner.control || match.control;
  match.healing = owner.healing || match.healing;
  match.tower = owner.tower || match.tower;
  match.lane = owner.lane || match.lane;
  match.reputation = owner.reputation || match.reputation;
  match.rankDelta = owner.rankDelta || match.rankDelta;
  match.powerDelta = owner.powerDelta || match.powerDelta;
  match.ownerSide = owner.side === "red" ? "red" : "blue";
  if (owner.uid) match.ownerUid = owner.uid;
  if (match.result === "勝") match.winner = match.ownerSide;
  else if (match.result === "敗") match.winner = match.ownerSide === "red" ? "blue" : "red";
  if (owner.kills !== "" || owner.deaths !== "" || owner.assists !== "") {
    if (owner.kills !== "") match.kills = owner.kills;
    if (owner.deaths !== "") match.deaths = owner.deaths;
    if (owner.assists !== "") match.assists = owner.assists;
  }
  if (match.kills !== "" && match.deaths !== "" && match.assists !== "") {
    match.kda = `${match.kills} / ${match.deaths} / ${match.assists}`;
  }
  match.mvp = owner.mvp === true;
  match.badges = { ...emptyBadges(), ...(owner.badges || {}) };
}

function parseChunk(chunk, keyword, index) {
  const head = headerHtml(chunk);
  const headText = stripTags(head);
  const text = stripTags(chunk);
  const header = headerResult(chunk);
  const kda = headerKda(headText);
  const playedAt = playedAtFrom(text);
  const mapped = catalogMode(headerMode(headText));
  const external = /(?:對局\s*(?:ID|編號)?|Match)\s*[:：]?\s*(\d{6,}-\d+)/i.exec(text)?.[1] || /(\d{8,}-\d+)/.exec(text)?.[1] || "";
  const alts = headerAlts(head);
  const hero = alts[alts.length - 1] || "";
  if (!kda.kills && !playedAt && !external && !hero) return null;
  const sections = teamHtml(chunk);
  const blue = sections ? rowsFromHtml(sections.blue, "blue") : rowsFromHtml(chunk, "blue");
  const red = sections ? rowsFromHtml(sections.red, "red") : [];
  const board = [...blue, ...red].slice(0, 10);
  let boardPartial = false;
  let owner = pickOwner(board, keyword, hero);
  if (!owner && !board.length && (kda.kills || kda.deaths || kda.assists || hero)) {
    owner = headerOwnerRow(keyword, hero, kda);
    board.push(owner);
    boardPartial = true;
  }
  const notes = [];
  if (mapped.raw && mapped.raw !== mapped.mode) notes.push(`AOVRanking 地圖：${mapped.raw}`);
  if (boardPartial) notes.push("這頁沒有展開隊伍，記分板只有自己的 KDA。");
  const id = external || stableId([playedAt, hero, kda.kills, kda.deaths, kda.assists, String(index)]);
  const match = {
    id,
    externalMatchId: id,
    source: "aovweb",
    label: [mapped.mode, hero].filter(Boolean).join(" · "),
    date: playedAt.slice(0, 10),
    playedAt,
    duration: durationFrom(headText),
    mode: mapped.mode,
    map: mapped.raw && mapped.raw !== mapped.mode ? mapped.raw : "",
    hero: clip(hero, 80),
    result: header,
    kda: kda.kills || kda.deaths || kda.assists ? `${kda.kills} / ${kda.deaths} / ${kda.assists}` : "",
    kills: kda.kills,
    deaths: kda.deaths,
    assists: kda.assists,
    gold: "",
    damage: "",
    taken: "",
    minions: "",
    lastHits: "",
    jungleGold: "",
    damageRatio: "",
    takenPer: "",
    control: "",
    healing: "",
    tower: "",
    rankingFarm: "",
    rankingControl: "",
    rankingHealing: "",
    rankingTower: "",
    farmValidated: false,
    lane: "",
    reputation: "",
    rankDelta: "",
    powerDelta: "",
    ownerSide: owner ? (owner.side === "red" ? "red" : "blue") : "",
    winner: "",
    publish: false,
    mvp: false,
    badges: emptyBadges(),
    note: { zh: notes.join(" "), en: "" },
    board: board.map((row) => {
      const next = { ...row };
      delete next.uid;
      delete next.badges;
      delete next.marked;
      return next;
    }),
  };
  copyOwner(match, owner);
  const marked = owner ? match.board.find((row) => row.ign === owner.ign && row.hero === owner.hero) : null;
  if (marked) marked.owner = true;
  delete match.ownerUid;
  return { match, ownerUid: owner?.uid || "", boardPartial };
}

function splitAccordion(html) {
  const itemRe = /<(div|article|section)\b[^>]*class=(["'])[^"']*\baccordion-item\b[^"']*\2[^>]*>/gi;
  const playerRe = /<(div|article|section)\b[^>]*class=(["'])[^"']*\bplayer-match-item\b[^"']*\2[^>]*>/gi;
  const re = itemRe.test(html) ? itemRe : playerRe;
  re.lastIndex = 0;
  const marks = [];
  let match;
  while ((match = re.exec(html))) marks.push(match.index);
  if (marks.length < 1) return null;
  const summary = html.slice(0, marks[0]);
  const chunks = marks.map((start, index) => html.slice(start, marks[index + 1] ?? html.length));
  return { summary, chunks };
}

function splitLoose(html) {
  const re = /對局時間/g;
  const marks = [];
  let match;
  while ((match = re.exec(html))) marks.push(match.index);
  if (!marks.length) return { summary: html, chunks: [] };
  const lookback = 900;
  const summaryEnd = Math.max(0, marks[0] - lookback);
  const chunks = marks.map((index, item) => {
    const start = Math.max(0, index - lookback);
    const end = item + 1 < marks.length ? Math.max(start + 1, marks[item + 1] - lookback) : html.length;
    return html.slice(start, end);
  });
  return { summary: html.slice(0, summaryEnd), chunks };
}

function parseSummary(html) {
  const text = stripTags(html);
  const heroes = [];
  const heroRe = /([^\s()（）<>]{1,16})\s*[（(]\s*(\d+)\s*場\s*[,，]\s*勝率\s*([\d.]+)\s*%\s*[）)]/g;
  let hero;
  while ((hero = heroRe.exec(text))) {
    const after = text.slice(hero.index, hero.index + 180);
    const kda = /K\/D\/A\s*[:：]\s*([\d.]+\s*\/\s*[\d.]+\s*\/\s*[\d.]+)/.exec(after);
    heroes.push({
      hero: hero[1],
      matches: hero[2],
      winRate: hero[3].replace(/\.0+$/, ""),
      kdaText: kda ? kda[1].replace(/\s+/g, " ") : "",
    });
  }
  const wins = /勝場\s*[:：]\s*(\d+)/.exec(text)?.[1] || "";
  const losses = /敗場\s*[:：]\s*(\d+)/.exec(text)?.[1] || "";
  const recent = /近\s*(\d+)\s*場/.exec(text)?.[1] || "";
  const played = wins && losses ? String(Number(wins) + Number(losses)) : recent;
  const statsBlock = text.split(/近\s*\d+\s*場|對戰統計/).pop() || text;
  const explicitRate = /(\d{1,3}(?:\.\d+)?)\s*%/.exec(statsBlock)?.[1]?.replace(/\.0+$/, "") || "";
  let winRate = explicitRate;
  if (!winRate && wins && losses) {
    const total = Number(wins) + Number(losses);
    if (total) winRate = String(Math.round((Number(wins) / total) * 1000) / 10).replace(/\.0$/, "");
  }
  return { heroes, wins, losses, played, winRate, radar: radarFrom(text) };
}

function radarFrom(text) {
  const block = /雷達[\s\S]{0,500}/.exec(String(text || ""))?.[0] || "";
  if (!block) return {};
  const grab = (re) => {
    const match = re.exec(block);
    if (!match) return "";
    const value = match[1].replace(/\.0$/, "");
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || number > 100) return "";
    return value;
  };
  return {
    output: grab(/(?<!總)輸出\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)/),
    kda: grab(/KDA\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)(?!\s*\/)/i),
    farm: grab(/發育\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)/),
    teamfight: grab(/團戰\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)/),
    survival: grab(/生存\s*[:：]?\s*(\d{1,3}(?:\.\d+)?)/),
  };
}

export function parseFightHistory(html, options = {}) {
  const clean = withoutNoise(html);
  const split = splitAccordion(clean) || splitLoose(clean);
  const summary = parseSummary(split.summary);
  const keyword = clip(options.keyword, 100);
  const matches = [];
  const seen = new Set();
  let ownerUid = "";
  let boardPartial = false;
  split.chunks.forEach((chunk, index) => {
    const parsed = parseChunk(chunk, keyword, index);
    if (!parsed?.match) return;
    const key = parsed.match.externalMatchId;
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (!ownerUid && parsed.ownerUid) ownerUid = parsed.ownerUid;
    if (parsed.boardPartial) boardPartial = true;
    matches.push(parsed.match);
  });
  matches.sort((a, b) => String(b.playedAt).localeCompare(String(a.playedAt)));
  if (ownerUid) summary.uid = ownerUid;
  return {
    matches: matches.slice(0, PLAYER_MATCH_LIMIT),
    summary,
    count: Math.min(matches.length, PLAYER_MATCH_LIMIT),
    boardPartial,
  };
}

function shellBlob(html) {
  const clean = withoutNoise(html);
  return `${clean}\n${decode(clean)}`;
}

function hasMatchRows(blob) {
  return /player-match-item|對局時間|對局\s*(?:ID|編號)|Match\s*ID/i.test(blob);
}

function isProtectedQueryShell(html) {
  const blob = shellBlob(html);
  if (hasMatchRows(blob)) return false;
  return /aov-protected-query|正在載入歷史戰績|data-query-result/i.test(blob);
}

function isAovShell(html) {
  const blob = shellBlob(html);
  if (hasMatchRows(blob)) return false;
  if (isProtectedQueryShell(html)) return true;
  return /歷史戰績|FightHistory|accordion-item|class=(["'])[^"']*\baccordion\b/i.test(blob);
}

/** Classify a user-supplied history page before it is stored. */
export function pastedFightHistory(html, options = {}) {
  if (isProtectedQueryShell(html)) return { ok: false, code: "aov_shell" };
  const page = aovPageStatus(200, html);
  if (page === "challenge") return { ok: false, code: "aov_challenge" };
  if (isAovShell(html)) return { ok: false, code: "aov_shell" };
  const parsed = parseFightHistory(html, options);
  if (!parsed.matches.length) return { ok: false, code: "aov_empty" };
  return { ok: true, ...parsed };
}

function sumsOf(matches) {
  let kills = 0;
  let deaths = 0;
  let assists = 0;
  let gold = 0;
  let damage = 0;
  let counted = 0;
  let goldCount = 0;
  let damageCount = 0;
  for (const match of matches) {
    if (match.kills !== "" && match.deaths !== "" && match.assists !== "") {
      kills += Number(match.kills);
      deaths += Number(match.deaths);
      assists += Number(match.assists);
      counted += 1;
    }
    if (match.gold) {
      gold += Number(match.gold);
      goldCount += 1;
    }
    if (match.damage) {
      damage += Number(match.damage);
      damageCount += 1;
    }
  }
  return {
    kills: counted ? String(kills) : "",
    deaths: counted ? String(deaths) : "",
    assists: counted ? String(assists) : "",
    gold: goldCount ? String(gold) : "",
    damage: damageCount ? String(damage) : "",
  };
}

function mergeHeroes(existing, heroes) {
  const list = Array.isArray(existing) ? existing.map((item) => ({ ...item, note: { zh: "", en: "", ...(item?.note || {}) } })) : [];
  for (const hero of heroes) {
    if (!hero?.hero) continue;
    const found = list.find((item) => item.hero === hero.hero);
    const note = hero.kdaText ? `K/D/A ${hero.kdaText}` : "";
    if (found) {
      if (hero.matches) found.matches = hero.matches;
      if (hero.winRate) found.winRate = hero.winRate;
      if (note && !found.note?.zh) found.note = { zh: note, en: found.note?.en || "" };
    } else {
      list.push({ id: "", hero: hero.hero, matches: hero.matches || "", winRate: hero.winRate || "", note: { zh: note, en: "" } });
    }
  }
  return list.slice(0, 16);
}

const MEDAL_KEYS = ["godlike", "penta", "quadra", "triple", "supreme", "gold", "silver", "loseMvp"];

function resultTotals(matches) {
  let played = 0;
  let wins = 0;
  for (const match of matches) {
    if (match.result !== "勝" && match.result !== "敗") continue;
    played += 1;
    if (match.result === "勝") wins += 1;
  }
  if (!played) return null;
  const rate = String(Math.round((wins / played) * 1000) / 10).replace(/\.0$/, "");
  return { played: String(played), wins: String(wins), winRate: rate };
}

function seasonsFrom(matches, summary) {
  const groups = new Map();
  for (const match of matches) {
    const mode = match?.mode || "";
    if (!mode) continue;
    if (!groups.has(mode)) groups.set(mode, []);
    groups.get(mode).push(match);
  }
  const seasons = [];
  for (const [mode, list] of groups) {
    const totals = resultTotals(list);
    const season = emptySeason();
    season.id = stableId(["season", mode]);
    season.mode = mode;
    const onlyMode = groups.size === 1;
    if (onlyMode && summary?.played) season.played = summary.played;
    else if (totals) season.played = totals.played;
    if (onlyMode && summary?.wins) season.wins = summary.wins;
    else if (totals) season.wins = totals.wins;
    if (onlyMode && summary?.winRate) season.winRate = summary.winRate;
    else if (totals) season.winRate = totals.winRate;
    let mvp = 0;
    for (const match of list) {
      if (match.mvp === true) mvp += 1;
      for (const key of MEDAL_KEYS) {
        if (match.badges?.[key] === true) season.medals[key] = String(Number(season.medals[key] || 0) + 1);
      }
    }
    if (mvp > 0) season.mvp = String(mvp);
    if (onlyMode && summary?.radar) {
      for (const [key, value] of Object.entries(summary.radar)) {
        if (value) season.radar[key] = value;
      }
    }
    seasons.push(season);
  }
  return seasons;
}

function mergeSeasons(existing, incoming) {
  const list = Array.isArray(existing) ? existing.map((item) => ({ ...item, radar: { ...(item?.radar || {}) }, medals: { ...(item?.medals || {}) } })) : [];
  for (const next of incoming) {
    const found = list.find((item) => item.mode === next.mode);
    if (!found) {
      list.push(next);
      continue;
    }
    for (const key of ["played", "wins", "winRate", "mvp"]) {
      if (!found[key] && next[key]) found[key] = next[key];
    }
    for (const [key, value] of Object.entries(next.radar || {})) {
      if (!found.radar[key] && value) found.radar[key] = value;
    }
    for (const [key, value] of Object.entries(next.medals || {})) {
      if (!found.medals[key] && value) found.medals[key] = value;
    }
  }
  return list.slice(0, 8);
}

function mergeMatch(prev, next, publish) {
  const match = { ...next, note: next.note || { zh: "", en: "" }, highlight: next.highlight };
  if (!prev) {
    match.publish = publish === true;
    return match;
  }
  match.highlight = prev.highlight?.key || prev.highlight?.caption?.zh || prev.highlight?.caption?.en ? prev.highlight : next.highlight;
  if (prev.note?.zh || prev.note?.en) match.note = prev.note;
  match.publish = publish === true ? true : prev.publish === true;
  if (!match.label && prev.label) match.label = prev.label;
  return match;
}

export function applyAovImport(player, parsed, options = {}) {
  const base = player && typeof player === "object" ? structuredClone(player) : {};
  const publish = options.publish === true;
  const existing = Array.isArray(base.matches) ? base.matches : [];
  const byKey = new Map();
  for (const match of existing) {
    if (match?.externalMatchId) byKey.set(match.externalMatchId, match);
    if (match?.id) byKey.set(match.id, match);
  }
  const seen = new Set();
  const imported = [];
  for (const raw of parsed?.matches || []) {
    const key = raw?.externalMatchId || raw?.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const prev = byKey.get(raw.externalMatchId) || byKey.get(raw.id);
    imported.push(mergeMatch(prev, raw, publish));
  }
  const leftover = existing.filter((match) => {
    const keys = [match?.externalMatchId, match?.id].filter(Boolean);
    return keys.every((key) => !seen.has(key));
  });
  const matches = [...imported, ...leftover].slice(0, PLAYER_MATCH_LIMIT);
  const summary = parsed?.summary || {};
  const sums = sumsOf(imported);
  const stats = { ...(base.stats || {}) };
  if (summary.played) stats.played = summary.played;
  if (summary.wins) stats.wins = summary.wins;
  if (summary.winRate) stats.winRate = summary.winRate;
  if (sums.kills) {
    stats.kills = sums.kills;
    stats.deaths = sums.deaths;
    stats.assists = sums.assists;
    stats.kda = derivedKda(sums.kills, sums.deaths, sums.assists);
  }
  if (sums.gold) stats.gold = sums.gold;
  if (sums.damage) stats.damage = sums.damage;
  const seasons = seasonsFrom(imported, summary);
  const mvpCount = seasons.reduce((sum, season) => sum + (season.mvp ? Number(season.mvp) : 0), 0);
  if (mvpCount > 0 && !stats.mvp) stats.mvp = String(mvpCount);
  const heroes = Array.isArray(summary.heroes) ? summary.heroes : [];
  const signatureHeroes = {
    zh: base.signatureHeroes?.zh || "",
    en: base.signatureHeroes?.en || "",
  };
  if (heroes.length) signatureHeroes.zh = heroes.map((hero) => hero.hero).filter(Boolean).join("、").slice(0, 200);
  const serverId = options.server === "1011" || options.server === "1012" ? options.server : "";
  const server = { zh: base.server?.zh || "", en: base.server?.en || "" };
  if (!server.zh && serverId && AOV_SERVERS[serverId]) server.zh = AOV_SERVERS[serverId];
  let handle = base.handle || "";
  if (!handle && options.searchType !== "UID") handle = clip(options.keyword, 40);
  let uid = base.uid || "";
  if (!uid && summary.uid) uid = summary.uid;
  if (!uid && options.searchType === "UID" && /^\d{1,20}$/.test(options.keyword || "")) uid = options.keyword;
  const syncedAt = clip(options.syncedAt || parsed?.syncedAt || new Date().toISOString(), 40);
  return {
    ...base,
    publish: publish ? true : base.publish === true,
    handle,
    uid,
    server,
    signatureHeroes,
    stats,
    heroPool: mergeHeroes(base.heroPool, heroes),
    seasons: mergeSeasons(base.seasons, seasons),
    matches,
    aov: {
      syncedAt,
      count: String(imported.length),
      keyword: clip(options.keyword || parsed?.keyword || "", 100),
      server: serverId,
    },
  };
}

function retryAfterSeconds(response) {
  const raw = response.headers?.get?.("retry-after") || "";
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  return 60;
}

async function readHtml(response) {
  const declared = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > HTML_MAX) return "";
  const text = await response.text();
  return text.length > HTML_MAX ? text.slice(0, HTML_MAX) : text;
}

async function requestPage(fetchImpl, url) {
  return fetchImpl(url, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
    headers: {
      "user-agent": AOV_USER_AGENT,
      accept: "text/html,application/xhtml+xml",
      "accept-language": "zh-Hant,zh;q=0.9,en;q=0.5",
    },
  });
}

export async function fetchFightHistory(env, query) {
  let url = "";
  try {
    url = fightHistoryUrl(query);
  } catch (error) {
    logFailure("aov_fetch_failed", error);
    return { ok: false, code: "aov_invalid" };
  }
  const keyword = clip(query?.keyword, 100);
  if (!keyword) return { ok: false, code: "aov_invalid" };
  if (query?.searchType === "UID" && !/^\d{1,20}$/.test(keyword)) return { ok: false, code: "aov_invalid" };
  const fetchImpl = typeof env?.AOV_FETCH === "function" ? env.AOV_FETCH : fetch;
  const sleep = typeof env?.AOV_SLEEP === "function" ? env.AOV_SLEEP : (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    let response = await requestPage(fetchImpl, url);
    if (response.status === 429) {
      const wait = retryAfterSeconds(response);
      if (wait >= 1 && wait <= 3) {
        await sleep(wait * 1000);
        response = await requestPage(fetchImpl, url);
      }
    }
    const html = response.status === 429 ? "" : await readHtml(response);
    if (response.status !== 429 && isProtectedQueryShell(html)) return { ok: false, code: "aov_shell" };
    const status = aovPageStatus(response.status, html);
    if (status === "rate_limited") return { ok: false, code: "aov_rate_limited" };
    if (status === "challenge") return { ok: false, code: "aov_challenge" };
    if (status === "blocked") return { ok: false, code: "aov_blocked" };
    if (status === "empty") return { ok: false, code: "aov_empty" };
    const parsed = parseFightHistory(html, { keyword });
    if (!parsed.matches.length) return { ok: false, code: isAovShell(html) ? "aov_shell" : "aov_empty" };
    return { ok: true, ...parsed, keyword, fetched: true };
  } catch (error) {
    logFailure("aov_fetch_failed", error);
    return { ok: false, code: "aov_blocked" };
  }
}
