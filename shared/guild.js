/**
 * In-game guild and team snapshots.
 * The built-in snapshot is the 2026-09-27 client screen. Admin can replace it.
 * The gap to 4th is the printed 4th-place star total minus this guild's own stars.
 */

import { tierById } from "./ranks.js";

export const GUILD_EMBLEM = "/guild/moohsia.webp";
export const TEAM_EMBLEM = "/teams/moohsia.webp";
export const GOLD_EMBLEM = "/ranks/gold.webp";

function clip(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function digits(value, maxDigits) {
  const text = clip(typeof value === "number" && Number.isFinite(value) ? String(value) : String(value ?? ""), 16).replace(/,/g, "");
  if (!text) return "";
  return new RegExp(`^\\d{1,${maxDigits}}$`).test(text) ? text : "";
}

function tops(value) {
  const list = Array.isArray(value) ? value : [];
  return [0, 1, 2, 3].map((index) => digits(list[index], 8));
}

export function emptyGuild() {
  return {
    updatedAt: "",
    region: "",
    members: "",
    capacity: "",
    motto: "",
    activity: "",
    activityMax: "",
    chestLevel: "",
    chestLevels: "",
    levelReq: "",
    rankReq: "",
    review: "",
    accept: "",
    president: "",
    presidentRole: "",
    weekActivity: "",
    lastActivity: "",
    stars: "",
    starsLast: "",
    standing: "",
    weekTop: ["", "", "", ""],
    lastTop: ["", "", "", ""],
  };
}

/** Printed guild screen. Other guilds' names are not stored. */
export function defaultGuild() {
  return {
    updatedAt: "2026-09-27",
    region: "新北市",
    members: "1",
    capacity: "20",
    motto: "moohsia.com 請至官網填表申請",
    activity: "1195",
    activityMax: "6240",
    chestLevel: "1",
    chestLevels: "8",
    levelReq: "6",
    rankReq: "gold",
    review: "off",
    accept: "on",
    president: "htw0702aov",
    presidentRole: "公會長",
    weekActivity: "1195",
    lastActivity: "0",
    stars: "55",
    starsLast: "0",
    standing: "unranked",
    weekTop: ["12848", "11895", "11353", "11314"],
    lastTop: ["25693", "24720", "21402", "21193"],
  };
}

/** Printed team-list screen. A dash score stays blank and renders as —. */
export function defaultTeamCard() {
  return {
    updatedAt: "2026-09-27",
    region: "永和區",
    score: "",
    members: "1",
    capacity: "5",
    status: "招募中",
    captain: "htw0702aov",
    motto: "moohsia.com",
  };
}

export function emptyTeamCard() {
  return {
    updatedAt: "",
    region: "",
    score: "",
    members: "",
    capacity: "",
    status: "",
    captain: "",
    motto: "",
  };
}

export function cleanGuild(value) {
  const source = value && typeof value === "object" ? value : {};
  const standingRaw = clip(source.standing, 12);
  const standing = standingRaw === "unranked" || standingRaw === "未上榜" ? "unranked" : digits(standingRaw, 6);
  const rank = tierById(clip(source.rankReq, 40));
  const review = source.review === "on" || source.review === "off" ? source.review : "";
  const accept = source.accept === "on" || source.accept === "off" ? source.accept : "";
  return {
    updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(clip(source.updatedAt, 10)) ? clip(source.updatedAt, 10) : "",
    region: clip(source.region, 40),
    members: digits(source.members, 4),
    capacity: digits(source.capacity, 4),
    motto: clip(source.motto, 160),
    activity: digits(source.activity, 8),
    activityMax: digits(source.activityMax, 8),
    chestLevel: digits(source.chestLevel, 2),
    chestLevels: digits(source.chestLevels, 2),
    levelReq: digits(source.levelReq, 3),
    rankReq: rank ? rank.id : "",
    review,
    accept,
    president: clip(source.president, 40),
    presidentRole: clip(source.presidentRole, 24),
    weekActivity: digits(source.weekActivity, 8),
    lastActivity: digits(source.lastActivity, 8),
    stars: digits(source.stars, 8),
    starsLast: digits(source.starsLast, 8),
    standing,
    weekTop: tops(source.weekTop),
    lastTop: tops(source.lastTop),
  };
}

export function cleanTeamCard(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    updatedAt: /^\d{4}-\d{2}-\d{2}$/.test(clip(source.updatedAt, 10)) ? clip(source.updatedAt, 10) : "",
    region: clip(source.region, 40),
    score: digits(source.score, 8),
    members: digits(source.members, 4),
    capacity: digits(source.capacity, 4),
    status: clip(source.status, 24),
    captain: clip(source.captain, 40),
    motto: clip(source.motto, 160),
  };
}

export function guildFilled(guild) {
  if (!guild) return false;
  return Object.entries(guild).some(([key, value]) => {
    if (key === "weekTop" || key === "lastTop") return value.some(Boolean);
    return Boolean(value);
  });
}

export function teamCardFilled(card) {
  if (!card) return false;
  return Object.values(card).some(Boolean);
}

/** Stars still short of the printed 4th-place total. Blank when either number is missing. */
export function gapToFourth(stars, top) {
  const own = digits(stars, 8);
  const fourth = digits(Array.isArray(top) ? top[3] : "", 8);
  if (!own || !fourth) return "";
  return String(Math.max(0, Number(fourth) - Number(own)));
}
