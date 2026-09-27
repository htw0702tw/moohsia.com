import { getCatalog } from "./catalog-state.js";
import { esc } from "./html.js";
import { resolveHero } from "../shared/aov-assets.js";
import { BADGE_KEYS, RADAR_KEYS, RADAR_SCALE, computeMatchStats } from "../shared/match-stats.js";
import { GAME_SNAPSHOT_KEYS } from "../shared/player.js";

const ZH = {
  title: "圖表",
  lead: "由本站已同步的 {n} 場公開對局即時計算，每小時同步後自動更新。",
  all: "全部",
  seasonNote: "{label}：{date} 起的對局。",
  empty: "這個範圍還沒有對局。",
  missing: "同步的對局沒有這項欄位，這張圖先不畫。",
  games: "場次",
  winRate: "勝率",
  record: "{w}勝{l}敗",
  mvp: "MVP",
  loseMvp: "敗方MVP",
  kda: "KDA",
  avgKda: "平均 K / D / A",
  score: "平均評分",
  badgesMissing: "超神、五殺、四殺、三殺、頂級、金牌、銀牌：同步來源沒有標記這些稱號，請看下方遊戲內對戰資料。",
  mvpNote: "MVP 含敗方MVP。",
  radar: "對戰雷達",
  radarCaption: "輸出＝平均輸出占全隊比 ÷ {output}%；KDA＝(總擊殺＋總助攻) ÷ 總死亡 ÷ {kda}；發育＝平均經濟占全隊比 ÷ {farm}%；團戰＝平均參團率 (擊殺＋助攻) ÷ 全隊擊殺；生存＝100 − {survival} × 平均死亡。各軸 0–100。",
  radarRaw: "輸出占比 {damagePct}% · KDA {kda} · 經濟占比 {goldPct}% · 參團率 {killPart}% · 平均死亡 {deaths}",
  winTrend: "勝率走勢",
  winTrendNote: "金線是近 {n} 場的滾動勝率，粉線是累計勝率。底部小格：金＝勝、灰＝敗。由左到右是舊到新。",
  rolling: "近 {n} 場",
  cumulative: "累計",
  kdaTrend: "每場 K / D / A",
  kdaTrendNote: "長條是擊殺、死亡、助攻，白線是該場 KDA。由左到右是舊到新。",
  kills: "擊殺",
  deaths: "死亡",
  assists: "助攻",
  heroes: "英雄使用比例",
  heroesNote: "使用占比與各英雄勝率。",
  modes: "模式分布",
  hours: "時段分布",
  hoursNote: "每小時的場次（依對局時間，臺北時間）。顏色越亮勝率越高。",
  weekdays: "星期分布",
  weekdayNames: ["一", "二", "三", "四", "五", "六", "日"],
  gamesN: "{n} 場",
  reference: "遊戲內對戰資料（參考）",
  referenceNote: "上面的圖表是依本站已同步的 {n} 場對局計算；這裡是遊戲內「對戰資料」頁的總數，只供參考，兩者範圍不同。",
  referenceWhen: "{date} · {mode}",
  referenceKeys: {
    played: "場次",
    winRate: "勝率",
    mvp: "MVP",
    godlike: "超神",
    penta: "五殺",
    quadra: "四殺",
    triple: "三殺",
    supreme: "頂級",
    gold: "金牌",
    silver: "銀牌",
    loseMvp: "敗方MVP",
  },
  radarLabels: { output: "輸出", kda: "KDA", farm: "發育", teamfight: "團戰", survival: "生存" },
};

