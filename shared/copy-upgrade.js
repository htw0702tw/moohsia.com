/**
 * Published CMS copy that still matches a previous built-in sentence is
 * rewritten to the current guild wording. Custom sentences are left alone.
 * Keys are dotted paths. Numeric segments address arrays.
 */
const LEGACY_EXACT = {
  "zh.meta.homeTitle": "暮霞｜MOS — 傳說對決戰隊",
  "zh.meta.homeDescription": "公會 MOOHSIA，戰隊暮霞｜MOS。加入只接受官網申請。聯絡 Info@moohsia.com。",
  "zh.nav.about": "戰隊",
  "zh.footer.blurb": "公會 MOOHSIA，戰隊暮霞｜MOS。",
  "zh.home.kickerZh": "傳說對決戰隊",
  "zh.home.lead": "公會 MOOHSIA，戰隊暮霞｜MOS。暮色未歇，戰線仍在。加入只走官網申請，Discord 不開放加入。",
  "zh.home.ctaTeam": "進入戰隊",
  "zh.home.ticker": "公會 MOOHSIA · 戰隊暮霞｜MOS · 傳說對決 · 官網申請 · Discord 不開放加入 · 成員資訊即將公開 · Info@moohsia.com · ",
  "zh.home.metrics.3.value": "戰隊信箱",
  "zh.home.cards.0.title": "戰隊",
  "zh.home.cards.0.body": "公會 MOOHSIA。戰隊暮霞｜MOS（MOS），傳說對決。",
  "zh.home.cards.1.body": "餘燼、堇紫與暮色，是這支隊伍的顏色。",
  "zh.home.signalTitle": "戰隊動態",
  "zh.home.finaleTitle": "聯絡戰隊",
  "zh.home.finaleBody": "媒體、合作與戰隊事務，請寄到這個信箱。加入請用官網申請。",
  "zh.home.catalogLead": "官方公開名單。不是戰隊戰績。",
  "zh.about.kicker": "02 — TEAM",
  "zh.about.title": "戰隊",
  "zh.about.lead": "公會 MOOHSIA，戰隊暮霞｜MOS。暮色未歇，戰線仍在。",
  "zh.news.lead": "賽事與戰隊消息。",
  "zh.contact.lead": "媒體、合作與戰隊事務，寫信到這裡。",
  "zh.contact.emailLabel": "寫信給戰隊",
  "zh.contact.writeTitle": "戰隊信箱",
  "zh.notFound.lead": "這個網址不在戰隊站內。",
  "zh.activities.lead": "Garena 公開頁上的活動、公告與賽事。不是戰隊自己的賽程。",
  "zh.apply.lead": "公會 MOOHSIA、戰隊暮霞｜MOS 只接受這個網站的申請。Discord 不開放加入。",
  "en.meta.homeTitle": "MOS — Arena of Valor team",
  "en.meta.homeDescription": "Guild MOOHSIA, team 暮霞｜MOS. Apply only on this site. Contact Info@moohsia.com.",
  "en.nav.about": "Team",
  "en.footer.blurb": "Guild MOOHSIA. Team 暮霞｜MOS.",
  "en.home.lead": "Guild MOOHSIA, team 暮霞｜MOS. Dusk holds. The line stays. Apply on this site. Discord is not open to join.",
  "en.home.ctaTeam": "Enter the team",
  "en.home.ticker": "GUILD MOOHSIA · TEAM 暮霞｜MOS · ARENA OF VALOR · APPLY ON SITE · DISCORD IS CLOSED · ROSTER PENDING · Info@moohsia.com · ",
  "en.home.metrics.3.value": "Team inbox",
  "en.home.cards.0.title": "The team",
  "en.home.cards.0.body": "Guild MOOHSIA. Team 暮霞｜MOS plays Arena of Valor.",
  "en.home.cards.1.body": "Ember, violet, and dusk are the colors of this team.",
  "en.home.signalTitle": "Team signal",
  "en.home.finaleTitle": "Reach the team",
  "en.home.finaleBody": "Press, partners, and team business: write to this address. Apply on this site to join.",
  "en.home.catalogLead": "Official public catalog. Not a team result.",
  "en.about.kicker": "02 — TEAM",
  "en.about.title": "Team",
  "en.about.lead": "Guild MOOHSIA, team 暮霞｜MOS. Dusk holds. The line stays.",
  "en.about.manifesto": "The name is the last light of dusk, while the embers are still bright. This team plays Arena of Valor.",
  "en.news.lead": "Matches and team news.",
  "en.contact.lead": "Press, partners, and team business: write here.",
  "en.contact.emailLabel": "Email the team",
  "en.contact.writeTitle": "Team inbox",
  "en.notFound.lead": "That address is not part of the team site.",
  "en.activities.lead": "Activities, news, and esports posts from public Garena pages. Not this team's fixtures.",
  "en.apply.lead": "Guild MOOHSIA and team 暮霞｜MOS take applications only on this website. Discord is not open to join.",
  "zh.ultimates.kicker": "08 — ULT",
  "zh.ultimates.lead": "傳說對決英雄的奧義，整理自 Garena 公開英雄頁。",
  "zh.ultimates.source": "資料來源：Garena 傳說對決官方英雄頁。",
  "zh.ultimates.method": "官方頁沒有單獨的「奧義」欄位。技能順序是被動、一技、二技、奧義，本頁取第 4 個。說明裡的 {0} 這類符號是官方頁的數值占位，本站不另填冷卻或傷害。技能數不是 4 的英雄不會猜測哪一個是奧義。",
  "zh.player.arcana": "銘文",
  "zh.search.placeholder": "英雄、造型、裝備",
  "en.nav.ultimates": "Ultimates",
  "en.ultimates.kicker": "08 — ULT",
  "en.ultimates.title": "Ultimates",
  "en.ultimates.lead": "Arena of Valor ultimate abilities, taken from public Garena hero pages.",
  "en.ultimates.source": "Source: official Garena Arena of Valor hero pages.",
  "en.ultimates.method": "The official page does not label an ultimate on its own. Skills are listed as passive, skill 1, skill 2, then the ultimate, so this page uses the fourth skill. Tokens like {0} are official placeholders. This site does not fill in cooldown or damage. Heroes whose skill list is not four long are left unmarked.",
  "en.search.placeholder": "Heroes, skins, items",
};

function readPath(root, path) {
  let node = root;
  for (const part of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[part];
  }
  return node;
}

function writePath(root, path, value) {
  const parts = path.split(".");
  let node = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    if (node == null || typeof node !== "object") return;
    node = node[parts[index]];
  }
  if (node == null || typeof node !== "object") return;
  node[parts[parts.length - 1]] = value;
}

/** @param {Record<string, unknown>} copy @param {Record<string, unknown>} defaults */
export function upgradeLegacyCopy(copy, defaults) {
  if (!copy || typeof copy !== "object" || !defaults) return copy;
  for (const [path, previous] of Object.entries(LEGACY_EXACT)) {
    if (readPath(copy, path) !== previous) continue;
    const next = readPath(defaults, path);
    if (typeof next === "string" && next !== previous) writePath(copy, path, next);
  }
  return copy;
}
