import { SITE_URL } from "../shared/brand.js";
import { previewApplication } from "../shared/apply.js";
import { applyDraft } from "./apply-state.js";
import { setActivityFilter, setCatalog, setItemCategory, setRoleFilter } from "./catalog-state.js";
import { setPlayerMatch, setPlayerQueue, setPlayerSeason, setPlayerSection, setPlayerTab } from "./player-view.js";
import { NAV, applyPublishedContent, getContactEmail, getCopy, getMailto, getNewsPosts, getPlaceholderSlots, getPlayer, getProfileFields, getRosterMembers } from "./content.js";
import { esc } from "./html.js";
import { mountChrome, mountMotion } from "./motion.js";
import { playerMemberPath } from "../shared/match-present.js";
import { renderHeroDetail, renderItemDetail, renderItems, renderModeDetail, renderSkins } from "./catalog-pages.js";
import { brandMark, renderMember, renderPage } from "./pages.js";
import "./styles.css";

document.documentElement.classList.add("js");

const ROUTES = {
  "/": "home",
  "/about": "about",
  "/roster": "roster",
  "/player": "player",
  "/heroes": "heroes",
  "/skins": "skins",
  "/items": "items",
  "/modes": "modes",
  "/activities": "activities",
  "/news": "news",
  "/apply": "apply",
  "/contact": "contact",
};

const state = {
  lang: "zh",
  menuOpen: false,
};

const app = document.querySelector("#app");
let dismissIntro = () => {};