const EN = {
  ...ZH,
  title: "Charts",
  lead: "Computed live from the {n} public matches synced to this site. Updates after each hourly sync.",
  all: "All",
  seasonNote: "{label}: matches from {date}.",
  empty: "No matches in this range yet.",
  missing: "The synced matches do not carry this field, so this chart is skipped.",
  games: "Games",
  winRate: "Win rate",
  record: "{w}W {l}L",
  avgKda: "Avg K / D / A",
  score: "Avg rating",
  loseMvp: "MVP (loss)",
  badgesMissing: "Godlike, penta, quadra, triple, supreme, gold and silver are not flagged by the sync source. See the in-game numbers below.",
  mvpNote: "MVP includes MVP on a loss.",
  radar: "Match radar",
  radarCaption: "Damage = avg team damage share ÷ {output}%; KDA = (kills + assists) ÷ deaths ÷ {kda}; Farm = avg team gold share ÷ {farm}%; Teamfight = avg kill participation; Survival = 100 − {survival} × avg deaths. Each axis 0–100.",
  radarRaw: "Damage share {damagePct}% · KDA {kda} · Gold share {goldPct}% · KP {killPart}% · Avg deaths {deaths}",
  winTrend: "Win rate trend",
  winTrendNote: "Gold: rolling last {n}. Pink: cumulative. Bottom strip: gold = win, grey = loss. Oldest to newest.",
  rolling: "Last {n}",
  cumulative: "Cumulative",
  kdaTrend: "K / D / A per match",
  kdaTrendNote: "Bars are kills, deaths, assists. White line is KDA. Oldest to newest.",
  kills: "Kills",
  deaths: "Deaths",
  assists: "Assists",
  heroes: "Hero share",
  heroesNote: "Share of matches and win rate per hero.",
  modes: "Modes",
  hours: "By hour",
  hoursNote: "Matches per hour (Taipei time). Brighter = higher win rate.",
  weekdays: "By weekday",
  weekdayNames: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  gamesN: "{n} games",
  reference: "In-game battle data (reference)",
  referenceNote: "The charts above use the {n} matches synced to this site. These are the in-game totals, for reference only; the ranges differ.",
  referenceKeys: {
    played: "Games",
    winRate: "Win rate",
    mvp: "MVP",
    godlike: "Godlike",
    penta: "Penta",
    quadra: "Quadra",
    triple: "Triple",
    supreme: "Supreme",
    gold: "Gold",
    silver: "Silver",
    loseMvp: "MVP (loss)",
  },
  radarLabels: { output: "Damage", kda: "KDA", farm: "Farm", teamfight: "Teamfight", survival: "Survival" },
};

function lang() {
  return typeof document !== "undefined" && document.documentElement?.lang === "en" ? "en" : "zh";
}

function copyFor(page) {
  const base = lang() === "en" ? EN : ZH;
  const custom = page?.charts && typeof page.charts === "object" ? page.charts : {};
  const out = { ...base };
  for (const [key, value] of Object.entries(custom)) {
    if (typeof value === "string" && value.trim()) out[key] = value;
  }
  return out;
}

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (values[key] == null ? "—" : String(values[key])));
}

function pct(value) {
  if (value == null) return "—";
  return `${Number.isInteger(value) ? value : value.toFixed(1)}%`;
}

function missing(t, title) {
  return `<article class="aov-chart chart-card"><h4>${esc(title)}</h4><p class="aov-empty">${esc(t.missing)}</p></article>`;
}

function heroFace(name) {
  const hero = resolveHero(name, getCatalog().heroes);
  const image = hero.image
    ? `<img src="${esc(hero.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span>${esc(String(name || "?").slice(0, 1))}</span>`;
  const label = hero.href ? `<a href="${esc(hero.href)}" data-nav>${esc(name)}</a>` : esc(name);
  return `<span class="aov-mini">${image}</span><b>${label}</b>`;
}

function tile(value, label, extra = "") {
  return `<article><b>${esc(value)}</b><span>${esc(label)}</span>${extra ? `<small>${esc(extra)}</small>` : ""}</article>`;
}

