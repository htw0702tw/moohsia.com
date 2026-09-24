import { CONTACT_EMAIL, MAILTO, SITE_URL } from "../shared/brand.js";
import { NAV, getCopy } from "./content.js";
import { esc } from "./html.js";
import { mountChrome, mountMotion } from "./motion.js";
import { brandMark, renderPage } from "./pages.js";
import "./styles.css";

document.documentElement.classList.add("js");

const ROUTES = {
  "/": "home",
  "/about": "about",
  "/roster": "roster",
  "/news": "news",
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
          <em>AOV</em>
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
      <a class="text-link" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a>
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
          <a class="text-link" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a>
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

function setActive() {
  const path = currentPath();
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const href = link.getAttribute("href");
    if (href === path) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
}

function setMeta() {
  const text = copy();
  const path = currentPath();
  const name = ROUTES[path] || "notFound";
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

function paint() {
  if (!app) return;
  const path = currentPath();
  const name = ROUTES[path] || "notFound";
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-Hant";
  app.innerHTML = shell();
  const main = document.getElementById("main");
  if (main) main.innerHTML = renderPage(name, copy());
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

function onKeydown(event) {
  if (event.key === "Escape" && state.menuOpen && !document.querySelector(".intro")) {
    event.preventDefault();
    closeMenu();
  }
}

function boot() {
  state.lang = readLang();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || introSeen()) document.body.classList.add("is-ready");
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("popstate", () => {
    closeMenu(false);
    paint();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860 && state.menuOpen) closeMenu(false);
  });
  paint();
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

boot();
