import "./admin.css";

const NAV = [
  ["dashboard", "/dashboard", "總覽"],
  ["home", "/edit/home", "首頁"],
  ["about", "/edit/about", "戰隊"],
  ["roster", "/edit/roster", "成員"],
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
  about: "戰隊",
  roster: "成員",
  news: "動態",
  contact: "聯絡",
  notFound: "找不到頁面",
  homeTitle: "首頁標題",
  homeDescription: "首頁說明",
  titleSuffix: "標題後綴",
  home: "首頁",
  about: "戰隊",
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
  ctaTeam: "按鈕：戰隊",
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
  username: "",
  csrf: "",
  draft: null,
  publishedAt: "",
  updatedAt: "",
  dirty: false,
  localDirty: false,
  status: "",
  error: "",
  samples: {},
};

const MESSAGES = {
  invalid_login: "帳號或密碼不正確。",
  rate_limited: "嘗試次數過多，請稍後再試。",
  admin_not_configured: "尚未設定管理員密鑰。請先用 wrangler secret put。",
  storage_unconfigured: "尚未綁定 CMS 資料庫。",
  storage_unavailable: "現在讀不到內容資料庫。",
  forbidden: "這個操作被拒絕。請重新整理後再試。",
  unauthorized: "請先登入。",
  blocked_content: "內容含有 Discord 邀請連結，或選手名字是保留名稱 moohsia，沒有儲存。",
  invalid_content: "內容格式不正確。",
  payload_too_large: "內容太長。",
};

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

function message(code) {
  return MESSAGES[code] || "沒有完成。請再試一次。";
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body) headers.set("content-type", "application/json");
  if (state.csrf && options.method && options.method !== "GET") headers.set("x-csrf-token", state.csrf);
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
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
  if (state.draft?.copy?.zh) captureSamples(state.draft.copy.zh, "");
}

/**
 * The login form stores username htw0702. Empty CMS boxes, especially a new
 * roster name, stay readonly until focus so the browser does not overwrite
 * them with that saved username. Autocomplete stays off, and the hidden sink
 * catches a password-manager fill before it lands in a content field.
 */
const CMS_TEXT = `data-cms autocomplete="off" autocapitalize="off" spellcheck="false" readonly`;
const CMS_CHOICE = `data-cms autocomplete="off"`;

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
        </div>
        <label class="check"><input type="checkbox" data-roster="${index}" data-field="hidden"${member.hidden ? " checked" : ""}>在公開頁隱藏</label>
      </article>`;
    })
    .join("");
  return `<section class="stack">
    <h2>選手</h2>
    <p class="hint">預設沒有選手。空白名單會在公開頁顯示待公布席位，不會自動填上假的人名。不要寫 Discord 邀請網址。選手名字不能是 moohsia。</p>
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
    <h2>戰隊欄位</h2>
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
    <p class="hint">招募文案可以改字，但這裡沒有試訓報名表。賽程區塊是占位文字，確認之前保持尚未公布即可。</p>
  </section>`;
}

function pageBody() {
  const id = sectionId();
  if (!state.draft) return `<p>正在讀取草稿。</p>`;
  if (id === "dashboard") return dashboard();
  if (id === "about") return `${profileEditor()}${copyBlocks("about")}`;
  if (id === "roster") return rosterEditor();
  if (id === "news") return newsEditor();
  if (id === "contact") return contactEditor();
  if (id === "home") {
    return `<section class="stack"><h1>首頁</h1><p class="hint">標籤、狀態列、賽程占位都在這頁。招募維持關閉，只改顯示文字。</p>${copyBlocks("home")}</section>`;
  }
  return `<section class="stack"><h1>${esc(NAV.find((item) => item[0] === id)?.[2] || "編輯")}</h1>${copyBlocks(id)}</section>`;
}

function loginView() {
  return `<div class="login-wrap"><form class="login" id="login-form">
    <p class="brand">暮霞｜MOS</p>
    <h1>管理登入</h1>
    <p class="hint">帳號固定為 htw0702。密碼由管理員密鑰設定，不會寫在這個網站裡。</p>
    <label>帳號<input name="username" autocomplete="username" value="htw0702" required></label>
    <label>密碼<input name="password" type="password" autocomplete="current-password" required></label>
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
      <p class="user">${esc(state.username)}</p>
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
  const app = document.querySelector("#app");
  if (!app) return;
  if (!state.authed) {
    if (currentPath() !== "/login") history.replaceState({}, "", "/login");
    app.innerHTML = loginView();
    return;
  }
  if (currentPath() === "/" || currentPath() === "/login") history.replaceState({}, "", "/dashboard");
  app.innerHTML = shell();
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
  if (target.dataset.roster != null) {
    const member = state.draft.rosterMembers[Number(target.dataset.roster)];
    if (!member) return;
    if (target.dataset.field === "hidden") member.hidden = target instanceof HTMLInputElement && target.checked;
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
  }
}

async function persist(mode) {
  state.error = "";
  state.status = mode === "publish" ? "發布中" : "儲存中";
  const body = JSON.stringify(state.draft);
  render();
  const data = await api(mode === "publish" ? "/api/admin/publish" : "/api/admin/content", {
    method: mode === "publish" ? "POST" : "PUT",
    body,
  });
  if (!data.ok) {
    state.error = message(data.code);
    state.status = "";
    render();
    return;
  }
  applyPayload(data);
  state.status = mode === "publish" ? "已發布到網站" : "草稿已儲存";
  render();
}

async function discardDraft() {
  if (!window.confirm("草稿會回到上次發布的內容。這頁還沒儲存的修改也會消失。")) return;
  const data = await api("/api/admin/discard", { method: "POST", body: "{}" });
  if (!data.ok) {
    state.error = message(data.code);
    render();
    return;
  }
  applyPayload(data);
  state.status = "已回到上次發布的內容";
  render();
}

async function logout() {
  await api("/api/admin/logout", { method: "POST", body: "{}" });
  state.authed = false;
  state.csrf = "";
  state.draft = null;
  state.status = "";
  history.replaceState({}, "", "/login");
  render();
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
    state.draft.rosterMembers.push({ id: newId(), name: { zh: "", en: "" }, role: { zh: "", en: "" }, hidden: false });
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
  }
}

async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "login-form") return;
  event.preventDefault();
  state.error = "";
  const data = await api("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: form.username.value, password: form.password.value }),
  });
  if (!data.ok) {
    state.error = message(data.code);
    render();
    return;
  }
  state.authed = true;
  state.username = data.username;
  state.csrf = data.csrf;
  const content = await api("/api/admin/content");
  if (!content.ok) {
    state.error = message(content.code);
    render();
    return;
  }
  applyPayload(content);
  state.status = "已登入";
  history.replaceState({}, "", "/dashboard");
  render();
}

function unlockCmsField(event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (!target.hasAttribute("data-cms") || !target.readOnly) return;
  target.readOnly = false;
}

async function boot() {
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onInput);
  document.addEventListener("focusin", unlockCmsField);
  document.addEventListener("submit", onSubmit);
  window.addEventListener("popstate", () => render());
  const session = await api("/api/admin/session");
  if (session.ok) {
    state.authed = true;
    state.username = session.username;
    state.csrf = session.csrf;
    const content = await api("/api/admin/content");
    if (content.ok) applyPayload(content);
    else state.error = message(content.code);
  }
  render();
}

void boot();