function summaryBlock(t, stats) {
  const s = stats.summary;
  const tiles = [
    tile(String(s.games), t.games),
    tile(pct(s.rate), t.winRate, fill(t.record, { w: s.wins, l: s.losses })),
    tile(String(s.mvp), t.mvp),
    tile(String(s.loseMvp), t.loseMvp),
    tile(s.kda == null ? "—" : s.kda.toFixed(2), t.kda),
    s.avgKills == null ? "" : tile(`${s.avgKills} / ${s.avgDeaths} / ${s.avgAssists}`, t.avgKda),
    s.avgScore == null ? "" : tile(String(s.avgScore), t.score),
  ];
  const badges = s.badges
    ? `<div class="aov-medals">${BADGE_KEYS.filter((key) => key !== "loseMvp").map((key) => tile(String(s.badges[key]), t.referenceKeys[key])).join("")}</div>`
    : `<p class="section-note">${esc(t.badgesMissing)}</p>`;
  return `<div class="chart-summary">
    <div class="aov-trio">${tiles.join("")}</div>
    <p class="section-note">${esc(t.mvpNote)}</p>
    ${badges}
  </div>`;
}

function radarCard(t, stats) {
  const radar = stats.radar;
  if (!radar.ok) return missing(t, t.radar);
  const cx = 160;
  const cy = 150;
  const radius = 92;
  const point = (index, scale) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
    return [cx + Math.cos(angle) * radius * scale, cy + Math.sin(angle) * radius * scale];
  };
  const pts = (scale) => RADAR_KEYS.map((_, index) => point(index, scale).map((n) => n.toFixed(1)).join(",")).join(" ");
  const rings = [0.25, 0.5, 0.75, 1].map((scale) => `<polygon points="${pts(scale)}" class="chart-ring"/>`).join("");
  const spokes = RADAR_KEYS.map((_, index) => {
    const [x, y] = point(index, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="chart-spoke"/>`;
  }).join("");
  const values = RADAR_KEYS.map((key) => radar.values[key] ?? 0);
  const poly = RADAR_KEYS.map((_, index) => point(index, values[index] / 100).map((n) => n.toFixed(1)).join(",")).join(" ");
  const dots = RADAR_KEYS.map((_, index) => {
    const [x, y] = point(index, values[index] / 100);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" class="chart-dot"/>`;
  }).join("");
  const labels = RADAR_KEYS.map((key, index) => {
    const [x, y] = point(index, 1.27);
    const value = radar.values[key];
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="chart-axis">${esc(t.radarLabels[key])}</text>
      <text x="${x.toFixed(1)}" y="${(y + 15).toFixed(1)}" text-anchor="middle" class="chart-axis-value">${esc(value == null ? "—" : String(value))}</text>`;
  }).join("");
  const summary = RADAR_KEYS.map((key) => `${t.radarLabels[key]} ${radar.values[key] ?? "—"}`).join("、");
  return `<article class="aov-chart chart-card chart-radar-card">
    <h4>${esc(t.radar)}</h4>
    <div class="chart-radar-wrap">
      <svg class="chart-radar" viewBox="0 0 320 310" role="img" aria-label="${esc(summary)}">${rings}${spokes}<polygon points="${poly}" class="chart-area"/>${dots}${labels}</svg>
    </div>
    <p class="chart-raw">${esc(fill(t.radarRaw, radar.raw))}</p>
    <p class="section-note chart-caption">${esc(fill(t.radarCaption, RADAR_SCALE))}</p>
  </article>`;
}

function scrollSvg(width, height, minPx, body, label) {
  return `<div class="chart-scroll"><svg class="chart-line" viewBox="0 0 ${width} ${height}" style="min-width:${minPx}px" role="img" aria-label="${esc(label)}">${body}</svg></div>`;
}

/** Date ticks: at most one per day, at least `minGap` apart; the newest match is always labelled. */
export function tickIndexes(labels, xAt, minGap = 56) {
  const day = (index) => String(labels[index] || "").split(" ")[0];
  const count = labels.length;
  const kept = [];
  for (let index = 0; index < count; index += 1) {
    const last = kept.at(-1);
    if (last != null && (day(last) === day(index) || xAt(index) - xAt(last) < minGap)) continue;
    kept.push(index);
  }
  if (count > 1) {
    const end = count - 1;
    while (kept.length && (xAt(end) - xAt(kept.at(-1)) < minGap || day(kept.at(-1)) === day(end)) && kept.at(-1) !== end) kept.pop();
    if (kept.at(-1) !== end) kept.push(end);
  }
  return kept;
}

function xTicks(points, xAt, height) {
  const count = points.length;
  return tickIndexes(points.map((point) => point.label), xAt)
    .map((index) => {
      const label = String(points[index].label || "").split(" ")[0];
      const anchor = index === 0 ? "start" : index === count - 1 ? "end" : "middle";
      return `<text x="${xAt(index).toFixed(1)}" y="${height - 6}" text-anchor="${anchor}" class="chart-tick">${esc(label)}</text>`;
    })
    .join("");
}

function winTrendCard(t, stats) {
  const points = stats.winTrend;
  if (points.length < 2) return missing(t, t.winTrend);
  const n = points.length;
  const width = Math.max(640, n * 12);
  const height = 250;
  const pad = { l: 40, r: 14, t: 14, b: 50 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const xAt = (index) => pad.l + (n === 1 ? innerW / 2 : (index / (n - 1)) * innerW);
  const yAt = (value) => pad.t + innerH - (value / 100) * innerH;
  const grid = [0, 25, 50, 75, 100]
    .map((value) => `<line x1="${pad.l}" x2="${pad.l + innerW}" y1="${yAt(value).toFixed(1)}" y2="${yAt(value).toFixed(1)}" class="${value === 50 ? "chart-mid" : "chart-grid"}"/><text x="${pad.l - 6}" y="${yAt(value).toFixed(1)}" text-anchor="end" dominant-baseline="middle" class="chart-tick">${value}%</text>`)
    .join("");
  const line = (key, cls) => {
    const run = points.map((point, index) => (point[key] == null ? "" : `${xAt(index).toFixed(1)},${yAt(point[key]).toFixed(1)}`)).filter(Boolean).join(" ");
    return `<polyline points="${run}" class="${cls}"/>`;
  };
  const cell = Math.max(3, Math.min(10, innerW / n - 2));
  const strip = points
    .map((point, index) => {
      const cls = point.win === true ? "is-win" : point.win === false ? "is-loss" : "is-none";
      const title = [point.label, point.win === true ? "勝" : point.win === false ? "敗" : "", point.rolling == null ? "" : `${fill(t.rolling, { n: stats.window })} ${point.rolling}%`].filter(Boolean).join(" · ");
      return `<rect x="${(xAt(index) - cell / 2).toFixed(1)}" y="${pad.t + innerH + 8}" width="${cell.toFixed(1)}" height="8" rx="1.5" class="chart-cell ${cls}"><title>${esc(title)}</title></rect>`;
    })
    .join("");
  const last = points.at(-1);
  const body = `${grid}${line("cumulative", "chart-series is-pink")}${line("rolling", "chart-series is-gold")}${strip}${xTicks(points, xAt, height)}`;
  return `<article class="aov-chart chart-card">
    <h4>${esc(t.winTrend)}</h4>
    <p class="section-note">${esc(fill(t.winTrendNote, { n: stats.window }))}</p>
    ${scrollSvg(width, height, Math.max(520, n * 9), body, `${t.winTrend} ${fill(t.rolling, { n: stats.window })} ${pct(last.rolling)} · ${t.cumulative} ${pct(last.cumulative)}`)}
    <p class="aov-legend"><i class="is-kda"></i><span>${esc(fill(t.rolling, { n: stats.window }))} ${esc(pct(last.rolling))}</span><i class="is-dmg"></i><span>${esc(t.cumulative)} ${esc(pct(last.cumulative))}</span></p>
  </article>`;
}

function kdaTrendCard(t, stats) {
  const points = stats.kdaTrend;
  if (points.length < 2) return missing(t, t.kdaTrend);
  const n = points.length;
  const width = Math.max(640, n * 16);
  const height = 250;
  const pad = { l: 34, r: 36, t: 14, b: 30 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const slot = innerW / n;
  const xAt = (index) => pad.l + slot * index + slot / 2;
  const countMax = Math.max(4, ...points.map((point) => Math.max(point.kills ?? 0, point.deaths ?? 0, point.assists ?? 0)));
  const top = Math.ceil(countMax / 4) * 4;
  const kdaMax = Math.max(4, Math.ceil(Math.max(...points.map((point) => point.kda ?? 0)) / 4) * 4);
  const yCount = (value) => pad.t + innerH - (value / top) * innerH;
  const yKda = (value) => pad.t + innerH - (Math.min(value, kdaMax) / kdaMax) * innerH;
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((scale) => {
      const y = (pad.t + innerH - scale * innerH).toFixed(1);
      return `<line x1="${pad.l}" x2="${pad.l + innerW}" y1="${y}" y2="${y}" class="chart-grid"/><text x="${pad.l - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" class="chart-tick">${Math.round(top * scale)}</text><text x="${pad.l + innerW + 6}" y="${y}" dominant-baseline="middle" class="chart-tick is-kda">${Math.round(kdaMax * scale)}</text>`;
    })
    .join("");
  const bar = Math.max(1.5, Math.min(5, slot / 3.6));
  const bars = points
    .map((point, index) => {
      const x = xAt(index);
      const title = `${point.label} · ${point.kills ?? "—"}/${point.deaths ?? "—"}/${point.assists ?? "—"} · KDA ${point.kda ?? "—"}`;
      return [["kills", -1.5], ["deaths", 0], ["assists", 1.5]]
        .map(([key, offset]) => {
          const value = point[key];
          if (value == null) return "";
          const y = yCount(value);
          return `<rect x="${(x + offset * bar - bar / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${bar.toFixed(1)}" height="${Math.max(0.5, pad.t + innerH - y).toFixed(1)}" class="chart-bar is-${key}"><title>${esc(title)}</title></rect>`;
        })
        .join("");
    })
    .join("");
  const kdaLine = points.map((point, index) => (point.kda == null ? "" : `${xAt(index).toFixed(1)},${yKda(point.kda).toFixed(1)}`)).filter(Boolean).join(" ");
  const body = `${grid}${bars}<polyline points="${kdaLine}" class="chart-series is-white"/>${xTicks(points, xAt, height)}`;
  return `<article class="aov-chart chart-card">
    <h4>${esc(t.kdaTrend)}</h4>
    <p class="section-note">${esc(t.kdaTrendNote)}</p>
    ${scrollSvg(width, height, Math.max(560, n * 12), body, t.kdaTrend)}
    <p class="aov-legend chart-legend"><i class="is-kills"></i><span>${esc(t.kills)}</span><i class="is-deaths"></i><span>${esc(t.deaths)}</span><i class="is-assists"></i><span>${esc(t.assists)}</span><i class="is-white"></i><span>KDA</span></p>
  </article>`;
}

const DONUT_COLORS = ["#f6d37a", "#ff3b86", "#7c5cff", "#4c8dff", "#35d0ba", "#ff8a3d", "#d5dbe8", "#9aa4c4"];

function heroCard(t, stats) {
  const heroes = stats.heroes;
  if (!heroes.length) return missing(t, t.heroes);
  const top = heroes.slice(0, 7);
  const rest = heroes.slice(7);
  const slices = rest.length
    ? [...top, { hero: lang() === "en" ? "Others" : "其他", games: rest.reduce((sum, row) => sum + row.games, 0), share: Math.round(rest.reduce((sum, row) => sum + (row.share || 0), 0) * 10) / 10, rate: null, other: true }]
    : top;
  const total = slices.reduce((sum, row) => sum + row.games, 0) || 1;
  const r = 52;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const arcs = slices
    .map((row, index) => {
      const len = (row.games / total) * circ;
      const arc = `<circle cx="70" cy="70" r="${r}" fill="none" stroke="${DONUT_COLORS[index % DONUT_COLORS.length]}" stroke-width="20" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 70 70)"><title>${esc(`${row.hero} ${row.share}%`)}</title></circle>`;
      offset += len;
      return arc;
    })
    .join("");
  const rows = heroes
    .map((row, index) => {
      const width = row.rate == null ? 0 : Math.max(0, Math.min(100, row.rate));
      const swatch = index < 7 ? DONUT_COLORS[index] : DONUT_COLORS[7];
      return `<div class="aov-rate-row chart-rate-row chart-hero-row">
        <span class="aov-rate-name"><i class="chart-swatch" style="background:${swatch}"></i>${heroFace(row.hero)}</span>
        <i class="aov-bar is-gold" aria-hidden="true"><em style="width:${width}%"></em></i>
        <span class="aov-rate-meta"><b>${esc(pct(row.rate))}</b><small>${esc(`${row.share}% · ${fill(t.gamesN, { n: row.games })}`)}</small></span>
      </div>`;
    })
    .join("");
  return `<article class="aov-chart chart-card">
    <h4>${esc(t.heroes)}</h4>
    <p class="section-note">${esc(t.heroesNote)}</p>
    <div class="chart-hero">
      <svg class="chart-donut" viewBox="0 0 140 140" role="img" aria-label="${esc(heroes.map((row) => `${row.hero} ${row.share}%`).join("、"))}">
        <circle cx="70" cy="70" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="20"/>${arcs}
        <text x="70" y="68" text-anchor="middle" class="chart-donut-n">${heroes.length}</text>
        <text x="70" y="86" text-anchor="middle" class="chart-tick">${lang() === "en" ? "heroes" : "位英雄"}</text>
      </svg>
      <div class="aov-rate-list">${rows}</div>
    </div>
  </article>`;
}

