import { getPlayer } from "./content.js";
import { esc } from "./html.js";
import { getPlayerView } from "./player-view.js";
import { derivedKda, matchRecency } from "../shared/player.js";

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

function ownerRows(player) {
  const rows = [];
  for (const match of player.matches || []) {
    const boardOwner = (match.board || []).find((row) => row.owner);
    if (boardOwner) rows.push({ match, row: boardOwner });
    else if (match.kills || match.deaths || match.assists || match.gold) rows.push({ match, row: match });
  }
  return rows;
}

function radarSvg(radar, labels) {
  const keys = ["output", "kda", "farm", "teamfight", "survival"];
  const values = keys.map((key) => num(radar?.[key]));
  if (values.some((value) => value == null)) return "";
  const cx = 140;
  const cy = 132;
  const radius = 78;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale];
  };
  const rings = [0.33, 0.66, 1]
    .map((scale) => {
      const line = keys.map((_, index) => point(index, scale).map((n) => n.toFixed(1)).join(",")).join(" ");
      return `<polygon points="${line}" fill="none" stroke="rgba(247,241,234,0.16)"/>`;
    })
    .join("");
  const spokes = keys
    .map((_, index) => {
      const [x, y] = point(index, 1);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="rgba(247,241,234,0.16)"/>`;
    })
    .join("");
  const poly = keys.map((_, index) => point(index, values[index] / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  const texts = keys
    .map((key, index) => {
      const [x, y] = point(index, 1.28);
      return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" fill="#ffb020" font-size="12" font-family="Share Tech Mono, monospace">${esc(labels[key])}</text>`;
    })
    .join("");
  return `<svg class="radar-chart" viewBox="0 0 280 270" role="img">${rings}${spokes}<polygon points="${poly}" fill="rgba(255,176,32,0.35)" stroke="#ffb020" stroke-width="2"/>${texts}</svg>`;
}

function donut(rate) {
  const value = num(rate);
  if (value == null) return "";
  const bounded = Math.max(0, Math.min(100, value));
  const c = 2 * Math.PI * 36;
  const dash = (bounded / 100) * c;
  return `<svg class="donut" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="36" fill="none" stroke="rgba(247,241,234,0.12)" stroke-width="8"/><circle cx="50" cy="50" r="36" fill="none" stroke="#ffb020" stroke-width="8" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>`;
}

function bars(rows) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return `<div class="bar-chart">${rows
    .map((row) => {
      const width = Math.max(4, Math.round((row.value / max) * 100));
      return `<div class="bar-row"><span>${esc(row.label)}</span><i style="width:${width}%"></i><b>${esc(String(row.text))}</b></div>`;
    })
    .join("")}</div>`;
}

function medalGrid(medals, labels) {
  const cells = Object.keys(labels)
    .map((key) => {
      const value = String(medals?.[key] ?? "").trim();
      if (!value) return "";
      return `<article class="medal"><b>${esc(value)}</b><span>${esc(labels[key])}</span></article>`;
    })
    .filter(Boolean)
    .join("");
  return cells ? `<div class="medal-grid">${cells}</div>` : "";
}

function statTrio(page, season) {
  const played = season?.played || "";
  const winRate = season?.winRate || "";
  const mvp = season?.mvp || "";
  if (!played && !winRate && !mvp) return "";
  return `<div class="battle-trio">
    <article><b>${esc(shown(played, page.pending))}</b><span>${esc(page.played)}</span></article>
    <article class="is-rate">${donut(winRate)}<b>${esc(winRate ? `${winRate}%` : page.pending)}</b><span>${esc(page.winRate)}</span></article>
    <article><b>${esc(shown(mvp, page.pending))}</b><span>${esc(page.mvp)}</span></article>
  </div>`;
}

