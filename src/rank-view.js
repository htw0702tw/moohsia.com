import { esc } from "./html.js";
import { renderGuildStarsBoard } from "./guild-view.js";
import { getPlayer, getRosterMembers } from "./content.js";
import {
  APEX_RULES,
  APEX_UNKNOWN,
  LADDER,
  LEGEND_PATH_NODES,
  POINTS_PER_STAR,
  RANKED_MODES,
  buildRankHistory,
  compareRanks,
  formatRank,
  rankedMode,
  reachedLegend,
  starIndex,
  tierById,
} from "../shared/ranks.js";

function lang() {
  return document.documentElement.lang === "en" ? "en" : "zh";
}

function bi(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  const key = lang();
  return String(value[key] || value.zh || value.en || "").trim();
}

function pageCopy(copy) {
  return copy.ranks || {};
}

export function emblemImg(tierId, label) {
  const tier = tierById(tierId);
  if (!tier) return "";
  const name = label || (lang() === "en" ? tier.en : tier.zh);
  return `<span class="rank-emblem"><img src="${esc(tier.emblem)}" alt="${esc(name)}" width="96" height="96" decoding="async"><b>${esc(name.slice(0, 1))}</b></span>`;
}

function starRow(filled, cap) {
  if (!cap || filled === "" || filled == null) return "";
  const count = Number(filled);
  if (!Number.isInteger(count)) return "";
  const stars = Array.from({ length: cap }, (_, index) => `<i class="${index < count ? "is-on" : ""}"></i>`).join("");
  return `<span class="rank-stars" aria-label="${esc(`${count}/${cap}`)}">${stars}</span>`;
}

function pointBar(card, text) {
  if (card.points === "" || card.points == null) return "";
  const width = Math.max(0, Math.min(100, Number(card.points)));
  return `<div class="rank-pointbar"><span style="width:${width}%"></span><em>${esc(card.points)}/${POINTS_PER_STAR}</em><small>${esc(text.points)}</small></div>`;
}

export function renderRankStage(copy, player) {
  const text = pageCopy(copy);
  const card = player?.rankCard || {};
  const history = buildRankHistory(player?.matches || [], card);
  const tier = tierById(card.tier);
  if (!tier && history.code === "empty" && !(player?.weeklyReports || []).length) return "";
  const title = tier ? formatRank(card, lang()) : text.empty;
  const cap = tier?.kind === "division" ? tier.stars : 0;
  const meta = [
    card.season ? `<p>${esc(card.season)}</p>` : "",
    card.updatedAt ? `<p>${esc(text.updated)} ${esc(card.updatedAt)}</p>` : tier ? `<p>${esc(text.updatedMissing)}</p>` : "",
    card.seasonChallenge ? `<p>${esc(text.challenge)} ${esc(card.seasonChallenge)}</p>` : "",
    card.queueReadout ? `<p>${esc(text.readout)} ${esc(card.queueReadout)}${card.queueReadoutMax ? `/${esc(card.queueReadoutMax)}` : ""}</p><p class="section-note">${esc(text.readoutNote)}</p>` : "",
  ].join("");
  const chart = history.code === "empty" ? `<p class="aov-empty">${esc(text.notes.empty)}</p>` : renderHistory(text, history);
  return `<section class="rank-stage">
    <article class="rank-card">
      <div>
        ${tier ? starRow(card.stars, cap) : ""}
        ${tier ? emblemImg(tier.id, lang() === "en" ? tier.en : tier.zh) : ""}
        ${tier ? pointBar(card, text) : ""}
        <h3>${esc(title)}</h3>
      </div>
      <div class="rank-card-meta">
        ${meta}
        <p class="section-note">${esc(text.pointsHint)}</p>
        <p class="aov-jumps"><a href="/ranks" data-nav>${esc(text.ladder)}</a><a href="/ranks#rewards" data-nav>${esc(text.rewards)}</a><a href="/modes/apex" data-nav>${esc(text.modes)}</a></p>
      </div>
    </article>
    <article class="rank-history">
      <h3>${esc(text.history)}</h3>
      <p class="section-note">${esc(text.historyLead)}</p>
      ${chart}
    </article>
    ${weeklyBlock(text, player)}
  </section>`;
}

