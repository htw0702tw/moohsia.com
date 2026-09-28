/** Official Garena CDN helpers and the public search index. No login, no private API. */

import { heroSkillSlots } from "./hero-skills.js";

export const ITEM_ICON_BASE =
  "https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/";

export const SITE_SEARCH = [
  {
    type: "page",
    id: "player",
    title: "選手數據",
    text: "選手數據 player 歷史戰績 配裝 對戰資料 成員",
    href: "/roster",
    image: "",
  },
