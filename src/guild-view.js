import { esc } from "./html.js";
import { getGuild } from "./content.js";
import { GOLD_EMBLEM, GUILD_EMBLEM, TEAM_EMBLEM, gapToFourth, guildFilled, teamCardFilled } from "../shared/guild.js";
import { tierById } from "../shared/ranks.js";

function lang() {
  return document.documentElement.lang === "en" ? "en" : "zh";
}

function crest(src, label, small = false) {
  const name = label || "MOOHSIA";
  const size = small ? 56 : 96;
  return `<span class="guild-crest${small ? " is-small" : ""}"><img src="${esc(src)}" alt="${esc(name)}" width="${size}" height="${size}" decoding="async"></span>`;
}

function pair(label, value) {
  if (!String(value ?? "").trim()) return "";
  return `<p><span>${esc(label)}</span><b>${esc(value)}</b></p>`;
}

function ratio(left, right) {
  if (!left && !right) return "";
  if (left && right) return `${left}/${right}`;
  return left || right;
}

function switchLabel(copy, value) {
  if (value === "on") return copy.about.guild.on;
  if (value === "off") return copy.about.guild.off;
  return "";
}

export function renderGuildPanel(copy) {
  const guild = getGuild();
  const text = copy.about.guild;
  if (!guildFilled(guild)) {
    return `<section class="section wrap"><div class="guild-panel"><h2>${esc(text.title)}</h2><p class="aov-empty">${esc(text.insufficient)}</p></div></section>`;
  }
  const rank = tierById(guild.rankReq);
  const rankName = rank ? (lang() === "en" ? rank.en : rank.zh) : "";
  const rankLine = rank
    ? `<p class="guild-rank"><img src="${esc(GOLD_EMBLEM)}" alt="" width="36" height="36"><span>${esc(text.rankReq)}</span><b>${esc(rankName)}</b></p>`
    : pair(text.rankReq, "");
  const levels = Number(guild.chestLevels) || 0;
  const current = Number(guild.chestLevel);
  const chests = levels
    ? `<ol class="guild-chests">${Array.from({ length: Math.min(levels, 12) }, (_, index) => {
        const on = current === index + 1 ? " is-on" : "";
        return `<li class="${on.trim()}">${esc(String(index + 1))}</li>`;
      }).join("")}</ol>`
    : "";
  const width = guild.activity && guild.activityMax && Number(guild.activityMax) > 0
    ? Math.max(0, Math.min(100, (Number(guild.activity) / Number(guild.activityMax)) * 100))
    : 0;
  const bar = guild.activity
    ? `<div class="guild-activity"><span style="width:${width.toFixed(1)}%"></span><em>${esc(ratio(guild.activity, guild.activityMax))}</em></div>`
    : "";
  const when = guild.updatedAt ? `${text.updated} ${guild.updatedAt}` : text.updatedMissing;
  return `<section id="ingame-guild" class="section wrap">
    <div class="guild-panel">
      <div class="guild-head">
        ${crest(GUILD_EMBLEM, "MOOHSIA")}
        <div>
          <h2>${esc(text.title)}</h2>
          <p class="section-note">${esc(text.note)}</p>
          ${pair(text.region, guild.region)}
          ${pair(text.members, ratio(guild.members, guild.capacity))}
          ${pair(text.motto, guild.motto)}
          <p class="section-note">${esc(when)}</p>
        </div>
      </div>
      <div class="guild-activity-block">
        <h3>${esc(text.activity)}</h3>
        ${bar}
        ${guild.chestLevel ? `<p>${esc(lang() === "en" ? `${text.chest} ${guild.chestLevel}` : `第${guild.chestLevel}級寶箱`)}</p>` : ""}
        ${chests}
        <p class="section-note">${esc(text.chestMail)}</p>
      </div>
      <div class="guild-settings">
        <h3>${esc(text.settings)}</h3>
        ${pair(text.levelReq, guild.levelReq ? `lv.${guild.levelReq}` : "")}
        ${rankLine}
        ${pair(text.review, switchLabel(copy, guild.review))}
        ${pair(text.accept, switchLabel(copy, guild.accept))}
        ${pair(text.president, [guild.presidentRole, guild.president].filter(Boolean).join(" · "))}
        ${pair(text.weekActivity, guild.weekActivity)}
        ${pair(text.lastActivity, guild.lastActivity)}
      </div>
    </div>
  </section>`;
}

export function renderTeamSnapshot(copy, team) {
  const card = team?.card;
  const text = copy.teams.card;
  if (!teamCardFilled(card)) return "";
  const when = card.updatedAt ? `${copy.about.guild.updated} ${card.updatedAt}` : copy.about.guild.updatedMissing;
  return `<section id="ingame-team" class="section wrap">
    <div class="guild-panel">
      <div class="guild-head">
        ${crest(TEAM_EMBLEM, teamPrimaryName(team))}
        <div>
          <h2>${esc(text.title)}</h2>
          ${pair(text.region, card.region)}
          ${pair(text.score, card.score || text.scoreEmpty)}
          ${pair(text.members, ratio(card.members, card.capacity))}
          ${pair(text.status, card.status)}
          ${pair(text.captain, card.captain)}
          ${pair(text.motto, card.motto)}
          <p class="section-note">${esc(when)}</p>
        </div>
      </div>
    </div>
  </section>`;
}

function teamPrimaryName(team) {
  return (lang() === "en" ? team?.name?.en || team?.name?.zh : team?.name?.zh || team?.name?.en) || "MOOHSIA";
}

function starRow(label, stars, top, gapLabel) {
  const fourth = Array.isArray(top) ? top[3] : "";
  const gap = gapToFourth(stars, top);
  if (!stars && !fourth) return "";
  return `<li><b>${esc(label)}</b><span>${esc(stars || "—")}</span><small>${fourth ? `${esc(gapLabel.fourth)} ${esc(fourth)}` : ""}</small><em>${gap ? `${esc(gapLabel.gapFourth)} ${esc(gap)}` : ""}</em></li>`;
}

export function renderGuildStarsBoard(copy) {
  const guild = getGuild();
  const text = copy.ranks;
  const shown = guild.stars || guild.starsLast || guild.standing || (guild.weekTop || []).some(Boolean) || (guild.lastTop || []).some(Boolean);
  if (!shown) return "";
  const standing = guild.standing === "unranked" ? text.unranked : guild.standing;
  const rows = [
    starRow(text.thisWeek, guild.stars, guild.weekTop, text),
    starRow(text.lastWeek, guild.starsLast, guild.lastTop, text),
  ].join("");
  const members = ratio(guild.members, guild.capacity);
  const when = guild.updatedAt ? `${text.updated} ${guild.updatedAt}` : text.updatedMissing;
  return `<article class="guild-board">
    <div class="guild-board-row">
      ${crest(GUILD_EMBLEM, "MOOHSIA", true)}
      <div>
        <h3>${esc(text.guildStars)}</h3>
        <p class="section-note">${esc(text.guildStarsNote)}</p>
        ${standing ? `<p>${esc(standing)}</p>` : ""}
        ${members ? `<p>${esc(copy.about.guild.members)} ${esc(members)}</p>` : ""}
        <p class="section-note">${esc(when)}</p>
      </div>
    </div>
    <ol class="rank-places guild-star-rows">${rows}</ol>
  </article>`;
}

export function requirementHtml(text) {
  const gold = /黃金|Gold/i.test(text);
  const mark = gold ? `<img class="req-emblem" src="${esc(GOLD_EMBLEM)}" alt="" width="28" height="28">` : "";
  return `<li><span class="req-line">${mark}${esc(text)}</span></li>`;
}
