/** Display helpers for in-game match rows. Farm and healing stay different fields. */

export const ITEM_ICON_BASE =
  "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/";

export function itemIdFromToken(value) {
  const text = String(value ?? "").trim();
  const fromPath = /\/image\/item\/(\d{1,6})\./i.exec(text);
  if (fromPath) return fromPath[1];
  const labeled = /^(?:裝備\s*)?(\d{3,6})$/.exec(text);
  if (labeled) return labeled[1];
  return "";
}

export function itemIconUrl(id) {
  return id ? `${ITEM_ICON_BASE}${id}.png` : "";
}

/** Always six slots. Empty slots stay so a build is never shortened. */
export function itemSlots(items, catalogItems = []) {
  const list = Array.isArray(items) ? items : [];
  const known = Array.isArray(catalogItems) ? catalogItems : [];
  return Array.from({ length: 6 }, (_, index) => {
    const raw = String(list[index] ?? "").trim();
    const id = itemIdFromToken(raw);
    const found = id ? known.find((item) => String(item?.id) === id) : null;
    const name = found?.name?.zh || found?.name?.en || "";
    return {
      id,
      label: name || raw,
      src: found?.image || itemIconUrl(id),
      description: found?.description || "",
    };
  });
}

/**
 * AOVRanking 控場 is seconds. In-game 控制效果 is that value ×1000
 * (6.534 → 6534). Integers already on the in-game scale stay as entered.
 */
export function controlEffect(value) {
  const text = String(value ?? "").trim();
  if (!/^\d{1,4}\.\d{1,3}$/.test(text)) return text;
  const seconds = Number(text);
  if (!Number.isFinite(seconds)) return text;
  return String(Math.round(seconds * 1000));
}

export function resultWord(result) {
  const text = String(result ?? "").trim();
  if (!text) return "";
  if (text === "勝" || /勝利|VICTORY/i.test(text)) return "VICTORY";
  if (text === "敗" || /失敗|敗北|DEFEAT/i.test(text)) return "DEFEAT";
  return text;
}

export function percentOf(part, whole) {
  const value = Number(part);
  const total = Number(whole);
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return "";
  const pct = Math.round((value / total) * 1000) / 10;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/** 每次承傷 = 承受傷害 / 死亡. Blank when deaths are missing or zero. */
export function takenEach(taken, deaths) {
  const damage = Number(taken);
  const died = Number(deaths);
  if (!Number.isFinite(damage) || !Number.isFinite(died) || died <= 0) return "";
  return String(Math.round(damage / died));
}

export function sumField(rows, field) {
  let total = 0;
  let seen = false;
  for (const row of rows || []) {
    const value = Number(row?.[field]);
    if (!Number.isFinite(value)) continue;
    total += value;
    seen = true;
  }
  return seen ? total : 0;
}

export function rosterMemberForPlayer(members, player) {
  const handle = String(player?.handle || "").trim().toLowerCase();
  if (!handle) return null;
  for (const member of members || []) {
    if (member?.hidden) continue;
    const names = [member?.name?.zh, member?.name?.en]
      .map((value) => String(value || "").trim().toLowerCase())
      .filter(Boolean);
    if (names.includes(handle)) return member;
  }
  return null;
}

export function memberSlug(member) {
  const names = [member?.name?.en, member?.name?.zh, member?.id];
  for (const value of names) {
    const text = String(value || "").trim();
    if (/^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/.test(text)) return text;
  }
  return "";
}

export function findRosterMember(members, key) {
  const needle = String(key || "").trim().toLowerCase();
  if (!needle) return null;
  for (const member of members || []) {
    if (member?.hidden) continue;
    if (String(member.id || "").toLowerCase() === needle) return member;
    if (memberSlug(member).toLowerCase() === needle) return member;
    const names = [member?.name?.zh, member?.name?.en].map((value) => String(value || "").trim().toLowerCase());
    if (names.includes(needle)) return member;
  }
  return null;
}

/** Public profile URL. Prefers the roster member whose name is the player handle. */
export function playerMemberPath(members, player) {
  const match = rosterMemberForPlayer(members, player);
  const slug = memberSlug(match);
  return slug ? `/roster/${slug}` : "";
}

export function frequentBuilds(matches, limit = 6, catalogItems = []) {
  const counts = new Map();
  for (const match of matches || []) {
    const row = (match.board || []).find((item) => item.owner) || null;
    const slots = itemSlots(row?.items || [], catalogItems);
    if (!slots.some((slot) => slot.label)) continue;
    const hero = String(row?.hero || match.hero || "").trim();
    const key = `${hero}|${slots.map((slot) => slot.label).join("|")}`;
    const found = counts.get(key);
    if (found) found.count += 1;
    else counts.set(key, { hero, items: slots, count: 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.hero.localeCompare(b.hero, "zh-Hant"))
    .slice(0, limit);
}

export function listedSkins(player) {
  const rows = [];
  const seen = new Set();
  const push = (hero, name) => {
    const skin = String(name || "").trim();
    const who = String(hero || "").trim();
    if (!skin) return;
    const key = `${who}|${skin}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({ hero: who, name: skin });
  };
  for (const skin of player?.skins || []) push(skin.hero, skin.name);
  for (const match of player?.matches || []) push(match.hero, match.skin);
  return rows;
}
