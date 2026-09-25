import { derivedKda, PLAYER_MATCH_LIMIT } from "./player.js";
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
  const hasHistory = /player-match-item|對局時間|常用英雄/.test(text);
  const challenge = /cf-turnstile|turnstile-form|安全驗證|Just a moment|cf-browser-verification/i.test(text);
  if ((status === 403 || status === 503) && !hasHistory) return "blocked";
  if (challenge && !hasHistory) return "challenge";
  if (!text.trim()) return "empty";
  if (status >= 400 && !hasHistory) return "blocked";
  return "";
}

function columnKey(text) {
  const label = String(text || "").replace(/\s+/g, "");
  const rules = [
    ["輸出占比", "heroDamagePct"],
    ["輸出%", "heroDamagePct"],
    ["承傷占比", "takenPct"],
    ["承傷%", "takenPct"],
    ["總輸出", "heroDamage"],
    ["英雄輸出", "heroDamage"],
    ["輸出", "heroDamage"],
    ["總承傷", "taken"],
    ["承受傷害", "taken"],
    ["承傷", "taken"],
    ["對塔傷害", "tower"],
    ["對塔", "tower"],
    ["控制時間", "control"],
    ["控制", "control"],
    ["治療量", "healing"],
    ["治療", "healing"],
    ["排位積分", "rankDelta"],
    ["積分變化", "rankDelta"],
    ["積分", "rankDelta"],
    ["補兵", "minions"],
    ["分均經濟", "gpm"],
    ["GPM", "gpm"],
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

function parseTables(html) {
  const tables = [];
  const re = /<table\b[^>]*>([\s\S]*?)<\/table>/gi;
  let match;
  while ((match = re.exec(html))) {
    const rows = [];
    const rowRe = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let row;
    while ((row = rowRe.exec(match[1]))) {
      const cells = [];
      const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi;
      let cell;
      while ((cell = cellRe.exec(row[1]))) {
        const alts = [...cell[1].matchAll(/<img\b[^>]*\balt=(["'])([\s\S]*?)\1/gi)]
          .map((item) => decode(item[2]).trim())
          .filter(Boolean);
        cells.push({ text: stripTags(cell[1]), alts, mvp: /MVP/i.test(cell[1]) });
      }
      if (cells.length) rows.push(cells);
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
  if (cell.alts?.length) return cell.alts.slice(0, 6);
  return String(cell.text || "")
    .split(/[、,，]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function kdaParts(text) {
  const match = /(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/.exec(String(text || ""));
  if (!match) return { kills: "", deaths: "", assists: "" };
  return { kills: match[1], deaths: match[2], assists: match[3] };
}

function materialize(row) {
  const cells = row.cells || {};
  const kda = kdaParts(cells.kda?.text || "");
  const joined = Object.values(cells)
    .map((cell) => cell.text || "")
    .join(" ");
  return {
    side: row.side === "red" ? "red" : "blue",
    hero: clip(row.hero || cells.hero?.alts?.[0] || cells.hero?.text || "", 40),
    ign: clip(row.ign || ignFrom(cells.ign?.text || ""), 40),
    uid: row.uid || uidFrom(cells.ign?.text || ""),
    lane: clip(cells.lane?.text || "", 24),
    badge: clip(cells.badge?.text || "", 24),
    kills: kda.kills,
    deaths: kda.deaths,
    assists: kda.assists,
    gold: numberFrom(cells.gold?.text),
    score: numberFrom(cells.score?.text, { places: 2 }),
    mvp: Object.values(cells).some((cell) => cell.mvp) || /\bMVP\b/.test(joined),
    owner: false,
    items: itemsFrom(cells.items),
    heroDamage: numberFrom(cells.heroDamage?.text),
    heroDamagePct: numberFrom(cells.heroDamagePct?.text, { places: 2 }),
    taken: numberFrom(cells.taken?.text),
    takenPct: numberFrom(cells.takenPct?.text, { places: 2 }),
    level: numberFrom(cells.level?.text),
    minions: numberFrom(cells.minions?.text),
    control: numberFrom(cells.control?.text, { places: 3 }),
    healing: numberFrom(cells.healing?.text),
    tower: numberFrom(cells.tower?.text),
    rankDelta: numberFrom(cells.rankDelta?.text, { signed: true }),
    reputation: numberFrom(cells.reputation?.text, { signed: true }),
    powerDelta: numberFrom(cells.powerDelta?.text, { signed: true }),
    gpm: numberFrom(cells.gpm?.text),
  };
}

function rowsFromHtml(html, side) {
  const byKey = new Map();
  const order = [];
  for (const table of parseTables(html)) {
    const header = table[0].map((cell) => columnKey(cell.text));
    if (!header.some(Boolean)) continue;
    for (const raw of table.slice(1)) {
      const cells = {};
      header.forEach((key, index) => {
        if (key && raw[index]) cells[key] = raw[index];
      });
      const ign = ignFrom(cells.ign?.text || "");
      const hero = cells.hero?.alts?.[0] || stripTags(cells.hero?.text || "");
      const uid = uidFrom(cells.ign?.text || "");
      if (!ign && !hero) continue;
      const id = `${ign}|${hero}`;
      if (!byKey.has(id)) {
        byKey.set(id, { side, ign, hero, uid: "", cells: {} });
        order.push(id);
      }
      const row = byKey.get(id);
      if (hero) row.hero = hero;
      if (ign) row.ign = ign;
      if (uid) row.uid = uid;
      Object.assign(row.cells, cells);
    }
  }
  return order.map((id) => materialize(byKey.get(id)));
}

function teamHtml(chunk, name) {
  const start = chunk.indexOf(name);
  if (start < 0) return "";
  const rest = chunk.slice(start + name.length);
  const other = name === "我方隊伍" ? "敵方隊伍" : "我方隊伍";
  const end = rest.indexOf(other);
  return end < 0 ? rest : rest.slice(0, end);
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
  const head = html.split(/<table\b|我方隊伍|敵方隊伍/)[0];
  return [...head.matchAll(/<img\b[^>]*\balt=(["'])([\s\S]*?)\1/gi)].map((item) => decode(item[2]).trim()).filter(Boolean);
}

function headerResult(chunk, text) {
  const badge = /<span\b[^>]*badge[^>]*>([\s\S]*?)<\/span>/i.exec(chunk);
  const badgeText = badge ? stripTags(badge[1]) : "";
  const source = `${badgeText} ${text}`;
  if (source.includes("失敗")) return "失敗";
  if (source.includes("勝利")) return "勝利";
  return "";
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

function pickOwner(rows, keyword, headerHero) {
  const name = clip(keyword, 100);
  if (name && !/^\d+$/.test(name)) {
    const byName = rows.find((row) => row.ign === name);
    if (byName) return byName;
  }
  if (name && /^\d+$/.test(name)) {
    const byUid = rows.find((row) => row.uid === name);
    if (byUid) return byUid;
  }
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
  match.minions = owner.minions || match.minions;
  match.control = owner.control || match.control;
  match.healing = owner.healing || match.healing;
  match.tower = owner.tower || match.tower;
  match.lane = owner.lane || match.lane;
  match.reputation = owner.reputation || match.reputation;
  match.rankDelta = owner.rankDelta || match.rankDelta;
  match.powerDelta = owner.powerDelta || match.powerDelta;
  match.ownerSide = owner.side === "red" ? "red" : "blue";
  if (owner.uid) match.ownerUid = owner.uid;
  if (match.result === "勝利") match.winner = match.ownerSide;
  else if (match.result === "失敗") match.winner = match.ownerSide === "red" ? "blue" : "red";
}

function parseChunk(chunk, keyword, index) {
  const text = stripTags(chunk);
  const header = headerResult(chunk, text);
  const kda = kdaParts(text);
  const playedAt = playedAtFrom(text);
  const mode = /地圖\s*[:：]\s*([^\n|<]+)/.exec(text)?.[1]?.trim() || "";
  const external = /(?:對局\s*(?:ID|編號)?|Match)\s*[:：]?\s*(\d{6,}-\d+)/i.exec(text)?.[1] || /(\d{8,}-\d+)/.exec(text)?.[1] || "";
  const hero = headerAlts(chunk)[0] || "";
  if (!kda.kills && !playedAt && !external && !hero) return null;
  const blueHtml = teamHtml(chunk, "我方隊伍");
  const redHtml = teamHtml(chunk, "敵方隊伍");
  let blue = rowsFromHtml(blueHtml, "blue");
  let red = rowsFromHtml(redHtml, "red");
  if (!blue.length && !red.length) {
    blue = rowsFromHtml(chunk, "blue");
  }
  const board = [...blue, ...red].slice(0, 10);
  const owner = pickOwner(board, keyword, hero);
  const id = external || stableId([playedAt, hero, kda.kills, kda.deaths, kda.assists, String(index)]);
  const match = {
    id,
    externalMatchId: id,
    source: "aovweb",
    label: [mode, hero].filter(Boolean).join(" · "),
    date: playedAt.slice(0, 10),
    playedAt,
    duration: durationFrom(text),
    mode: clip(mode, 80),
    hero: clip(hero, 80),
    result: header,
    kda: kda.kills ? `${kda.kills} / ${kda.deaths} / ${kda.assists}` : "",
    kills: kda.kills,
    deaths: kda.deaths,
    assists: kda.assists,
    gold: "",
    damage: "",
    taken: "",
    minions: "",
    control: "",
    healing: "",
    tower: "",
    lane: "",
    reputation: "",
    rankDelta: "",
    powerDelta: "",
    ownerSide: owner ? (owner.side === "red" ? "red" : "blue") : "",
    winner: "",
    publish: false,
    note: { zh: "", en: "" },
    board: board.map((row) => {
      const next = { ...row };
      delete next.uid;
      return next;
    }),
  };
  copyOwner(match, owner);
  const marked = owner ? match.board.find((row) => row.ign === owner.ign && row.hero === owner.hero) : null;
  if (marked) marked.owner = true;
  delete match.ownerUid;
  return { match, ownerUid: owner?.uid || "" };
}

function splitAccordion(html) {
  const re = /<(div|article|section)\b[^>]*class=(["'])[^"']*\b(?:player-match-item|accordion-item)\b[^"']*\2[^>]*>/gi;
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
  return { heroes, wins, losses, played, winRate };
}

export function parseFightHistory(html, options = {}) {
  const clean = withoutNoise(html);
  const split = splitAccordion(clean) || splitLoose(clean);
  const summary = parseSummary(split.summary);
  const keyword = clip(options.keyword, 100);
  const matches = [];
  const seen = new Set();
  let ownerUid = "";
  split.chunks.forEach((chunk, index) => {
    const parsed = parseChunk(chunk, keyword, index);
    if (!parsed?.match) return;
    const key = parsed.match.externalMatchId;
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (!ownerUid && parsed.ownerUid) ownerUid = parsed.ownerUid;
    matches.push(parsed.match);
  });
  matches.sort((a, b) => String(b.playedAt).localeCompare(String(a.playedAt)));
  if (ownerUid) summary.uid = ownerUid;
  return { matches: matches.slice(0, PLAYER_MATCH_LIMIT), summary, count: Math.min(matches.length, PLAYER_MATCH_LIMIT) };
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
    const status = aovPageStatus(response.status, html);
    if (status === "rate_limited") return { ok: false, code: "aov_rate_limited" };
    if (status === "challenge") return { ok: false, code: "aov_challenge" };
    if (status === "blocked") return { ok: false, code: "aov_blocked" };
    if (status === "empty") return { ok: false, code: "aov_empty" };
    const parsed = parseFightHistory(html, { keyword });
    if (!parsed.matches.length) return { ok: false, code: "aov_empty" };
    return { ok: true, ...parsed, keyword, fetched: true };
  } catch (error) {
    logFailure("aov_fetch_failed", error);
    return { ok: false, code: "aov_blocked" };
  }
}