function battlePanel(copy, player) {
  const page = copy.player;
  const seasons = player.seasons || [];
  if (!seasons.length) return `<p class="section-note">${esc(page.noChart)}</p>`;
  const view = getPlayerView();
  const index = Math.min(view.season, seasons.length - 1);
  const season = seasons[index];
  const tabs = seasons
    .map((item, itemIndex) => {
      const label = [item.label, item.mode].filter(Boolean).join(" · ") || page.pending;
      return `<button type="button" class="chip${itemIndex === index ? " is-on" : ""}" data-season="${itemIndex}">${esc(label)}</button>`;
    })
    .join("");
  const radar = radarSvg(season.radar, page.radar);
  const medals = medalGrid(season.medals, page.medals);
  return `<div class="battle-layout">
    <div class="role-filters" role="tablist">${tabs}</div>
    <div class="battle-grid">
      <div class="glass frame">${radar || `<p>${esc(page.noChart)}</p>`}</div>
      <div>
        ${statTrio(page, season)}
        ${medals || `<p class="section-note">${esc(page.pending)}</p>`}
      </div>
    </div>
  </div>`;
}

function chartBlock(copy, player) {
  const page = copy.player;
  const stats = player.stats || {};
  const k = num(stats.kills);
  const d = num(stats.deaths);
  const a = num(stats.assists);
  const parts = [];
  if (k != null || d != null || a != null) {
    parts.push(
      `<div><p class="section-kicker">${esc(page.kda)}</p>${bars([
        { label: page.kills, value: k || 0, text: shown(stats.kills, "—") },
        { label: page.deaths, value: d || 0, text: shown(stats.deaths, "—") },
        { label: page.assists, value: a || 0, text: shown(stats.assists, "—") },
      ])}</div>`,
    );
  }
  const economy = ownerRows(player)
    .map(({ match, row }) => ({ label: match.date || match.hero || match.label || "—", value: num(row.gold), text: row.gold }))
    .filter((row) => row.value != null)
    .slice(0, 8);
  if (economy.length) {
    parts.push(`<div><p class="section-kicker">${esc(page.gold)}</p>${bars(economy)}</div>`);
  }
  const rate = stats.winRate || player.seasons?.[0]?.winRate || "";
  if (num(rate) != null) {
    parts.push(`<div class="win-card">${donut(rate)}<b>${esc(rate)}%</b><span>${esc(page.winRate)}</span></div>`);
  }
  if (!parts.length) return "";
  return `<div class="chart-grid">${parts.join("")}</div>`;
}

function tagged(label, value) {
  if (value === "" || value == null) return "";
  return `${label} ${value}`;
}

function signedText(value) {
  if (value === "" || value == null) return "";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (number > 0) return `+${value}`;
  return String(value);
}

function boardCells(row, tab, page) {
  if (tab === "data") {
    return [row.heroDamage, row.heroDamagePct && `${row.heroDamagePct}%`, row.taken, row.takenPct && `${row.takenPct}%`, row.teamfightRate && `${row.teamfightRate}%`]
      .filter(Boolean)
      .join(" · ");
  }
  if (tab === "output") return [row.heroDamage, tagged(page.tower, row.tower), row.damageRatio].filter(Boolean).join(" · ");
  if (tab === "survival") return [row.taken, tagged(page.healing, row.healing), tagged(page.control, row.control), row.takenPer].filter(Boolean).join(" · ");
  if (tab === "farm") return [row.gold, tagged(page.minions, row.minions), row.gpm].filter(Boolean).join(" · ");
  if (tab === "record") return [row.kills, row.deaths, row.assists, row.score, tagged(page.rankDelta, signedText(row.rankDelta))].filter(Boolean).join(" / ");
  if (tab === "team") return [row.teamfightCount, row.teamfightRate && `${row.teamfightRate}%`, row.heroDamagePct && `${row.heroDamagePct}%`].filter(Boolean).join(" · ");
  const kda = [row.kills, row.deaths, row.assists].filter((part) => part !== "").join(" / ");
  return [kda, row.gold, row.score, tagged(page.minions, row.minions)].filter(Boolean).join(" · ");
}

