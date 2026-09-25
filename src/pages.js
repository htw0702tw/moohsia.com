import { AGE_BANDS, GENDERS, POSITIONS, RANKS } from "../shared/apply.js";
import { applyDraft, applyErrorText } from "./apply-state.js";
import { getActivityFilter, getCatalog, getRoleFilter } from "./catalog-state.js";
import { renderHeroDetail, renderItems } from "./catalog-pages.js";
import {
  getContactEmail,
  getMailto,
  getNewsPosts,
  getPlaceholderSlots,
  getPlayer,
  getProfileFields,
  getRosterMembers,
} from "./content.js";
import { esc } from "./html.js";
import { renderPlayerBody } from "./player-page.js";
import { findRosterMember, memberSlug, playerMemberPath } from "../shared/match-present.js";

export function brandMark() {
  return `
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="29" fill="#140814" stroke="#ffb020" stroke-width="1.4"/>
      <path d="M10 44c7-18 37-18 44 0" fill="#ff3b86"/>
      <circle cx="44" cy="22" r="4.2" fill="#ffb020"/>
      <circle cx="44" cy="22" r="7.5" fill="none" stroke="rgba(255,176,32,0.65)"/>
      <path d="M20 44V28l12 10 12-10v16" fill="none" stroke="#f7f1ea" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>
  `;
}

function crest() {
  return `
    <div class="orbit" aria-hidden="true">
      <span class="orbit-ring orbit-a"></span>
      <span class="orbit-ring orbit-b"></span>
      <span class="orbit-dial"></span>
      <div class="orbit-core">
        <svg class="crest-svg" viewBox="0 0 400 400">
          <defs>
            <linearGradient id="duskStroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stop-color="#ffb020"/>
              <stop offset="46%" stop-color="#ff3b86"/>
              <stop offset="100%" stop-color="#b388ff"/>
            </linearGradient>
            <radialGradient id="duskFill" cx="50%" cy="64%" r="58%">
              <stop offset="0%" stop-color="#ff3b86" stop-opacity="0.62"/>
              <stop offset="40%" stop-color="#ff6a2c" stop-opacity="0.22"/>
              <stop offset="100%" stop-color="#07040d" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <circle cx="200" cy="200" r="168" fill="url(#duskFill)"/>
          <circle cx="200" cy="200" r="178" fill="none" stroke="url(#duskStroke)" stroke-width="1.6"/>
          <circle cx="200" cy="200" r="148" fill="none" stroke="rgba(246,240,232,0.16)"/>
          <path d="M34 252 H366" stroke="rgba(246,240,232,0.16)"/>
          <path d="M56 252 C130 128 270 128 344 252" fill="rgba(255,59,134,0.24)" stroke="#ffb020" stroke-width="2"/>
          <circle cx="268" cy="156" r="16" fill="#ffb020"/>
          <circle cx="268" cy="156" r="30" fill="none" stroke="rgba(255,176,32,0.5)"/>
          <circle cx="268" cy="156" r="44" fill="none" stroke="rgba(255,176,32,0.22)"/>
          <text x="200" y="112" text-anchor="middle" fill="#ffb020" font-family="Share Tech Mono, monospace" font-size="15" letter-spacing="7">暮霞</text>
          <text x="200" y="242" text-anchor="middle" fill="#f7f1ea" font-family="Oxanium, sans-serif" font-size="74" font-weight="800" letter-spacing="10">MOS</text>
          <text x="200" y="286" text-anchor="middle" fill="#ffb020" font-family="Share Tech Mono, monospace" font-size="16" letter-spacing="6">MOOHSIA</text>
        </svg>
      </div>
    </div>
  `;
}

function seal(label) {
  return `<div class="seal" aria-hidden="true"><span>${esc(label)}</span></div>`;
}

function ticker(line) {
  const text = esc(line);
  return `
    <div class="ticker" aria-hidden="true">
      <div class="ticker-track">
        <span>${text.repeat(2)}</span>
        <span>${text.repeat(2)}</span>
      </div>
    </div>
  `;
}

