/** Public recruitment application. Guild MOOHSIA, team 暮霞｜MOS. */

const RESERVED = "moohsia";
const DISCORD_INVITE = /discord\.gg\/|discord\.com\/invite\//i;

export const RANKS = [
  { id: "bronze", zh: "青銅", en: "Bronze", ok: false },
  { id: "silver", zh: "白銀", en: "Silver", ok: false },
  { id: "gold", zh: "黃金", en: "Gold", ok: true },
  { id: "platinum", zh: "鉑金", en: "Platinum", ok: true },
  { id: "diamond", zh: "鑽石", en: "Diamond", ok: true },
  { id: "star", zh: "星耀", en: "Star", ok: true },
  { id: "conqueror", zh: "王者", en: "Conqueror", ok: true },
];

export const POSITIONS = [
  { id: "clash", zh: "對抗路", en: "Clash Lane" },
  { id: "jungle", zh: "打野", en: "Jungle" },
  { id: "mid", zh: "中路", en: "Mid" },
  { id: "farm", zh: "發育路", en: "Farm Lane" },
  { id: "roam", zh: "輔助", en: "Roam" },
];

export const GENDERS = [
  { id: "male", zh: "男", en: "Male" },
  { id: "female", zh: "女", en: "Female" },
  { id: "other", zh: "其他", en: "Other" },
  { id: "unspecified", zh: "不願透露", en: "Prefer not to say" },
];

export const AGE_BANDS = [
  { id: "18-20", zh: "18-20", en: "18-20" },
  { id: "21-30", zh: "21-30", en: "21-30" },
  { id: "31-40", zh: "31-40", en: "31-40" },
  { id: "41+", zh: "41 以上", en: "41+" },
];

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nameKey(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function clockOk(hours, minutes) {
  const h = Number(hours);
  const m = Number(minutes);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/** At least one concrete range such as 20:00～22:00. */
export function practiceTimeOk(value) {
  const text = clip(value, 80);
  if (!text) return false;
  const pattern = /(\d{1,2}):(\d{2})\s*[~～\-–—]\s*(\d{1,2}):(\d{2})/g;
  const matches = [...text.matchAll(pattern)];
  if (!matches.length) return false;
  return matches.every((item) => clockOk(item[1], item[2]) && clockOk(item[3], item[4]));
}

function reject(code, field) {
  return { ok: false, code, field };
}

/**
 * @param {unknown} input
 */
export function validateApplication(input) {
  const source = input && typeof input === "object" ? input : {};
  if (clip(source.company, 80) || clip(source.website, 80)) return { ok: false, code: "spam", field: "company" };

  const rank = RANKS.find((item) => item.id === source.rank);
  if (!rank) return reject("rank_below_gold", "rank");
  if (!rank.ok) return reject("rank_below_gold", "rank");

  const uid = clip(source.uid, 24);
  if (!/^\d{4,20}$/.test(uid)) return reject("uid_invalid", "uid");

  const nickname = clip(source.nickname, 32);
  if (!nickname || nickname.length > 24) return reject("nickname_invalid", "nickname");
  if (nameKey(nickname) === RESERVED) return reject("nickname_invalid", "nickname");

  const email = clip(source.email, 120);
  if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return reject("email_invalid", "email");

  if (!GENDERS.some((item) => item.id === source.gender)) return reject("gender_invalid", "gender");
  if (!AGE_BANDS.some((item) => item.id === source.ageBand)) return reject("age_invalid", "ageBand");

  const motivation = clip(source.motivation, 800);
  if (motivation.length < 8) return reject("motivation_invalid", "motivation");

  const positions = Array.isArray(source.positions) ? source.positions.map((item) => clip(item, 20)) : [];
  const unique = [...new Set(positions)];
  if (unique.length !== 2 || unique.some((id) => !POSITIONS.some((item) => item.id === id))) {
    return reject("positions_invalid", "positions");
  }

  const weekday = clip(source.weekday, 80);
  const holiday = clip(source.holiday, 80);
  if (weekday.length < 2 || holiday.length < 2) return reject("playtime_invalid", "weekday");

  const practice = clip(source.practice, 80);
  if (!practiceTimeOk(practice)) return reject("practice_time_invalid", "practice");

  if (source.conduct !== true) return reject("conduct_required", "conduct");

  const texts = [nickname, motivation, weekday, holiday, practice, email];
  if (texts.some((text) => DISCORD_INVITE.test(text))) return reject("blocked_content", "motivation");

  return {
    ok: true,
    value: {
      rank: rank.id,
      uid,
      nickname,
      email,
      gender: source.gender,
      ageBand: source.ageBand,
      motivation,
      positions: unique,
      weekday,
      holiday,
      practice,
      conduct: true,
      lang: source.lang === "en" ? "en" : "zh",
    },
  };
}

export function rankLabel(id, lang) {
  const row = RANKS.find((item) => item.id === id);
  if (!row) return id;
  return lang === "en" ? row.en : row.zh;
}

export function positionLabel(id, lang) {
  const row = POSITIONS.find((item) => item.id === id);
  if (!row) return id;
  return lang === "en" ? row.en : row.zh;
}

export function genderLabel(id, lang) {
  const row = GENDERS.find((item) => item.id === id);
  if (!row) return id;
  return lang === "en" ? row.en : row.zh;
}

/** Owner-pasted one-time invite. The URL is never returned to the browser. */
export function normalizeInvite(value) {
  const text = clip(value, 200);
  if (!text || DISCORD_INVITE.test(text) === false) return "";
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, "");
    const code = path.split("/").filter(Boolean).pop() || "";
    if (!/^[A-Za-z0-9-]{2,40}$/.test(code)) return "";
    if (url.protocol !== "https:") return "";
    if (host === "discord.gg") return `https://discord.gg/${code}`;
    if (host === "discord.com" && path.startsWith("/invite/")) return `https://discord.com/invite/${code}`;
    return "";
  } catch {
    return "";
  }
}
