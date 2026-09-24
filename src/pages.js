import { CONTACT_EMAIL, MAILTO } from "../shared/brand.js";
import { newsPosts, PLACEHOLDER_SLOTS, profileFields, rosterMembers } from "./content.js";
import { esc } from "./html.js";

function crest() {
  return `
    <div class="orbit" aria-hidden="true">
      <span class="orbit-ring orbit-a"></span>
      <span class="orbit-ring orbit-b"></span>
      <div class="orbit-core">
        <svg class="crest-svg" viewBox="0 0 320 320">
          <defs>
            <linearGradient id="duskStroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#ffb020"/>
              <stop offset="48%" stop-color="#ff3b86"/>
              <stop offset="100%" stop-color="#a78bfa"/>
            </linearGradient>
            <radialGradient id="duskFill" cx="50%" cy="70%" r="60%">
              <stop offset="0%" stop-color="#ff3b86" stop-opacity="0.55"/>
              <stop offset="55%" stop-color="#7c3aed" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="#07060c" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="160" cy="160" r="126" fill="url(#duskFill)"/>
          <path d="M28 198 H292" stroke="rgba(246,241,234,0.18)" stroke-width="1"/>
          <path d="M46 198 C90 112 230 112 274 198" fill="rgba(255,59,134,0.22)" stroke="#ffb020" stroke-width="1.4"/>
          <circle cx="214" cy="128" r="14" fill="#ffb020"/>
          <circle cx="214" cy="128" r="26" fill="none" stroke="rgba(255,176,32,0.45)"/>
          <text x="160" y="178" text-anchor="middle" fill="#f6f1ea" font-family="Oxanium, sans-serif" font-size="54" font-weight="700" letter-spacing="6">MOS</text>
          <circle cx="160" cy="160" r="150" fill="none" stroke="url(#duskStroke)" stroke-width="1.4"/>
        </svg>
      </div>
    </div>
  `;
}

function seal(label) {
  const text = label.split("：").map((part) => esc(part)).join("<br>");
  return `<div class="seal" aria-hidden="true"><span>${text}</span></div>`;
}

function ticker() {
  const line = "暮霞｜MOS · 傳說對決 · 不開放招募 · Info@moohsia.com · 通過驗證後加入內部 Discord · ";
  return `
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track">
        <span>${line.repeat(2)}</span>
        <span>${line.repeat(2)}</span>
      </div>
    </div>
  `;
}

function pending(copy, value) {
  const text = value?.trim() ? value : copy.about.pending;
  const klass = value?.trim() ? "" : " is-pending";
  return `<span class="fact-value${klass}">${esc(text)}</span>`;
}

export function renderHome(copy) {
  const home = copy.home;
  const chips = home.chips
    .map((chip) => `<li class="chip${chip.tone === "alert" ? " chip-alert" : ""}">${esc(chip.text)}</li>`)
    .join("");
  const cards = home.cards
    .map(
      (card) => `
      <article class="glass tilt reveal" data-tilt>
        <p class="index">${esc(card.index)}</p>
        <h3>${esc(card.title)}</h3>
        <p>${esc(card.body)}</p>
      </article>`,
    )
    .join("");
  const rows = home.rows
    .map(
      ([label, value]) => `
      <div class="board-row">
        <dt>${esc(label)}</dt>
        <dd>${esc(value)}</dd>
      </div>`,
    )
    .join("");

  return `
    <article class="page home">
      <section class="hero" data-hero>
        <canvas class="dust" aria-hidden="true"></canvas>
        <div class="hero-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="wrap hero-grid">
          <div class="hero-copy">
            <p class="kicker"><span>${esc(home.kicker)}</span> ${esc(home.kickerZh)}</p>
            <h1>
              <span class="zh-title">暮霞</span>
              <span class="en-title"><span>M</span><span>O</span><span>S</span></span>
            </h1>
            <p class="tagline">${esc(home.tagline)}</p>
            <p class="tagline-alt">${esc(home.taglineAlt)}</p>
            <p class="lead">${esc(home.lead)}</p>
            <ul class="chips">${chips}</ul>
            <div class="hero-actions">
              <a class="btn btn-primary" href="/about" data-nav>${esc(home.ctaTeam)}</a>
              <a class="btn btn-ghost" href="/verify" data-nav>${esc(home.ctaVerify)}</a>
            </div>
          </div>
          <div class="hero-crest">
            ${crest()}
            <p class="hud-readout"><span>${esc(home.crestSig)}</span><span>${esc(home.crestRec)}</span></p>
            ${seal(copy.nav.recruitChip)}
          </div>
        </div>
      </section>
      ${ticker()}
      <section class="section wrap">
        <p class="section-kicker">${esc(home.identityKicker)}</p>
        <h2>${esc(home.identityTitle)}</h2>
        <div class="card-grid">${cards}</div>
      </section>
      <section class="section wrap">
        <p class="section-kicker">${esc(home.boardKicker)}</p>
        <h2>${esc(home.boardTitle)}</h2>
        <p class="section-note">${esc(home.boardNote)}</p>
        <dl class="board reveal">${rows}</dl>
      </section>
      <section class="section wrap">
        <p class="section-kicker">${esc(home.pathKicker)}</p>
        <h2>${esc(home.pathTitle)}</h2>
        <div class="path-grid">
          <article class="glass tilt reveal" data-tilt>
            <p class="index">MAIL</p>
            <h3>${esc(home.emailTitle)}</h3>
            <p>${esc(home.emailBody)}</p>
            <a class="text-link" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a>
          </article>
          <article class="glass tilt reveal" data-tilt>
            <p class="index">LOCK</p>
            <h3>${esc(home.discordTitle)}</h3>
            <p>${esc(home.discordBody)}</p>
            <a class="btn btn-ghost" href="/verify" data-nav>${esc(home.discordCta)}</a>
          </article>
        </div>
      </section>
    </article>
  `;
}