function lang() {
  return document.documentElement.lang === "en" ? "en" : "zh";
}

function bi(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  const key = lang();
  return String(value[key] || value.zh || value.en || "").trim();
}

function note(text) {
  const value = String(text ?? "").trim();
  return value ? `<p class="section-note">${esc(value)}</p>` : "";
}

function pending(copy, value) {
  const text = value?.trim() ? value : copy.about.pending;
  const klass = value?.trim() ? "" : " is-pending";
  return `<span class="fact-value${klass}">${esc(text)}</span>`;
}

function rosterCards(copy) {
  const roster = copy.roster;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const rosterMembers = getRosterMembers();
  const published = rosterMembers.filter(
    (member) => !member.hidden && (member.name?.[lang] || member.name?.zh || "").trim(),
  );
  if (published.length) {
    return published
      .map((member, index) => {
        const name = (member.name?.[lang] || member.name?.zh || "").trim();
        const role = (member.role?.[lang] || member.role?.zh || "").trim() || roster.rolePending;
        return slotCard(index, name, role, roster.stampLive, false, memberSlug(member) ? `/roster/${memberSlug(member)}` : "");
      })
      .join("");
  }
  return Array.from({ length: getPlaceholderSlots() }, (_, index) =>
    slotCard(index, roster.slot, roster.slotMeta, roster.stamp, true),
  ).join("");
}

function slotCard(index, name, meta, stamp, empty, href = "") {
  const body = `
      <div class="slot-top">
        <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
        <p class="stamp">${esc(stamp)}</p>
      </div>
      <div class="silhouette" aria-hidden="true"><span></span></div>
      <h3>${esc(name)}</h3>
      <p>${esc(meta)}</p>`;
  const klass = `slot${empty ? " is-empty" : ""} reveal`;
  if (href) return `<a class="${klass}" href="${esc(href)}" data-nav>${body}</a>`;
  return `<article class="${klass}">${body}</article>`;
}

function newsBody(copy, compact) {
  const news = copy.news;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const posts = getNewsPosts().filter(
    (post) => post.status !== "draft" && (post.title?.[lang] || post.title?.zh || "").trim(),
  );
  if (posts.length) {
    return `<div class="news-list">${posts
      .map((post) => {
        const title = (post.title?.[lang] || post.title?.zh || "").trim();
        const body = (post.body?.[lang] || post.body?.zh || "").trim();
        return `
          <article class="glass news-item reveal">
            <p class="index">${esc(post.date || "")}</p>
            <h3>${esc(title)}</h3>
            ${body ? `<p>${esc(body)}</p>` : ""}
          </article>
        `;
      })
      .join("")}</div>`;
  }
  const wires = news.reserved
    .map(
      (row) => `
      <li>
        <span>${esc(row.id)}</span>
        <strong>${esc(row.title)}</strong>
        <em>${esc(row.meta)}</em>
      </li>`,
    )
    .join("");
  return `
    <div class="console reveal">
      <div class="console-bar">
        <span class="rec"><i></i>${esc(news.silent)}</span>
        <span>${esc(news.feed)}</span>
      </div>
      <div class="console-body">
        <div class="radar" aria-hidden="true"><span></span></div>
        <div>
          <p class="section-kicker">${esc(news.silent)}</p>
          <h3>${esc(news.emptyTitle)}</h3>
          <p>${esc(news.emptyBody)}</p>
          ${compact ? `<a class="text-link" href="/news" data-nav>${esc(copy.home.signalCta)}</a>` : ""}
        </div>
      </div>
      <p class="wire-label">${esc(news.wireLabel)}</p>
      <ol class="wire">${wires}</ol>
      ${compact ? "" : note(news.reservedNote)}
    </div>
  `;
}

