import { getDefaultDocument } from "../src/content.js";
import { storeFromEnv } from "./cms-store.js";
import { logFailure } from "./log.js";
import { emptyPlayer } from "./player.js";
import { ContentRejected, sanitizeDocument } from "./site-document.js";

const NOTION_VERSION = "2022-06-28";

const DATABASES = [
  ["roster", "NOTION_ROSTER_DB"],
  ["news", "NOTION_NEWS_DB"],
  ["copy", "NOTION_COPY_DB"],
  ["profile", "NOTION_PROFILE_DB"],
  ["player", "NOTION_PLAYER_DB"],
  ["matches", "NOTION_MATCH_DB"],
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
  if (sections.player) {
    const published = sorted(sections.player).filter((page) => flag(page.properties, "Publish"));
    const matches = doc.player.matches;
    if (!published.length) {
      doc.player = emptyPlayer();
    } else {
      const props = published[0].properties;
      doc.player = {
        ...emptyPlayer(),
        publish: true,
        handle: titleText(props),
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
        },
        matches,
      };
    }
    if (!sections.matches) doc.player.matches = matches;
  }
  if (sections.matches) {
    if (!doc.player) doc.player = emptyPlayer();
    doc.player.matches = sorted(sections.matches).map((page, index) => ({
      id: pageId(page, index),
      label: titleText(page.properties),
      date: textProp(page.properties, "Date").slice(0, 10),
      mode: textProp(page.properties, "Mode"),
      hero: textProp(page.properties, "Hero"),
      result: textProp(page.properties, "Result"),
      kda: textProp(page.properties, "KDA"),
      note: bilingual(textProp(page.properties, "Note"), textProp(page.properties, "Note EN")),
      publish: flag(page.properties, "Publish"),
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
