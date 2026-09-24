import { CONTACT_EMAIL, MAILTO, SITE_URL } from "../shared/brand.js";
import { maskMiddle, validateVerification } from "../shared/validate.js";
import { NAV, getCopy } from "./content.js";
import { esc } from "./html.js";
import { mountChrome, mountMotion } from "./motion.js";
import { renderPage } from "./pages.js";
import "./styles.css";

document.documentElement.classList.add("js");

const STORAGE_KEY = "mos-verify-receipt-v1";
const ROUTES = {
  "/": "home",
  "/about": "about",
  "/roster": "roster",
  "/news": "news",
  "/contact": "contact",
  "/verify": "verify",
};

const state = {
  lang: "zh",
  menuOpen: false,
  config: { inviteConfigured: false },
};

const app = document.querySelector("#app");

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

function readReceipt() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.receiptId !== "string") return null;
    return data;
  } catch {
    return null;
  }
}

function storeReceipt(receipt) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipt));
  } catch {
    /* ignore quota */
  }
}

function clearReceipt() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
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

function shell() {
  const text = copy();
  const links = NAV.map(
    (item) =>
      `<a href="${item.href}" data-nav>${esc(text.nav[item.key])}<small>${esc(item.href === "/" ? "HOME" : item.key.toUpperCase())}</small></a>`,
  ).join("");
  return `
    <a class="skip" href="#main">${esc(text.nav.skip)}</a>
    <div class="scroll-progress" aria-hidden="true"><span></span></div>
    <div class="ambient" aria-hidden="true">
      <span class="orb orb-a"></span>
      <span class="orb orb-b"></span>
      <span class="orb orb-c"></span>
      <span class="grid-fade"></span>
    </div>
    <div class="scanlines" aria-hidden="true"></div>
    <header class="nav">
      <a class="brand" href="/" data-nav>
        <span class="brand-mark" aria-hidden="true"></span>
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
        <div>
          <p class="section-kicker">${esc(text.footer.recruit)}</p>
          <a class="text-link" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a>
          <p>${esc(text.footer.rule)}</p>
        </div>
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
  const canonical = document.querySelector('link[rel="canonical"]');
  if (ogTitle) ogTitle.setAttribute("content", title);
  if (ogDesc) ogDesc.setAttribute("content", description);
  if (canonical) canonical.setAttribute("href", `${SITE_URL}${path === "/" ? "/" : path}`);
}

function syncInvite() {
  const ready = state.config.inviteConfigured;
  document.querySelectorAll("[data-invite]").forEach((node) => {
    const show = node.dataset.invite === "ready" ? ready : !ready;
    node.hidden = !show;
  });
}

function closeMenu(restoreFocus = true) {
  state.menuOpen = false;
  document.body.classList.remove("menu-open");
  const panel = document.getElementById("menu-panel");
  const button = document.querySelector("[data-menu]");
  if (panel) panel.hidden = true;
  if (button) {
    button.setAttribute("aria-expanded", "false");
    const label = copy().nav.menu;
    const span = button.querySelector("span");
    if (span) span.textContent = label;
    if (restoreFocus) button.focus();
  }
}

function openMenu() {
  state.menuOpen = false;
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
  syncInvite();
  mountMotion(main);
  mountChrome();
  if (name === "verify") mountVerify();
  if (state.menuOpen) openMenu();
}

function navigate(href, { push = true } = {}) {
  const url = new URL(href, window.location.origin);
  const next = normalize(url.pathname);
  if (push) {
    if (`${next}${url.search}` !== `${currentPath()}${window.location.search}`) {
      history.pushState({}, "", next);
    }
  }
  closeMenu(false);
  paint();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  const main = document.getElementById("main");
  if (main) main.focus({ preventScroll: true });
}

function receiptRows(receipt) {
  const text = copy().verify;
  return [
    [text.labels.id, receipt.receiptId],
    [text.labels.status, text.labels.pending],
    [text.labels.aov, receipt.aovMasked || "••"],
    [text.labels.handle, receipt.discordMasked || "••"],
    [text.labels.discord, text.labels.locked],
    [text.labels.garena, text.labels.unsynced],
    [text.labels.store, text.labels.local],
  ];
}

function renderReceipt(receipt) {
  const host = document.getElementById("receipt");
  const steps = document.querySelector("[data-steps]");
  if (!host) return;
  host.replaceChildren();
  if (!receipt) {
    host.hidden = true;
    if (steps) steps.classList.remove("is-received");
    return;
  }
  host.hidden = false;
  if (steps) steps.classList.add("is-received");
  const text = copy().verify;
  const title = document.createElement("p");
  title.className = "receipt-title";
  title.textContent = text.receiptTitle;
  const body = document.createElement("p");
  body.textContent = text.receiptBody;
  const list = document.createElement("dl");
  receiptRows(receipt).forEach(([term, value]) => {
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = value;
    list.append(dt, dd);
  });
  const again = document.createElement("p");
  again.className = "section-note";
  again.textContent = text.again;
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "btn btn-ghost";
  clear.dataset.clearReceipt = "true";
  clear.textContent = text.clear;
  host.append(title, body, list, again, clear);
}

function setErrors(errors) {
  const map = {
    aov: "err-aov",
    discord: "err-discord",
    ack: "err-ack",
  };
  Object.entries(map).forEach(([key, id]) => {
    const node = document.getElementById(id);
    if (node) node.textContent = errors[key] || "";
  });
  const aov = document.getElementById("aov-id");
  const discord = document.getElementById("discord-handle");
  const ack = document.getElementById("ack");
  if (aov) aov.setAttribute("aria-invalid", errors.aov ? "true" : "false");
  if (discord) discord.setAttribute("aria-invalid", errors.discord ? "true" : "false");
  if (ack) ack.setAttribute("aria-invalid", errors.ack ? "true" : "false");
}

function mountVerify() {
  renderReceipt(readReceipt());
}

async function submitVerify(form) {
  const text = copy().verify;
  const status = document.getElementById("form-status");
  const button = form.querySelector('button[type="submit"]');
  const payload = {
    aovId: form.aovId.value,
    discordHandle: form.discordHandle.value,
    ack: form.ack.checked === true,
    website: form.website.value,
  };
  const result = validateVerification(payload);
  const errors = { aov: "", discord: "", ack: "" };
  if (!result.ok) {
    if (result.code === "invalid_aov_id") errors.aov = text.errors.invalid_aov_id;
    if (result.code === "invalid_discord") errors.discord = text.errors.invalid_discord;
    if (result.code === "ack_required") errors.ack = text.errors.ack_required;
    setErrors(errors);
    if (status) status.textContent = "";
    return;
  }
  setErrors(errors);
  if (button) {
    button.disabled = true;
    button.textContent = text.sending;
  }
  try {
    const response = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      const code = data.code || "server_error";
      const message = text.errors[code] || text.errors.server_error;
      if (code === "invalid_aov_id") setErrors({ ...errors, aov: message });
      else if (code === "invalid_discord") setErrors({ ...errors, discord: message });
      else if (code === "ack_required") setErrors({ ...errors, ack: message });
      if (status) status.textContent = message;
      return;
    }
    const receipt = {
      receiptId: data.receiptId,
      status: data.status,
      aovMasked: maskMiddle(payload.aovId.trim()),
      discordMasked: maskMiddle(payload.discordHandle.trim()),
      submittedAt: new Date().toISOString(),
    };
    storeReceipt(receipt);
    renderReceipt(receipt);
    form.reset();
    if (status) status.textContent = text.receiptTitle;
  } catch {
    if (status) status.textContent = text.errors.network;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = text.submit;
    }
  }
}

function onClick(event) {
  const clear = event.target.closest("[data-clear-receipt]");
  if (clear) {
    clearReceipt();
    renderReceipt(null);
    const status = document.getElementById("form-status");
    if (status) status.textContent = "";
    return;
  }
  const lang = event.target.closest("[data-lang]");
  if (lang) {
    state.lang = state.lang === "en" ? "zh" : "en";
    storeLang(state.lang);
    paint();
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
  if (!href || href.startsWith("mailto:")) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  navigate(href);
}

function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement) || form.id !== "verify-form") return;
  event.preventDefault();
  void submitVerify(form);
}

function onKeydown(event) {
  if (event.key === "Escape" && state.menuOpen) {
    event.preventDefault();
    closeMenu();
  }
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) return;
    const data = await response.json();
    if (data.contactEmail && data.contactEmail !== CONTACT_EMAIL) return;
    state.config.inviteConfigured = Boolean(data.discord?.inviteConfigured);
    syncInvite();
  } catch {
    /* defaults keep the gate closed and the invite unpublished */
  }
}

function boot() {
  state.lang = readLang();
  document.addEventListener("click", onClick);
  document.addEventListener("submit", onSubmit);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("popstate", () => {
    closeMenu(false);
    paint();
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 860 && state.menuOpen) closeMenu(false);
  });
  paint();
  void loadConfig();
}

boot();
