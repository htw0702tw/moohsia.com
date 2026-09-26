import { getCatalog } from "./catalog-state.js";
import { esc } from "./html.js";
import { resolveHero } from "../shared/aov-assets.js";
import { formatRate } from "../shared/match-analysis.js";

function textOf(page, key, fallback) {
  const value = page?.analysis?.[key];
  return value == null || value === "" ? fallback : String(value);
}

function fill(template, values) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (values[key] == null ? "" : String(values[key])));
}

function formatInt(value) {
  const text = String(Math.round(Number(value)));
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function recordLine(page, window) {
  return fill(textOf(page, "record", "{wins}勝{losses}敗"), { wins: window.wins, losses: window.losses });
}

function gamesLine(page, count) {
  return fill(textOf(page, "games", "{n} 場"), { n: count });
}

function axisLabel(value, unit) {
  if (!Number.isFinite(value)) return "";
  if (Math.abs(value) >= 10000) {
    if (unit === "k") {
      const scaled = value / 1000;
      const text = scaled >= 100 || Number.isInteger(scaled) ? String(Math.round(scaled)) : String(Math.round(scaled * 10) / 10);
      return `${text}k`;
    }
    const wan = value / 10000;
    const digits = wan >= 10 || Number.isInteger(wan) ? 0 : 1;
    return `${wan.toFixed(digits).replace(/\.0$/, "")}萬`;
  }
  if (Math.abs(value) >= 100) return String(Math.round(value));
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function niceMax(value) {
  if (!Number.isFinite(value) || value <= 0) return 1;
  const padded = value * 1.08;
  const exp = Math.floor(Math.log10(padded));
  const pow = 10 ** exp;
  const n = padded / pow;
  const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
  const nice = steps.find((step) => step >= n - 1e-9) ?? 10;
  return nice * pow;
}

function face(name) {
  const hero = resolveHero(name, getCatalog().heroes);
  const image = hero.image
    ? `<img src="${esc(hero.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">`
    : `<span>${esc(String(name || "?").slice(0, 1))}</span>`;
  const portrait = `<span class="aov-mini">${image}</span>`;
  const label = hero.href ? `<a href="${esc(hero.href)}" data-nav>${esc(name)}</a>` : esc(name);
  return `${portrait}<b>${label}</b>`;
}

function ring(page, label, window) {
  const rate = window.rate;
  const radius = 36;
  const circ = 2 * Math.PI * radius;
  const dash = rate == null ? 0 : (Math.max(0, Math.min(100, rate)) / 100) * circ;
  const percent = rate == null ? textOf(page, "empty", "資料不足") : `${formatRate(rate)}%`;
  const record = recordLine(page, window);
  const games = gamesLine(page, window.games);
  const summary = `${label} ${percent} ${record} ${games}`;
  const arc =
    rate == null
      ? ""
      : `<circle class="aov-arc" cx="50" cy="50" r="${radius}" fill="none" stroke="#f6d37a" stroke-width="8" stroke-linecap="round" stroke-dasharray="${dash.toFixed(2)} ${(circ - dash).toFixed(2)}" transform="rotate(-90 50 50)" style="--arc:${circ.toFixed(2)}"/>`;
  return `<figure class="aov-ring">
    <svg viewBox="0 0 100 100" role="img" aria-label="${esc(summary)}">
      <circle cx="50" cy="50" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
      ${arc}
      <text x="50" y="${rate == null ? 54 : 56}" text-anchor="middle" fill="${rate == null ? "#c8bedd" : "#f6d37a"}" font-size="${rate == null ? 9 : 16}" font-family="Oxanium, Noto Sans TC, sans-serif">${esc(percent)}</text>
    </svg>
    <figcaption>
      <b>${esc(label)}</b>
      <span>${esc(record)}</span>
      <small>${esc(games)}</small>
    </figcaption>
  </figure>`;
}

function rateRows(page, rows, nameOf) {
  if (!rows.length) return `<p class="aov-empty">${esc(textOf(page, "empty", "資料不足"))}</p>`;
  return `<div class="aov-rate-list">${rows
    .map((row) => {
      const rate = row.rate;
      const width = rate == null ? 0 : Math.max(0, Math.min(100, rate));
      const percent = rate == null ? textOf(page, "empty", "資料不足") : `${formatRate(rate)}%`;
      return `<div class="aov-rate-row">
        <span class="aov-rate-name">${nameOf(row)}</span>
        <i class="aov-bar is-gold" aria-hidden="true"><em style="width:${width}%"></em></i>
        <span class="aov-rate-meta"><b>${esc(percent)}</b><small>${esc(gamesLine(page, row.games))}</small></span>
      </div>`;
    })
    .join("")}</div>`;
}

function recentCard(page, recent) {
  const windows = [
    [textOf(page, "last10", "近 10 場"), recent.last10],
    [textOf(page, "last20", "近 20 場"), recent.last20],
    [textOf(page, "overall", "全部"), recent.overall],
  ];
  return `<article class="aov-chart">
    <h4>${esc(textOf(page, "recent", "近況勝率"))}</h4>
    <div class="aov-form">${windows.map(([label, window]) => ring(page, label, window)).join("")}</div>
  </article>`;
}

function heroCard(page, heroes) {
  return `<article class="aov-chart">
    <h4>${esc(textOf(page, "heroes", "常用英雄勝率"))}</h4>
    ${rateRows(page, heroes, (row) => face(row.hero))}
  </article>`;
}

function segments(points, key, xAt, yAt) {
  const runs = [];
  let current = [];
  points.forEach((point, index) => {
    const value = point[key];
    if (value == null) {
      if (current.length) runs.push(current);
      current = [];
      return;
    }
    current.push([xAt(index), yAt(value)]);
  });
  if (current.length) runs.push(current);
  return runs.filter((run) => run.length >= 2);
}

function trendCard(page, trend) {
  const title = textOf(page, "trend", "KDA／輸出趨勢");
  if (!trend?.kda && !trend?.damage) {
    return `<article class="aov-chart"><h4>${esc(title)}</h4><p class="aov-empty">${esc(textOf(page, "empty", "資料不足"))}</p></article>`;
  }
  const points = trend.points || [];
  const width = 360;
  const height = 214;
  const dual = Boolean(trend.kda && trend.damage);
  const pad = { l: dual ? 36 : 42, r: dual ? 48 : 14, t: 16, b: 32 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const kdaMax = niceMax(Math.max(0, ...points.map((point) => point.kda ?? 0)));
  const damageMax = niceMax(Math.max(0, ...points.map((point) => point.damage ?? 0)));
  const xAt = (index) => (points.length <= 1 ? pad.l + innerW / 2 : pad.l + (index / (points.length - 1)) * innerW);
  const yOf = (value, max) => pad.t + innerH - (Math.max(0, value) / max) * innerH;
  const unit = textOf(page, "myriad", "萬");
  const leftMax = trend.kda ? kdaMax : damageMax;
  const leftColor = trend.kda ? "#f6d37a" : "#ff8ab3";
  const grid = [1, 0.75, 0.5, 0.25]
    .map((scale) => {
      const y = (pad.t + innerH - scale * innerH).toFixed(1);
      const leftText = axisLabel(leftMax * scale, unit);
      const rightText = dual ? axisLabel(damageMax * scale, unit) : "";
      return `<line x1="${pad.l}" y1="${y}" x2="${(pad.l + innerW).toFixed(1)}" y2="${y}" stroke="rgba(186,168,255,0.18)"/>
        <text x="${pad.l - 6}" y="${y}" text-anchor="end" dominant-baseline="middle" fill="${leftColor}" font-size="10">${esc(leftText)}</text>
        ${rightText ? `<text x="${(pad.l + innerW + 6).toFixed(1)}" y="${y}" text-anchor="start" dominant-baseline="middle" fill="#ff8ab3" font-size="10">${esc(rightText)}</text>` : ""}`;
    })
    .join("");
  const line = (key, max, color) =>
    segments(points, key, xAt, (value) => yOf(value, max))
      .map(
        (run) =>
          `<polyline points="${run.map((pair) => pair.map((n) => n.toFixed(1)).join(",")).join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
      )
      .join("");
  const dots = (key, max, color) =>
    points
      .map((point, index) => {
        if (point[key] == null) return "";
        const result = point.win === true ? textOf(page, "winWord", "勝") : point.win === false ? textOf(page, "lossWord", "敗") : "";
        const bits = [point.label, key === "kda" ? `KDA ${point.kda.toFixed(2)}` : `${textOf(page, "damage", "輸出")} ${formatInt(point.damage)}`, result].filter(Boolean);
        return `<circle cx="${xAt(index).toFixed(1)}" cy="${yOf(point[key], max).toFixed(1)}" r="3.2" fill="${color}"><title>${esc(bits.join(" · "))}</title></circle>`;
      })
      .join("");
  const tickCount = Math.min(5, points.length);
  const tickIndexes = new Set(
    tickCount <= 1
      ? [0]
      : Array.from({ length: tickCount }, (_, step) => Math.round((step * (points.length - 1)) / (tickCount - 1))),
  );
  const ticks = points
    .map((point, index) => {
      if (!point.label || !tickIndexes.has(index)) return "";
      const short = point.label.split(" ")[0];
      const anchor = index === 0 ? "start" : index === points.length - 1 ? "end" : "middle";
      const x = index === 0 ? pad.l : index === points.length - 1 ? pad.l + innerW : xAt(index);
      return `<text x="${x.toFixed(1)}" y="${height - 8}" text-anchor="${anchor}" fill="#b7add4" font-size="10">${esc(short)}</text>`;
    })
    .join("");
  const legend = [
    trend.kda ? `<i class="is-kda"></i><span>${esc(textOf(page, "kda", "KDA"))}</span>` : "",
    trend.damage ? `<i class="is-dmg"></i><span>${esc(textOf(page, "damage", "輸出"))}</span>` : "",
  ]
    .filter(Boolean)
    .join("");
  const rows = points
    .map((point) => {
      const kda = point.kda == null ? "—" : point.kda.toFixed(2);
      const damage = point.damage == null ? "—" : formatInt(point.damage);
      return `<tr><td>${esc(point.label || "—")}</td><td>${esc(kda)}</td><td>${esc(damage)}</td></tr>`;
    })
    .join("");
  return `<article class="aov-chart">
    <h4>${esc(title)}</h4>
    <p class="section-note">${esc(textOf(page, "trendNote", "由左到右是較早到較近的對局。"))}</p>
    <svg class="aov-trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">
      ${grid}
      ${trend.kda ? line("kda", kdaMax, "#f6d37a") : ""}
      ${trend.damage ? line("damage", damageMax, "#ff3b86") : ""}
      ${trend.kda ? dots("kda", kdaMax, "#f6d37a") : ""}
      ${trend.damage ? dots("damage", damageMax, "#ff3b86") : ""}
      ${ticks}
    </svg>
    <p class="aov-legend">${legend}</p>
    <table class="sr-only"><caption>${esc(title)}</caption><thead><tr><th>${esc(textOf(page, "when", "時間"))}</th><th>KDA</th><th>${esc(textOf(page, "damage", "輸出"))}</th></tr></thead><tbody>${rows}</tbody></table>
  </article>`;
}

function comparePair(page, label, pair) {
  if (!pair) return `<div class="aov-compare-block"><h5>${esc(label)}</h5><p class="aov-empty">${esc(textOf(page, "empty", "資料不足"))}</p></div>`;
  const max = Math.max(pair.win.avg, pair.loss.avg, 1);
  const side = (tone, word, sample) => {
    const width = Math.max(0, Math.min(100, (sample.avg / max) * 100));
    return `<div class="aov-compare-side">
      <span>${esc(word)} <b>${esc(formatInt(sample.avg))}</b></span>
      <small>${esc(textOf(page, "average", "平均"))} · ${esc(gamesLine(page, sample.n))}</small>
      <i class="aov-bar ${tone}" aria-hidden="true"><em style="width:${width.toFixed(1)}%"></em></i>
    </div>`;
  };
  return `<div class="aov-compare-block">
    <h5>${esc(label)}</h5>
    ${side("is-win", textOf(page, "winWord", "勝"), pair.win)}
    ${side("is-loss", textOf(page, "lossWord", "敗"), pair.loss)}
  </div>`;
}

function compareCard(page, compare) {
  const title = textOf(page, "compare", "勝敗對比");
  if (!compare?.damage && !compare?.gold) {
    return `<article class="aov-chart"><h4>${esc(title)}</h4><p class="aov-empty">${esc(textOf(page, "empty", "資料不足"))}</p></article>`;
  }
  return `<article class="aov-chart">
    <h4>${esc(title)}</h4>
    <div class="aov-compare">
      ${comparePair(page, textOf(page, "damage", "輸出"), compare.damage)}
      ${comparePair(page, textOf(page, "gold", "經濟"), compare.gold)}
    </div>
  </article>`;
}

function modeCard(page, modes) {
  if (!modes?.length) return "";
  return `<article class="aov-chart">
    <h4>${esc(textOf(page, "modes", "模式分布"))}</h4>
    <p class="section-note">${esc(textOf(page, "modesNote", "依對局的模式，有地圖時一併標出。"))}</p>
    ${rateRows(page, modes, (row) => `<b>${esc(row.mode)}</b>`)}
  </article>`;
}

/** Dark esports charts. Returns the empty copy when there are no matches. */
export function renderMatchAnalysis(page, analysis) {
  const games = analysis?.recent?.overall?.games || 0;
  if (!games) return `<p class="aov-empty">${esc(page?.matchesEmpty || textOf(page, "empty", "資料不足"))}</p>`;
  return `<section class="aov-analysis" aria-label="${esc(textOf(page, "title", "分析"))}">
    <header class="aov-analysis-head">
      <h3>${esc(textOf(page, "title", "分析"))}</h3>
      <p class="section-note">${esc(textOf(page, "lead", "只從已公開的對局計算。"))}</p>
    </header>
    ${recentCard(page, analysis.recent)}
    ${heroCard(page, analysis.heroes || [])}
    ${trendCard(page, analysis.trend)}
    ${compareCard(page, analysis.compare)}
    ${modeCard(page, analysis.modes)}
  </section>`;
}
