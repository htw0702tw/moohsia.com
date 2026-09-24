import { getDefaultDocument } from "../src/content.js";
import { CONTACT_EMAIL } from "./brand.js";

const TEXT_MAX = 2000;
const LONG_MAX = 5000;
const LONG_KEYS = new Set([
  "body",
  "lead",
  "manifesto",
  "ticker",
  "finaleBody",
  "writeBody",
  "emptyBody",
  "recruitBody",
  "homeDescription",
  "identityLead",
]);

function clip(value, max) {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function cleanEmail(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text) && text.length <= 120) return text;
  return fallback || CONTACT_EMAIL;
}

function cleanSlots(value, fallback) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 12) return fallback;
  return number;
}

function cleanId(value) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (/^[A-Za-z0-9_-]{1,40}$/.test(raw)) return raw;
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function cleanDate(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function bilingual(value, max) {
  const record = value && typeof value === "object" ? value : {};
  return { zh: clip(record.zh, max), en: clip(record.en, max) };
}

function sanitizeBySchema(schema, input, key = "") {
  if (typeof schema === "string") {
    if (key === "tone") return input === "alert" ? "alert" : "calm";
    const max = LONG_KEYS.has(key) ? LONG_MAX : TEXT_MAX;
    return typeof input === "string" ? input.slice(0, max) : schema;
  }
  if (Array.isArray(schema)) {
    const items = Array.isArray(input) ? input : schema;
    const sample = schema[0];
    if (sample === undefined) return [];
    return items.slice(0, 24).map((item) => sanitizeBySchema(sample, item, key));
  }
  if (schema && typeof schema === "object") {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const out = {};
    for (const child of Object.keys(schema)) {
      out[child] = sanitizeBySchema(schema[child], source[child], child);
    }
    return out;
  }
  return schema;
}

function cleanProfile(list, fallback) {
  if (!Array.isArray(list)) return fallback;
  const out = [];
  for (const item of list.slice(0, 16)) {
    if (!item || typeof item !== "object") continue;
    const zh = clip(item.zh, 80);
    const en = clip(item.en, 80);
    if (!zh && !en) continue;
    out.push({
      id: cleanId(item.id || zh || en),
      zh,
      en,
      value: bilingual(item.value, 400),
    });
  }
  return out;
}

function cleanRoster(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list.slice(0, 24)) {
    if (!item || typeof item !== "object") continue;
    out.push({
      id: cleanId(item.id),
      name: bilingual(item.name, 80),
      role: bilingual(item.role, 80),
      hidden: item.hidden === true,
    });
  }
  return out;
}

function cleanNews(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const item of list.slice(0, 80)) {
    if (!item || typeof item !== "object") continue;
    out.push({
      id: cleanId(item.id),
      date: cleanDate(item.date),
      title: bilingual(item.title, 200),
      body: bilingual(item.body, LONG_MAX),
      status: item.status === "published" ? "published" : "draft",
    });
  }
  return out;
}

export class ContentRejected extends Error {
  /** @param {string} code */
  constructor(code) {
    super(code);
    this.name = "ContentRejected";
    this.code = code;
  }
}

function assertPublicSafe(doc) {
  const text = JSON.stringify(doc).toLowerCase();
  const offBrand = String.fromCharCode(104, 116, 119, 48, 55, 48, 50);
  if (text.includes("discord.gg/") || text.includes("discord.com/invite/") || text.includes(offBrand)) {
    throw new ContentRejected("blocked_content");
  }
}

/** @param {unknown} input */
export function sanitizeDocument(input) {
  const base = getDefaultDocument();
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const copy = source.copy && typeof source.copy === "object" ? source.copy : {};
  const doc = {
    version: 1,
    contactEmail: cleanEmail(source.contactEmail, base.contactEmail),
    placeholderSlots: cleanSlots(source.placeholderSlots, base.placeholderSlots),
    profileFields: cleanProfile(source.profileFields, base.profileFields),
    rosterMembers: cleanRoster(source.rosterMembers),
    newsPosts: cleanNews(source.newsPosts),
    copy: {
      zh: sanitizeBySchema(base.copy.zh, copy.zh),
      en: sanitizeBySchema(base.copy.en, copy.en),
    },
  };
  assertPublicSafe(doc);
  return doc;
}

/** Published view. Hidden players and unpublished news are omitted. */
export function toPublicDocument(doc) {
  return {
    contactEmail: doc.contactEmail,
    placeholderSlots: doc.placeholderSlots,
    profileFields: doc.profileFields,
    rosterMembers: doc.rosterMembers
      .filter((member) => member.hidden !== true && (member.name.zh || member.name.en))
      .map(({ id, name, role }) => ({ id, name, role })),
    newsPosts: doc.newsPosts
      .filter((post) => post.status === "published" && (post.title.zh || post.title.en || post.body.zh || post.body.en))
      .map(({ id, date, title, body }) => ({ id, date, title, body })),
    copy: doc.copy,
  };
}

export function projectDefault() {
  return {
    ok: true,
    source: "default",
    ...toPublicDocument(sanitizeDocument(getDefaultDocument())),
  };
}