function renderHistory(text, history) {
  const note = text.notes?.[history.code] || text.notes?.empty || "";
  const line = history.series.length >= 2 ? lineChart(history, text) : "";
  const bars = history.bars.length ? barChart(history.bars, text) : "";
  return `${line}${bars}<p class="section-note">${esc(note)}</p>`;
}

function lineChart(history, text) {
  const width = 640;
  const height = 260;
  const pad = { l: 18, r: 118, t: 16, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const values = history.series.map((point) => point.y).concat(history.boundaries.map((line) => line.y));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 0.8);
  const xAt = (index) => pad.l + (history.series.length === 1 ? innerW / 2 : (index / (history.series.length - 1)) * innerW);
  const yAt = (value) => pad.t + (1 - (value - min) / span) * innerH;
  const poly = history.series.map((point, index) => `${xAt(index).toFixed(1)},${yAt(point.y).toFixed(1)}`).join(" ");
  const used = [];
  const lines = history.boundaries
    .map((line) => {
      const y = yAt(line.y);
      if (used.some((prev) => Math.abs(prev - y) < 16)) return "";
      used.push(y);
      const tier = tierById(line.tierId);
      return `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${pad.l + innerW}" y2="${y.toFixed(1)}" class="rank-bound"/>
        <image href="${esc(tier.emblem)}" x="${pad.l + innerW + 8}" y="${(y - 9).toFixed(1)}" width="18" height="18"/>
        <text x="${pad.l + innerW + 30}" y="${(y + 4).toFixed(1)}">${esc(line.label)}</text>`;
    })
    .join("");
  const dots = history.series
    .map((point, index) => {
      const label = point.kind === "now" ? text.now : point.at.slice(5, 10);
      return `<circle cx="${xAt(index).toFixed(1)}" cy="${yAt(point.y).toFixed(1)}" r="3.5"/>
        <text class="rank-tick" x="${xAt(index).toFixed(1)}" y="${height - 8}" text-anchor="middle">${esc(label)}</text>`;
    })
    .join("");
  const summary = history.series.map((point) => `${point.at || text.now} ${formatRank(point)}`).join(", ");
  return `<svg class="rank-line" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(summary)}">
    ${lines}
    <polyline points="${poly}" />
    ${dots}
  </svg>`;
}

function barChart(bars, text) {
  const max = Math.max(...bars.map((row) => Math.abs(row.delta)), 1);
  const items = bars
    .map((row) => {
      const height = Math.max(8, Math.round((Math.abs(row.delta) / max) * 72));
      const sign = row.delta > 0 ? `+${row.delta}` : String(row.delta);
      return `<li class="${row.delta >= 0 ? "is-up" : "is-down"}"><b style="height:${height}px"></b><span>${esc(sign)}</span><small>${esc(row.at.slice(5, 10))}</small></li>`;
    })
    .join("");
  return `<div class="rank-bars"><h4>${esc(text.bars)}</h4><p class="section-note">${esc(text.barsNote)}</p><ol>${items}</ol></div>`;
}

function weeklyLine(label, value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return `<li><span>${esc(label)}</span>${esc(text)}</li>`;
}

function weeklyBlock(text, player) {
  const reports = player?.weeklyReports || [];
  if (!reports.length) return "";
  const cards = reports
    .map((report) => {
      const lines = [
        weeklyLine(text.weekSpecialty, report.specialty && report.specialtyGames ? `${report.specialty} · ${report.specialtyGames}` : report.specialty),
        weeklyLine(text.weekRanked, report.rankedGames ? `${report.rankedGames} / ${report.rankedWins || "—"}` : ""),
        weeklyLine(text.weekUp, report.starDelta),
        weeklyLine(text.weekStars, report.starsEarned ? `${report.starsEarned}（${report.starsCasual || "—"} / ${report.starsRanked || "—"}）` : ""),
        weeklyLine(text.weekSpan, report.fromLabel && report.toLabel ? `${report.fromLabel} → ${report.toLabel}` : ""),
        weeklyLine(text.weekPower, report.powerFrom && report.powerTo ? `${report.powerFrom} → ${report.powerTo}` : ""),
        weeklyLine(text.weekMastery, report.hero && report.mastery ? `${report.hero} ${report.mastery}` : ""),
        weeklyLine(text.weekHeroRate, report.heroGames && report.heroWinRate ? `${report.heroGames} · ${report.heroWinRate}%` : ""),
        weeklyLine(text.weekBest, report.bestLine),
        weeklyLine(text.weekMvp, report.mvp),
        weeklyLine(text.weekMedals, report.goldMedals || report.silverMedals ? `${report.goldMedals || "—"} / ${report.silverMedals || "—"}` : ""),
        weeklyLine(
          text.weekWin,
          report.winRate ? `${report.winRate}%${report.winRateBeat ? ` · ${report.winRateBeat}%` : ""}${report.winRateGrade ? ` ${report.winRateGrade}` : ""}` : "",
        ),
        weeklyLine(text.weekKda, report.kda ? `${report.kda}${report.kdaBeat ? ` · ${report.kdaBeat}%` : ""}${report.kdaGrade ? ` ${report.kdaGrade}` : ""}` : ""),
      ].join("");
      const when = [report.start, report.end].filter(Boolean).join(" – ");
      const heading = report.title ? `${report.title}${when ? ` · ${when}` : ""}` : when || text.week;
      return `<article><header><b>${esc(heading)}</b></header><ul>${lines}</ul></article>`;
    })
    .join("");
  return `<div class="rank-weeks"><h3>${esc(text.week)}</h3><div class="rank-week-grid">${cards}</div></div>`;
}

