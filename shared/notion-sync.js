import { getDefaultDocument } from "../src/content.js";
import { storeFromEnv } from "./cms-store.js";
import { logFailure } from "./log.js";
import { emptyHighlight, emptyPlayer, emptySeason } from "./player.js";
import { ContentRejected, sanitizeDocument } from "./site-document.js";

const NOTION_VERSION = "2022-06-28";

const DATABASES = [
  ["roster", "NOTION_ROSTER_DB"],
  ["news", "NOTION_NEWS_DB"],
  ["copy", "NOTION_COPY_DB"],
  ["profile", "NOTION_PROFILE_DB"],
  ["player", "NOTION_PLAYER_DB"],
  ["matches", "NOTION_MATCH_DB"],
  ["seasons", "NOTION_SEASON_DB"],
  ["honors", "NOTION_HONOR_DB"],
  ["titles", "NOTION_TITLE_DB"],
  ["heroes", "NOTION_HERO_DB"],
];

function configuredId(env, name) {
  const value = env?.[name];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function notionStatus(env) {
  const token = configuredId(env, "NOTION_TOKEN");
  const flags = {};
  let any = false;
  for (const [key, name] of DATABASES) {
    flags[key] = Boolean(token && configuredId(env, name));
    if (flags[key]) any = true;
  }
  return { configured: any, ...flags };
}

function joinRich(list) {
  if (!Array.isArray(list)) return "";
  return list
    .map((item) => (item && typeof item.plain_text === "string" ? item.plain_text : ""))
    .join("")
    .trim();
}

function textProp(properties, name) {
  const prop = properties?.[name];
  if (!prop || typeof prop !== "object") return "";
  if (Array.isArray(prop.title)) return joinRich(prop.title);
  if (Array.isArray(prop.rich_text)) return joinRich(prop.rich_text);
  if (prop.select && typeof prop.select.name === "string") return prop.select.name.trim();
  if (typeof prop.number === "number" && Number.isFinite(prop.number)) return String(prop.number);
  if (prop.date && typeof prop.date.start === "string") return prop.date.start.trim();
  return "";
}

function titleText(properties) {
  for (const prop of Object.values(properties || {})) {
    if (prop && Array.isArray(prop.title)) {
      const text = joinRich(prop.title);
      if (text) return text;
    }
  }
  return "";
}

function flag(properties, name) {
  const prop = properties?.[name];
  return Boolean(prop && prop.checkbox === true);
}

function orderOf(page) {
  const value = page?.properties?.Order?.number;
  return typeof value === "number" && Number.isFinite(value) ? value : 100000;
}

function sorted(pages) {
  return pages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => orderOf(a.page) - orderOf(b.page) || a.index - b.index)
    .map((item) => item.page);
}

function pageId(page, index) {
  const raw = typeof page?.id === "string" ? page.id.replaceAll("-", "") : "";
  if (/^[A-Za-z0-9]{8,32}$/.test(raw)) return raw.slice(0, 32);
  return `notion${index}`;
}

function bilingual(zh, en) {
  return { zh: zh || "", en: en || "" };
}

function sideToken(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "blue" || text === "藍" || text === "藍方") return "blue";
  if (text === "red" || text === "紅" || text === "紅方") return "red";
  return "";
}

function keptHighlight(previous, caption) {
  const prior = previous && typeof previous === "object" ? previous : emptyHighlight();
  const next = caption?.zh || caption?.en ? caption : prior.caption || { zh: "", en: "" };
  return {
    caption: next,
    key: prior.key || "",
    mime: prior.mime || "",
    kind: prior.kind || "",
  };
}

function scoreboard(text) {
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed.slice(0, 10) : [];
  } catch {
    return [];
  }
}

function seasonFromPage(page, index) {
  const props = page.properties;
  const base = emptySeason();
  return {
    ...base,
    id: pageId(page, index),
    label: titleText(props),
    mode: textProp(props, "Mode"),
    radar: {
      output: textProp(props, "Radar Output"),
      kda: textProp(props, "Radar KDA"),
      farm: textProp(props, "Radar Farm"),
      teamfight: textProp(props, "Radar Teamfight"),
      survival: textProp(props, "Radar Survival"),
    },
    played: textProp(props, "Played"),
    wins: textProp(props, "Wins"),
    winRate: textProp(props, "Win Rate"),
    mvp: textProp(props, "MVP"),
    medals: {
      godlike: textProp(props, "超神"),
      penta: textProp(props, "五殺"),
      quadra: textProp(props, "四殺"),
      triple: textProp(props, "三殺"),
      supreme: textProp(props, "頂級"),
      gold: textProp(props, "金牌"),
      silver: textProp(props, "銀牌"),
      loseMvp: textProp(props, "敗方MVP"),
    },
  };
}