function readLang() {
  try {
    return localStorage.getItem("mos-lang") === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function storeLang(lang) {
  try {
    localStorage.setItem("mos-lang", lang);
  } catch {
    /* private mode */
  }
}

function introSeen() {
  try {
    return sessionStorage.getItem("mos-intro") === "1";
  } catch {
    return false;
  }
}

function markIntro() {
  try {
    sessionStorage.setItem("mos-intro", "1");
  } catch {
    /* private mode */
  }
}

function normalize(pathname) {
  let path = pathname || "/";
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "/index.html") path = "/";
  return path;
}

function currentPath() {
  return normalize(window.location.pathname);
}

function copy() {
  return getCopy(state.lang);
}

function navLinks(text) {
  return NAV.map((item) => {
    const code = item.href === "/" ? "HOME" : item.key.toUpperCase();
    return `<a href="${item.href}" data-nav><span>${esc(text.nav[item.key])}</span><small>${esc(code)}</small></a>`;
  }).join("");
}

function shell() {
  const text = copy();
  const links = navLinks(text);
  return `
    <a class="skip" href="#main">${esc(text.nav.skip)}</a>
    <div class="scroll-progress" aria-hidden="true"><span></span></div>
    <div class="ambient" aria-hidden="true">
      <span class="orb orb-a"></span>
      <span class="orb orb-b"></span>
      <span class="orb orb-c"></span>
    </div>
    <div class="grain" aria-hidden="true"></div>
    <div class="scanlines" aria-hidden="true"></div>
    <div class="reticle" aria-hidden="true"></div>
    <p class="rail" aria-hidden="true"><span>暮霞｜MOS</span><span>AOV</span></p>
    <header class="nav">
      <a class="brand" href="/" data-nav>
        ${brandMark()}
        <span>
          <strong>暮霞｜MOS</strong>
          <em>MOOHSIA</em>
        </span>
      </a>
      <nav class="nav-links" aria-label="Primary">${links}</nav>
      <div class="nav-tools">
        <p class="sys"><i></i><span>${esc(text.nav.sys)}</span></p>
        <p class="nav-chip">${esc(text.nav.recruitChip)}</p>
        <button class="lang" type="button" data-lang aria-label="${esc(text.nav.lang)}">${esc(text.nav.langShort)}</button>
        <button class="menu-toggle" type="button" data-menu aria-expanded="false" aria-controls="menu-panel">
          <span>${esc(text.nav.menu)}</span>
        </button>
      </div>
    </header>
    <div id="menu-panel" class="menu-panel" hidden>
      <nav aria-label="Mobile">${links}</nav>
      <p class="nav-chip">${esc(text.nav.recruitChip)}</p>
      <a class="text-link" href="${getMailto()}">${esc(getContactEmail())}</a>
    </div>
    <main id="main" tabindex="-1"></main>
    <footer class="footer">
      <div class="wrap footer-grid">
        <div>
          <p class="brand-lock">暮霞｜MOS</p>
          <p>${esc(text.footer.blurb)}</p>
        </div>
        <nav aria-label="${esc(text.nav.footerLabel)}">
          <p class="section-kicker">${esc(text.footer.explore)}</p>
          ${links}
        </nav>
        <div>
          <p class="section-kicker">${esc(text.footer.recruit)}</p>
          <a class="text-link" href="${getMailto()}">${esc(getContactEmail())}</a>
          <p>${esc(text.footer.rule)}</p>
        </div>
      </div>
      <div class="wrap footer-bar">
        <span>暮霞｜MOS</span>
        <span>ARENA OF VALOR</span>
        <span>moohsia.com</span>
      </div>
    </footer>
  `;
}

function resolvePath(path) {
  const roster = /^\/roster\/([A-Za-z0-9_-]{1,40})$/.exec(path);
  if (roster) return { name: "member", key: roster[1] };
  const hero = /^\/heroes\/(\d{1,6})$/.exec(path);
  if (hero) return { name: "hero", id: hero[1] };
  const item = /^\/items\/(\d{3,6})$/.exec(path);
  if (item) return { name: "item", id: item[1] };
  const mode = /^\/modes\/([a-z0-9-]{1,40})$/.exec(path);
  if (mode) return { name: "mode", id: mode[1] };
  return { name: ROUTES[path] || "notFound" };
}

function setActive() {
  const path = currentPath();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    const on = href === path || (href && href !== "/" && (path === href || path.startsWith(`${href}/`)));
    if (on) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function setMeta() {
  const text = copy();
  const path = currentPath();
  const route = resolvePath(path);
  const name = route.name === "member" ? "player" : route.name === "hero" ? "heroes" : route.name === "item" ? "items" : route.name === "mode" ? "modes" : route.name;
  const page = text[name] || text.notFound;
  const title = path === "/" ? text.meta.homeTitle : `${page.title} — ${text.meta.titleSuffix}`;
  document.title = title;
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-Hant";
  const description = path === "/" ? text.meta.homeDescription : page.lead || text.meta.homeDescription;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const canonical = document.querySelector('link[rel="canonical"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  if (ogDesc) ogDesc.setAttribute("content", description);
  if (ogLocale) ogLocale.setAttribute("content", state.lang === "en" ? "en_US" : "zh_TW");
  if (canonical) canonical.setAttribute("href", `${SITE_URL}${path === "/" ? "/" : path}`);
}

function closeMenu(restoreFocus = true) {
  state.menuOpen = false;
  document.body.classList.remove("menu-open");
  const panel = document.getElementById("menu-panel");
  const button = document.querySelector("[data-menu]");
  if (panel) panel.hidden = true;
  if (button) {
    button.setAttribute("aria-expanded", "false");
    const span = button.querySelector("span");
    if (span) span.textContent = copy().nav.menu;
    if (restoreFocus) button.focus();
  }
}

function openMenu() {
  const panel = document.getElementById("menu-panel");
  const button = document.querySelector("[data-menu]");
  if (!panel || !button) return;
  state.menuOpen = true;
  document.body.classList.add("menu-open");
  panel.hidden = false;
  button.setAttribute("aria-expanded", "true");
  const span = button.querySelector("span");
  if (span) span.textContent = copy().nav.close;
  const first = panel.querySelector("a");
  if (first) first.focus();
}

function restoreMenu() {
  if (!state.menuOpen) return;
  const panel = document.getElementById("menu-panel");
  const button = document.querySelector("[data-menu]");
  if (panel) panel.hidden = false;
  document.body.classList.add("menu-open");
  if (button) {
    button.setAttribute("aria-expanded", "true");
    const span = button.querySelector("span");
    if (span) span.textContent = copy().nav.close;
  }
}

function renderRoute(route, text) {
  if (route.name === "member") return renderMember(text, route.key);
  if (route.name === "skins") return renderSkins(text);
  if (route.name === "items") return renderItems(text);
  if (route.name === "hero") return renderHeroDetail(text, route.id);
  if (route.name === "item") return renderItemDetail(text, route.id);
  if (route.name === "mode") return renderModeDetail(text, route.id);
  return renderPage(route.name, text);
}

function paint() {
  if (!app) return;
  let path = currentPath();
  if (path === "/player") {
    const target = playerMemberPath(getRosterMembers(), getPlayer());
    if (target) {
      history.replaceState({}, "", `${target}${window.location.search}${window.location.hash}`);
      path = target;
    }
  }
  const route = resolvePath(path);
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-Hant";
  app.innerHTML = shell();
  const main = document.getElementById("main");
  if (main) main.innerHTML = renderRoute(route, copy());
  setActive();
  setMeta();
  mountMotion(main);
  mountChrome();
  restoreMenu();
}

function navigate(href, { push = true } = {}) {
  const url = new URL(href, window.location.origin);
  const next = normalize(url.pathname);
  if (push && next !== currentPath()) history.pushState({}, "", next);
  closeMenu(false);
  paint();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  const main = document.getElementById("main");
  if (main) main.focus({ preventScroll: true });
}

function mountIntro() {
  const text = copy().intro;
  const layer = document.createElement("div");
  layer.className = "intro";
  layer.setAttribute("role", "dialog");
  layer.setAttribute("aria-modal", "true");
  layer.setAttribute("aria-label", text.label);
  layer.innerHTML = `
    <div class="intro-inner">
      <div class="intro-mark">${brandMark()}</div>
      <p class="intro-zh">暮霞</p>
      <p class="intro-en" aria-hidden="true"><span>M</span><span>O</span><span>S</span></p>
      <p class="intro-sub">${esc(text.sub)}</p>
    </div>
    <button class="intro-skip" type="button" data-skip>${esc(text.skip)}</button>
  `;
  document.body.classList.add("intro-on");
  document.body.appendChild(layer);
  if (app) app.setAttribute("inert", "");
  const skip = layer.querySelector("[data-skip]");
  let closed = false;
  let timer = 0;
  const finish = () => {
    if (closed) return;
    closed = true;
    window.clearTimeout(timer);
    document.removeEventListener("keydown", onKey, true);
    markIntro();
    document.body.classList.add("is-ready");
    document.body.classList.remove("intro-on");
    if (app) app.removeAttribute("inert");
    layer.classList.add("is-leave");
    window.setTimeout(() => layer.remove(), 520);
    document.getElementById("main")?.focus({ preventScroll: true });
    dismissIntro = () => {};
  };
  const onKey = (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    finish();
  };
  dismissIntro = finish;
  skip?.addEventListener("click", finish);
  document.addEventListener("keydown", onKey, true);
  timer = window.setTimeout(finish, 2600);
  skip?.focus();
}

function onClick(event) {
  const role = event.target.closest("[data-role-filter]");
  if (role) {
    setRoleFilter(role.getAttribute("data-role-filter"));
    paint();
    return;
  }
  const itemCategory = event.target.closest("[data-item-category]");
  if (itemCategory) {
    setItemCategory(itemCategory.getAttribute("data-item-category"));
    paint();
    return;
  }
  const queue = event.target.closest("[data-queue]");
  if (queue) {
    setPlayerQueue(queue.getAttribute("data-queue"));
    paint();
    return;
  }
  const section = event.target.closest("[data-profile-section]");
  if (section) {
    setPlayerSection(section.getAttribute("data-profile-section"));
    paint();
    return;
  }
  const season = event.target.closest("[data-season]");
  if (season) {
    setPlayerSeason(Number(season.getAttribute("data-season")));
    paint();
    return;
  }
  const match = event.target.closest("[data-match]");
  if (match && match.tagName === "BUTTON") {
    setPlayerMatch(match.getAttribute("data-match"));
    paint();
    return;
  }
  const matchTab = event.target.closest("[data-match-tab]");
  if (matchTab) {
    setPlayerTab(matchTab.getAttribute("data-match-tab"));
    paint();
    return;
  }
  const activity = event.target.closest("[data-activity-filter]");
  if (activity) {
    setActivityFilter(activity.getAttribute("data-activity-filter"));
    paint();
    return;
  }
  const lang = event.target.closest("[data-lang]");
  if (lang) {
    state.lang = state.lang === "en" ? "zh" : "en";
    storeLang(state.lang);
    paint();
    document.querySelector("[data-lang]")?.focus();
    return;
  }
  const menu = event.target.closest("[data-menu]");
  if (menu) {
    if (state.menuOpen) closeMenu();
    else openMenu();
    return;
  }
  const link = event.target.closest("a[data-nav]");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href.startsWith("mailto:") || href.startsWith("http")) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate(href);
}

function readApply(form) {
  const data = new FormData(form);
  applyDraft.rank = String(data.get("rank") || "");
  applyDraft.uid = String(data.get("uid") || "");
  applyDraft.nickname = String(data.get("nickname") || "");
  applyDraft.email = String(data.get("email") || "");
  applyDraft.gender = String(data.get("gender") || "");
  applyDraft.ageBand = String(data.get("ageBand") || "");
  applyDraft.motivation = String(data.get("motivation") || "");
  applyDraft.positions = data.getAll("positions").map(String);
  applyDraft.weekday = String(data.get("weekday") || "");
  applyDraft.holiday = String(data.get("holiday") || "");
  applyDraft.practice = String(data.get("practice") || "");
  applyDraft.conduct = data.get("conduct") === "on";
  return {
    ...applyDraft,
    company: String(data.get("company") || ""),
    lang: state.lang,
    conduct: applyDraft.conduct,
  };
}

function showApplyError(code, field) {
  applyDraft.status = "";
  applyDraft.mailDelayed = false;
  applyDraft.errorCode = typeof code === "string" ? code : "";
  applyDraft.field = typeof field === "string" ? field : "";
  paint();
  const message = document.querySelector("[data-apply-error]");
  if (message instanceof HTMLElement) {
    message.focus({ preventScroll: true });
    message.scrollIntoView({ block: "nearest" });
  }
}

async function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "apply-form") return;
  event.preventDefault();
  const payload = readApply(form);
  applyDraft.errorCode = null;
  applyDraft.field = "";
  applyDraft.status = "";
  applyDraft.mailDelayed = false;
  const preview = previewApplication(payload);
  if (!preview.ok) {
    showApplyError(preview.code, preview.field);
    return;
  }
  try {
    const response = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok !== true || (data.stored === false && response.status !== 201)) {
      showApplyError(data.code, data.field);
      return;
    }
    applyDraft.status = "sent";
    applyDraft.errorCode = null;
    applyDraft.field = "";
    applyDraft.mailDelayed = data.mailed === false;
    paint();
  } catch {
    showApplyError("", "");
  }
}