function modeCard(t, stats) {
  if (!stats.modes.length) return missing(t, t.modes);
  const rows = stats.modes
    .map((row) => {
      const width = Math.max(0, Math.min(100, row.share || 0));
      return `<div class="aov-rate-row chart-rate-row">
        <span class="aov-rate-name"><b>${esc(row.mode)}</b></span>
        <i class="aov-bar is-gold" aria-hidden="true"><em style="width:${width}%"></em></i>
        <span class="aov-rate-meta"><b>${esc(`${row.share}%`)}</b><small>${esc(`${fill(t.gamesN, { n: row.games })} · ${t.winRate} ${pct(row.rate)}`)}</small></span>
      </div>`;
    })
    .join("");
  return `<article class="aov-chart chart-card"><h4>${esc(t.modes)}</h4><div class="aov-rate-list">${rows}</div></article>`;
}

function columns(items, labelOf, t) {
  const max = Math.max(1, ...items.map((item) => item.games));
  return `<ol class="chart-cols">${items
    .map((item) => {
      const height = item.games ? Math.max(6, Math.round((item.games / max) * 84)) : 2;
      const heat = item.rate == null ? 0.25 : 0.3 + (item.rate / 100) * 0.7;
      const title = `${labelOf(item)} · ${fill(t.gamesN, { n: item.games })}${item.rate == null ? "" : ` · ${t.winRate} ${pct(item.rate)}`}`;
      return `<li title="${esc(title)}"><small>${item.games || ""}</small><b style="height:${height}px;opacity:${heat.toFixed(2)}"></b><span>${esc(labelOf(item))}</span></li>`;
    })
    .join("")}</ol>`;
}

