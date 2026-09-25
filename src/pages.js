import { getCatalog, getRoleFilter } from "./catalog-state.js";
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
        return slotCard(index, name, role, roster.stampLive, false);
      })
      .join("");
  }
  return Array.from({ length: getPlaceholderSlots() }, (_, index) =>
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
          <a class="btn btn-ghost" href="/player" data-nav>${esc(home.playerCta)}</a>
        </div>
        ${playerPanel(copy, true)}
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
        <div class="section-head section-head-row">
          <div>
            <p class="section-kicker">${esc(copy.player.kicker)}</p>
            <h2>${esc(copy.player.title)}</h2>
            <p class="section-note">${esc(getPlayer() ? copy.player.lead : copy.player.emptyBody)}</p>
          </div>
          <a class="btn btn-ghost" href="/player" data-nav>${esc(copy.home.playerCta)}</a>
        </div>
        ${playerPanel(copy, true)}
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

function playerPanel(copy, compact) {
  const page = copy.player;
  const player = getPlayer();
  if (!player) {
    return `
      <div class="console reveal">
        <div class="console-bar">
          <span class="rec"><i></i>PLAYER // DARK</span>
          <span>NO PUBLIC RECORD</span>
        </div>
        <div class="console-body">
          <div class="radar" aria-hidden="true"><span></span></div>
          <div>
            <p class="section-kicker">${esc(page.kicker)}</p>
            <h3>${esc(page.emptyTitle)}</h3>
            <p>${esc(page.emptyBody)}</p>
          </div>
        </div>
      </div>`;
  }
  const stats = [
    [page.played, player.stats?.played],
    [page.wins, player.stats?.wins],
    [page.winRate, player.stats?.winRate],
    [page.kda, player.stats?.kda],
    [page.mvp, player.stats?.mvp],
  ];
  const statHtml = stats
    .map(
      ([label, value]) => `
      <article class="metric reveal">
        <p class="metric-label">${esc(label)}</p>
        <h3>${esc(value?.trim() ? value : page.pending)}</h3>
      </article>`,
    )
    .join("");
  const facts = [
    [page.handleLabel, player.handle],
    [page.nameLabel, bi(player.name)],
    [page.roleLabel, bi(player.role)],
    [page.laneLabel, bi(player.lane)],
    [page.rankLabel, bi(player.rank)],
    [page.seasonLabel, bi(player.season)],
    [page.serverLabel, bi(player.server)],
    [page.titleLabel, bi(player.title)],
    [page.heroesLabel, bi(player.signatureHeroes)],
  ]
    .filter(([, value]) => compact ? value?.trim() : true)
    .map(([label, value]) => fieldLine(label, value || "", page.pending))
    .join("");
  const bio = bi(player.bio);
  const matches = Array.isArray(player.matches) ? player.matches : [];
  const matchHtml = matches.length
    ? `<ol class="fixtures">${matches
        .map((match) => {
          const title = match.label || match.hero || match.mode || page.pending;
          const meta = [match.date, match.mode, match.hero, match.result, match.kda].filter(Boolean).join(" · ");
          const noteText = bi(match.note);
          return `<li class="fixture reveal"><span>${esc(match.date || "—")}</span><strong>${esc(title)}</strong><em>${esc(meta || noteText || page.pending)}</em></li>`;
        })
        .join("")}</ol>`
    : `<p class="section-note">${esc(page.matchesEmpty)}</p>`;
  return `
    <div class="player-layout">
      <div class="glass frame reveal">
        <p class="section-kicker">${esc(page.handleLabel)}</p>
        <h3 class="player-handle">${esc(player.handle || page.pending)}</h3>
        ${bio ? `<p>${esc(bio)}</p>` : ""}
        <div class="facts">${facts}</div>
      </div>
      <div>
        <p class="section-kicker">${esc(page.statsKicker)}</p>
        <div class="metrics-grid player-stats">${statHtml}</div>
        ${compact ? "" : `<div class="section-head"><p class="section-kicker">${esc(page.matchesKicker)}</p></div>${matchHtml}`}
      </div>
    </div>`;
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
    <article class="hero-card reveal">
      <a href="${esc(hero.pageUrl || "#")}" target="_blank" rel="noopener noreferrer">
        <span class="hero-portrait">
          <img src="${esc(hero.image || "")}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        </span>
        <span class="hero-meta">
          <strong>${esc(name)}</strong>
          <em>${esc(role)}</em>
          <small>${esc(copy.heroes.open)}</small>
        </span>
      </a>
    </article>`;
}

export function renderPlayer(copy) {
  const page = copy.player;
  const player = getPlayer();
  return `
    <article class="page subpage">
      ${mast(copy, player ? { ...page, lead: page.lead } : { ...page, lead: page.emptyBody })}
      <section class="section wrap">${playerPanel(copy, false)}</section>
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
  const modes = getCatalog().modes;
  const cards = modes.length
    ? `<div class="mode-grid">${modes
        .map((mode, index) => {
          const players = mode.players ? `<p class="stamp">${esc(page.players)} ${esc(mode.players)}</p>` : "";
          return `
            <article class="mode-card glass tilt frame reveal" data-tilt>
              <p class="index">${esc(String(index + 1).padStart(2, "0"))}</p>
              <h2>${esc(bi(mode.name) || mode.name?.zh || "")}</h2>
              ${players}
              ${mode.excerpt ? `<p>${esc(mode.excerpt)}</p>` : ""}
              <a class="text-link" href="${esc(mode.sourceUrl || "#")}" target="_blank" rel="noopener noreferrer">${esc(copy.heroes.open)}</a>
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

export function renderPage(name, copy) {
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
    case "modes":
      return renderModes(copy);
    case "news":
      return renderNews(copy);
    case "contact":
      return renderContact(copy);
    default:
      return renderNotFound(copy);
  }
}