function badgeLine(match, page) {
  const labels = [];
  if (match.mvp) labels.push("MVP");
  for (const [key, label] of Object.entries(page.medals || {})) {
    if (match.badges?.[key]) labels.push(label);
  }
  return labels.join(" · ");
}

function scoreboard(match, page, tab) {
  const blue = (match.board || []).filter((row) => row.side !== "red");
  const red = (match.board || []).filter((row) => row.side === "red");
  if (!blue.length && !red.length) {
    const kda = [match.kills, match.deaths, match.assists].filter((part) => part !== "").join(" / ");
    const meta = [
      match.mode,
      match.map,
      match.hero,
      match.skin,
      match.result,
      kda || match.kda,
      match.gold,
      match.damage,
      match.taken,
      tagged(page.minions, match.minions),
      tagged(page.healing, match.healing),
      tagged(page.tower, match.tower),
      tagged(page.control, match.control),
      tagged(page.rankDelta, signedText(match.rankDelta)),
      match.lane,
      badgeLine(match, page),
    ]
      .filter(Boolean)
      .join(" · ");
    return `<p class="section-note">${esc(meta || page.pending)}</p>`;
  }
  const side = (rows, tone) =>
    `<ol class="score-side score-${tone}">${rows
      .map((row) => {
        const items = (row.items || []).filter(Boolean);
        return `<li class="${row.owner ? "is-owner" : ""}">
          <strong>${esc(row.hero || page.pending)}${row.mvp ? " · MVP" : ""}</strong>
          <em>${esc(row.ign || "")}</em>
          <span>${esc([row.lane, row.badge].filter(Boolean).join(" · "))}</span>
          <b>${esc(boardCells(row, tab, page) || page.pending)}</b>
          ${items.length ? `<small>${esc(items.join(" · "))}</small>` : ""}
        </li>`;
      })
      .join("")}</ol>`;
  const title = [match.blueScore, match.result || (match.winner === match.ownerSide && match.winner ? "VICTORY" : ""), match.redScore]
    .filter(Boolean)
    .join(" ");
  const subject = [match.hero, match.skin, badgeLine(match, page)].filter(Boolean).join(" · ");
  const when = [match.duration, match.playedAt || match.date].filter(Boolean).join(" · ");
  return `<div class="scoreboard">
    <header><span>${esc(when)}</span><strong>${esc(title || match.label || page.pending)}</strong><span>${esc(subject)}</span></header>
    ${side(blue, "blue")}${side(red, "red")}
  </div>`;
}

function historyPanel(copy, player) {
  const page = copy.player;
  const matches = (player.matches || [])
    .map((match, index) => ({ match, index }))
    .sort((a, b) => matchRecency(b.match) - matchRecency(a.match) || a.index - b.index)
    .map((item) => item.match);
  if (!matches.length) return `<p class="section-note">${esc(page.matchesEmpty)}</p>`;
  const view = getPlayerView();
  const current = matches.find((match) => match.id === view.match) || matches[0];
  const list = matches
    .map((match) => {
      const kda = [match.kills, match.deaths, match.assists].filter((part) => part !== "").join("/");
      const label = [match.date || match.playedAt, match.result, match.hero || match.label, kda].filter(Boolean).join(" · ");
      return `<button type="button" class="chip${match.id === current.id ? " is-on" : ""}" data-match="${esc(match.id)}">${esc(label || page.pending)}</button>`;
    })
    .join("");
  const tabs = Object.entries(page.tabs)
    .map(([id, label]) => `<button type="button" class="chip${view.tab === id ? " is-on" : ""}" data-match-tab="${esc(id)}">${esc(label)}</button>`)
    .join("");
  const highlight = current.highlight?.url
    ? `<figure class="highlight">${current.highlight.kind === "video" ? `<video controls playsinline preload="metadata" src="${esc(current.highlight.url)}"></video>` : `<img src="${esc(current.highlight.url)}" alt="">`}<figcaption>${esc(bi(current.highlight.caption) || page.highlight)}</figcaption></figure>`
    : "";
  return `<div class="history-layout">
    <div class="role-filters">${list}</div>
    <div class="role-filters">${tabs}</div>
    ${scoreboard(current, page, view.tab)}
    ${highlight}
  </div>`;
}

