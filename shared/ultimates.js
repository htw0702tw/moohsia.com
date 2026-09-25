/**
 * Garena hero pages publish skills in order: passive, skill 1, skill 2, ultimate.
 * The snapshot does not mark 奧義 on its own. Every bundled hero has four skills;
 * the fourth is treated as the ultimate. Any other count is left unresolved.
 */
export function ultimateSkill(hero) {
  const skills = Array.isArray(hero?.skills) ? hero.skills : [];
  if (skills.length !== 4) return null;
  const skill = skills[3];
  if (!skill || typeof skill !== "object") return null;
  const name = String(skill.name || "").trim();
  if (!name) return null;
  return skill;
}