export function applyNotionCollections(document, sections) {
  const doc = structuredClone(document);
  if (sections.roster) {
    doc.rosterMembers = sorted(sections.roster)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => ({
        id: pageId(page, index),
        name: bilingual(titleText(page.properties), textProp(page.properties, "Name EN")),
        role: bilingual(textProp(page.properties, "Role"), textProp(page.properties, "Role EN")),
        hidden: flag(page.properties, "Hidden"),
      }));
  }
  if (sections.news) {
    doc.newsPosts = sorted(sections.news).map((page, index) => ({
      id: pageId(page, index),
      date: textProp(page.properties, "Date").slice(0, 10),
      title: bilingual(titleText(page.properties), textProp(page.properties, "Title EN")),
      body: bilingual(textProp(page.properties, "Body"), textProp(page.properties, "Body EN")),
      status: flag(page.properties, "Publish") ? "published" : "draft",
    }));
  }
  if (sections.copy) {
    for (const page of sections.copy) {
      if (!flag(page.properties, "Publish")) continue;
      const key = titleText(page.properties);
      const text = textProp(page.properties, "Text") || textProp(page.properties, "Value");
      if (!key) continue;
      if (key === "contactEmail") {
        doc.contactEmail = text;
        continue;
      }
      const parts = key.split(".");
      if ((parts[0] !== "zh" && parts[0] !== "en") || parts.length < 2) continue;
      let node = doc.copy[parts[0]];
      for (let index = 1; index < parts.length - 1; index += 1) {
        node = node && typeof node === "object" ? node[parts[index]] : null;
      }
      const leaf = parts[parts.length - 1];
      if (node && typeof node[leaf] === "string") node[leaf] = text;
    }
  }
  if (sections.profile) {
    doc.profileFields = sorted(sections.profile)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => ({
        id: pageId(page, index),
        zh: titleText(page.properties),
        en: textProp(page.properties, "Label EN"),
        value: bilingual(textProp(page.properties, "Value"), textProp(page.properties, "Value EN")),
      }));
  }
  if (!doc.player) doc.player = emptyPlayer();
  const kept = {
    matches: doc.player.matches,
    seasons: doc.player.seasons,
    reputation: doc.player.reputation,
    heroPool: doc.player.heroPool,
    championships: doc.player.championships,
    honorTitles: doc.player.honorTitles,
  };
  if (sections.player) {
    const published = sorted(sections.player).filter((page) => flag(page.properties, "Publish"));
    if (!published.length) {
      doc.player = emptyPlayer();
    } else {
      const props = published[0].properties;
      doc.player = {
        ...emptyPlayer(),
        publish: true,
        handle: titleText(props),
        uid: textProp(props, "UID"),
        name: bilingual(textProp(props, "Name"), textProp(props, "Name EN")),
        role: bilingual(textProp(props, "Role"), textProp(props, "Role EN")),
        lane: bilingual(textProp(props, "Lane"), textProp(props, "Lane EN")),
        rank: bilingual(textProp(props, "Rank"), textProp(props, "Rank EN")),
        season: bilingual(textProp(props, "Season"), textProp(props, "Season EN")),
        server: bilingual(textProp(props, "Server"), textProp(props, "Server EN")),
        title: bilingual(textProp(props, "Title"), textProp(props, "Title EN")),
        bio: bilingual(textProp(props, "Bio"), textProp(props, "Bio EN")),
        signatureHeroes: bilingual(textProp(props, "Heroes"), textProp(props, "Heroes EN")),
        stats: {
          played: textProp(props, "Played"),
          wins: textProp(props, "Wins"),
          winRate: textProp(props, "Win Rate"),
          kda: textProp(props, "KDA"),
          mvp: textProp(props, "MVP"),
          kills: textProp(props, "Kills"),
          deaths: textProp(props, "Deaths"),
          assists: textProp(props, "Assists"),
          gold: textProp(props, "Gold"),
          damage: textProp(props, "Damage"),
        },
        reputation: {
          ...emptyPlayer().reputation,
          score: textProp(props, "Reputation"),
          level: textProp(props, "Reputation Level"),
          exp: textProp(props, "Reputation Exp"),
          expMax: textProp(props, "Reputation Exp Max"),
          note: bilingual(textProp(props, "Reputation Note"), textProp(props, "Reputation Note EN")),
        },
        matches: kept.matches,
        seasons: kept.seasons,
        heroPool: kept.heroPool,
        championships: kept.championships,
        honorTitles: kept.honorTitles,
      };
    }
    if (!sections.matches) doc.player.matches = kept.matches;
    if (!sections.seasons) doc.player.seasons = kept.seasons;
  }
  if (sections.matches) {
    if (!doc.player) doc.player = emptyPlayer();
    const previous = new Map((kept.matches || []).map((match) => [match.id, match.highlight]));
    doc.player.matches = sorted(sections.matches).map((page, index) => {
      const id = pageId(page, index);
      return {
        id,
        label: titleText(page.properties),
        date: textProp(page.properties, "Date").slice(0, 10),
        playedAt: textProp(page.properties, "Played At"),
        duration: textProp(page.properties, "Duration"),
        mode: textProp(page.properties, "Mode"),
        hero: textProp(page.properties, "Hero"),
        result: textProp(page.properties, "Result"),
        kda: textProp(page.properties, "KDA"),
        kills: textProp(page.properties, "Kills"),
        deaths: textProp(page.properties, "Deaths"),
        assists: textProp(page.properties, "Assists"),
        gold: textProp(page.properties, "Gold"),
        damage: textProp(page.properties, "Damage"),
        taken: textProp(page.properties, "Taken"),
        blueScore: textProp(page.properties, "Blue"),
        redScore: textProp(page.properties, "Red"),
        winner: sideToken(textProp(page.properties, "Winner")),
        ownerSide: sideToken(textProp(page.properties, "Owner Side")),
        note: bilingual(textProp(page.properties, "Note"), textProp(page.properties, "Note EN")),
        publish: flag(page.properties, "Publish"),
        highlight: keptHighlight(previous.get(id), bilingual(textProp(page.properties, "Highlight"), textProp(page.properties, "Highlight EN"))),
        board: scoreboard(textProp(page.properties, "Scoreboard")),
      };
    });
  }
  if (sections.seasons) {
    if (!doc.player) doc.player = emptyPlayer();
    doc.player.seasons = sorted(sections.seasons)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => seasonFromPage(page, index));
  }
  if (sections.honors) {
    if (!doc.player) doc.player = emptyPlayer();
    doc.player.championships = sorted(sections.honors)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => ({
        id: pageId(page, index),
        title: titleText(page.properties),
        season: textProp(page.properties, "Season"),
        note: bilingual(textProp(page.properties, "Note"), textProp(page.properties, "Note EN")),
      }));
  }
  if (sections.titles) {
    if (!doc.player) doc.player = emptyPlayer();
    doc.player.honorTitles = sorted(sections.titles)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => ({
        id: pageId(page, index),
        name: titleText(page.properties),
        note: bilingual(textProp(page.properties, "Note"), textProp(page.properties, "Note EN")),
      }));
  }
  if (sections.heroes) {
    if (!doc.player) doc.player = emptyPlayer();
    doc.player.heroPool = sorted(sections.heroes)
      .filter((page) => flag(page.properties, "Publish"))
      .map((page, index) => ({
        id: pageId(page, index),
        hero: titleText(page.properties),
        matches: textProp(page.properties, "Played"),
        winRate: textProp(page.properties, "Win Rate"),
        note: bilingual(textProp(page.properties, "Note"), textProp(page.properties, "Note EN")),
      }));
  }
  return doc;
}