function timeCard(t, stats) {
  if (!stats.hours.length) return missing(t, t.hours);
  return `<article class="aov-chart chart-card">
    <h4>${esc(t.hours)}</h4>
    <p class="section-note">${esc(t.hoursNote)}</p>
    <div class="chart-scroll">${columns(stats.hours, (item) => String(item.index).padStart(2, "0"), t)}</div>
    <h5>${esc(t.weekdays)}</h5>
    ${columns(stats.weekdays, (item) => t.weekdayNames[item.index], t)}
  </article>`;
}

function referenceCard(t, snapshot, liveCount) {
  const rows = (snapshot?.rows || []).filter((row) => GAME_SNAPSHOT_KEYS.some((key) => row[key] !== ""));
  if (!rows.length) return "";
  const when = [snapshot.updatedAt, snapshot.mode].filter(Boolean).join(" · ");
  const blocks = rows
    .map((row) => {
      const cells = GAME_SNAPSHOT_KEYS.filter((key) => row[key] !== "")
        .map((key) => tile(key === "winRate" ? `${row[key]}%` : row[key], t.referenceKeys[key]))
        .join("");
      return `<section class="chart-ref-block"><h5>${esc(row.label || "—")}</h5><div class="aov-medals">${cells}</div></section>`;
    })
    .join("");
  return `<article class="aov-chart chart-card chart-ref">
    <h4>${esc(t.reference)}</h4>
    ${when ? `<p class="chart-ref-when">${esc(when)}</p>` : ""}
    ${blocks}
    <p class="section-note">${esc(fill(t.referenceNote, { n: liveCount }))}</p>
  </article>`;
}