function onKeydown(event) {
  if (event.key === "Escape" && state.menuOpen && !document.querySelector(".intro")) {
    event.preventDefault();
    closeMenu();
  }
}

function contentFingerprint() {
  return JSON.stringify({
    contactEmail: getContactEmail(),
    placeholderSlots: getPlaceholderSlots(),
    profileFields: getProfileFields(),
    rosterMembers: getRosterMembers(),
    newsPosts: getNewsPosts(),
    player: getPlayer(),
    zh: getCopy("zh"),
    en: getCopy("en"),
  });
}

let painted = false;

async function loadPublished() {
  try {
    const response = await fetch("/api/content");
    if (!response.ok) return;
    const data = await response.json();
    if (!data || data.ok !== true || !data.copy) return;
    const before = contentFingerprint();
    applyPublishedContent(data);
    if (painted && contentFingerprint() !== before) paint();
  } catch {
    /* built-in defaults stay on screen */
  }
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/catalog");
    if (!response.ok) return;
    const data = await response.json();
    if (!data || data.ok !== true) return;
    setCatalog(data);
  } catch {
    /* catalog pages show the empty state */
  }
}

async function boot() {
  state.lang = readLang();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || introSeen()) document.body.classList.add("is-ready");
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  document.addEventListener("submit", onSubmit);
  window.addEventListener("popstate", () => {
    closeMenu(false);
    paint();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860 && state.menuOpen) closeMenu(false);
  });
  const pending = Promise.all([loadPublished(), loadCatalog()]);
  if (import.meta.env.DEV) {
    await pending;
    if (new URLSearchParams(window.location.search).has("preview")) {
      document.body.classList.add("is-ready");
      const { applyPreview } = await import("../shared/preview-player.js");
      applyPreview();
      const target = playerMemberPath(getRosterMembers(), getPlayer());
      if (target && (currentPath() === "/" || currentPath() === "/player")) {
        history.replaceState({}, "", `${target}${window.location.search}`);
      }
    }
  } else {
    await Promise.race([
      pending,
      new Promise((resolve) => {
        window.setTimeout(resolve, 500);
      }),
    ]);
  }
  paint();
  painted = true;
  if (!document.body.classList.contains("is-ready")) {
    try {
      mountIntro();
    } catch {
      document.body.classList.add("is-ready");
      document.body.classList.remove("intro-on");
      if (app) app.removeAttribute("inert");
    }
  }
  window.setTimeout(() => {
    if (!document.body.classList.contains("is-ready")) dismissIntro();
  }, 5000);
}

void boot();
