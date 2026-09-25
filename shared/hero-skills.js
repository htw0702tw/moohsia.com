/**
 * Garena hero pages list skills in order. When a hero has four, they are
 * passive, skill 1, skill 2, and skill 3. The fourth skill is still a hero
 * skill. It is not 奧義 (the arcana / glyph loadout).
 */
export const HERO_SKILL_SLOTS = [
  { id: "passive", zh: "被動", en: "Passive" },
  { id: "skill1", zh: "一技能", en: "Skill 1" },
  { id: "skill2", zh: "二技能", en: "Skill 2" },
  { id: "skill3", zh: "三技能", en: "Skill 3" },
];

export function heroSkillSlots(hero) {
  const skills = Array.isArray(hero?.skills) ? hero.skills : [];
  const labeled = skills.length === 4;
  return skills.map((skill, index) => {
    const known = labeled ? HERO_SKILL_SLOTS[index] : null;
    return {
      index,
      id: known?.id || `n${index + 1}`,
      zh: known?.zh || `技能 ${index + 1}`,
      en: known?.en || `Skill ${index + 1}`,
      skill,
    };
  });
}
