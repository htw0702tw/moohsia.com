/** Guild teams. The org is the guild; these are the competitive squads under it. */

export const DEFAULT_TEAM_SLUG = "moohsia";

export function teamSlug(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  return /^[a-z0-9-]{1,40}$/.test(raw) ? raw : "";
}

/** Missing or invalid assignment stays on the seeded MOOHSIA squad. */
export function memberTeamSlug(member) {
  return teamSlug(member?.team) || DEFAULT_TEAM_SLUG;
}

export function findTeam(teams, slug) {
  const key = teamSlug(slug);
  if (!key) return null;
  return (Array.isArray(teams) ? teams : []).find((team) => teamSlug(team?.slug || team?.id) === key) || null;
}

export function teamPrimary(team, lang) {
  if (!team) return "";
  const name = lang === "en" ? team.name?.en || team.name?.zh : team.name?.zh || team.name?.en;
  return String(name || team.slug || "").trim();
}

export function teamAka(team, lang) {
  if (!team) return "";
  const aka = lang === "en" ? team.aka?.en || team.aka?.zh : team.aka?.zh || team.aka?.en;
  return String(aka || "").trim();
}