function reputationPanel(copy, player) {
  const page = copy.player;
  const reputation = player.reputation || {};
  const has = reputation.score || reputation.level || reputation.exp || bi(reputation.note) || (reputation.privileges || []).length;
  if (!has) return `<p class="section-note">${esc(page.reputationEmpty)}</p>`;
  const exp = reputation.exp && reputation.expMax ? `${reputation.exp}/${reputation.expMax}` : reputation.exp || "";
  const width = num(reputation.exp) != null && num(reputation.expMax) ? Math.max(0, Math.min(100, (num(reputation.exp) / num(reputation.expMax)) * 100)) : 0;
  const perks = (reputation.privileges || [])
    .map((item) => `<article class="medal${item.unlocked ? "" : " is-locked"}"><b>${esc(item.level || page.pending)}</b><span>${esc(bi(item.name) || page.pending)}</span><small>${esc(bi(item.note))}</small></article>`)
    .join("");
  return `<div class="reputation">
    <p class="reputation-score">${esc(shown(reputation.score, page.pending))}</p>
    <p>${esc(reputation.level ? `Lv.${reputation.level}` : page.pending)} ${esc(exp)}</p>
    ${width ? `<div class="exp-bar"><i style="width:${width.toFixed(1)}%"></i></div>` : ""}
    ${bi(reputation.note) ? `<p>${esc(bi(reputation.note))}</p>` : ""}
    ${perks ? `<div class="medal-grid">${perks}</div>` : ""}
  </div>`;
}

const SKILL_LABEL = { 1: "1", 2: "2", 3: "3", 4: "大招" };
const ARCANA_COLOR = { red: "紅", purple: "紫", green: "綠" };

function buildsPanel(copy, player) {
  const page = copy.player;
  const builds = player.builds || [];
  if (!builds.length) return `<p class="section-note">${esc(page.buildsEmpty)}</p>`;
  return `<div class="mode-grid">${builds
    .map((build) => {
      const skills = (build.skillOrder || []).filter(Boolean).map((token) => SKILL_LABEL[token] || token).join(" → ");
      const items = (build.items || []).filter(Boolean);
      const arcana = (build.arcana || [])
        .filter((row) => row.name || row.count)
        .map((row) => [ARCANA_COLOR[row.color] || "", row.count ? `${row.count}×` : "", row.name].filter(Boolean).join(" "))
        .join(" · ");
      const gear = [items.join(" · "), build.boots, build.enchant].filter(Boolean).join(" · ");
      const shot = build.shot?.url
        ? `<figure class="highlight">${build.shot.kind === "video" ? `<video controls playsinline preload="metadata" src="${esc(build.shot.url)}"></video>` : `<img src="${esc(build.shot.url)}" alt="">`}<figcaption>${esc(bi(build.shot.caption) || page.items)}</figcaption></figure>`
        : "";
      return `<article class="mode-card glass frame build-card">
        <h2>${esc(build.hero || page.pending)}</h2>
        <p>${esc([bi(build.name), build.lane].filter(Boolean).join(" · "))}</p>
        ${skills ? `<p><b>${esc(page.skillOrder)}</b> ${esc(skills)}</p>` : ""}
        ${gear ? `<p><b>${esc(page.items)}</b> ${esc(gear)}</p>` : ""}
        ${arcana ? `<p><b>${esc(page.arcana)}</b> ${esc(arcana)}</p>` : ""}
        ${bi(build.note) ? `<p>${esc(bi(build.note))}</p>` : ""}
        ${shot}
      </article>`;
    })
    .join("")}</div>`;
}

