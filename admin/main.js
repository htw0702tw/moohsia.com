import "./admin.css";
import { applyAovImport, fightHistoryUrl } from "../shared/aov-import.js";
import { adminMessage, aovNeedsPaste, choosePastedHtml, importFailureMessage } from "./messages.js";
import {
  applyPlayerInput,
  assignPlayerMedia,
  ensurePlayerRecord,
  mediaTargetFrom,
  renderPlayerEditor,
  runPlayerAction,
} from "./player-editor.js";

const NAV = [
  ["dashboard", "/dashboard", "總覽"],
  ["home", "/edit/home", "首頁"],
  ["about", "/edit/about", "公會"],
  ["teams", "/edit/teams", "戰隊"],
  ["roster", "/edit/roster", "成員"],
  ["player", "/edit/player", "選手數據"],
  ["applications", "/applications", "加入申請"],
  ["news", "/edit/news", "動態"],
  ["contact", "/edit/contact", "聯絡"],
  ["chrome", "/edit/chrome", "導覽與頁尾"],
];

const COPY_ROOTS = {
  home: ["home"],
  about: ["about"],
  roster: ["roster"],
  news: ["news"],
  contact: ["contact"],
  chrome: ["meta", "nav", "intro", "footer", "notFound"],
};

const LONG = new Set([
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
  "blurb",
]);

const LABELS = {
  meta: "頁面資訊",
  nav: "導覽",
  intro: "入場",
  footer: "頁尾",
  home: "首頁",
  about: "公會",
  teams: "戰隊",
  roster: "成員",
  news: "動態",
  contact: "聯絡",
  notFound: "找不到頁面",
  homeTitle: "首頁標題",
  homeDescription: "首頁說明",
  titleSuffix: "標題後綴",
  home: "首頁",
  about: "公會",
  menu: "選單",
  close: "關閉",
  lang: "語言按鈕說明",
  langShort: "語言短標",
  skip: "跳至內容",
  recruitChip: "招募標籤",
  sys: "狀態列",
  footerLabel: "頁尾導覽名稱",
  label: "入場名稱",
  sub: "入場副標",
  blurb: "頁尾短句",
  rule: "頁尾規則",
  recruit: "頁尾招募",
  explore: "頁尾欄名",
  kicker: "眉題",
  kickerZh: "眉題中文",
  tagline: "主標語",
  taglineAlt: "副標語",
  lead: "導言",
  ctaTeam: "按鈕：公會",
  ctaRoster: "按鈕：成員",
  ctaContact: "按鈕：信箱",
  chips: "標籤",
  text: "文字",
  tone: "語氣",
  crestSig: "徽章左",
  crestRec: "徽章右",
  hudChannel: "HUD 頻道",
  hudGame: "HUD 遊戲",
  ticker: "跑馬燈",
  metricsKicker: "指標眉題",
  metrics: "指標",
  index: "編號",
  note: "補充",
  value: "內容",
  identityKicker: "識別眉題",
  identityTitle: "識別標題",
  identityLead: "識別導言",
  cards: "介紹卡",
  title: "標題",
  body: "內文",
  boardKicker: "狀態眉題",
  boardTitle: "狀態標題",
  boardNote: "狀態註記",
  rows: "狀態列",
  fixtureKicker: "賽程眉題",
  fixtureTitle: "賽程標題",
  fixtureLead: "賽程導言",
  fixtureNote: "賽程註記",
  fixtures: "賽程占位",
  id: "代碼",
  meta: "補充",
  rosterKicker: "成員眉題",
  rosterTitle: "成員標題",
  rosterLead: "成員導言",
  rosterCta: "成員按鈕",
  signalKicker: "動態眉題",
  signalTitle: "動態標題",
  signalCta: "動態按鈕",
  finaleKicker: "結尾眉題",
  finaleTitle: "結尾標題",
  finaleBody: "結尾內文",
  pending: "待公布",
  manifestoKicker: "宣言眉題",
  manifestoTitle: "宣言標題",
  manifesto: "宣言",
  principlesKicker: "原則眉題",
  principlesTitle: "原則標題",
  principles: "原則",
  recruitTitle: "招募標題",
  recruitBody: "招募說明",
  slot: "空位標題",
  slotMeta: "空位說明",
  stamp: "空位章",
  stampLive: "已公開章",
  emptyNote: "空名單註記",
  liveLead: "有名單時的導言",
  rolePending: "位置未公開",
  stageKicker: "舞台眉題",
  emptyTitle: "無動態標題",
  emptyBody: "無動態說明",
  silent: "靜默標",
  feed: "頻道標",
  wireLabel: "清單標題",
  reserved: "占位訊息",
  reservedNote: "占位註記",
  emailLabel: "信箱標籤",
  only: "信箱下方短句",
  sheetKicker: "管道眉題",
  sheet: "管道列",
  writeTitle: "寫信標題",
  writeBody: "寫信說明",
  back: "返回按鈕",
};

const SAMPLES = {
  "home.chips": { text: "", tone: "calm" },
  "home.cards": { index: "", title: "", body: "" },
  "home.metrics": { index: "", label: "", value: "", note: "" },
  "home.rows": ["", ""],
  "home.fixtures": { id: "", title: "", meta: "" },
  "about.principles": "",
  "news.reserved": { id: "", title: "", meta: "" },
  "contact.sheet": ["", "", ""],
};

const state = {
  authed: false,
  csrf: "",
  draft: null,
  publishedAt: "",
  updatedAt: "",
  dirty: false,
  localDirty: false,
  status: "",
  error: "",
  samples: {},
  notion: null,
  applications: [],
  applicationsAt: 0,
  aovForm: { keyword: "", uid: "", server: "1012", html: "" },
  aovBusy: false,
  aovFocusPaste: false,
  playerUi: { tab: "profile", openMatch: "", catalog: null, catalogLoading: false },
};

function message(code, http) {
  return adminMessage(code, http);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function labelFor(key) {
  return LABELS[key] || key;
}

function currentPath() {
  let path = window.location.pathname || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function sectionId() {
  const path = currentPath();
  return NAV.find((item) => item[1] === path)?.[0] || "dashboard";
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set("content-type", "application/json");
  if (state.csrf && options.method && options.method !== "GET") headers.set("x-csrf-token", state.csrf);
  let response;
  try {
    response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  } catch {
    return { ok: false, code: "network", http: 0 };
  }
  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = null;
  }
  if (state.authed && response.status === 401 && path !== "/api/admin/login") dropSession();
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { ok: false, code: "bad_response", http: response.status };
  }
  return { http: response.status, ...data };
}

function emptyLike(value, key = "") {
  if (typeof value === "string") return key === "tone" ? "calm" : "";
  if (Array.isArray(value)) return value.map((item) => emptyLike(item));
  if (value && typeof value === "object") {
    const out = {};
    for (const [child, inner] of Object.entries(value)) out[child] = emptyLike(inner, child);
    return out;
  }
  return "";
}

function captureSamples(node, path) {
  if (Array.isArray(node)) {
    if (node.length && state.samples[path] === undefined) state.samples[path] = emptyLike(node[0]);
    node.forEach((item, index) => captureSamples(item, `${path}.${index}`));
    return;
  }
  if (node && typeof node === "object") {
    for (const key of Object.keys(node)) captureSamples(node[key], path ? `${path}.${key}` : key);
  }
}

