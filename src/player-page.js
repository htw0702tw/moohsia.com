import { getCatalog } from "./catalog-state.js";
import { getPlayer } from "./content.js";
import { esc } from "./html.js";
import { getPlayerView } from "./player-view.js";
import { resolveHero } from "../shared/aov-assets.js";
import { derivedKda, matchRecency } from "../shared/player.js";
import {
  controlEffect,
  frequentBuilds,
  itemSlots,
  listedSkins,
  percentOf,
  resultWord,
  sumField,
  takenEach,
} from "../shared/match-present.js";

function bi(value) {
  if (!value || typeof value !== "object") return "";
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  return String(value[lang] || value.zh || "").trim();
}

function num(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function shown(value, pending) {
  const text = String(value ?? "").trim();
  return text ? text : pending;
}

function signedText(value) {
  if (value === "" || value == null) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (number > 0) return `+${value}`;
  return String(value);
}

function ownerRow(match) {
  return (match.board || []).find((row) => row.owner) || null;
}

function ownerStats(match) {
  const row = ownerRow(match);
  return {
    kills: row?.kills || match.kills || "",
    deaths: row?.deaths || match.deaths || "",
    assists: row?.assists || match.assists || "",
    gold: row?.gold || match.gold || "",
    jungleGold: row?.jungleGold || match.jungleGold || "",
    lastHits: row?.lastHits || row?.minions || match.lastHits || match.minions || "",
    healing: row?.healing || match.healing || "",
    control: controlEffect(row?.control || match.control || ""),
    tower: row?.tower || match.tower || "",
    damage: row?.heroDamage || match.damage || "",
    taken: row?.taken || match.taken || "",
    damageRatio: row?.damageRatio || match.damageRatio || "",
    takenPer: row?.takenPer || match.takenPer || takenEach(row?.taken || match.taken, row?.deaths || match.deaths),
    teamfightRate: row?.teamfightRate || "",
    score: row?.score || "",
    rankDelta: row?.rankDelta || match.rankDelta || "",
    powerDelta: row?.powerDelta || match.powerDelta || "",
    items: row?.items?.some(Boolean) ? row.items : [],
    mvp: row?.mvp || match.mvp,
    hero: row?.hero || match.hero || "",
  };
}

function heroImage(name) {
  return resolveHero(name, getCatalog().heroes).image || "";
}

function portrait(name, score) {
  const image = heroImage(name);
  const face = image
    ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span>${esc(String(name || "?").slice(0, 1))}</span>`;
  return `<span class="aov-face">${face}${score ? `<b>${esc(score)}</b>` : ""}</span>`;
}

function itemRow(items, link = false) {
  return `<span class="aov-items">${itemSlots(items, getCatalog().items)
    .map((slot) => {
      if (!slot.label) return `<i class="aov-item is-empty" aria-hidden="true"></i>`;
      const icon = slot.src
        ? `<img src="${esc(slot.src)}" alt="${esc(slot.label)}" title="${esc(slot.label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
        : `<em>${esc(slot.label.slice(0, 2))}</em>`;
      if (link && slot.id && slot.label !== `裝備 ${slot.id}`) {
        return `<a class="aov-item" href="/items/${esc(slot.id)}" data-nav>${icon}</a>`;
      }
      return `<i class="aov-item">${icon}</i>`;
    })
    .join("")}</span>`;
}

function kdaIcons(kills, deaths, assists) {
  const sword = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 14 L9 3 L11 5 L4 16 Z" fill="currentColor"/><path d="M9 3 L13 1 L14 4 L11 5 Z" fill="currentColor"/></svg>`;
  const skull = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="7" r="4.2" fill="currentColor"/><rect x="5" y="11" width="6" height="3" rx="1" fill="currentColor"/></svg>`;
  const fist = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8 V5 H5 V8 H7 V4 H9 V8 H11 V5 H13 V9 C13 12 11 14 8 14 S3 12 3 9 Z" fill="currentColor"/></svg>`;
  const cell = (icon, value) => `<span>${icon}<b>${esc(value === "" ? "—" : String(value))}</b></span>`;
  return `<span class="aov-kda">${cell(sword, kills)}${cell(skull, deaths)}${cell(fist, assists)}</span>`;
}

function whenLabel(match) {
  const raw = String(match.playedAt || match.date || "");
  const [day, time = ""] = raw.split(" ");
  const clock = time.slice(0, 5);
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayLabel = day === iso ? "今天" : day ? day.slice(5).replace("-", "/") : "";
  return [dayLabel, clock].filter(Boolean).join(" ");
}

function sideRows(match, side) {
  return (match.board || []).filter((row) => (side === "red" ? row.side === "red" : row.side !== "red"));
}

function teamScore(match, side) {
  const stored = side === "red" ? match.redScore : match.blueScore;
  if (stored) return stored;
  const total = sumField(sideRows(match, side), "kills");
  return total ? String(total) : "";
}

function radarSvg(radar, labels) {
  const keys = ["output", "kda", "farm", "teamfight", "survival"];
  const values = keys.map((key) => num(radar?.[key]));
  if (values.some((value) => value == null)) return "";
  const cx = 150;
  const cy = 142;
  const radius = 86;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale];
  };
  const rings = [0.35, 0.68, 1]
    .map((scale) => `<polygon points="${keys.map((_, index) => point(index, scale).map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="rgba(214,196,255,0.28)"/>`)
    .join("");
  const poly = keys.map((_, index) => point(index, values[index] / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  const texts = keys
    .map((key, index) => {
      const [x, y] = point(index, 1.24);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="#f6d37a" font-size="13">${esc(labels[key])}</text>`;
    })
    .join("");
  return `<svg class="aov-radar" viewBox="0 0 300 290" role="img">${rings}<polygon points="${poly}" fill="rgba(246,211,122,0.35)" stroke="#f6d37a" stroke-width="2"/>${texts}</svg>`;
}

function pctBar(label, value, pct, tone) {
  const width = Math.max(0, Math.min(100, Number(pct) || 0));
  return `<div class="aov-metric">
    <span>${esc(label)}</span>
    <b>${esc(value === "" || value == null ? "—" : String(value))}</b>
    <i class="aov-bar ${tone}"><em style="width:${width}%"></em></i>
    <small>${pct ? `${esc(String(pct))}%` : ""}</small>
  </div>`;
}

function metricTrio(page, row, side, match, tab) {
  const tone = side === "red" ? "is-red" : "is-blue";
  const allies = sideRows(match, side);
  const farm = row.lastHits || row.minions || "";
  const specs = {
    data: [
      [page.kills, row.kills, percentOf(row.kills, sumField(allies, "kills"))],
      [page.deaths, row.deaths, percentOf(row.deaths, sumField(allies, "deaths"))],
      [page.assists, row.assists, percentOf(row.assists, sumField(allies, "assists"))],
    ],
    output: [
      [page.heroDamage, row.heroDamage, row.heroDamagePct || percentOf(row.heroDamage, sumField(allies, "heroDamage"))],
      [page.damageRatio, row.damageRatio, ""],
      [page.teamfight, row.teamfightRate, row.teamfightRate],
    ],
    survival: [
      [page.takenLabel, row.taken, row.takenPct || percentOf(row.taken, sumField(allies, "taken"))],
      [page.takenPer, row.takenPer || takenEach(row.taken, row.deaths), ""],
    ],
    farm: [
      [page.goldTotal, row.gold, percentOf(row.gold, sumField(allies, "gold"))],
      [page.jungle, row.jungleGold, percentOf(row.jungleGold, sumField(allies, "jungleGold"))],
      [page.lastHits, farm, percentOf(farm, sumField(allies, "lastHits"))],
    ],
    record: [
      [page.score, row.score, ""],
      [page.rankDelta, signedText(row.rankDelta), ""],
      [page.power, signedText(row.powerDelta), ""],
    ],
    team: [
      [page.control, controlEffect(row.control), percentOf(controlEffect(row.control), allies.reduce((sum, item) => sum + (Number(controlEffect(item.control)) || 0), 0))],
      [page.healing, row.healing, percentOf(row.healing, sumField(allies, "healing"))],
      [page.tower, row.tower, percentOf(row.tower, sumField(allies, "tower"))],
    ],
  };
  return `<div class="aov-metrics">${(specs[tab] || specs.data).map(([label, value, pct]) => pctBar(label, value, pct, tone)).join("")}</div>`;
}

function boardLine(match, page, tab) {
  const blue = sideRows(match, "blue");
  const red = sideRows(match, "red");
  if (!blue.length && !red.length) {
    const self = ownerStats(match);
    return `<p class="section-note">${esc(
      [resultWord(match.result), self.hero, `${self.kills}/${self.deaths}/${self.assists}`, `${page.lastHits} ${self.lastHits}`, `${page.healing} ${self.healing}`]
        .filter((part) => part && !part.endsWith(" "))
        .join(" · ") || page.pending,
    )}</p>`;
  }
  const side = (rows, tone) =>
    `<ol class="aov-side is-${tone}">${rows
      .map((row) => {
        const name = row.ign || row.hero || page.pending;
        return `<li class="${row.owner ? "is-owner" : ""}">
          ${portrait(row.hero, row.score)}
          <div class="aov-who"><strong>${esc(name)}${row.mvp ? `<em>MVP</em>` : ""}</strong><span>${esc([row.kills, row.deaths, row.assists].filter((part) => part !== "").join(" / ") || "—")}</span><small>${esc(row.gold || "")}</small></div>
          ${itemRow(row.items, true)}
          ${metricTrio(page, row, tone, match, tab)}
        </li>`;
      })
      .join("")}</ol>`;
  const word = resultWord(match.result);
  const title = [teamScore(match, "blue"), word, teamScore(match, "red")].filter(Boolean).join(" ");
  return `<div class="aov-board">
    <header><span>${esc([match.duration, match.playedAt || match.date].filter(Boolean).join(" · "))}</span><strong class="${word === "VICTORY" ? "is-win" : "is-loss"}">${esc(title || page.pending)}</strong><span>${esc(match.mode || "")}</span></header>
    <div class="aov-versus">${side(blue, "blue")}${side(red, "red")}</div>
  </div>`;
}

function sortedMatches(player) {
  return (player.matches || [])
    .map((match, index) => ({ match, index }))
    .sort((a, b) => matchRecency(b.match) - matchRecency(a.match) || a.index - b.index)
    .map((item) => item.match);
}

function historyList(copy, player, limit = 0) {
  const page = copy.player;
  const view = getPlayerView();
  if (view.queue === "magic") return `<p class="aov-empty">${esc(page.magicEmpty)}</p>`;
  const matches = limit > 0 ? sortedMatches(player).slice(0, limit) : sortedMatches(player);
  if (!matches.length) return `<p class="aov-empty">${esc(page.matchesEmpty)}</p>`;
  const tabs = ["data", "output", "survival", "farm", "record", "team"]
    .map((id) => `<button type="button" class="${view.tab === id ? "is-on" : ""}" data-match-tab="${id}">${esc(page.tabs[id])}</button>`)
    .join("");
  return `<div class="aov-history">
    <div class="aov-cols" aria-hidden="true"><span>${esc(page.columns.hero)}</span><span>${esc(page.columns.result)}</span><span>${esc(page.columns.points)}</span><span>${esc(page.columns.items)}</span><span>${esc(page.columns.mode)}</span><span></span></div>
    ${matches
      .map((match) => {
        const self = ownerStats(match);
        const word = resultWord(match.result);
        const open = view.match === match.id;
        const lane = self.hero && match.lane ? match.lane : "";
        return `<article class="aov-row ${open ? "is-open" : ""}">
          <button type="button" class="aov-row-hit" data-match="${esc(match.id)}" aria-expanded="${open ? "true" : "false"}">
            <span class="aov-hero">${portrait(self.hero, self.score)}${self.mvp ? `<i class="aov-mvp">MVP</i>` : ""}<b>${esc(self.hero || page.pending)}</b>${lane ? `<small>${esc(lane)}</small>` : ""}</span>
            <span class="aov-result ${word === "VICTORY" ? "is-win" : "is-loss"}">${esc(word || page.pending)}</span>
            <span class="aov-points"><b>${esc(signedText(self.rankDelta) || "—")}</b>${kdaIcons(self.kills, self.deaths, self.assists)}</span>
            ${itemRow(self.items)}
            <span class="aov-when"><b>${esc(match.mode || page.pending)}</b><small>${esc(whenLabel(match))}</small></span>
            <span class="aov-chevron" aria-hidden="true">›</span>
          </button>
          ${open ? `<div class="aov-detail">${boardLine(match, page, view.tab)}<div class="aov-tabs">${tabs}</div></div>` : ""}
        </article>`;
      })
      .join("")}
  </div>`;
}

function heroCards(copy, player) {
  const page = copy.player;
  const cards = player.heroPool || [];
  if (!cards.length) return `<p class="aov-empty">${esc(page.heroesEmpty)}</p>`;
  const grid = `<div class="aov-hero-grid">${cards
    .map((card) => {
      const image = heroImage(card.hero);
      const splash = image ? `<img src="${esc(image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : "";
      const hero = getCatalog().heroes.find((item) => item.name?.zh === card.hero || item.name?.en === card.hero);
      const heading = hero?.id
        ? `<a href="/heroes/${esc(hero.id)}" data-nav>${esc(card.hero)}</a>`
        : esc(card.hero);
      return `<article class="aov-hero-card">
        <div class="aov-splash">${splash}</div>
        <h3>${heading}</h3>
        <dl>
          <div><dt>${esc(page.played)}</dt><dd>${esc(shown(card.matches, page.pending))}</dd></div>
          <div><dt>${esc(page.winRate)}</dt><dd>${esc(card.winRate ? `${card.winRate}%` : page.pending)}</dd></div>
          <div><dt>${esc(page.power)}</dt><dd>${esc(shown(card.power, page.pending))}</dd></div>
        </dl>
      </article>`;
    })
    .join("")}</div>`;
  const table = `<div class="aov-table-wrap"><h3>${esc(page.heroTable)}</h3><table class="aov-table"><thead><tr><th>${esc(page.columns.hero)}</th><th>${esc(page.played)}</th><th>${esc(page.winRate)}</th><th>${esc(page.power)}</th><th>K / D / A</th></tr></thead><tbody>${cards
    .map((card) => {
      const kda = [card.kills, card.deaths, card.assists].filter((part) => part !== "").join(" / ");
      return `<tr><td>${esc(card.hero)}</td><td>${esc(card.matches || "—")}</td><td>${esc(card.winRate ? `${card.winRate}%` : "—")}</td><td>${esc(card.power || "—")}</td><td>${esc(kda || card.kda || "—")}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
  const builds = frequentBuilds(player.matches, 6, getCatalog().items);
  const buildBlock = builds.length
    ? `<section class="aov-builds"><h3>${esc(page.buildsTitle)}</h3><p class="section-note"><a href="/items" data-nav>${esc(page.items)}</a></p><div class="aov-build-grid">${builds
        .map(
          (build) => `<article><header><b>${esc(build.hero || page.pending)}</b><span>×${build.count}</span></header>${itemRow(build.items.map((slot) => slot.label), true)}</article>`,
        )
        .join("")}</div></section>`
    : `<p class="aov-empty">${esc(page.buildsEmpty)}</p>`;
  const skins = listedSkins(player);
  const skinBlock = `<section class="aov-skins"><h3>${esc(page.skinsTitle)}</h3><p class="section-note"><a href="/skins" data-nav>${esc(page.skinsTitle)}</a></p>${
    skins.length
      ? `<ul>${skins.map((skin) => `<li><b>${esc(skin.hero || page.pending)}</b><span>${esc(skin.name)}</span></li>`).join("")}</ul>`
      : `<p class="aov-empty">${esc(page.skinsEmpty)}</p>`
  }</section>`;
  return `${grid}${table}${buildBlock}${skinBlock}`;
}

function matchSummary(copy, player) {
  const page = copy.player;
  const matches = player.matches || [];
  const wins = matches.filter((match) => resultWord(match.result) === "VICTORY").length;
  const mvp = matches.filter((match) => match.mvp || (match.board || []).some((row) => row.owner && row.mvp)).length;
  const rate = matches.length ? `${Math.round((wins / matches.length) * 1000) / 10}%` : page.pending;
  return `<div class="aov-trio">
    <article><b>${esc(String(matches.length || page.pending))}</b><span>${esc(page.played)}</span></article>
    <article><b>${esc(rate)}</b><span>${esc(page.winRate)}</span></article>
    <article><b>${esc(String(mvp))}</b><span>MVP</span></article>
  </div>`;
}

function battlePanel(copy, player) {
  const page = copy.player;
  const seasons = player.seasons || [];
  const matches = `<section class="aov-battle-matches"><h3>${esc(page.sections.history)}</h3>${historyList(copy, player)}</section>`;
  if (!seasons.length) {
    return `<div class="aov-battle">
      <p class="section-note">${esc(page.derivedNote)}</p>
      ${matchSummary(copy, player)}
      <p class="aov-empty">${esc(page.noChart)}</p>
      ${matches}
    </div>`;
  }
  const view = getPlayerView();
  const index = Math.min(view.season, seasons.length - 1);
  const season = seasons[index];
  const tabs = seasons
    .map((item, itemIndex) => `<button type="button" class="${itemIndex === index ? "is-on" : ""}" data-season="${itemIndex}">${esc([item.label, item.mode].filter(Boolean).join(" · ") || page.pending)}</button>`)
    .join("");
  const medals = Object.entries(page.medals)
    .map(([key, label]) => {
      const value = String(season.medals?.[key] ?? "").trim();
      if (!value) return "";
      return `<article><b>${esc(value)}</b><span>${esc(label)}</span></article>`;
    })
    .filter(Boolean)
    .join("");
  const rate = season.winRate ? `${season.winRate}%` : page.pending;
  return `<div class="aov-battle">
    <div class="aov-tabs">${tabs}</div>
    <div class="aov-battle-grid">
      <div class="aov-panel">${radarSvg(season.radar, page.radar) || `<p class="aov-empty">${esc(page.noChart)}</p>`}</div>
      <div>
        <div class="aov-trio"><article><b>${esc(shown(season.played, page.pending))}</b><span>${esc(page.played)}</span></article><article><b>${esc(rate)}</b><span>${esc(page.winRate)}</span></article><article><b>${esc(shown(season.mvp, page.pending))}</b><span>MVP</span></article></div>
        ${medals ? `<div class="aov-medals">${medals}</div>` : `<p class="aov-empty">${esc(page.pending)}</p>`}
      </div>
    </div>
    ${matches}
  </div>`;
}

function reputationPanel(copy, player) {
  const page = copy.player;
  const reputation = player.reputation || {};
  const has = reputation.score || reputation.level || bi(reputation.note);
  if (!has) return `<p class="aov-empty">${esc(page.reputationEmpty)}</p>`;
  return `<div class="aov-panel"><p class="aov-reputation">${esc(reputation.score || page.pending)}</p><p>${esc(bi(reputation.note))}</p></div>`;
}

function listCards(items, renderItem, empty) {
  if (!items.length) return `<p class="aov-empty">${esc(empty)}</p>`;
  return `<div class="aov-build-grid">${items.map(renderItem).join("")}</div>`;
}

function queueTabs(page, view) {
  return `<div class="aov-queue">
    <button type="button" class="${view.queue === "classic" ? "is-on" : ""}" data-queue="classic">${esc(page.classic)}</button>
    <button type="button" class="${view.queue === "magic" ? "is-on" : ""}" data-queue="magic">${esc(page.magic)}</button>
  </div>`;
}

export function renderPlayerBody(copy, compact) {
  const page = copy.player;
  const player = getPlayer();
  if (!player) {
    return `<div class="aov-shell"><p class="aov-empty">${esc(page.emptyTitle)}</p><p>${esc(page.emptyBody)}</p></div>`;
  }
  const view = getPlayerView();
  if (compact) {
    return `<div class="aov-shell is-compact">${historyList(copy, player, 3)}</div>`;
  }
  const sections = ["heroes", "history", "battle", "reputation", "honors", "titles", "bonds"];
  const nav = sections
    .map((id) => `<button type="button" class="${view.section === id ? "is-on" : ""}" data-profile-section="${id}">${esc(page.sections[id])}</button>`)
    .join("");
  let main = "";
  if (view.section === "history") main = `${queueTabs(page, view)}${historyList(copy, player)}`;
  else if (view.section === "heroes") main = heroCards(copy, player);
  else if (view.section === "reputation") main = reputationPanel(copy, player);
  else if (view.section === "honors") {
    main = listCards(
      player.championships || [],
      (item) => `<article><header><b>${esc(item.title)}</b></header><p>${esc(item.season || "")}</p><p>${esc(bi(item.note))}</p></article>`,
      page.honorsEmpty,
    );
  } else if (view.section === "titles") {
    main = listCards(
      player.honorTitles || [],
      (item) => `<article><header><b>${esc(item.name)}</b></header><p>${esc(bi(item.note))}</p></article>`,
      page.titlesEmpty,
    );
  } else if (view.section === "bonds") main = `<p class="aov-empty">${esc(page.bondsEmpty)}</p>`;
  else main = battlePanel(copy, player);
  const facts = [player.handle, bi(player.rank), bi(player.season), player.uid && `UID ${player.uid}`].filter(Boolean);
  return `<div class="aov-shell">
    <header class="aov-identity"><p>${esc(page.title)}</p><h2>${esc(player.handle || page.pending)}</h2><span>${esc(facts.join(" · "))}</span></header>
    <div class="aov-layout">
      <aside class="aov-nav">${nav}</aside>
      <div class="aov-main">${main}</div>
    </div>
  </div>`;
}

export function derivedPreviewKda(card) {
  return card.kda || derivedKda(card.kills, card.deaths, card.assists);
}
