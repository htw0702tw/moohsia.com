import { getPlayer } from "./content.js";
import { esc } from "./html.js";
import { derivedKda } from "../shared/player.js";

function bi(value) {
  if (!value || typeof value !== "object") return "";
  const lang = document.documentElement.lang === "en" ? "en" : "zh";
  return String(value[lang] || value.zh || value.en || "").trim();
}

export function renderPlayerBody(copy, compact) {
  const page = copy.player;
  const player = getPlayer();
  if (!player) {
    return `<div class="aov-shell"><p class="aov-empty">${esc(page.emptyTitle)}</p><p>${esc(page.emptyBody)}</p></div>`;
  }

  const siteHref = page.siteUrl || "https://htw0702.com";
  const siteLabel = page.siteLabel || "htw0702.com";
  const facts = [
    player.handle,
    bi(player.rank),
    bi(player.season),
    player.uid ? `UID ${player.uid}` : "",
    bi(player.role),
    bi(player.lane),
    bi(player.server),
    bi(player.title),
  ].filter(Boolean);
  const bio = bi(player.bio);
  const heroes = bi(player.signatureHeroes);

  return `
    <div class="aov-shell${compact ? " is-compact" : ""}">
      <header class="aov-identity">
        <p>${esc(page.title)}</p>
        <h2>${esc(player.handle || page.pending)}</h2>
        ${facts.length ? `<span>${esc(facts.join(" · "))}</span>` : ""}
      </header>
      ${bio ? `<p class="section-note">${esc(bio)}</p>` : ""}
      ${heroes ? `<p class="section-note">${esc(page.heroesLabel || page.sections.heroes)}：${esc(heroes)}</p>` : ""}
      <p class="aov-jumps">
        <a href="${esc(siteHref)}" target="_blank" rel="noopener noreferrer">${esc(siteLabel)}</a>
      </p>
    </div>`;
}

export function derivedPreviewKda(card) {
  return card?.kda || derivedKda(card?.kills, card?.deaths, card?.assists);
}