function getPath(root, path) {
  return path.split(".").filter(Boolean).reduce((node, key) => node?.[key], root);
}

function setPath(root, path, value) {
  const parts = path.split(".").filter(Boolean);
  let node = root;
  for (let index = 0; index < parts.length - 1; index += 1) node = node[parts[index]];
  node[parts[parts.length - 1]] = value;
}

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function applyPayload(data) {
  state.draft = data.draft;
  state.updatedAt = data.updatedAt || "";
  state.publishedAt = data.publishedAt || "";
  state.dirty = Boolean(data.dirty);
  state.localDirty = false;
  state.notion = data.notion || state.notion;
  if (state.draft?.copy?.zh) captureSamples(state.draft.copy.zh, "");
}

/**
 * Empty CMS boxes stay readonly until focus so a password manager does not
 * overwrite them. Autocomplete stays off, and the hidden sink catches a
 * password-manager fill before it lands in a content field.
 */
const NO_SAVE = `autocomplete="off" data-1p-ignore="true" data-lpignore="true" data-form-type="other"`;
const CMS_TEXT = `data-cms ${NO_SAVE} autocapitalize="off" spellcheck="false" readonly`;
const CMS_CHOICE = `data-cms ${NO_SAVE}`;

function fieldControl(path, lang, value) {
  const key = path.split(".").pop();
  const text = value ?? "";
  if (key === "tone") {
    return `<select data-path="${esc(path)}" data-lang="${lang}" ${CMS_CHOICE}>
      <option value="calm"${text !== "alert" ? " selected" : ""}>一般</option>
      <option value="alert"${text === "alert" ? " selected" : ""}>強調</option>
    </select>`;
  }
  if (LONG.has(key) || String(text).length > 90) {
    return `<textarea data-path="${esc(path)}" data-lang="${lang}" rows="4" ${CMS_TEXT}>${esc(text)}</textarea>`;
  }
  return `<input data-path="${esc(path)}" data-lang="${lang}" value="${esc(text)}" ${CMS_TEXT}>`;
}

function fieldPair(path, zh, en) {
  const parts = path.split(".");
  const key = parts[parts.length - 1];
  const name = /^\d+$/.test(key) ? ["名稱", "內容", "狀態"][Number(key)] || `欄 ${Number(key) + 1}` : labelFor(key);
  return `<div class="field">
    <span>${esc(name)}</span>
    <div class="pair">
      <label>繁中${fieldControl(path, "zh", zh)}</label>
      <label>EN${fieldControl(path, "en", en)}</label>
    </div>
  </div>`;
}

function isTuple(value, path) {
  return Array.isArray(value) && /\.\d+$/.test(path) && value.every((item) => typeof item === "string" || item == null);
}

function renderNode(zh, en, path) {
  if (isTuple(zh, path)) {
    return zh.map((value, index) => fieldPair(`${path}.${index}`, value, Array.isArray(en) ? en[index] : "")).join("");
  }
  if (Array.isArray(zh) || Array.isArray(en)) return renderArray(Array.isArray(zh) ? zh : [], Array.isArray(en) ? en : [], path);
  if (typeof zh === "string" || typeof en === "string") return fieldPair(path, zh, en);
  if (zh && typeof zh === "object") {
    return `<div class="stack">${Object.keys(zh)
      .map((key) => {
        const child = zh[key];
        const inner = renderNode(child, en?.[key], `${path}.${key}`);
        if (typeof child === "string" || typeof en?.[key] === "string") return inner;
        return `<div class="card"><p class="group-label">${esc(labelFor(key))}</p>${inner}</div>`;
      })
      .join("")}</div>`;
  }
  return "";
}

function renderArray(zhList, enList, path) {
  const count = Math.max(zhList.length, enList.length);
  const name = labelFor(path.split(".").pop());
  const cards = [];
  for (let index = 0; index < count; index += 1) {
    cards.push(`<article class="repeat">
      <header><b>${esc(name)} ${index + 1}</b><button class="ghost" type="button" data-remove="${esc(path)}" data-index="${index}">移除</button></header>
      ${renderNode(zhList[index], enList[index], `${path}.${index}`)}
    </article>`);
  }
  return `<div class="repeats">${cards.join("")}<button class="btn" type="button" data-add="${esc(path)}">新增${esc(name)}</button></div>`;
}

function copyBlocks(id) {
  return (COPY_ROOTS[id] || [])
    .map((key) => `<section class="stack"><h2>${esc(labelFor(key))}</h2>${renderNode(state.draft.copy.zh[key], state.draft.copy.en[key], key)}</section>`)
    .join("");
}

function teamOptions(selected) {
  const teams = Array.isArray(state.draft?.teams) ? state.draft.teams : [];
  const current = String(selected || "moohsia");
  const slugs = new Set(teams.map((team) => String(team.slug || team.id || "")));
  const extra = slugs.has(current) ? "" : `<option value="${esc(current)}" selected>${esc(current)}</option>`;
  const options = teams
    .map((team) => {
      const slug = String(team.slug || team.id || "");
      const label = team.name?.zh || team.aka?.zh || slug;
      return `<option value="${esc(slug)}"${slug === current ? " selected" : ""}>${esc(label)}</option>`;
    })
    .join("");
  return `${extra}${options}`;
}