function ladderCard(tier, text) {
  const name = lang() === "en" ? tier.en : tier.zh;
  const division = tier.kind === "division" ? tier.divisions.join(" / ") : tier.maxStars == null ? `${tier.minStars}+` : `${tier.minStars}–${tier.maxStars}`;
  const stars = tier.kind === "division" ? `${tier.stars}` : "";
  const population = lang() === "en" ? tier.populationEn : tier.population;
  return `<article class="rank-tier">
    ${emblemImg(tier.id, name)}
    <div>
      <h3>${esc(name)}</h3>
      <p>${esc(division)}${stars ? ` · ${esc(stars)}★` : ""}</p>
      <p>${esc(population)}</p>
      ${tier.note ? `<p class="section-note">${esc(tier.note)}</p>` : ""}
    </div>
  </article>`;
}

function rewardBlocks(text, player) {
  const card = player?.rankCard;
  const path = !card?.tier ? text.pathUnknown : reachedLegend(card) ? text.pathOpen : text.pathLocked;
  const nodes = LEGEND_PATH_NODES.map((node) => `<li><b>${node}</b><span>${esc(text.unknown)}</span></li>`).join("");
  const treasure = player?.yearTreasure;
  const knownTreasure = Boolean(treasure?.year || treasure?.reward);
  const active = (treasure?.seasons || []).filter((row) => row.active).length;
  const treasureState = !knownTreasure ? text.empty : active >= 4 ? text.treasureReady : active > 0 ? `${text.treasureSome} ${active}/4` : text.treasureOff;
  const gems = (treasure?.seasons || [])
    .map((row) => `<li class="${row.active ? "is-on" : ""}"><b>${esc(row.id)}</b><span>${esc(row.active ? text.treasureSome : text.treasureOff)}</span></li>`)
    .join("");
  return `<section id="rewards" class="rank-block">
    <h2>${esc(text.rewards)}</h2>
    <article class="rank-reward">
      <h3>傳說之路</h3>
      <p>${esc(path)}</p>
      <p>10 / 20 / 30 / 40 / 50</p>
      <ol class="rank-nodes">${nodes}</ol>
      <p>專屬邀請彈窗造型</p>
      <p class="section-note">${esc(text.unknown)}：其餘節點的獎勵名稱。畫面上看得到的是專屬邀請彈窗造型，尚未獲得。</p>
    </article>
    <article class="rank-reward">
      <h3>賽年寶藏</h3>
      <p>${esc(treasure?.year ? `${treasure.year}` : "")} ${esc(treasureState)}</p>
      ${treasure?.reward ? `<p>${esc(treasure.reward)}</p>` : `<p>${esc(text.unknown)}</p>`}
      <ol class="rank-nodes">${gems}</ol>
      <p class="section-note">2023 年官方公告寫過漏季可以用更高段位追溯。2026 的賽年寶藏畫面沒有再寫這條，這裡不把它當成現在的規則。</p>
    </article>
  </section>`;
}