function listPanel(items, renderItem, empty) {
  if (!items.length) return `<p class="section-note">${esc(empty)}</p>`;
  return `<div class="mode-grid">${items.map(renderItem).join("")}</div>`;
}

export function renderPlayerBody(copy, compact) {
  const page = copy.player;
  const player = getPlayer();
  if (!player) {
    return `<div class="console reveal">
      <div class="console-bar"><span class="rec"><i></i>PLAYER // DARK</span><span>NO PUBLIC RECORD</span></div>
      <div class="console-body"><div class="radar" aria-hidden="true"><span></span></div><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div>
    </div>`;
  }
  if (compact) {
    return `<div class="player-layout">
      <div class="glass frame reveal"><p class="section-kicker">${esc(page.handleLabel)}</p><h3 class="player-handle">${esc(player.handle || page.pending)}</h3><p>${esc(bi(player.bio) || page.lead)}</p></div>
      <div>${chartBlock(copy, player) || `<p class="section-note">${esc(page.noChart)}</p>`}</div>
    </div>`;
  }
  const view = getPlayerView();
  const sections = ["battle", "history", "builds", "heroes", "reputation", "honors", "titles"];
  const nav = sections
    .map((id) => `<button type="button" class="${view.section === id ? "is-on" : ""}" data-profile-section="${id}">${esc(page.sections[id])}</button>`)
    .join("");
  let main = "";
  if (view.section === "history") main = historyPanel(copy, player);
  else if (view.section === "builds") main = buildsPanel(copy, player);
  else if (view.section === "heroes") {
    main = listPanel(
      player.heroPool || [],
      (card) => {
        const kda = [card.kills, card.deaths, card.assists].filter((part) => part !== "").join(" / ");
        const ratio = card.kda || derivedKda(card.kills, card.deaths, card.assists);
        return `<article class="mode-card glass frame"><h2>${esc(card.hero)}</h2><p>${esc([card.matches && `${card.matches}`, card.winRate && `${card.winRate}%`, kda && `K/D/A ${kda}`, ratio && `KDA ${ratio}`, card.mvp && `MVP ${card.mvp}`].filter(Boolean).join(" · "))}</p><p>${esc(bi(card.note))}</p></article>`;
      },
      page.heroesEmpty,
    );
  } else if (view.section === "reputation") main = reputationPanel(copy, player);
  else if (view.section === "honors") {
    main = listPanel(
      player.championships || [],
      (item) => `<article class="mode-card glass frame"><h2>${esc(item.title)}</h2><p>${esc(item.season)}</p><p>${esc(bi(item.note))}</p></article>`,
      page.honorsEmpty,
    );
  } else if (view.section === "titles") {
    main = listPanel(
      player.honorTitles || [],
      (item) => `<article class="mode-card glass frame"><h2>${esc(item.name)}</h2><p>${esc(bi(item.note))}</p></article>`,
      page.titlesEmpty,
    );
  } else main = `${battlePanel(copy, player)}${chartBlock(copy, player)}`;
  const facts = [
    [page.handleLabel, player.handle],
    [page.uidLabel, player.uid],
    [page.rankLabel, bi(player.rank)],
    [page.peakLabel, bi(player.peakRank)],
    [page.seasonLabel, bi(player.season)],
    [page.joinLabel, player.joinDate],
  ]
    .filter(([, value]) => value)
    .map(([label, value]) => `<span><b>${esc(label)}</b> ${esc(value)}</span>`)
    .join("");
  const avatar = player.avatar?.url ? `<img class="player-avatar" src="${esc(player.avatar.url)}" alt="">` : "";
  return `<div class="profile-shell">
    <aside class="profile-nav">${nav}</aside>
    <div>
      <div class="player-identity">${avatar}<p class="player-facts">${facts}</p></div>
      ${main}
    </div>
  </div>`;
}
