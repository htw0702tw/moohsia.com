import { CONTACT_EMAIL, MAILTO } from "../shared/brand.js";
import { newsPosts, PLACEHOLDER_SLOTS, profileFields, rosterMembers } from "./content.js";
import { esc } from "./html.js";

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

function pending(copy, value) {
  const text = value?.trim() ? value : copy.about.pending;
  const klass = value?.trim() ? "" : " is-pending";
  return `<span class="fact-value${klass}">${esc(text)}</span>`;
}

function rosterCards(copy) {
  const roster = copy.roster;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const published = rosterMembers.filter((member) => (member.name?.[lang] || member.name?.zh || "").trim());
  if (published.length) {
    return published
      .map((member, index) => {
        const name = (member.name?.[lang] || member.name?.zh || "").trim();
        const role = (member.role?.[lang] || member.role?.zh || "").trim() || roster.rolePending;
        return slotCard(index, name, role, roster.stampLive, false);
      })
      .join("");
  }
  return Array.from({ length: PLACEHOLDER_SLOTS }, (_, index) =>
    slotCard(index, roster.slot, roster.slotMeta, roster.stamp, true),
  ).join("");
}

function slotCard(index, name, meta, stamp, empty) {
  return `
    <article class="slot${empty ? " is-empty" : ""} reveal">
      <div class="slot-top">
        <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
        <p class="stamp">${esc(stamp)}</p>
      </div>
      <div class="silhouette" aria-hidden="true"><span></span></div>
      <h3>${esc(name)}</h3>
      <p>${esc(meta)}</p>
    </article>
  `;
}

function newsBody(copy, compact) {
  const news = copy.news;
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  const posts = newsPosts.filter((post) => (post.title?.[lang] || post.title?.zh || "").trim());
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
      ${compact ? "" : `<p class="section-note">${esc(news.reservedNote)}</p>`}
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
              <a class="btn btn-ghost" href="${MAILTO}">${esc(home.ctaContact)}</a>
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
            <p class="section-note">${esc(home.boardNote)}</p>
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
          <p class="section-note">${esc(home.fixtureNote)}</p>
        </div>
      </section>
      <section class="section roster-stage">
        <div class="wrap">
          <div class="section-head section-head-row">
            <div>
              <p class="section-kicker">${esc(home.rosterKicker)}</p>
              <h2>${esc(home.rosterTitle)}</h2>
              <p class="section-note">${esc(rosterMembers.some((member) => (member.name?.zh || member.name?.en || "").trim()) ? copy.roster.liveLead : home.rosterLead)}</p>
            </div>
            <a class="btn btn-ghost" href="/roster" data-nav>${esc(home.rosterCta)}</a>
          </div>
          <div class="slots">${rosterCards(copy)}</div>
          ${rosterMembers.some((member) => (member.name?.zh || member.name?.en || "").trim()) ? "" : `<p class="section-note">${esc(copy.roster.emptyNote)}</p>`}
        </div>
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
            <a class="mail-address" href="${MAILTO}">${esc(CONTACT_EMAIL)}</a>
          </div>
          <div class="plate reveal">
            ${seal(copy.nav.recruitChip)}
            <div>
              <h2>${esc(copy.about.recruitTitle)}</h2>
              <p>${esc(copy.about.recruitBody)}</p>
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
  const published = rosterMembers.filter((member) => (member.name?.[lang] || member.name?.zh || "").trim());
  const page = published.length ? { ...roster, lead: roster.liveLead } : roster;
  return `
    <article class="page subpage">
      ${mast(copy, page)}
      <section class="section roster-stage">
        <div class="wrap">
          <p class="section-kicker">${esc(roster.stageKicker)}</p>
          <div class="slots">${rosterCards(copy)}</div>
          ${published.length ? "" : `<p class="section-note">${esc(roster.emptyNote)}</p>`}
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
        <a class="mail-plate frame" href="${MAILTO}">
          <span class="section-kicker">${esc(contact.emailLabel)}</span>
          <span class="mail-address">${esc(CONTACT_EMAIL)}</span>
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
    default:
      return renderNotFound(copy);
  }
}