function boardBlocks(text, player, members, copy) {
  const board = player?.powerBoard;
  const hasPower = Boolean(board?.hero || board?.power || board?.bestPower || board?.rows?.length);
  const powerRows = (board?.rows || [])
    .map((row) => {
      const place = row.place ? row.place : text.unranked;
      const gap = row.gap ? `${text.gap} ${row.gap}` : "";
      return `<li><b>${esc(row.scope || "—")}</b><span>${esc(place)}</span><small>${esc(gap)}</small></li>`;
    })
    .join("");
  const ranked = [];
  for (const member of members || []) {
    if (member.hidden) continue;
    const names = [member.name?.zh, member.name?.en, member.id].map((value) => String(value || "").trim().toLowerCase());
    const handle = String(player?.handle || "").trim().toLowerCase();
    const own = handle && names.includes(handle) && player?.rankCard?.tier;
    const position = own
      ? player.rankCard
      : member.rankTier
        ? { tier: member.rankTier, division: member.rankDivision, stars: member.rankStars, points: 0 }
        : null;
    if (!position?.tier || starIndex({ ...position, points: Number(position.points) || 0 }) == null) continue;
    ranked.push({ name: bi(member.name) || member.id, position });
  }
  ranked.sort((a, b) => compareRanks(a.position, b.position));
  const guild = ranked.length
    ? `<ol class="rank-guild">${ranked.map((row, index) => `<li><b>${index + 1}</b>${emblemImg(row.position.tier, "")}<span>${esc(row.name)}</span><em>${esc(formatRank(row.position, lang()))}</em></li>`).join("")}</ol>`
    : `<p class="aov-empty">${esc(text.empty)}</p>`;
  return `<section id="boards" class="rank-block">
    <h2>${esc(text.boards)}</h2>
    <article>
      <h3>${esc(text.power)}</h3>
      <p class="section-note">${esc(text.powerNote)}</p>
      ${
        hasPower
          ? `<p>${esc(board.area || "")}</p><p>${esc(board.hero || "")} ${board.power ? `${esc(text.currentPower)} ${esc(board.power)}` : ""}</p>${board.bestPower ? `<p>${esc(text.best)} ${esc(board.bestPower)}</p>` : ""}${board.updatedAt ? `<p>${esc(text.updated)} ${esc(board.updatedAt)}</p>` : `<p>${esc(text.updatedMissing)}</p>`}<ol class="rank-places">${powerRows}</ol>`
          : `<p class="aov-empty">${esc(text.empty)}</p>`
      }
    </article>
    ${renderGuildStarsBoard(copy)}
    <article>
      <h3>${esc(text.guild)}</h3>
      <p class="section-note">${esc(text.guildNote)}</p>
      ${guild}
    </article>
  </section>`;
}

export function renderRanksPage(copy) {
  const text = pageCopy(copy);
  const player = getPlayer();
  const members = getRosterMembers();
  const ladder = LADDER.map((tier) => ladderCard(tier, text)).join("");
  return `<article class="page subpage rank-page">
    <header class="mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(text.title)}</span></p>
      <p class="kicker">${esc(text.kicker)}</p>
      <h1>${esc(text.title)}</h1>
      <p class="lead">${esc(text.lead)}</p>
      <p class="aov-jumps">
        <a href="#ladder">${esc(text.ladder)}</a>
        <a href="#rewards">${esc(text.rewards)}</a>
        <a href="#boards">${esc(text.boards)}</a>
        <a href="/modes" data-nav>${esc(text.openModes)}</a>
      </p>
    </header>
    <section id="ladder" class="section wrap rank-block">
      <h2>${esc(text.ladder)}</h2>
      <p class="section-note">${esc(text.starNote)}</p>
      <p class="section-note">${esc(text.legendNote)}</p>
      <div class="rank-ladder">${ladder}</div>
      <p class="section-note">${esc(text.sourceNote)} <a href="https://moba.garena.tw/news/show/4760" target="_blank" rel="noopener noreferrer">4760</a> · <a href="https://moba.garena.tw/news/show/4906" target="_blank" rel="noopener noreferrer">4906</a> · <a href="https://moba.garena.tw/news/show/5240" target="_blank" rel="noopener noreferrer">5240</a></p>
    </section>
    <section class="section wrap">${rewardBlocks(text, player)}</section>
    <section class="section wrap">${boardBlocks(text, player, members, copy)}</section>
  </article>`;
}

