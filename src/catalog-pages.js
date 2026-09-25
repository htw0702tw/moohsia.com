import { ARCANA_TAGS, GLYPH_FACTIONS, GLYPH_SOURCE } from "../shared/arcana.js";
import { HERO_SKILL_SLOTS, heroSkillSlots } from "../shared/hero-skills.js";
import { frequentBuilds } from "../shared/match-present.js";
import {
  getArcanaLevel,
  getArcanaQuery,
  getArcanaTag,
  getCatalog,
  getItemCategory,
  getRoleFilter,
  getSkillQuery,
  getSkillSlot,
} from "./catalog-state.js";
import { getPlayer } from "./content.js";
import { esc } from "./html.js";

function uiLang() {
  return document.documentElement.lang === "en" ? "en" : "zh";
}

function bi(value) {
  if (!value || typeof value !== "object") return "";
  const lang = uiLang();
  return String(value[lang] || value.zh || "").trim();
}

function tagLabel(tag) {
  const known = ARCANA_TAGS.find((row) => row.id === tag);
  if (!known) return tag;
  return uiLang() === "en" ? known.en : known.zh;
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
  const skills = heroSkillSlots(hero)
    .map((row) => {
      const skill = row.skill || {};
      const slot = uiLang() === "en" ? row.en : row.zh;
      return `<article class="aov-skill" id="skill-${esc(hero.id)}-${row.index}">
        ${skill.image ? `<img src="${esc(skill.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
        <div><h3><span class="stamp">${esc(slot)}</span> ${esc(skill.name || "")}</h3><p>${esc(skill.text || "")}</p></div>
      </article>`;
    })
    .join("");
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/heroes" data-nav>${esc(page.title)}</a><span aria-hidden="true">/</span><span>${esc(name)}</span></p>
      <p class="kicker">${esc(role)}</p>
      <h1>${esc(name)}</h1>
      ${hero.blurb ? `<p class="lead">${esc(hero.blurb)}</p>` : ""}
      <p class="hero-actions"><a class="btn btn-ghost" href="${esc(hero.pageUrl || "#")}" target="_blank" rel="noopener noreferrer">${esc(page.open)}</a><a class="btn btn-ghost" href="/skills" data-nav>${esc(copy.nav.heroSkills)}</a><a class="btn btn-ghost" href="/skins" data-nav>${esc(copy.nav.skins)}</a></p>
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

function roleChips(copy, filter) {
  const roles = getCatalog().roles || [];
  return [`<button type="button" class="chip${filter === "all" ? " is-on" : ""}" data-role-filter="all">${esc(copy.heroes.all)}</button>`]
    .concat(
      roles.map(
        (role) =>
          `<button type="button" class="chip${filter === role.id ? " is-on" : ""}" data-role-filter="${esc(role.id)}">${esc(bi(role) || role.zh)}</button>`,
      ),
    )
    .join("");
}

function catalogQuery(id, label, value) {
  return `<label class="catalog-q"><span class="sr-only">${esc(label)}</span><input id="${esc(id)}" type="search" data-catalog-q="${esc(id)}" value="${esc(value)}" placeholder="${esc(label)}" autocomplete="off" enterkeyhint="search"></label>`;
}

export function renderHeroSkills(copy) {
  const page = copy.skills;
  const filter = getRoleFilter();
  const slot = getSkillSlot();
  const query = getSkillQuery().trim().toLowerCase();
  const heroes = getCatalog().heroes.filter((hero) => filter === "all" || hero.role === filter);
  const slotChips = [`<button type="button" class="chip${slot === "all" ? " is-on" : ""}" data-skill-slot="all">${esc(page.all)}</button>`]
    .concat(
      HERO_SKILL_SLOTS.map((row) => {
        const label = uiLang() === "en" ? row.en : row.zh;
        return `<button type="button" class="chip${slot === row.id ? " is-on" : ""}" data-skill-slot="${esc(row.id)}">${esc(label)}</button>`;
      }),
    )
    .join("");
  let shown = 0;
  const odd = [];
  const cards = heroes
    .map((hero) => {
      const name = bi(hero.name) || hero.name?.zh || "";
      const role = bi(hero.roleLabel) || "";
      const rows = heroSkillSlots(hero).filter((row) => slot === "all" || row.id === slot);
      if (!rows.length) return "";
      if ((hero.skills || []).length !== 4) odd.push(hero);
      const blob = [name, role, ...rows.map((row) => `${row.zh} ${row.en} ${row.skill?.name || ""} ${row.skill?.text || ""}`)]
        .join(" ")
        .toLowerCase();
      const hidden = query && !blob.includes(query);
      if (!hidden) shown += 1;
      const skills = rows
        .map((row) => {
          const skill = row.skill || {};
          const label = uiLang() === "en" ? row.en : row.zh;
          return `<article class="aov-skill" id="skill-${esc(hero.id)}-${row.index}">
            ${skill.image ? `<img src="${esc(skill.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
            <div><h3><span class="stamp">${esc(label)}</span> ${esc(skill.name || "")}</h3><p>${esc(skill.text || "")}</p></div>
          </article>`;
        })
        .join("");
      return `<article class="skill-hero reveal" id="hero-skills-${esc(hero.id)}" data-catalog-kind="skill-q" data-catalog-blob="${esc(blob)}"${hidden ? " hidden" : ""}>
        <header>
          <a href="/heroes/${esc(hero.id)}" data-nav>
            ${hero.image ? `<img src="${esc(hero.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
            <span><strong>${esc(name)}</strong><em>${esc(role)}</em></span>
          </a>
        </header>
        <div class="aov-skill-list">${skills}</div>
      </article>`;
    })
    .join("");
  const body = heroes.length
    ? cards
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  const gaps = odd.length
    ? `<p class="section-note">${esc(page.unresolved)} ${odd
        .map((hero) => `<a href="/heroes/${esc(hero.id)}" data-nav>${esc(bi(hero.name) || hero.name?.zh || hero.id)}</a>`)
        .join("、")}</p>`
    : "";
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
      <p class="section-note">${esc(page.method)}</p>
      <p class="hud-readout"><span>HERO SKILL // <b data-catalog-count="skill-q">${esc(String(shown))}</b></span><span>${esc(page.count)}</span></p>
      <div class="role-filters" role="toolbar" aria-label="${esc(copy.nav.heroes)}">${roleChips(copy, filter)}</div>
      <div class="role-filters" role="toolbar" aria-label="${esc(page.title)}">${slotChips}</div>
      ${catalogQuery("skill-q", page.search, getSkillQuery())}
    </header>
    <section class="section wrap skill-index">
      ${body}
      <p class="aov-empty" data-catalog-empty="skill-q"${heroes.length && !shown ? "" : " hidden"}>${esc(page.noMatch)}</p>
      ${gaps}
      <p class="section-note">${esc(page.source)}</p>
    </section>
  </article>`;
}

export function renderUserSkills(copy) {
  const page = copy.userSkills;
  const rows = getCatalog().userSkills || [];
  const cards = rows.length
    ? `<div class="ult-grid">${rows
        .map(
          (skill) => `<article class="ult-card" id="user-${esc(skill.id)}">
            ${skill.image ? `<img src="${esc(skill.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="ult-fallback"></span>`}
            <span>
              <strong>${esc(skill.name || "")}</strong>
              <em>${esc(page.official)}</em>
              <small>${esc(skill.text || "")}</small>
            </span>
          </article>`,
        )
        .join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
      <p class="hud-readout"><span>USER // ${esc(String(rows.length))}</span><span>${esc(page.count)}</span></p>
    </header>
    <section class="section wrap">
      ${cards}
      <p class="section-note">${esc(page.source)} <a href="https://moba.garena.tw/game/skill" target="_blank" rel="noopener noreferrer">${esc(page.official)}</a></p>
    </section>
  </article>`;
}

export function renderUltimates(copy) {
  const page = copy.ultimates;
  const level = getArcanaLevel();
  const tag = getArcanaTag();
  const query = getArcanaQuery().trim().toLowerCase();
  const rows = (getCatalog().arcana || []).filter((row) => {
    if (level !== "all" && String(row.level) !== level) return false;
    if (tag !== "all" && !(row.tags || []).includes(tag)) return false;
    return true;
  });
  const presentTags = new Set((getCatalog().arcana || []).flatMap((row) => row.tags || []));
  const tags = ARCANA_TAGS.filter((row) => presentTags.has(row.id)).concat(
    [...presentTags].filter((id) => !ARCANA_TAGS.some((row) => row.id === id)).map((id) => ({ id, zh: id, en: id })),
  );
  const levelChips = [`<button type="button" class="chip${level === "all" ? " is-on" : ""}" data-arcana-level="all">${esc(page.levelAll)}</button>`]
    .concat(
      ["1", "2", "3"].map((id) => {
        const label = page.levels?.[id] || id;
        return `<button type="button" class="chip${level === id ? " is-on" : ""}" data-arcana-level="${id}">${esc(label)}</button>`;
      }),
    )
    .join("");
  const tagChips = [`<button type="button" class="chip${tag === "all" ? " is-on" : ""}" data-arcana-tag="all">${esc(page.tagAll)}</button>`]
    .concat(
      tags.map((row) => {
        const label = uiLang() === "en" ? row.en : row.zh;
        return `<button type="button" class="chip${tag === row.id ? " is-on" : ""}" data-arcana-tag="${esc(row.id)}">${esc(label)}</button>`;
      }),
    )
    .join("");
  const allArcana = getCatalog().arcana || [];
  let shown = 0;
  const cards = allArcana.length
    ? `<div class="arcana-grid">${rows
        .map((row) => {
          const blob = [row.name, ...(row.tags || []), row.effect, `${row.level}`].join(" ").toLowerCase();
          const hidden = query && !blob.includes(query);
          if (!hidden) shown += 1;
          const tagsText = (row.tags || []).map((item) => tagLabel(item)).join(" · ");
          const levelLabel = page.levels?.[String(row.level)] || String(row.level);
          return `<article class="arcana-card reveal" id="katha-${esc(String(row.level))}-${esc(row.id)}" data-catalog-kind="arcana-q" data-catalog-blob="${esc(blob)}"${hidden ? " hidden" : ""}>
            ${row.image ? `<img src="${esc(row.image)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="ult-fallback"></span>`}
            <strong>${esc(row.name || "")}</strong>
            <em>${esc(levelLabel)}${tagsText ? ` · ${esc(tagsText)}` : ""}</em>
            <p>${esc(row.effect || "")}</p>
          </article>`;
        })
        .join("")}</div>`
    : `<div class="console reveal"><div class="console-body"><div><h3>${esc(page.emptyTitle)}</h3><p>${esc(page.emptyBody)}</p></div></div></div>`;
  const factions = GLYPH_FACTIONS.map((row) => {
    const name = bi(row.name);
    const focus = bi(row.focus);
    return `<article class="glyph-card">
      <p class="stamp">${esc(page.glyphsPendingStamp)}</p>
      <h3>${esc(name)}</h3>
      <p>${esc(focus)}</p>
      <p class="section-note">${esc(page.glyphsPending)}</p>
    </article>`;
  }).join("");
  return `<article class="page subpage">
    <header class="mast catalog-mast wrap">
      <p class="crumbs"><a href="/" data-nav>${esc(copy.nav.home)}</a><span aria-hidden="true">/</span><span>${esc(page.title)}</span></p>
      <p class="kicker">${esc(page.kicker)}</p>
      <h1>${esc(page.title)}</h1>
      <p class="lead">${esc(page.lead)}</p>
      <p class="section-note">${esc(page.method)}</p>
      <p class="hud-readout"><span>ARCANA // <b data-catalog-count="arcana-q">${esc(String(shown))}</b></span><span>${esc(page.count)}</span></p>
      <div class="role-filters" role="toolbar" aria-label="${esc(page.levelAll)}">${levelChips}</div>
      <div class="role-filters" role="toolbar" aria-label="${esc(page.tagAll)}">${tagChips}</div>
      ${catalogQuery("arcana-q", page.search, getArcanaQuery())}
    </header>
    <section class="section wrap">
      ${cards}
      <p class="aov-empty" data-catalog-empty="arcana-q"${allArcana.length && !shown ? "" : " hidden"}>${esc(page.noMatch)}</p>
      <p class="section-note">${esc(page.source)} <a href="https://moba.garena.tw/game/katha" target="_blank" rel="noopener noreferrer">${esc(page.listLink)}</a></p>
      <section class="glyph-board">
        <h2>${esc(page.glyphsTitle)}</h2>
        <p>${esc(page.glyphsLead)}</p>
        <div class="glyph-grid">${factions}</div>
        <p class="section-note"><a href="${esc(GLYPH_SOURCE)}" target="_blank" rel="noopener noreferrer">${esc(page.glyphsSource)}</a></p>
      </section>
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