async function queryNotionDatabase(env, databaseId, fetchImpl) {
  const pages = [];
  let cursor = "";
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetchImpl(`https://api.notion.com/v1/databases/${encodeURIComponent(databaseId)}/query`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${configuredId(env, "NOTION_TOKEN")}`,
        "notion-version": NOTION_VERSION,
        "content-type": "application/json",
      },
      body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
    });
    if (!response.ok) {
      const error = new Error("NotionQuery");
      error.name = "NotionQuery";
      throw error;
    }
    const data = await response.json();
    if (Array.isArray(data.results)) pages.push(...data.results);
    if (!data.has_more || typeof data.next_cursor !== "string" || !data.next_cursor) break;
    cursor = data.next_cursor;
  }
  return pages;
}

/**
 * Pull configured Notion databases into the CMS draft.
 * Does not publish. Public pages change only after admin publish,
 * and only Publish=true rows are eligible.
 */
export async function syncNotionDraft(env) {
  const status = notionStatus(env);
  if (!status.configured) return { ok: false, code: "notion_not_configured" };
  const store = storeFromEnv(env);
  if (!store) return { ok: false, code: "storage_unconfigured" };
  const fetchImpl = typeof env?.NOTION_FETCH === "function" ? env.NOTION_FETCH : fetch;
  try {
    let row = await store.get();
    if (!row) {
      const seeded = JSON.stringify(sanitizeDocument(getDefaultDocument()));
      row = await store.seed(seeded, new Date().toISOString());
    }
    if (!row?.draft_json) return { ok: false, code: "storage_unavailable" };
    const sections = {};
    const counts = {};
    for (const [key, name] of DATABASES) {
      if (!status[key]) continue;
      const pages = await queryNotionDatabase(env, configuredId(env, name), fetchImpl);
      sections[key] = pages;
      counts[key] = pages.length;
    }
    const next = sanitizeDocument(applyNotionCollections(JSON.parse(row.draft_json), sections));
    const saved = await store.saveDraft(JSON.stringify(next), new Date().toISOString());
    return { ok: true, counts, updatedAt: saved?.updated_at || "", row: saved };
  } catch (error) {
    if (error instanceof ContentRejected) return { ok: false, code: error.code };
    logFailure("notion_sync_failed", error);
    return { ok: false, code: "notion_sync_failed" };
  }
}