export function renderAbout(copy) {
  const about = copy.about;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const facts = profileFields
    .map((field) => {
      const label = lang === "en" ? field.en : field.zh;
      const value = lang === "en" ? field.value.en : field.value.zh;
      return `<div class="fact"><b>${esc(label)}</b>${pending(copy, value)}</div>`;
    })
    .join("");
  const principles = about.principles.map((item) => `<li>${esc(item)}</li>`).join("");
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(about.kicker)}</p>
        <h1>${esc(about.title)}</h1>
        <p class="lead">${esc(about.lead)}</p>
      </header>
      <section class="section wrap split">
        <div class="glass reveal">
          <h2 class="sr-only">${esc(about.title)}</h2>
          <div class="facts">${facts}</div>
        </div>
        <div class="reveal">
          <p class="section-kicker">${esc(about.principlesKicker)}</p>
          <h2>${esc(about.principlesTitle)}</h2>
          <ul class="principles">${principles}</ul>
        </div>
      </section>
      <section class="section wrap">
        <div class="plate reveal">
          ${seal(copy.nav.recruitChip)}
          <div>
            <h2>${esc(about.recruitTitle)}</h2>
            <p>${esc(about.recruitBody)}</p>
          </div>
        </div>
      </section>
    </article>
  `;
}

export function renderRoster(copy) {
  const roster = copy.roster;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const published = rosterMembers.filter((member) => (member.name?.[lang] || member.name?.zh || "").trim());
  const cards = published.length
    ? published
        .map((member, index) => {
          const name = (member.name?.[lang] || member.name?.zh || "").trim();
          const role = (member.role?.[lang] || member.role?.zh || "").trim() || roster.rolePending;
          return `
            <article class="slot reveal">
              <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
              <div class="silhouette" aria-hidden="true"></div>
              <h2>${esc(name)}</h2>
              <p>${esc(role)}</p>
            </article>
          `;
        })
        .join("")
    : Array.from({ length: PLACEHOLDER_SLOTS }, (_, index) => {
        return `
          <article class="slot is-empty reveal">
            <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
            <div class="silhouette" aria-hidden="true"></div>
            <h2>${esc(roster.slot)}</h2>
            <p>${esc(roster.slotMeta)}</p>
          </article>
        `;
      }).join("");

  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(roster.kicker)}</p>
        <h1>${esc(roster.title)}</h1>
        <p class="lead">${esc(roster.lead)}</p>
      </header>
      <section class="section wrap">
        <div class="slots">${cards}</div>
        ${published.length ? "" : `<p class="section-note">${esc(roster.emptyNote)}</p>`}
      </section>
    </article>
  `;
}