function modeBody(id, text, player) {
  if (id === "ranked") {
    return `<p>5V5 排位賽。記分板上的排位積分，100 分等於 1 星。</p>
      <p>金牌約額外 +100 分，銀牌約額外 +35 分。嚴重掛網的勝場不加分。</p>
      <p><a href="https://moba.garena.tw/news/show/5240" target="_blank" rel="noopener noreferrer">Garena 超級傳說日版本公告</a></p>`;
  }
  if (id === "apex") {
    const rules = APEX_RULES.map((rule, index) => `<li>${esc(`${index + 1}. ${rule}`)}</li>`).join("");
    const unknown = APEX_UNKNOWN.map((item) => `<li>${esc(item)}</li>`).join("");
    return `<ol class="rank-rules">${rules}</ol>
      <p>大廳另有巔峰週榜。開啟前會倒數；某次畫面是 12 天，那是當下的倒數，不是固定天數。</p>
      <h2>${esc(text.unknown)}</h2>
      <ul>${unknown}</ul>
      <p class="section-note">規則文字來自遊戲內《傳說之巔規則》。16–24 點寫在排位大廳的入口。沒有找到一份 2026 的 Garena 新聞把這八條再寫一次。</p>`;
  }
  if (id === "season-challenge") {
    const progress = player?.rankCard?.seasonChallenge;
    return `<p>排位大廳的一項賽季挑戰。不是另一條對戰佇列。</p>
      <p>${esc(text.challenge)} ${progress ? esc(progress) : esc(text.empty)}</p>
      <p class="section-note">${esc(text.challengeUnknown)}</p>
      <p class="section-note">Garena 公告寫過段位調整後增加了對應的賽季挑戰獎勵，沒有列出 2026 的十項內容。<a href="https://moba.garena.tw/news/show/4906" target="_blank" rel="noopener noreferrer">4906</a></p>`;
  }
  if (id === "legend-path") {
    return `<p>到達傳說後才解鎖的獎勵軌。節點是 10、20、30、40、50。</p>
      <p>畫面上有一項獎勵叫專屬邀請彈窗造型，邀請組隊時隊友看得到。該特權在截圖上尚未獲得。</p>
      <p class="section-note">${esc(text.unknown)}：其餘節點對應的道具名稱。</p>`;
  }
  return `<p>戰場傳說榮譽獎勵。一個賽年有 S1 到 S4，每個賽季達到戰場傳說可啟動一顆傳說寶石。四顆都啟動才能領取全部賽年寶藏。</p>
    <p>2026 的限定獎勵畫面寫著朔月銀衛。</p>
    <p class="section-note">2023 年公告：<a href="https://moba.garena.tw/news/show/3977" target="_blank" rel="noopener noreferrer">3977</a>。那篇寫過漏季可在下一季用更高段位追溯。2026 的畫面沒有這句，所以不列成現在的規則。</p>
    <p class="section-note">更低段位在更早的賽季有過獎勵清單。沒有一份標成 2026 仍有效的官方清單，這裡不補。</p>`;
}

export function renderRankedModeDetail(copy, id) {
  const mode = rankedMode(id);
  const text = pageCopy(copy);
  const page = copy.modes;
  if (!mode) return "";
  const name = bi(mode.name);
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/modes" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>${esc(name)}</span></p>
      <p class="kicker">${esc(mode.kind === "queue" ? "5V5" : text.modes)}</p>
      <h1>${esc(name)}</h1>
    </header>
    <section class="section wrap rank-prose">${modeBody(id, text, getPlayer())}</section>
  </article>`;
}

export function rankedModeEntries(copy) {
  const text = pageCopy(copy);
  const blurbs = {
    ranked: copy.modes?.rankedNote || "",
    apex: lang() === "en" ? "Opens during the season for Glory and above. Solo queue, hidden names, three bans." : "賽季中途開啟。星耀以上、預選位單排。",
    "season-challenge": lang() === "en" ? "A challenge track on the ranked lobby, not a separate queue." : "排位大廳上的挑戰軌，不是另一條佇列。",
    "legend-path": lang() === "en" ? "A reward track that opens at Legend." : "到達傳說後的獎勵軌。",
    "year-treasure": lang() === "en" ? "Four season gems for reaching War Legend." : "每個賽季達到戰場傳說，啟動賽年寶藏。",
  };
  return RANKED_MODES.map((mode) => ({
    id: mode.id,
    name: mode.name,
    players: mode.players,
    excerpt: blurbs[mode.id] || "",
    detail: text.modes,
  }));
}
