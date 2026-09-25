import { getCatalog, getItemCategory } from "./catalog-state.js";
import { getPlayer } from "./content.js";
import { esc } from "./html.js";
import { frequentBuilds } from "../shared/match-present.js";

function bi(value) {
  if (!value || typeof value !== "object") return "";
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  return String(value[lang] || value.zh || "").trim();
}

function skinLabel(copy, skin, index) {
  const named = bi(skin.name);
  if (named) return named;
  if (skin.kind === "default") return copy.skins.original;
  return `${copy.skins.unnamed} ${index + 1}`;
}

export function catalogSkins() {
  const rows = [];
  for (const hero of getCatalog().heroes) {
    const heroName = bi(hero.name) || hero.name?.zh || "";
    (hero.skins || []).forEach((skin, index) => {
      if (!skin?.image) return;
      rows.push({
        heroId: String(hero.id),
        heroName,
        skinId: String(skin.id ?? index),
        image: skin.image,
        thumb: skin.thumb || skin.image,
        kind: skin.kind || "skin",
        index,
        name: skin.name,
      });
    });
  }
  return rows;
}

export function renderSkins(copy) {
  const page = copy.skins;
  const rows = catalogSkins();
  const body = rows.length
    ? `<div class="aov-skin-grid">${rows
        .map((skin) => {
          const label = skinLabel(copy, skin, skin.index);
          return `<a class="aov-skin-card" href="/heroes/${esc(skin.heroId)}#skin-${esc(skin.heroId)}-${esc(skin.skinId)}" data-nav>
            <img src="${esc(skin.thumb || skin.image)}" alt="${esc(`${skin.heroName} ${label}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
            <strong>${esc(skin.heroName)}</strong>
            <em>${esc(label)}</em>
          </a>`;
        })
        .join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
    </header>
    <section class="section wrap">
      ${body}
      <p class="section-note">${esc(page.source)}</p>
    </section>
  </article>`;
}