export function renderNews(copy) {
  const news = copy.news;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const posts = newsPosts.filter((post) => (post.title?.[lang] || post.title?.zh || "").trim());
  const list = posts.length
    ? `<div class="news-list">${posts
        .map((post) => {
          const title = (post.title?.[lang] || post.title?.zh || "").trim();
          const body = (post.body?.[lang] || post.body?.zh || "").trim();
          return `
            <article class="glass news-item reveal">
              <p class="index">${esc(post.date || "")}</p>
              <h2>${esc(title)}</h2>
              ${body ? `<p>${esc(body)}</p>` : ""}
            </article>
          `;
        })
        .join("")}</div>`
    : `
      <div class="empty-signal reveal">
        <div class="radar" aria-hidden="true"><span></span></div>
        <p class="section-kicker">${esc(news.silent)}</p>
        <h2>${esc(news.emptyTitle)}</h2>
        <p>${esc(news.emptyBody)}</p>
      </div>
    `;
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(news.kicker)}</p>
        <h1>${esc(news.title)}</h1>
        <p class="lead">${esc(news.lead)}</p>
      </header>
      <section class="section wrap">${list}</section>
    </article>
  `;
}

function discordNotes(copy) {
  return `
    <p class="mono-note" data-invite="empty">${esc(copy.comingSoon)}</p>
    <p class="mono-note" data-invite="ready" hidden>${esc(copy.staged)}</p>
  `;
}

export function renderContact(copy) {
  const contact = copy.contact;
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(contact.kicker)}</p>
        <h1>${esc(contact.title)}</h1>
        <p class="lead">${esc(contact.lead)}</p>
      </header>
      <section class="section wrap contact-layout">
        <a class="mail-plate" href="${MAILTO}">
          <span class="section-kicker">${esc(contact.emailLabel)}</span>
          <span class="mail-address">${esc(CONTACT_EMAIL)}</span>
          <span class="section-note">${esc(contact.only)}</span>
        </a>
        <article class="glass lock-card">
          <div class="lock" aria-hidden="true"></div>
          <h2>${esc(contact.discordTitle)}</h2>
          <p>${esc(contact.discordBody)}</p>
          ${discordNotes(contact)}
          <a class="btn btn-ghost" href="/verify" data-nav>${esc(contact.discordCta)}</a>
        </article>
        <div class="plate">
          ${seal(copy.nav.recruitChip)}
          <div>
            <h2>${esc(contact.recruitTitle)}</h2>
            <p>${esc(contact.recruitBody)}</p>
          </div>
        </div>
      </section>
    </article>
  `;
}

export function renderVerify(copy) {
  const verify = copy.verify;
  const steps = verify.steps
    .map(
      (step, index) => `
      <li${index === 3 ? ' class="is-locked"' : ""}>
        <span>${esc(String(index + 1).padStart(2, "0"))}</span>
        <strong>${esc(step.title)}</strong>
        <em>${esc(step.body)}</em>
      </li>`,
    )
    .join("");
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(verify.kicker)}</p>
        <h1>${esc(verify.title)}</h1>
        <p class="lead">${esc(verify.lead)}</p>
        <p class="banner">${esc(verify.banner)}</p>
      </header>
      <section class="section wrap verify-layout">
        <ol class="steps" data-steps>${steps}</ol>
        <div class="verify-grid">
          <form id="verify-form" class="glass form-card" novalidate>
            <h2>${esc(verify.formTitle)}</h2>
            <label>
              <span>${esc(verify.aovLabel)}</span>
              <input id="aov-id" name="aovId" type="text" maxlength="24" autocomplete="off" required>
              <small>${esc(verify.aovHint)}</small>
              <p class="field-error" id="err-aov"></p>
            </label>
            <label>
              <span>${esc(verify.discordLabel)}</span>
              <input id="discord-handle" name="discordHandle" type="text" maxlength="37" autocomplete="off" required>
              <small>${esc(verify.discordHint)}</small>
              <p class="field-error" id="err-discord"></p>
            </label>
            <label class="check">
              <input id="ack" name="ack" type="checkbox" value="yes">
              <span>${esc(verify.ack)}</span>
            </label>
            <p class="field-error" id="err-ack"></p>
            <label class="hp" aria-hidden="true">
              <span>${esc(verify.honeypot)}</span>
              <input name="website" type="text" tabindex="-1" autocomplete="off">
            </label>
            <button class="btn btn-primary" type="submit">${esc(verify.submit)}</button>
            <p class="form-status" id="form-status" role="status"></p>
            <div id="receipt" class="receipt" hidden></div>
          </form>
          <aside class="glass lock-card gate-card">
            <div class="lock" aria-hidden="true"></div>
            <h2>${esc(verify.gateTitle)}</h2>
            <button class="btn btn-ghost" type="button" disabled>${esc(verify.gateCta)}</button>
            ${discordNotes(verify)}
            <p class="section-note">${esc(verify.gateNote)}</p>
            <p class="section-note">${esc(verify.human)} <a class="text-link" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a></p>
          </aside>
        </div>
      </section>
    </article>
  `;
}

export function renderNotFound(copy) {
  const page = copy.notFound;
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(page.kicker)}</p>
        <h1>${esc(page.title)}</h1>
        <p class="lead">${esc(page.lead)}</p>
        <a class="btn btn-primary" href="/" data-nav>${esc(page.back)}</a>
      </header>
    </article>
  `;
}

export function renderPage(name, copy) {
  switch (name) {
    case "home":
      return renderHome(copy);
    case "about":
      return renderAbout(copy);
    case "roster":
      return renderRoster(copy);
    case "news":
      return renderNews(copy);
    case "contact":
      return renderContact(copy);
    case "verify":
      return renderVerify(copy);
    default:
      return renderNotFound(copy);
  }
}