function seasonFilter(t, snapshot, active) {
  const start = snapshot?.seasonStart || "";
  if (!start) return { html: `<div class="aov-tabs chart-filter"><button type="button" class="is-on" data-chart-season="all">${esc(t.all)}</button></div>`, since: "" };
  const label = snapshot.seasonLabel || start;
  const on = active === "season";
  return {
    html: `<div class="aov-tabs chart-filter">
      <button type="button" class="${on ? "" : "is-on"}" data-chart-season="all">${esc(t.all)}</button>
      <button type="button" class="${on ? "is-on" : ""}" data-chart-season="season">${esc(label)}</button>
    </div>${on ? `<p class="section-note">${esc(fill(t.seasonNote, { label, date: start }))}</p>` : ""}`,
    since: on ? start : "",
  };
}

/** 圖表 tab. `matches` are the public matches already on the page. */
export function renderChartsTab(page, player, view = {}) {
  const t = copyFor(page);
  const matches = Array.isArray(player?.matches) ? player.matches : [];
  const filter = seasonFilter(t, player?.gameSnapshot, view.chartSeason);
  const stats = computeMatchStats(matches, { since: filter.since, window: 10 });
  const head = `<header class="aov-analysis-head">
      <h3>${esc(t.title)}</h3>
      <p class="section-note">${esc(fill(t.lead, { n: stats.total }))}</p>
    </header>`;
  const reference = referenceCard(t, player?.gameSnapshot, stats.total);
  if (!stats.total) {
    return `<section class="aov-analysis chart-tab">${head}<p class="aov-empty">${esc(page?.matchesEmpty || t.empty)}</p>${reference}</section>`;
  }
  const body = stats.summary.games
    ? `${summaryBlock(t, stats)}
      <div class="chart-grid-2">${radarCard(t, stats)}${heroCard(t, stats)}</div>
      ${winTrendCard(t, stats)}
      ${kdaTrendCard(t, stats)}
      <div class="chart-grid-2">${modeCard(t, stats)}${timeCard(t, stats)}</div>`
    : `<p class="aov-empty">${esc(t.empty)}</p>`;
  return `<section class="aov-analysis chart-tab" aria-label="${esc(t.title)}">
    ${head}
    ${filter.html}
    ${body}
    ${reference}
  </section>`;
}