export function renderHome(copy) {
  const home = copy.home;
  const chips = home.chips
    .map((chip) => `<li class="chip${chip.tone === "alert" ? " chip-alert" : ""}">${esc(chip.text)}</li>`)
    .join("");
  const metrics = home.metrics
    .map(
      (item) => `
      <article class="metric reveal">
        <p class="index">${esc(item.index)}</p>
        <p class="metric-label">${esc(item.label)}</p>
        <h3>${esc(item.value)}</h3>
        <p>${esc(item.note)}</p>
      </article>`,
    )
    .join("");
  const cards = home.cards
    .map(
      (card) => `
      <article class="reveal">
        <div class="glass tilt frame" data-tilt>
          <p class="index">${esc(card.index)}</p>
          <h3>${esc(card.title)}</h3>
          <p>${esc(card.body)}</p>
        </div>
      </article>`,
    )
    .join("");
  const rows = home.rows
    .map(
      ([label, value]) => `
      <tr>
        <th scope="row">${esc(label)}</th>
        <td>${esc(value)}</td>
      </tr>`,
    )
    .join("");
  const fixtures = home.fixtures
    .map(
      (row) => `
      <li class="fixture reveal">
        <span>${esc(row.id)}</span>
        <strong>${esc(row.title)}</strong>
        <em>${esc(row.meta)}</em>
      </li>`,
    )
    .join("");

  return `
    <article class="page home">
      <section class="hero" data-hero>
        <div class="hero-bg" aria-hidden="true">
          <div class="sky"></div>
          <div class="sun"></div>
          <div class="haze"></div>
          <div class="stage-floor"><div class="stage-floor-grid"></div></div>
          <div class="vignette"></div>
        </div>
        <canvas class="dust" aria-hidden="true"></canvas>
        <div class="hero-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="wrap hero-grid">
          <div class="hero-copy">
            <p class="kicker"><span>${esc(home.kicker)}</span> ${esc(home.kickerZh)}</p>
            <h1>
              <span class="zh-title">暮霞</span>
              <span class="en-title">MOS</span>
            </h1>
            <p class="tagline">${esc(home.tagline)}</p>
            <p class="tagline-alt">${esc(home.taglineAlt)}</p>
            <p class="lead">${esc(home.lead)}</p>
            <ul class="chips">${chips}</ul>
            <div class="hero-actions">
              <a class="btn btn-primary" href="/about" data-nav>${esc(home.ctaTeam)}</a>
              <a class="btn btn-ghost" href="/roster" data-nav>${esc(home.ctaRoster)}</a>
              <a class="btn btn-primary" href="/apply" data-nav>${esc(home.ctaApply || copy.nav.apply)}</a>
              <a class="btn btn-ghost" href="${getMailto()}">${esc(home.ctaContact)}</a>
            </div>
          </div>
          <div class="hero-crest">
            ${crest()}
            <p class="hud-readout"><span>${esc(home.crestSig)}</span><span>${esc(home.crestRec)}</span></p>
            ${seal(copy.nav.recruitChip)}
          </div>
        </div>
        <div class="wrap hero-hud">
          <span>${esc(home.hudChannel)}</span>
          <span>${esc(home.hudGame)}</span>
          <span data-clock>TPE --:--:--</span>
          <span class="coords" data-coords>X ---  Y ---</span>
        </div>
      </section>
      ${ticker(home.ticker)}
      <section class="section wrap metrics" aria-label="${esc(home.metricsKicker)}">
        <div class="metrics-grid">${metrics}</div>
      </section>
      <section class="section wrap">
        <div class="section-head">
          <p class="section-kicker">${esc(home.identityKicker)}</p>
          <h2>${esc(home.identityTitle)}</h2>
          <p class="section-note">${esc(home.identityLead)}</p>
        </div>
        <div class="card-grid">${cards}</div>
      </section>
      <section class="section wrap split-board">
        <div>
          <div class="section-head">
            <p class="section-kicker">${esc(home.boardKicker)}</p>
            <h2>${esc(home.boardTitle)}</h2>
            ${note(home.boardNote)}
          </div>
          <table class="board reveal">
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="fixture-panel reveal">
          <p class="section-kicker">${esc(home.fixtureKicker)}</p>
          <h2>${esc(home.fixtureTitle)}</h2>
          <p>${esc(home.fixtureLead)}</p>
          <ol class="fixtures">${fixtures}</ol>
          ${note(home.fixtureNote)}
        </div>
      </section>
      <section class="section roster-stage">
        <div class="wrap">
          <div class="section-head section-head-row">
            <div>
              <p class="section-kicker">${esc(home.rosterKicker)}</p>
              <h2>${esc(home.rosterTitle)}</h2>
              <p class="section-note">${esc(getRosterMembers().some((member) => !member.hidden && (member.name?.zh || member.name?.en || "").trim()) ? copy.roster.liveLead : home.rosterLead)}</p>
            </div>
            <a class="btn btn-ghost" href="/roster" data-nav>${esc(home.rosterCta)}</a>
          </div>
          <div class="slots">${rosterCards(copy)}</div>
          ${getRosterMembers().some((member) => !member.hidden && (member.name?.zh || member.name?.en || "").trim()) ? "" : note(copy.roster.emptyNote)}
        </div>
      </section>
      <section class="section wrap">
        <div class="section-head section-head-row">
          <div>
            <p class="section-kicker">${esc(home.playerKicker)}</p>
            <h2>${esc(home.playerTitle)}</h2>
            <p class="section-note">${esc(getPlayer() ? home.playerLead : home.playerEmpty)}</p>
          </div>
          <a class="btn btn-ghost" href="${esc(playerMemberPath(getRosterMembers(), getPlayer()) || "/roster")}" data-nav>${esc(home.playerCta)}</a>
        </div>
        ${renderPlayerBody(copy, true)}
      </section>
      <section class="section wrap">
        <div class="section-head section-head-row">
          <div>
            <p class="section-kicker">${esc(home.catalogKicker)}</p>
            <h2>${esc(home.catalogTitle)}</h2>
            <p class="section-note">${esc(home.catalogLead)}</p>
          </div>
          <div class="hero-actions">
            <a class="btn btn-ghost" href="/heroes" data-nav>${esc(home.heroesCta)}</a>
            <a class="btn btn-ghost" href="/modes" data-nav>${esc(home.modesCta)}</a>
          </div>
        </div>
        ${catalogPreview(copy)}
      </section>
      <section class="section wrap">
        <div class="section-head section-head-row">
          <div>
            <p class="section-kicker">${esc(copy.activities.kicker)}</p>
            <h2>${esc(copy.activities.title)}</h2>
            <p class="section-note">${esc(copy.activities.lead)}</p>
          </div>
          <a class="btn btn-ghost" href="/activities" data-nav>${esc(copy.nav.activities)}</a>
        </div>
        ${activityCards(copy, true)}
      </section>
      <section class="section wrap">
        <div class="section-head">
          <p class="section-kicker">${esc(home.signalKicker)}</p>
          <h2>${esc(home.signalTitle)}</h2>
        </div>
        ${newsBody(copy, true)}
      </section>
      <section class="finale">
        <div class="wrap finale-grid">
          <div class="reveal">
            <p class="section-kicker">${esc(home.finaleKicker)}</p>
            <h2>${esc(home.finaleTitle)}</h2>
            <p class="lead">${esc(home.finaleBody)}</p>
            <a class="mail-address" href="${getMailto()}">${esc(getContactEmail())}</a>
          </div>
          <div class="plate reveal">
            ${seal(copy.nav.recruitChip)}
            <div>
              <h2>${esc(copy.about.recruitTitle)}</h2>
              <p>${esc(copy.about.recruitBody)}</p>
              <a class="btn btn-primary" href="/apply" data-nav>${esc(copy.nav.apply)}</a>
            </div>
          </div>
        </div>
      </section>
    </article>
  `;
}