export function renderHeroDetail(copy, id) {
  const page = copy.heroes;
  const hero = getCatalog().heroes.find((item) => String(item.id) === String(id));
  if (!hero) {
    return `<article class="page subpage"><header class="mast wrap"><h1>${esc(page.emptyTitle)}</h1><p>${esc(page.emptyBody)}</p><a class="btn btn-primary" href="/heroes" data-nav>${esc(page.title)}</a></header></article>`;
  }
  const name = bi(hero.name) || hero.name?.zh || "";
  const role = bi(hero.roleLabel) || "";
  const skins = (hero.skins || [])
    .map((skin, index) => {
      if (!skin?.image) return "";
      const label = skinLabel(copy, skin, index);
      return `<article class="aov-skin-card" id="skin-${esc(hero.id)}-${esc(String(skin.id ?? index))}">
        <img src="${esc(skin.image)}" alt="${esc(`${name} ${label}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">
        <strong>${esc(name)}</strong>
        <em>${esc(label)}</em>
      </article>`;
    })
    .join("");
  const skills = (hero.skills || [])
    .map(
      (skill) => `<article class="aov-skill">
        ${skill.image ? `<img src="${esc(skill.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
        <div><h3>${esc(skill.name || "")}</h3><p>${esc(skill.text || "")}</p></div>
      </article>`,
    )
    .join("");
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/heroes" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>${esc(name)}</span></p>
      <p class="kicker">${esc(role)}</p>
      <h1>${esc(name)}</h1>
      ${hero.blurb ? `<p class="lead">${esc(hero.blurb)}</p>` : ""}
      <p class="hero-actions"><a class="btn btn-ghost" href="${esc(hero.pageUrl || "#")}" target="_blank" rel="noopener noreferrer">${esc(page.open)}</a><a class="btn btn-ghost" href="/skins" data-nav>${esc(copy.nav.skins)}</a></p>
    </header>
    <section class="section wrap hero-detail">
      <img class="aov-hero-banner" src="${esc(hero.image || "")}" alt="" decoding="async" referrerpolicy="no-referrer">
      ${skills ? `<div class="aov-skill-list">${skills}</div>` : ""}
      <h2>${esc(copy.skins.title)}</h2>
      <div class="aov-skin-grid">${skins || `<p class="aov-empty">${esc(copy.skins.emptyBody)}</p>`}</div>
      <p class="section-note">${esc(copy.skins.source)}</p>
    </section>
  </article>`;
}

function itemCard(item) {
  const name = bi(item.name) || item.name?.zh || item.id;
  return `<a class="aov-item-card" href="/items/${esc(item.id)}" data-nav id="item-${esc(item.id)}">
    <img src="${esc(item.image || "")}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">
    <strong>${esc(name)}</strong>
    <em>${esc(item.category || "")}</em>
    <p>${esc(item.description || "")}</p>
  </a>`;
}

export function renderItems(copy) {
  const page = copy.items;
  const catalog = getCatalog();
  const category = getItemCategory();
  const categories = [...new Set(catalog.items.map((item) => item.category).filter(Boolean))];
  const chips = [`<button type="button" class="chip${category === "all" ? " is-on" : ""}" data-item-category="all">${esc(page.all)}</button>`]
    .concat(
      categories.map(
        (name) => `<button type="button" class="chip${category === name ? " is-on" : ""}" data-item-category="${esc(name)}">${esc(name)}</button>`,
      ),
    )
    .join("");
  const items = catalog.items.filter((item) => category === "all" || item.category === category);
  const player = getPlayer();
  const builds = frequentBuilds(player?.matches || [], 6, catalog.items);
  const buildBlock = builds.length
    ? `<section class="aov-builds"><h2>${esc(page.builds)}</h2><div class="aov-build-grid">${builds
        .map((build) => {
          const icons = build.items
            .map((slot) =>
              slot.id
                ? `<a class="aov-item" href="/items/${esc(slot.id)}" data-nav><img src="${esc(slot.src)}" alt="${esc(slot.label)}" title="${esc(slot.label)}" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a>`
                : `<i class="aov-item is-empty"></i>`,
            )
            .join("");
          return `<article><header><b>${esc(build.hero || "—")}</b><span>×${build.count}</span></header><span class="aov-items">${icons}</span></article>`;
        })
        .join("")}</div></section>`
    : `<p class="aov-empty">${esc(page.buildsEmpty)}</p>`;
  const grid = items.length
    ? `<div class="aov-item-grid">${items.map((item) => itemCard(item)).join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
      <div class="role-filters" role="toolbar">${chips}</div>
    </header>
    <section class="section wrap">
      ${buildBlock}
      ${grid}
      <p class="section-note">${esc(page.source)}</p>
    </section>
  </article>`;
}

export function renderItemDetail(copy, id) {
  const page = copy.items;
  const item = getCatalog().items.find((row) => String(row.id) === String(id));
  if (!item) {
    return `<article class="page subpage"><header class="mast wrap"><h1>${esc(page.missing)}</h1><a class="btn btn-primary" href="/items" data-nav>${esc(page.title)}</a></header></article>`;
  }
  const name = bi(item.name) || item.id;
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/items" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>${esc(name)}</span></p>
      <p class="kicker">${esc(item.category || page.title)}</p>
      <h1>${esc(name)}</h1>
      <p class="lead">${esc(item.description || "")}</p>
    </header>
    <section class="section wrap">
      <article class="aov-item-detail">
        <img src="${esc(item.image || "")}" alt="${esc(name)}" decoding="async" referrerpolicy="no-referrer">
        <p>裝備 ${esc(item.id)}</p>
        <a class="text-link" href="${esc(item.pageUrl || "https://moba.garena.tw/game/props")}" target="_blank" rel="noopener noreferrer">${esc(copy.heroes.open)}</a>
      </article>
    </section>
  </article>`;
}

export function renderModeDetail(copy, id) {
  const page = copy.modes;
  const mode = getCatalog().modes.find((item) => item.id === id);
  if (!mode && id !== "ranked") {
    return `<article class="page subpage"><header class="mast wrap"><h1>${esc(page.emptyTitle)}</h1><a class="btn btn-primary" href="/modes" data-nav>${esc(page.title)}</a></header></article>`;
  }
  if (id === "ranked") {
    const classic = getCatalog().modes.find((item) => item.id === "classic-5v5");
    return `<article class="page subpage">
      <header class="mast catalog-mast wrap">
        <p class="crumbs"><a href="/modes" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>排位賽</span></p>
        <p class="kicker">5V5</p>
        <h1>排位賽</h1>
        <p class="lead">${esc(page.rankedNote)}</p>
        ${classic?.sourceUrl ? `<a class="btn btn-ghost" href="${esc(classic.sourceUrl)}" target="_blank" rel="noopener noreferrer">${esc(copy.heroes.open)}</a>` : ""}
      </header>
    </article>`;
  }
  const name = bi(mode.name) || mode.name?.zh || "";
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/modes" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>${esc(name)}</span></p>
      <p class="kicker">${esc(page.detail)}</p>
      <h1>${esc(name)}</h1>
      ${mode.players ? `<p class="stamp">${esc(page.players)} ${esc(mode.players)}</p>` : ""}
      ${mode.excerpt ? `<p class="lead">${esc(mode.excerpt)}</p>` : ""}
      <a class="btn btn-ghost" href="${esc(mode.sourceUrl || "#")}" target="_blank" rel="noopener noreferrer">${esc(copy.heroes.open)}</a>
    </header>
  </article>`;
}