function teamsEditor() {
  const teams = Array.isArray(state.draft.teams) ? state.draft.teams : [];
  const cards = teams
    .map((team, index) => {
      const requirements = Array.isArray(team.requirements) ? team.requirements : [];
      const rules = requirements
        .map(
          (rule, ruleIndex) => `<div class="pair">
            <label>條件 ${ruleIndex + 1} 繁中<input data-team="${index}" data-req="${ruleIndex}" data-lang="zh" value="${esc(rule.zh)}" ${CMS_TEXT}></label>
            <label>條件 ${ruleIndex + 1} EN<input data-team="${index}" data-req="${ruleIndex}" data-lang="en" value="${esc(rule.en)}" ${CMS_TEXT}></label>
            <button class="ghost" type="button" data-action="team-req-remove" data-index="${index}" data-req="${ruleIndex}">移除條件</button>
          </div>`,
        )
        .join("");
      return `<article class="repeat">
        <header><b>戰隊 ${index + 1}</b><button class="ghost" type="button" data-action="team-remove" data-index="${index}">刪除</button></header>
        <div class="pair">
          <label>網址代稱<input data-team="${index}" data-field="slug" value="${esc(team.slug)}" ${CMS_TEXT}></label>
          <label>名稱 繁中<input data-team="${index}" data-field="name" data-lang="zh" value="${esc(team.name?.zh)}" ${CMS_TEXT}></label>
          <label>名稱 EN<input data-team="${index}" data-field="name" data-lang="en" value="${esc(team.name?.en)}" ${CMS_TEXT}></label>
          <label>又稱 繁中<input data-team="${index}" data-field="aka" data-lang="zh" value="${esc(team.aka?.zh)}" ${CMS_TEXT}></label>
          <label>又稱 EN<input data-team="${index}" data-field="aka" data-lang="en" value="${esc(team.aka?.en)}" ${CMS_TEXT}></label>
        </div>
        <label>導言 繁中<textarea data-team="${index}" data-field="lead" data-lang="zh" rows="2" ${CMS_TEXT}>${esc(team.lead?.zh)}</textarea></label>
        <label>導言 EN<textarea data-team="${index}" data-field="lead" data-lang="en" rows="2" ${CMS_TEXT}>${esc(team.lead?.en)}</textarea></label>
        <h3>加入條件</h3>
        ${rules}
        <button class="btn" type="button" data-action="team-req-add" data-index="${index}">新增條件</button>
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h2>戰隊</h2>
    <p class="hint">公會底下的戰隊。網址代稱用小寫英文與數字，例如 moohsia，公開頁是 /teams/moohsia。再加一隊就按新增，成員頁把人指到這一隊，然後發布到網站。內建預設已有 MOOHSIA（暮霞）。</p>
    <div class="repeats">${cards}</div>
    <button class="btn" type="button" data-action="team-add">新增戰隊</button>
  </section>`;
}

function rosterEditor() {
  const cards = state.draft.rosterMembers
    .map((member, index) => {
      return `<article class="repeat">
        <header><b>成員 ${index + 1}</b><button class="ghost" type="button" data-action="roster-remove" data-index="${index}">刪除</button></header>
        <div class="pair">
          <label>名字 繁中<input data-roster="${index}" data-field="name" data-lang="zh" value="${esc(member.name?.zh)}" ${CMS_TEXT}></label>
          <label>名字 EN<input data-roster="${index}" data-field="name" data-lang="en" value="${esc(member.name?.en)}" ${CMS_TEXT}></label>
          <label>位置 繁中<input data-roster="${index}" data-field="role" data-lang="zh" value="${esc(member.role?.zh)}" ${CMS_TEXT}></label>
          <label>位置 EN<input data-roster="${index}" data-field="role" data-lang="en" value="${esc(member.role?.en)}" ${CMS_TEXT}></label>
          <label>戰隊<select data-roster="${index}" data-field="team" ${CMS_CHOICE}>${teamOptions(member.team)}</select></label>
        </div>
        <label class="check"><input type="checkbox" data-roster="${index}" data-field="hidden"${member.hidden ? " checked" : ""}>在公開頁隱藏</label>
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h2>選手</h2>
    <p class="hint">這裡是公開成員名單：名字與位置。空白名單會顯示待公布席位，不會自動填上假的人名。個人戰績、配裝、歷史戰績與截圖請到「選手數據」，照遊戲內畫面填。不要寫 Discord 邀請網址。選手名字不能是 moohsia。</p>
    <label>沒有選手時的空位數量<input data-kind="slots" type="number" min="0" max="12" value="${esc(state.draft.placeholderSlots)}" ${CMS_TEXT}></label>
    <div class="repeats">${cards}</div>
    <button class="btn" type="button" data-action="roster-add">新增成員</button>
    ${copyBlocks("roster")}
  </section>`;
}

function newsEditor() {
  const cards = state.draft.newsPosts
    .map((post, index) => {
      return `<article class="repeat">
        <header><b>動態 ${index + 1}</b><button class="ghost" type="button" data-action="news-remove" data-index="${index}">刪除</button></header>
        <div class="pair">
          <label>日期<input data-news="${index}" data-field="date" type="date" value="${esc(post.date)}" ${CMS_TEXT}></label>
          <label>狀態<select data-news="${index}" data-field="status" ${CMS_CHOICE}>
            <option value="draft"${post.status !== "published" ? " selected" : ""}>草稿（不公開）</option>
            <option value="published"${post.status === "published" ? " selected" : ""}>公開</option>
          </select></label>
          <label>標題 繁中<input data-news="${index}" data-field="title" data-lang="zh" value="${esc(post.title?.zh)}" ${CMS_TEXT}></label>
          <label>標題 EN<input data-news="${index}" data-field="title" data-lang="en" value="${esc(post.title?.en)}" ${CMS_TEXT}></label>
        </div>
        <label>內文 繁中<textarea data-news="${index}" data-field="body" data-lang="zh" rows="4" ${CMS_TEXT}>${esc(post.body?.zh)}</textarea></label>
        <label>內文 EN<textarea data-news="${index}" data-field="body" data-lang="en" rows="4" ${CMS_TEXT}>${esc(post.body?.en)}</textarea></label>
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h2>公告</h2>
    <p class="hint">新公告預設是草稿。改成公開後，還要按「發布到網站」，首頁才會出現。沒有公告時，公開頁維持空狀態。</p>
    <div class="repeats">${cards}</div>
    <button class="btn" type="button" data-action="news-add">新增動態</button>
    ${copyBlocks("news")}
  </section>`;
}

function profileEditor() {
  const cards = state.draft.profileFields
    .map((field, index) => {
      return `<article class="repeat">
        <header><b>欄位 ${index + 1}</b><button class="ghost" type="button" data-action="profile-remove" data-index="${index}">移除</button></header>
        <div class="pair">
          <label>欄名 繁中<input data-profile="${index}" data-part="label" data-lang="zh" value="${esc(field.zh)}" ${CMS_TEXT}></label>
          <label>欄名 EN<input data-profile="${index}" data-part="label" data-lang="en" value="${esc(field.en)}" ${CMS_TEXT}></label>
          <label>內容 繁中<input data-profile="${index}" data-part="value" data-lang="zh" value="${esc(field.value?.zh)}" ${CMS_TEXT}></label>
          <label>內容 EN<input data-profile="${index}" data-part="value" data-lang="en" value="${esc(field.value?.en)}" ${CMS_TEXT}></label>
        </div>
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h2>公會欄位</h2>
    <p class="hint">空白的內容在公開頁會顯示「待公布」。</p>
    <div class="repeats">${cards}</div>
    <button class="btn" type="button" data-action="profile-add">新增欄位</button>
  </section>`;
}

function contactEditor() {
  return `<section class="stack">
    <h2>公開信箱</h2>
    <p class="hint">預設是 Info@moohsia.com。這是按鈕與 mailto 使用的地址。句子裡寫出來的信箱，要在下面的文案另外改。</p>
    <label>聯絡信箱<input data-kind="email" value="${esc(state.draft.contactEmail)}" ${CMS_TEXT}></label>
    ${copyBlocks("contact")}
  </section>`;
}

function notionLine() {
  const notion = state.notion;
  if (!notion) return "尚未讀到 Notion 狀態。";
  if (!notion.configured) return "Notion 尚未設定。管理頁仍可直接編輯並發布。";
  const ready = ["roster", "news", "copy", "profile", "player", "matches", "seasons", "honors", "titles", "heroes"].filter((key) => notion[key]);
  return `已接上：${ready.join("、") || "無"}。同步只改草稿，公開頁要再按發布。`;
}

function aovCooldownSeconds(syncedAt) {
  const at = Date.parse(syncedAt || "");
  if (!Number.isFinite(at)) return 0;
  return Math.max(0, Math.ceil((60_000 - (Date.now() - at)) / 1000));
}

function ensureAovKeyword() {
  const handle = String(state.draft?.player?.handle || "").trim();
  if (!String(state.aovForm.keyword || "").trim() && handle) state.aovForm.keyword = handle;
}

function aovServer() {
  return state.aovForm.server === "1011" ? "1011" : "1012";
}

function aovHistoryHref() {
  ensureAovKeyword();
  const uid = String(state.aovForm.uid || "").trim();
  const keyword = uid || String(state.aovForm.keyword || "").trim();
  if (!keyword) return "";
  if (uid && !/^\d{1,20}$/.test(uid)) return "";
  try {
    return fightHistoryUrl({
      searchType: uid ? "UID" : "playerName",
      keyword,
      server: aovServer(),
    });
  } catch {
    return "";
  }
}

function focusAovPaste() {
  const node = document.querySelector("[data-aov-paste]");
  if (!(node instanceof HTMLTextAreaElement)) return;
  node.readOnly = false;
  node.focus();
  node.scrollIntoView({ block: "center" });
}

function currentPastedHtml() {
  const node = document.querySelector("[data-aov=html]");
  const live = node instanceof HTMLTextAreaElement ? node.value : "";
  const html = choosePastedHtml(live, state.aovForm.html);
  if (String(live).trim()) state.aovForm.html = live;
  return html;
}

function captureAovPaste() {
  currentPastedHtml();
}

function syncAovOpenLink() {
  const link = document.querySelector("[data-aov-open]");
  if (!(link instanceof HTMLAnchorElement)) return;
  const href = aovHistoryHref();
  if (href) link.href = href;
}

function aovSavedText(html) {
  const text = String(html || "");
  if (!text.trim()) return "";
  return `已貼上 ${text.length} 字元，可按匯入`;
}

function aovImportPanel() {
  ensureAovKeyword();
  const player = state.draft.player || {};
  const form = state.aovForm;
  const cooldown = aovCooldownSeconds(player.aov?.syncedAt);
  const busy = state.aovBusy ? " disabled" : "";
  const lastSync = player.aov?.syncedAt
    ? `上次匯入 ${esc(String(player.aov.syncedAt).replace("T", " ").replace(/\.\d+Z$/, "Z").slice(0, 19))}，${esc(player.aov.count || "0")} 場。`
    : "尚未從 AOVRanking 匯入。";
  const href = aovHistoryHref();
  const open = href
    ? `<a class="btn" data-aov-open href="${esc(href)}" target="_blank" rel="noopener noreferrer">打開歷史戰績頁</a>`
    : `<span class="hint">填好遊戲名稱或 UID 後，就能打開對應的歷史戰績頁。</span>`;
  return `<section class="card aov-import${state.aovFocusPaste ? " is-paste" : ""}">
    <h2>從 Garena 官方同步</h2>
    <p class="hint">每小時整點會優先讀 gameidsearch.moba.garena.tw 的官方介面（GET /api/character、GET /api/game）。請在已登入的結果頁，把請求標頭 Access-Token、Code、Partition 用 wrangler secret put 設成 GARENA_ACCESS_TOKEN、GARENA_CODE、GARENA_PARTITION。畫面上的「2區 純潔之翼」對應 Partition 的值 1012，不要設成 2。用 Apple 登入也是這三個標頭。密鑰失效或沒設定時，不會清掉已經存著的對局。下面的貼上匯入仍然可用。</p>
    <div class="row-actions">
      <button class="primary" type="button" data-action="garena-sync"${busy}>立即從 Garena 同步</button>
    </div>
    <h2>從 AOVRanking 匯入</h2>
    <p class="hint">資料來自 AOVRanking（個人研究站 aovweb.azurewebsites.net），不是 Garena 官方 API。伺服器直接抓取常常會被安全驗證擋住。可靠的做法是貼上你瀏覽器裡已通過驗證的頁面。大約只會有最近 50 場，可能延遲或被截斷。預設併入草稿，不會自動公開。</p>
    <p class="hint">${lastSync}${cooldown ? ` 請再等 ${cooldown} 秒再向對方查詢。` : ""}</p>
    <ol class="aov-steps hint">
      <li>打開歷史戰績頁</li>
      <li>通過安全驗證，等對局列表出現</li>
      <li>等畫面上出現戰績後，用 F12 → 元素 → 複製 html 的 outerHTML 貼上，或上傳已載入完成的 .html。檢視原始碼看不到對局</li>
      <li>按「用貼上的頁面匯入」</li>
    </ol>
    <p class="hint">標題列有結果、KDA 與地圖。地圖「經典競技」、「競賽模式」和「冠軍賽」會存成排位賽，「傳說之巔」存成巔峰對決。結果會存成勝或敗。每一場的藍方、紅方記分板要等該場展開後才寫進頁面；英雄取玩家名稱旁的圖片，自己在哪一隊看名稱是否對上關鍵字。沒展開的場次，記分板只填自己的 KDA。若這次只展開了第一場，請再展開其餘場次，或上傳已展開記分板的 .html。</p>
    <div class="pair">
      <label>遊戲名稱<input data-aov="keyword" value="${esc(form.keyword)}" ${CMS_TEXT}></label>
      <label>UID<input data-aov="uid" value="${esc(form.uid)}" inputmode="numeric" ${CMS_TEXT}></label>
      <label>伺服器
        <select data-aov="server" ${NO_SAVE}>
          <option value="1012"${form.server === "1011" ? "" : " selected"}>2服 純潔之翼</option>
          <option value="1011"${form.server === "1011" ? " selected" : ""}>1服 聖騎之王</option>
        </select>
      </label>
    </div>
    <p class="hint">名稱查詢用遊戲名稱。UID 有填的時候，連結與查詢改走 UID，並帶上伺服器（2服純潔之翼會加上 dwLogicWorldId=1012）。遊戲名稱留白時，會用選手的遊戲 ID。</p>
    <div class="row-actions">${open}</div>
    <label class="aov-paste-label">貼上已載入的歷史戰績頁<textarea data-aov="html" data-aov-paste rows="16" ${CMS_TEXT}></textarea></label>
    <p class="aov-saved" data-aov-saved>${esc(aovSavedText(form.html))}</p>
    <p class="hint">畫面重畫時這格會清空，避免整份原始碼被刷掉。字數還在就代表內容還在，直接按匯入即可。</p>
    <label>或選擇另存的網頁（.html / .txt）<input data-aov-file type="file" accept=".html,.htm,.txt,text/html,text/plain"></label>
    <div class="row-actions">
      <button class="primary" type="button" data-action="aov-paste"${busy}>用貼上的頁面匯入</button>
    </div>
    <p class="hint">若仍想由伺服器代查，用下面兩個按鈕。被驗證頁擋住時，錯誤會寫明原因，請回到上面貼上原始碼。</p>
    <div class="row-actions">
      <button class="btn" type="button" data-action="aov-import"${cooldown || state.aovBusy ? " disabled" : ""}>從 AOVRanking 匯入</button>
      <button class="btn" type="button" data-action="aov-publish"${cooldown || state.aovBusy ? " disabled" : ""}>匯入並發布</button>
    </div>
  </section>`;
}

function playerEditor() {
  state.draft.player = ensurePlayerRecord(state.draft.player);
  void loadCatalog();
  return renderPlayerEditor(state.draft.player, state.playerUi, {
    text: CMS_TEXT,
    choice: CMS_CHOICE,
    matchesLead: aovImportPanel(),
  });
}

function applicationsView() {
  const rows = state.applications || [];
  const cards = rows
    .map((row) => {
      const app = row.application || {};
      const positions = Array.isArray(app.positions) ? app.positions.join("、") : "";
      const pending = row.status === "pending";
      return `<article class="repeat" data-app="${esc(row.id)}">
        <header><b>${esc(app.nickname || row.uid || "申請")}</b><span>${esc(row.status || "")}</span></header>
        <p>UID ${esc(row.uid)} · ${esc(row.email)} · ${esc(row.createdAt || "")}</p>
        <p>${esc([app.rank, positions, app.gender, app.ageBand].filter(Boolean).join(" · "))}</p>
        <p>${esc([app.weekday, app.holiday, app.practice].filter(Boolean).join(" · "))}</p>
        <p>${esc(app.motivation || "")}</p>
        ${row.inviteSent ? "<p>已寄出邀請</p>" : ""}
        ${
          pending
            ? `<label>Discord 邀請網址<input data-invite autocomplete="off" autocapitalize="off" spellcheck="false"></label>
          <label>備註<input data-app-note autocomplete="off" spellcheck="false"></label>
          <div class="row-actions">
            <button class="primary" type="button" data-action="app-approve" data-id="${esc(row.id)}">核准並寄出</button>
            <label class="check"><input type="checkbox" data-notify>拒絕時寄信</label>
            <button class="btn" type="button" data-action="app-reject" data-id="${esc(row.id)}">拒絕</button>
          </div>`
            : `<p>${esc(row.note || "")}</p>`
        }
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h1>加入申請</h1>
    <p class="hint">核准時貼上一次性 Discord 邀請。網址只會出現在寄給申請人的信裡，不會留在這個頁面，也不會寫進資料庫。沒有邀請池，系統不會自己產生邀請。</p>
    ${cards || `<p class="hint">目前沒有申請。</p>`}
  </section>`;
}

function dashboard() {
  const pending = state.dirty || state.localDirty;
  return `<section class="stack">
    <h1>總覽</h1>
    <p class="hint">編輯先留在草稿。按「發布到網站」之後，moohsia.com 才會換成這份內容。資料庫是空的時候，公開頁會用內建預設，不會變成空白。</p>
    <div class="stats">
      <div class="panel"><dt>草稿</dt><dd>${esc(state.updatedAt || "—")}</dd></div>
      <div class="panel"><dt>上次發布</dt><dd>${esc(state.publishedAt || "尚未發布")}</dd></div>
      <div class="panel"><dt>狀態</dt><dd>${pending ? "有尚未發布的修改" : "草稿與網站一致"}</dd></div>
    </div>
    <div class="links">${NAV.filter((item) => item[0] !== "dashboard")
      .map((item) => `<a href="${item[1]}" data-nav>${esc(item[2])}</a>`)
      .join("")}</div>
    <p class="hint">加入申請在側欄。核准時貼一次性邀請，由信件寄出，頁面不留網址。賽程區塊是占位文字，確認之前保持尚未公布即可。</p>
    <h2>Notion</h2>
    <p class="hint">${esc(notionLine())} 只有 Publish 勾選的列會進草稿。新聞未勾選會留成草稿，公開頁看不到。</p>
    <div class="row-actions">
      <button class="btn" type="button" data-action="notion-sync">從 Notion 同步草稿</button>
      <button class="btn" type="button" data-action="catalog-refresh">更新官方目錄與活動</button>
    </div>
  </section>`;
}

function pageBody() {
  const id = sectionId();
  if (!state.draft) return `<p>正在讀取草稿。</p>`;
  if (id === "dashboard") return dashboard();
  if (id === "about") return `${profileEditor()}${copyBlocks("about")}`;
  if (id === "roster") return rosterEditor();
  if (id === "teams") return teamsEditor();
  if (id === "player") return playerEditor();
  if (id === "applications") return applicationsView();
  if (id === "news") return newsEditor();
  if (id === "contact") return contactEditor();
  if (id === "home") {
    return `<section class="stack"><h1>首頁</h1><p class="hint">標籤、狀態列、賽程占位都在這頁。加入改成官網申請，公開頁不放 Discord 邀請。</p>${copyBlocks("home")}</section>`;
  }
  return `<section class="stack"><h1>${esc(NAV.find((item) => item[0] === id)?.[2] || "編輯")}</h1>${copyBlocks(id)}</section>`;
}

function loginView() {
  return `<div class="login-wrap"><form class="login" id="login-form" autocomplete="off">
    <p class="brand">暮霞｜MOS</p>
    <h1>管理登入</h1>
    <p class="hint">密碼由管理員密鑰設定，不會寫在這個網站裡。</p>
    <label>帳號<input name="account" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-form-type="other" data-login readonly required></label>
    <label>密碼<input name="secret" type="password" autocomplete="new-password" spellcheck="false" data-1p-ignore="true" data-lpignore="true" data-form-type="other" data-login readonly required></label>
    <button class="primary" type="submit">登入</button>
    <p class="error" data-error>${esc(state.error)}</p>
  </form></div>`;
}

function shell() {
  const links = NAV.map(
    (item) =>
      `<a href="${item[1]}" data-nav${sectionId() === item[0] ? ' aria-current="page"' : ""}>${esc(item[2])}</a>`,
  ).join("");
  return `<div class="admin">
    <div class="autofill-sink" aria-hidden="true">
      <input tabindex="-1" type="text" name="username" autocomplete="username">
      <input tabindex="-1" type="password" name="password" autocomplete="current-password">
    </div>
    <aside class="side">
      <p class="brand">暮霞｜MOS</p>
      <nav aria-label="管理">${links}</nav>
      <button class="ghost logout" type="button" data-action="logout">登出</button>
    </aside>
    <div class="main">
      <div class="toolbar">
        <p class="status" data-status>${esc(state.status)}</p>
        <div class="row-actions">
          <button class="ghost" type="button" data-action="discard">捨棄草稿</button>
          <button class="btn" type="button" data-action="save">儲存草稿</button>
          <button class="primary" type="button" data-action="publish">發布到網站</button>
        </div>
      </div>
      <p class="error" data-error>${esc(state.error)}</p>
      ${pageBody()}
    </div>
  </div>`;
}

function render() {
  captureAovPaste();
  const app = document.querySelector("#app");
  if (!app) return;
  if (!state.authed) {
    if (currentPath() !== "/login") history.replaceState({}, "", "/login");
    app.innerHTML = loginView();
    return;
  }
  if (currentPath() === "/" || currentPath() === "/login") history.replaceState({}, "", "/dashboard");
  app.innerHTML = shell();
  if (sectionId() === "applications") void ensureApplications();
}

function markDirty(text) {
  state.localDirty = true;
  state.status = text;
  const node = document.querySelector("[data-status]");
  if (node) node.textContent = text;
}

function onInput(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement) || !state.draft) return;
  if (target instanceof HTMLInputElement && target.type === "file" && "aovFile" in target.dataset) {
    const file = target.files?.[0];
    target.value = "";
    if (file) void readAovFile(file);
    return;
  }
  if (target.dataset.aov) {
    if (target.dataset.aov === "html") {
      state.aovForm.html = target.value;
      const note = document.querySelector("[data-aov-saved]");
      if (note) note.textContent = aovSavedText(target.value);
      return;
    }
    state.aovForm[target.dataset.aov] = target.value;
    if (target.dataset.aov === "keyword" || target.dataset.aov === "uid" || target.dataset.aov === "server") syncAovOpenLink();
    return;
  }
  if (target.dataset.path && target.dataset.lang) {
    setPath(state.draft.copy[target.dataset.lang], target.dataset.path, target.value);
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.kind === "email") {
    state.draft.contactEmail = target.value;
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.kind === "slots") {
    state.draft.placeholderSlots = Number(target.value);
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.team != null && target.dataset.roster == null) {
    const team = state.draft.teams?.[Number(target.dataset.team)];
    if (!team) return;
    if (target.dataset.req != null) {
      const rule = team.requirements?.[Number(target.dataset.req)];
      if (!rule || !target.dataset.lang) return;
      rule[target.dataset.lang] = target.value;
    } else if (target.dataset.field === "slug") {
      team.slug = String(target.value || "").trim().toLowerCase();
      team.id = team.slug;
    } else if (target.dataset.lang && target.dataset.field) {
      if (!team[target.dataset.field] || typeof team[target.dataset.field] !== "object") team[target.dataset.field] = { zh: "", en: "" };
      team[target.dataset.field][target.dataset.lang] = target.value;
    }
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.roster != null) {
    const member = state.draft.rosterMembers[Number(target.dataset.roster)];
    if (!member) return;
    if (target.dataset.field === "hidden") member.hidden = target instanceof HTMLInputElement && target.checked;
    else if (target.dataset.field === "team") member.team = target.value;
    else if (target.dataset.lang) member[target.dataset.field][target.dataset.lang] = target.value;
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.news != null) {
    const post = state.draft.newsPosts[Number(target.dataset.news)];
    if (!post) return;
    if (target.dataset.field === "date" || target.dataset.field === "status") post[target.dataset.field] = target.value;
    else if (target.dataset.lang) post[target.dataset.field][target.dataset.lang] = target.value;
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.profile != null) {
    const field = state.draft.profileFields[Number(target.dataset.profile)];
    if (!field) return;
    if (target.dataset.part === "label") field[target.dataset.lang] = target.value;
    else field.value[target.dataset.lang] = target.value;
    markDirty("有未儲存的修改");
    return;
  }
  if (target.dataset.invite != null || target.dataset.appNote != null || target.dataset.notify != null) return;
  if (target instanceof HTMLInputElement && target.type === "file") return;
  if (!state.draft.player) return;
  if (applyPlayerInput(state.draft.player, target, state.playerUi.catalog)) markDirty("有未儲存的修改");
}

function isHistoryFile(file) {
  const name = String(file?.name || "").toLowerCase();
  const type = String(file?.type || "").toLowerCase();
  return name.endsWith(".html") || name.endsWith(".htm") || name.endsWith(".txt") || type === "text/html" || type === "text/plain";
}

async function readAovFile(file) {
  if (!isHistoryFile(file)) {
    state.error = "請選擇另存的 .html 或 .txt。";
    state.status = "";
    render();
    return;
  }
  state.aovBusy = true;
  state.error = "";
  state.status = "正在讀取檔案";
  render();
  let text = "";
  try {
    text = await file.text();
  } catch {
    state.aovBusy = false;
    state.status = "";
    state.error = "這個檔案讀不到。請改貼原始碼，或另存成 .html 再選一次。";
    render();
    return;
  }
  state.aovBusy = false;
  if (text.length > 1_400_000) {
    state.error = "這個檔案太長。請只存歷史戰績那一頁。";
    state.status = "";
    render();
    return;
  }
  if (text.trim().length < 40) {
    state.error = message("aov_empty");
    state.status = "";
    state.aovFocusPaste = true;
    render();
    focusAovPaste();
    return;
  }
  state.aovForm.html = text;
  state.error = "";
  state.status = aovSavedText(text);
  render();
}

function failAovImport(data) {
  state.aovBusy = false;
  state.status = "";
  state.error = importFailureMessage(data?.code, data?.http);
  state.aovFocusPaste = aovNeedsPaste(data?.code);
  render();
  if (state.aovFocusPaste) focusAovPaste();
}

async function importAov(action) {
  if (state.aovBusy || !state.draft?.player) return;
  ensureAovKeyword();
  const form = state.aovForm;
  const pasted = action === "aov-paste";
  const uid = String(form.uid || "").trim();
  const name = String(form.keyword || "").trim() || state.draft.player.handle || "";
  const keyword = uid || name;
  const searchType = uid ? "UID" : "playerName";
  const server = aovServer();
  const html = pasted ? currentPastedHtml() : "";
  if (!pasted && !keyword) {
    state.error = message("aov_invalid");
    state.aovFocusPaste = false;
    render();
    return;
  }
  if (pasted && html.trim().length < 40) {
    state.error = message("aov_empty");
    state.aovFocusPaste = true;
    render();
    focusAovPaste();
    return;
  }
  state.aovBusy = true;
  state.error = "";
  state.aovFocusPaste = false;
  state.status = pasted ? "正在讀取貼上的頁面" : "正在向 AOVRanking 查詢";
  render();
  try {
    const data = await api("/api/admin/aov/import", {
      method: "POST",
      body: JSON.stringify({
        searchType,
        keyword,
        server,
        html,
      }),
    });
    state.aovBusy = false;
    if (!state.authed) return;
    if (!data.ok) {
      failAovImport(data);
      return;
    }
    const publish = action === "aov-publish";
    state.draft.player = applyAovImport(state.draft.player, data, {
      publish,
      keyword,
      searchType,
      server,
      syncedAt: data.syncedAt,
    });
    const count = data.count || data.matches?.length || 0;
    const partial = data.boardPartial
      ? "有些對局沒有展開隊伍，那些場次的記分板只有自己的 KDA。請在歷史戰績頁展開各場，或上傳已展開藍方、紅方記分板的頁面後再匯入。"
      : "";
    if (publish) {
      state.status = `已讀到 ${count} 場，正在發布`;
      await persist("publish");
      return;
    }
    markDirty(`已併入草稿 ${count} 場，尚未公開。確認後可按「匯入並發布」。${partial}`);
    render();
  } catch {
    if (!state.authed) {
      state.aovBusy = false;
      return;
    }
    failAovImport({ code: "network", http: 0 });
  }
}

async function syncGarena() {
  if (state.aovBusy) return;
  state.aovBusy = true;
  state.error = "";
  state.status = "正在向 Garena 官方同步";
  render();
  try {
    const data = await api("/api/admin/aov/sync", { method: "POST", body: "{}" });
    state.aovBusy = false;
    if (!state.authed) return;
    if (!data.ok) {
      state.error = message(data.code, data.http);
      state.status = "";
      render();
      return;
    }
    if (data.draft) applyPayload(data);
    const count = data.garenaSync?.matches;
    const via = data.garenaSync?.source === "garena" ? "Garena 官方" : "AOVRanking";
    const total = Number.isFinite(count) ? `選手資料現有 ${count} 場。` : "";
    state.status = `已從${via}同步。${total}草稿與已發布的選手資料都已更新。`;
    render();
  } catch {
    if (!state.authed) {
      state.aovBusy = false;
      return;
    }
    state.aovBusy = false;
    state.error = message("network", 0);
    state.status = "";
    render();
  }
}

async function persist(mode) {
  state.error = "";
  state.status = mode === "publish" ? "發布中" : "儲存中";
  let body = "";
  try {
    body = JSON.stringify(state.draft);
  } catch {
    state.error = message("invalid_content");
    state.status = "";
    render();
    return;
  }
  render();
  try {
    const data = await api(mode === "publish" ? "/api/admin/publish" : "/api/admin/content", {
      method: mode === "publish" ? "POST" : "PUT",
      body,
    });
    if (!data.ok) {
      state.error = message(data.code, data.http);
      state.status = "";
      render();
      return;
    }
    applyPayload(data);
    state.status = mode === "publish" ? "已發布到網站" : "草稿已儲存";
    render();
  } catch {
    state.error = message("network", 0);
    state.status = "";
    render();
  }
}

async function discardDraft() {
  if (!window.confirm("草稿會回到上次發布的內容。這頁還沒儲存的修改也會消失。")) return;
  const data = await api("/api/admin/discard", { method: "POST", body: "{}" });
  if (!data.ok) {
    state.error = message(data.code, data.http);
    render();
    return;
  }
  applyPayload(data);
  state.status = "已回到上次發布的內容";
  render();
}

async function logout() {
  clearIdle();
  const was = state.authed;
  state.authed = false;
  if (was) await api("/api/admin/logout", { method: "POST", body: "{}" });
  state.csrf = "";
  state.draft = null;
  state.status = "";
  state.applications = [];
  history.replaceState({}, "", "/login");
  render();
}

function dropSession() {
  clearIdle();
  state.authed = false;
  state.csrf = "";
  state.draft = null;
  state.status = "";
  state.applications = [];
  history.replaceState({}, "", "/login");
}

function mutateList(path, index) {
  const sample = state.samples[path] || SAMPLES[path] || "";
  const zh = getPath(state.draft.copy.zh, path);
  const en = getPath(state.draft.copy.en, path);
  if (!Array.isArray(zh) || !Array.isArray(en)) return;
  if (index == null) {
    zh.push(structuredClone(sample));
    en.push(structuredClone(emptyLike(sample)));
  } else {
    zh.splice(index, 1);
    en.splice(index, 1);
  }
  markDirty("有未儲存的修改");
  render();
}

function onClick(event) {
  const link = event.target.closest("a[data-nav]");
  if (link) {
    event.preventDefault();
    history.pushState({}, "", link.getAttribute("href"));
    render();
    return;
  }
  const add = event.target.closest("[data-add]");
  if (add) {
    mutateList(add.dataset.add, null);
    return;
  }
  const remove = event.target.closest("[data-remove]");
  if (remove) {
    mutateList(remove.dataset.remove, Number(remove.dataset.index));
    return;
  }
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action || !state.draft) {
    if (action === "logout") void logout();
    return;
  }
  if (action === "logout") {
    void logout();
    return;
  }
  if (action === "save") {
    void persist("draft");
    return;
  }
  if (action === "publish") {
    void persist("publish");
    return;
  }
  if (action === "discard") {
    void discardDraft();
    return;
  }
  if (action === "roster-add") {
    state.draft.rosterMembers.push({ id: newId(), name: { zh: "", en: "" }, role: { zh: "", en: "" }, team: "moohsia", hidden: false });
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "team-add") {
    if (!Array.isArray(state.draft.teams)) state.draft.teams = [];
    const slug = `team${state.draft.teams.length + 1}`;
    state.draft.teams.push({
      id: slug,
      slug,
      name: { zh: "", en: "" },
      aka: { zh: "", en: "" },
      lead: { zh: "", en: "" },
      requirements: [{ zh: "", en: "" }],
    });
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "team-remove") {
    state.draft.teams.splice(Number(event.target.closest("[data-index]").dataset.index), 1);
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "team-req-add") {
    const team = state.draft.teams?.[Number(event.target.closest("[data-index]").dataset.index)];
    if (!team) return;
    if (!Array.isArray(team.requirements)) team.requirements = [];
    team.requirements.push({ zh: "", en: "" });
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "team-req-remove") {
    const button = event.target.closest("[data-index]");
    const team = state.draft.teams?.[Number(button.dataset.index)];
    if (!team || !Array.isArray(team.requirements)) return;
    team.requirements.splice(Number(button.dataset.req), 1);
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "roster-remove") {
    state.draft.rosterMembers.splice(Number(event.target.closest("[data-index]").dataset.index), 1);
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "news-add") {
    state.draft.newsPosts.push({
      id: newId(),
      date: "",
      title: { zh: "", en: "" },
      body: { zh: "", en: "" },
      status: "draft",
    });
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "news-remove") {
    state.draft.newsPosts.splice(Number(event.target.closest("[data-index]").dataset.index), 1);
    markDirty("有未儲存的修改");
    render();
  }
  if (action === "profile-add") {
    state.draft.profileFields.push({ id: newId(), zh: "", en: "", value: { zh: "", en: "" } });
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "profile-remove") {
    state.draft.profileFields.splice(Number(event.target.closest("[data-index]").dataset.index), 1);
    markDirty("有未儲存的修改");
    render();
    return;
  }
  if (action === "media-upload") {
    const host = event.target.closest("[data-upload]");
    void uploadPlayerMedia(mediaTargetFrom(host), null);
    return;
  }
  const playerOutcome = runPlayerAction(state.draft.player, action, event.target.closest("[data-action]"), state.playerUi);
  if (playerOutcome.handled) {
    state.draft.player = playerOutcome.player;
    if (playerOutcome.dirty) markDirty(playerOutcome.status || "有未儲存的修改");
    render();
    return;
  }
  if (action === "app-approve" || action === "app-reject") {
    const button = event.target.closest("[data-id]");
    const card = button?.closest("[data-app]");
    const invite = card?.querySelector("[data-invite]");
    const inviteUrl = invite instanceof HTMLInputElement ? invite.value : "";
    if (invite instanceof HTMLInputElement) invite.value = "";
    const noteNode = card?.querySelector("[data-app-note]");
    const note = noteNode instanceof HTMLInputElement ? noteNode.value : "";
    const notify = card?.querySelector("[data-notify]") instanceof HTMLInputElement && card.querySelector("[data-notify]").checked;
    void reviewApplication(button?.dataset.id, action === "app-approve" ? "approve" : "reject", { inviteUrl, note, notify });
    return;
  }
  if (action === "aov-import" || action === "aov-publish" || action === "aov-paste") {
    void importAov(action);
    return;
  }
  if (action === "garena-sync") {
    void syncGarena();
    return;
  }
  if (action === "notion-sync") {
    void runJob("/api/admin/notion/sync", "正在從 Notion 同步", "Notion 草稿已更新");
    return;
  }
  if (action === "catalog-refresh") {
    void runJob("/api/admin/catalog/refresh", "正在更新英雄目錄", "官方目錄已更新");
  }
}

async function runJob(path, pending, done) {
  state.error = "";
  state.status = pending;
  render();
  const data = await api(path, { method: "POST", body: "{}" });
  if (!data.ok) {
    state.error = message(data.code, data.http);
    state.status = "";
    render();
    return;
  }
  if (data.draft) applyPayload(data);
  if (path.endsWith("/catalog/refresh")) state.playerUi.catalog = null;
  state.status = done;
  render();
}

async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "login-form") return;
  event.preventDefault();
  state.error = "";
  const { username, password } = takeLogin(form);
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  if (!data.ok) {
    state.error = message(data.code, data.http);
    render();
    return;
  }
  state.authed = true;
  state.csrf = data.csrf;
  const content = await api("/api/admin/content");
  if (!content.ok) {
    state.error = message(content.code, content.http);
    render();
    return;
  }
  applyPayload(content);
  state.status = "已登入";
  armIdle();
  history.replaceState({}, "", "/dashboard");
  render();
}

function unlockField(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (!target.readOnly) return;
  if (!target.hasAttribute("data-cms") && !target.hasAttribute("data-login")) return;
  target.readOnly = false;
}

function takeLogin(form) {
  const account = form.elements.namedItem("account");
  const secret = form.elements.namedItem("secret");
  const username = account instanceof HTMLInputElement ? account.value : "";
  const password = secret instanceof HTMLInputElement ? secret.value : "";
  form.reset();
  if (account instanceof HTMLInputElement) {
    account.value = "";
    account.readOnly = true;
  }
  if (secret instanceof HTMLInputElement) {
    secret.value = "";
    secret.readOnly = true;
  }
  return { username, password };
}

const IDLE_MS = 15 * 60 * 1000;
let idleTimer = 0;
let lastPing = 0;
let applicationsLoading = false;

function clearIdle() {
  clearTimeout(idleTimer);
  idleTimer = 0;
}

function armIdle() {
  clearTimeout(idleTimer);
  if (!state.authed) return;
  idleTimer = setTimeout(() => {
    void logout();
  }, IDLE_MS);
}

async function pingSession() {
  if (!state.authed) return;
  const now = Date.now();
  if (now - lastPing < 60_000) return;
  lastPing = now;
  const session = await api("/api/admin/session");
  if (session.ok && session.csrf) state.csrf = session.csrf;
}

function noteActivity() {
  if (!state.authed) return;
  armIdle();
  void pingSession();
}

async function ensureApplications() {
  if (!state.authed || applicationsLoading) return;
  if (state.applicationsAt && Date.now() - state.applicationsAt < 1500) return;
  applicationsLoading = true;
  const data = await api("/api/admin/applications");
  applicationsLoading = false;
  if (!state.authed) return;
  state.applicationsAt = Date.now();
  if (!data.ok) {
    state.error = message(data.code, data.http);
    state.applications = [];
  } else {
    state.applications = data.applications || [];
    state.error = "";
  }
  render();
}

async function reviewApplication(id, action, fields) {
  if (!id) return;
  state.error = "";
  state.status = action === "approve" ? "寄送中" : "更新中";
  const body = action === "approve" ? { inviteUrl: fields.inviteUrl, note: fields.note } : { note: fields.note, notify: fields.notify };
  const data = await api(`/api/admin/applications/${encodeURIComponent(id)}/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  fields.inviteUrl = "";
  if (!state.authed) {
    render();
    return;
  }
  if (!data.ok) {
    state.error = message(data.code, data.http);
    state.status = "";
    render();
    return;
  }
  state.status = action === "approve" ? "已寄出邀請" : "已更新";
  state.applicationsAt = 0;
  await ensureApplications();
}

async function loadCatalog() {
  if (state.playerUi.catalog || state.playerUi.catalogLoading) return;
  state.playerUi.catalogLoading = true;
  let data = {};
  try {
    data = await api("/api/catalog");
  } catch {
    data = {};
  }
  state.playerUi.catalogLoading = false;
  if (!state.authed) return;
  state.playerUi.catalog = {
    heroes: Array.isArray(data.heroes) ? data.heroes : [],
    modes: Array.isArray(data.modes) ? data.modes : [],
    roles: Array.isArray(data.roles) ? data.roles : [],
  };
  if (sectionId() === "player") render();
}

async function uploadPlayerMedia(target, dropped) {
  if (!target || !state.draft?.player) return;
  const input = target.node?.querySelector("input[type='file']");
  const file = dropped || (input instanceof HTMLInputElement ? input.files?.[0] : null);
  if (!file) {
    state.error = "請先選擇檔案，或把檔案拖進框裡。";
    const node = document.querySelector("[data-error]");
    if (node) node.textContent = state.error;
    return;
  }
  if (target.kind !== "match" && String(file.type || "").startsWith("video/")) {
    state.error = "頭像與配裝只接受圖片。";
    const node = document.querySelector("[data-error]");
    if (node) node.textContent = state.error;
    return;
  }
  const form = new FormData();
  form.set("file", file);
  const headers = new Headers();
  if (state.csrf) headers.set("x-csrf-token", state.csrf);
  const response = await fetch("/api/admin/media", { method: "POST", headers, body: form, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    dropSession();
    render();
    return;
  }
  if (!data.ok) {
    state.error = message(data.code || "media_type", response.status);
    state.status = "";
    render();
    return;
  }
  if (!assignPlayerMedia(state.draft.player, target, data)) return;
  markDirty("媒體已上傳，記得儲存草稿");
  render();
}

function onDragOver(event) {
  const zone = event.target instanceof Element ? event.target.closest(".dropzone") : null;
  if (!zone) return;
  event.preventDefault();
  zone.classList.add("is-hot");
}

function onDrop(event) {
  const zone = event.target instanceof Element ? event.target.closest(".dropzone") : null;
  if (!zone) return;
  event.preventDefault();
  const file = event.dataTransfer?.files?.[0];
  if (!file) return;
  void uploadPlayerMedia(mediaTargetFrom(zone), file);
}

async function boot() {
  document.addEventListener("click", (event) => {
    noteActivity();
    onClick(event);
  });
  document.addEventListener("input", (event) => {
    noteActivity();
    onInput(event);
  });
  document.addEventListener("change", (event) => {
    noteActivity();
    onInput(event);
  });
  document.addEventListener("keydown", () => noteActivity());
  document.addEventListener("focusin", unlockField);
  document.addEventListener("submit", onSubmit, true);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("drop", onDrop);
  window.addEventListener("popstate", () => render());
  const session = await api("/api/admin/session");
  if (session.ok) {
    state.authed = true;
    state.csrf = session.csrf;
    const content = await api("/api/admin/content");
    if (content.ok) applyPayload(content);
    else state.error = message(content.code, content.http);
    armIdle();
  }
  render();
}

void boot();
