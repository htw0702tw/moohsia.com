/**
 * Official katha attribute tags, and the four 魔紋 factions from Garena's
 * public announcement. Individual 魔紋 effects are not on the current game
 * pages, so this file does not invent them.
 * https://moba.garena.tw/game/katha
 * https://moba.garena.tw/news/show/1854
 */
export const ARCANA_TAGS = [
  { id: "攻擊", zh: "攻擊", en: "Attack" },
  { id: "生命", zh: "生命", en: "Health" },
  { id: "防禦", zh: "防禦", en: "Defense" },
  { id: "功能", zh: "功能", en: "Utility" },
  { id: "吸血", zh: "吸血", en: "Lifesteal" },
  { id: "攻速", zh: "攻速", en: "Attack speed" },
  { id: "暴擊", zh: "暴擊", en: "Crit" },
  { id: "穿透", zh: "穿透", en: "Penetration" },
];

export const GLYPH_SOURCE = "https://moba.garena.tw/news/show/1854";

export const GLYPH_FACTIONS = [
  {
    id: "abyss",
    name: { zh: "魔能深淵", en: "魔能深淵" },
    focus: { zh: "近戰，對應戰士與刺客", en: "Melee heroes: warriors and assassins" },
  },
  {
    id: "temple",
    name: { zh: "光明聖殿", en: "光明聖殿" },
    focus: { zh: "射手與法師", en: "Marksmen and mages" },
  },
  {
    id: "forest",
    name: { zh: "暗影森林", en: "暗影森林" },
    focus: { zh: "坦克與輔助", en: "Tanks and supports" },
  },
  {
    id: "origin",
    name: { zh: "起源聯盟", en: "起源聯盟" },
    focus: { zh: "創造性打法，職業不限", en: "Creative play, any role" },
  },
];