function mast(copy, page) {
  return `
    <header class="mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
      <p class="mast-watermark" aria-hidden="true">${esc(page.kicker.split("—").pop().trim())}</p>
    </header>
  `;
}

export function renderAbout(copy) {
  const about = copy.about;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const facts = getProfileFields()
    .map((field) => {
      const label = lang === "en" ? field.en : field.zh;
      const value = lang === "en" ? field.value.en : field.value.zh;
      return `<div class="fact"><b>${esc(label)}</b>${pending(copy, value)}</div>`;
    })
    .join("");
  const principles = about.principles.map((item) => `<li>${esc(item)}</li>`).join("");
  return `
    <article class="page subpage">
      ${mast(copy, about)}
      <section class="section wrap about-layout">
        <div class="glass frame reveal">
          <p class="section-kicker">${esc(about.manifestoKicker)}</p>
          <h2>${esc(about.manifestoTitle)}</h2>
          <p>${esc(about.manifesto)}</p>
          <div class="facts">${facts}</div>
        </div>
        <div class="about-crest reveal" aria-hidden="true">
          ${crest()}
        </div>
      </section>
      <section class="section wrap">
        <div class="section-head">
          <p class="section-kicker">${esc(about.principlesKicker)}</p>
          <h2>${esc(about.principlesTitle)}</h2>
        </div>
        <ol class="principles">${principles}</ol>
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
  const published = getRosterMembers().filter(
    (member) => !member.hidden && (member.name?.[lang] || member.name?.zh || "").trim(),
  );
  const page = published.length ? { ...roster, lead: roster.liveLead } : roster;
  return `
    <article class="page subpage">
      ${mast(copy, page)}
      <section class="section roster-stage">
        <div class="wrap">
          <p class="section-kicker">${esc(roster.stageKicker)}</p>
          <div class="slots">${rosterCards(copy)}</div>
          ${published.length ? "" : note(roster.emptyNote)}
        </div>
      </section>
      <section class="section wrap">
        <div class="plate reveal">
          ${seal(copy.nav.recruitChip)}
          <div>
            <h2>${esc(copy.about.recruitTitle)}</h2>
            <p>${esc(copy.about.recruitBody)}</p>
          </div>
        </div>
      </section>
    </article>
  `;
}

export function renderNews(copy) {
  const news = copy.news;
  return `
    <article class="page subpage">
      ${mast(copy, news)}
      <section class="section wrap">${newsBody(copy, false)}</section>
    </article>
  `;
}

export function renderContact(copy) {
  const contact = copy.contact;
  const sheet = contact.sheet
    .map(
      ([label, value, state]) => `
      <li>
        <span>${esc(label)}</span>
        <strong>${esc(value)}</strong>
        <em>${esc(state)}</em>
      </li>`,
    )
    .join("");
  return `
    <article class="page subpage">
      ${mast(copy, contact)}
      <section class="section wrap contact-layout">
        <a class="mail-plate frame" href="${getMailto()}">
          <span class="section-kicker">${esc(contact.emailLabel)}</span>
          <span class="mail-address">${esc(getContactEmail())}</span>
          <span class="section-note">${esc(contact.only)}</span>
        </a>
        <div class="glass frame">
          <p class="section-kicker">${esc(contact.sheetKicker)}</p>
          <h2>${esc(contact.writeTitle)}</h2>
          <p>${esc(contact.writeBody)}</p>
          <ol class="wire wire-sheet">${sheet}</ol>
        </div>
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

export function renderNotFound(copy) {
  const page = copy.notFound;
  return `
    <article class="page subpage">
      <header class="mast wrap">
        <p class="kicker">${esc(page.kicker)}</p>
        <h1>404</h1>
        <p class="lead">${esc(page.title)}</p>
        <p>${esc(page.lead)}</p>
        <a class="btn btn-primary" href="/" data-nav>${esc(page.back)}</a>
      </header>
    </article>
  `;
}

function fieldLine(label, value, pendingLabel) {
  const text = value?.trim() ? value : pendingLabel;
  const klass = value?.trim() ? "" : " is-pending";
  return `<div class="fact"><b>${esc(label)}</b><span class="fact-value${klass}">${esc(text)}</span></div>`;
}

function catalogPreview(copy) {
  const heroes = getCatalog().heroes.slice(0, 8);
  if (!heroes.length) {
    return `<p class="section-note">${esc(copy.heroes.emptyBody)}</p>`;
  }
  return `<div class="hero-catalog hero-catalog-preview">${heroes.map((hero) => heroCard(hero, copy)).join("")}</div>`;
}

function heroCard(hero, copy) {
  const name = bi(hero.name) || hero.name?.zh || "";
  const role = bi(hero.roleLabel) || "";
  return `
    <article class="hero-card reveal" id="hero-${esc(hero.id)}">
      <a href="/heroes/${esc(hero.id)}" data-nav>
        <span class="hero-portrait">
          <img src="${esc(hero.image || "")}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        </span>
        <span class="hero-meta">
          <strong>${esc(name)}</strong>
          <em>${esc(role)}</em>
          <small>${esc(copy.heroes.skins || copy.nav.skins)}</small>
        </span>
      </a>
    </article>`;
}

export function renderMember(copy, key) {
  const member = findRosterMember(getRosterMembers(), key);
  const player = getPlayer();
  if (!member) return renderNotFound(copy);
  const name = bi(member.name) || copy.player.pending;
  const role = member ? bi(member.role) : "";
  return `
    <article class="page subpage member-page">
      <header class="mast wrap">
        <p class="crumbs"><a href="/roster" data-nav>${esc(copy.nav.roster)}</a><span aria-hidden="true">/</span><span>${esc(copy.player.title)}</span></p>
        <p class="kicker">${esc(copy.player.title)}</p>
        <h1>${esc(name)}</h1>
        <p class="lead">${esc(player ? copy.player.lead : copy.player.emptyBody)}</p>
        ${role ? `<p class="stamp">${esc(role)}</p>` : ""}
        <p class="aov-jumps">
          <a href="/skins" data-nav>${esc(copy.nav.skins)}</a>
          <a href="/items" data-nav>${esc(copy.nav.items)}</a>
          <a href="/modes" data-nav>${esc(copy.nav.modes)}</a>
        </p>
      </header>
      <section class="section wrap">${renderPlayerBody(copy, false)}</section>
    </article>`;
}

export function renderPlayer(copy) {
  const page = copy.player;
  const player = getPlayer();
  return `
    <article class="page subpage">
      ${mast(copy, player ? { ...page, lead: page.lead } : { ...page, lead: page.emptyBody })}
      <section class="section wrap">${renderPlayerBody(copy, false)}</section>
    </article>`;
}

export function renderHeroes(copy) {
  const page = copy.heroes;
  const catalog = getCatalog();
  const filter = getRoleFilter();
  const roles = catalog.roles.length
    ? catalog.roles
    : [];
  const heroes = catalog.heroes.filter((hero) => filter === "all" || hero.role === filter);
  const chips = [`<button type="button" class="chip${filter === "all" ? " is-on" : ""}" data-role-filter="all">${esc(page.all)}</button>`]
    .concat(
      roles.map(
        (role) =>
          `<button type="button" class="chip${filter === role.id ? " is-on" : ""}" data-role-filter="${esc(role.id)}">${esc(bi(role) || role.zh)}</button>`,
      ),
    )
    .join("");
  const body = heroes.length
    ? `<div class="hero-catalog">${heroes.map((hero) => heroCard(hero, copy)).join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  return `
    <article class="page subpage">
      <header class="mast catalog-mast wrap" data-hero>
        <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
        <p class="kicker">${esc(page.kicker)}</p>
        <h1>${esc(page.title)}</h1>
        <p class="lead">${esc(page.lead)}</p>
        <p class="hud-readout"><span>HEROES // ${esc(String(catalog.heroes.length))}</span><span>${esc(page.count)}</span></p>
        <div class="role-filters" role="toolbar" aria-label="${esc(page.title)}">${chips}</div>
      </header>
      <section class="section wrap">
        ${body}
        <p class="section-note">${esc(page.source)}</p>
      </section>
    </article>`;
}

export function renderModes(copy) {
  const page = copy.modes;
  const classic = getCatalog().modes.find((mode) => mode.id === "classic-5v5");
  const modes = [
    {
      id: "ranked",
      name: { zh: "排位賽", en: "Ranked" },
      players: "5V5",
      excerpt: page.rankedNote,
      sourceUrl: classic?.sourceUrl || "",
    },
    ...getCatalog().modes,
  ];
  const cards = modes.length
    ? `<div class="mode-grid">${modes
        .map((mode, index) => {
          const players = mode.players ? `<p class="stamp">${esc(page.players)} ${esc(mode.players)}</p>` : "";
          return `
            <article class="mode-card glass tilt frame reveal" data-tilt>
              <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
              <h2><a href="/modes/${esc(mode.id)}" data-nav>${esc(bi(mode.name) || mode.name?.zh || "")}</a></h2>
              ${players}
              ${mode.excerpt ? `<p>${esc(mode.excerpt)}</p>` : ""}
              <a class="text-link" href="/modes/${esc(mode.id)}" data-nav>${esc(page.detail || copy.heroes.open)}</a>
            </article>`;
        })
        .join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  return `
    <article class="page subpage">
      <header class="mast catalog-mast wrap" data-hero>
        <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
        <p class="kicker">${esc(page.kicker)}</p>
        <h1>${esc(page.title)}</h1>
        <p class="lead">${esc(page.lead)}</p>
        <p class="section-note">${esc(page.source)}</p>
      </header>
      <section class="section wrap">${cards}</section>
    </article>`;
}

function activityCards(copy, compact) {
  const page = copy.activities;
  const filter = getActivityFilter();
  const items = getCatalog().activities.filter((item) => filter === "all" || item.kind === filter);
  const shown = compact ? items.slice(0, 3) : items;
  if (!shown.length) {
    return `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  }
  return `<div class="mode-grid">${shown
    .map((item) => {
      const kind = page[item.kind] || item.kind;
      return `<article class="mode-card glass frame reveal">
        <p class="stamp">${esc(kind)} ${esc(item.dateLabel || item.date || "")}</p>
        <h2>${esc(item.title)}</h2>
        ${item.excerpt ? `<p>${esc(item.excerpt)}</p>` : ""}
        <a class="text-link" href="${esc(item.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(page.open)}</a>
      </article>`;
    })
    .join("")}</div>`;
}

export function renderActivities(copy) {
  const page = copy.activities;
  const filter = getActivityFilter();
  const kinds = ["all", "activity", "announcement", "esports"];
  const chips = kinds
    .map((kind) => `<button type="button" class="chip${filter === kind ? " is-on" : ""}" data-activity-filter="${kind}">${esc(kind === "all" ? page.all : page[kind])}</button>`)
    .join("");
  return `<article class="page subpage">
    ${mast(copy, page)}
    <section class="section wrap">
      <div class="role-filters" role="toolbar">${chips}</div>
      ${activityCards(copy, false)}
      <p class="section-note">${esc(page.source)}</p>
    </section>
  </article>`;
}

function optionList(rows, selected, lang) {
  return rows
    .map((row) => `<option value="${esc(row.id)}"${selected === row.id ? " selected" : ""}>${esc(lang === "en" ? row.en : row.zh)}</option>`)
    .join("");
}

export function renderApply(copy) {
  const page = copy.apply;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const positions = POSITIONS.map((row) => {
    const checked = applyDraft.positions.includes(row.id) ? " checked" : "";
    return `<label class="check"><input type="checkbox" name="positions" value="${esc(row.id)}"${checked}>${esc(lang === "en" ? row.en : row.zh)}</label>`;
  }).join("");
  const marked = (name) => (applyDraft.field === name ? ` aria-invalid="true"` : "");
  const errorText = applyDraft.errorCode == null ? "" : applyErrorText(page, applyDraft.errorCode);
  const mailNote = applyDraft.mailDelayed ? `<p class="form-note">${esc(page.mailDelayed || "")}</p>` : "";
  const banner = applyDraft.status === "sent"
    ? `<div class="plate"><div><h2>${esc(page.sent)}</h2><p>${esc(page.sentBody)}</p>${mailNote}</div></div>`
    : "";
  return `<article class="page subpage">
    ${mast(copy, page)}
    <section class="section wrap apply-layout">
      ${banner}
      <form class="apply-form glass frame" id="apply-form" autocomplete="off">
        <p class="section-note">${esc(page.discord)}</p>
        <label>${esc(page.rank)}
          <select name="rank" required${marked("rank")}>
            <option value="">—</option>
            ${optionList(RANKS, applyDraft.rank, lang)}
          </select>
          <small>${esc(page.rankHint)}</small>
        </label>
        <label>${esc(page.uid)}<input name="uid" inputmode="numeric" pattern="[0-9]*" autocomplete="off" value="${esc(applyDraft.uid)}" required${marked("uid")}><small>${esc(page.uidHint)}</small></label>
        <label>${esc(page.nickname)}<input name="nickname" autocomplete="off" value="${esc(applyDraft.nickname)}" required${marked("nickname")}></label>
        <label>${esc(page.email)}<input name="email" type="email" autocomplete="off" value="${esc(applyDraft.email)}" required${marked("email")}></label>
        <label>${esc(page.gender)}<select name="gender" required${marked("gender")}><option value="">—</option>${optionList(GENDERS, applyDraft.gender, lang)}</select></label>
        <label>${esc(page.age)}<select name="ageBand" required${marked("ageBand")}><option value="">—</option>${optionList(AGE_BANDS, applyDraft.ageBand, lang)}</select></label>
        <label>${esc(page.motivation)}<textarea name="motivation" rows="4" required${marked("motivation")}>${esc(applyDraft.motivation)}</textarea></label>
        <fieldset${marked("positions")}><legend>${esc(page.positions)}</legend><p>${esc(page.positionsHint)}</p><div class="position-grid">${positions}</div></fieldset>
        <label>${esc(page.weekday)}<input name="weekday" value="${esc(applyDraft.weekday)}" required${marked("weekday")}></label>
        <label>${esc(page.holiday)}<input name="holiday" value="${esc(applyDraft.holiday)}" required${marked("holiday")}></label>
        <label>${esc(page.practice)}<input name="practice" value="${esc(applyDraft.practice)}" required${marked("practice")}><small>${esc(page.practiceHint)}</small></label>
        <label class="check"><input type="checkbox" name="conduct"${applyDraft.conduct ? " checked" : ""} required${marked("conduct")}>${esc(page.conduct)}</label>
        <p class="hp" aria-hidden="true"><label>Company<input name="company" tabindex="-1" autocomplete="off"></label></p>
        <button class="btn btn-primary" type="submit">${esc(page.submit)}</button>
        <p class="form-error" data-apply-error${errorText ? ` role="alert" tabindex="-1"` : ""}>${esc(errorText)}</p>
      </form>
    </section>
  </article>`;
}

export function renderPage(name, copy, extra = {}) {
  switch (name) {
    case "home":
      return renderHome(copy);
    case "about":
      return renderAbout(copy);
    case "roster":
      return renderRoster(copy);
    case "player":
      return renderPlayer(copy);
    case "heroes":
      return renderHeroes(copy);
    case "hero":
      return renderHeroDetail(copy, extra.id);
    case "items":
      return renderItems(copy);
    case "modes":
      return renderModes(copy);
    case "activities":
      return renderActivities(copy);
    case "apply":
      return renderApply(copy);
    case "news":
      return renderNews(copy);
    case "contact":
      return renderContact(copy);
    default:
      return renderNotFound(copy);
  }
}
