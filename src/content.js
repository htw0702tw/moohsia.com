import { CONTACT_EMAIL } from "../shared/brand.js";
import { cleanPlayer, emptyPlayer, toPublicPlayer } from "../shared/player.js";

/**
 * Editable team facts.
 * Leave strings blank until they are confirmed. Do not invent championships,
 * player names, sponsors, match results, or a Discord invite.
 *
 * These values are the built-in defaults. The public site replaces them with
 * the published CMS document when one exists.
 */

export const PLACEHOLDER_SLOTS = 5;

/** @type {{ id: string, name: { zh: string, en: string }, role: { zh: string, en: string } }[]} */
export const rosterMembers = [];

/** @type {{ id: string, date: string, title: { zh: string, en: string }, body: { zh: string, en: string } }[]} */
export const newsPosts = [];

export const profileFields = [
  { id: "founded", zh: "成立", en: "Founded", value: { zh: "", en: "" } },
  { id: "base", zh: "基地", en: "Base", value: { zh: "", en: "" } },
  { id: "season", zh: "目前賽季", en: "Season", value: { zh: "", en: "" } },
  { id: "record", zh: "戰績", en: "Record", value: { zh: "", en: "" } },
  { id: "sponsors", zh: "贊助", en: "Sponsors", value: { zh: "", en: "" } },
];

const zh = {
  meta: {
    homeTitle: "暮霞｜MOS — 傳說對決戰隊",
    homeDescription: "公會 MOOHSIA，戰隊暮霞｜MOS。加入只接受官網申請。聯絡 Info@moohsia.com。",
    titleSuffix: "暮霞｜MOS",
  },
  nav: {
    home: "首頁",
    about: "戰隊",
    roster: "成員",
    news: "動態",
    contact: "聯絡",
    player: "選手",
    heroes: "英雄",
    modes: "模式",
    activities: "活動",
    apply: "申請",
    menu: "選單",
    close: "關閉",
    lang: "切換為 English",
    langShort: "EN",
    skip: "跳至內容",
    recruitChip: "官網申請",
    sys: "CH // PUBLIC",
    footerLabel: "頁尾",
  },
  intro: {
    label: "暮霞｜MOS",
    sub: "ARENA OF VALOR",
    skip: "略過入場",
  },
  footer: {
    blurb: "公會 MOOHSIA，戰隊暮霞｜MOS。",
    rule: "加入只接受官網申請。Discord 不開放加入。",
    recruit: "官網申請",
    explore: "站內",
  },
  home: {
    kicker: "ARENA OF VALOR",
    kickerZh: "傳說對決戰隊",
    tagline: "暮色未歇，戰線仍在。",
    taglineAlt: "Dusk holds. The line stays.",
    lead: "公會 MOOHSIA，戰隊暮霞｜MOS。暮色未歇，戰線仍在。加入只走官網申請，Discord 不開放加入。",
    ctaTeam: "進入戰隊",
    ctaRoster: "成員席位",
    ctaContact: "聯絡信箱",
    ctaApply: "提出申請",
    chips: [
      { text: "傳說對決", tone: "calm" },
      { text: "官網申請", tone: "alert" },
      { text: "戰績尚未公布", tone: "calm" },
      { text: "成員資訊即將公開", tone: "calm" },
    ],
    crestSig: "SIG // DUSK",
    crestRec: "APPLY // SITE",
    hudChannel: "CH // PUBLIC",
    hudGame: "AOV // 傳說對決",
    ticker: "公會 MOOHSIA · 戰隊暮霞｜MOS · 傳說對決 · 官網申請 · Discord 不開放加入 · 成員資訊即將公開 · Info@moohsia.com · ",
    metricsKicker: "00 — STAGE",
    metrics: [
      { index: "01", label: "主場", value: "傳說對決", note: "Arena of Valor" },
      { index: "02", label: "招募", value: "官網申請", note: "Discord 不開放加入" },
      { index: "03", label: "名單", value: "即將公開", note: "成員資訊即將公開" },
      { index: "04", label: "信箱", value: "戰隊信箱", note: "Info@moohsia.com" },
    ],
    identityKicker: "01 — IDENTITY",
    identityTitle: "關於暮霞",
    identityLead: "以暮色為名，站上傳說對決。",
    cards: [
      {
        index: "01",
        title: "戰隊",
        body: "公會 MOOHSIA。戰隊暮霞｜MOS（MOS），傳說對決。",
      },
      {
        index: "02",
        title: "暮色",
        body: "餘燼、堇紫與暮色，是這支隊伍的顏色。",
      },
      {
        index: "03",
        title: "招募",
        body: "加入只接受官方網站申請。Discord 不開放加入。",
      },
      {
        index: "04",
        title: "戰績",
        body: "賽季戰績尚未公布。",
      },
    ],
    boardKicker: "02 — STATUS",
    boardTitle: "現況",
    boardNote: "",
    rows: [
      ["遊戲", "傳說對決"],
      ["公開招募", "官網申請"],
      ["Discord", "不開放加入"],
      ["成員名單", "成員資訊即將公開"],
      ["賽事成績", "尚未公布"],
      ["贊助", "尚未公開"],
      ["聯絡", "Info@moohsia.com"],
    ],
    fixtureKicker: "03 — FIXTURE",
    fixtureTitle: "下一場",
    fixtureLead: "賽程尚未公布。",
    fixtureNote: "",
    fixtures: [
      { id: "NEXT", title: "尚未公布", meta: "對手與時間待定" },
    ],
    rosterKicker: "04 — ROSTER",
    rosterTitle: "成員",
    rosterLead: "名單即將公布。",
    rosterCta: "查看成員",
    signalKicker: "05 — SIGNAL",
    signalTitle: "戰隊動態",
    signalCta: "開啟動態台",
    finaleKicker: "06 — TRANSMIT",
    finaleTitle: "聯絡戰隊",
    finaleBody: "媒體、合作與戰隊事務，請寄到這個信箱。加入請用官網申請。",
    playerKicker: "07 — PLAYER",
    playerTitle: "選手數據",
    playerLead: "只顯示已經公開的個人資料。",
    playerCta: "打開選手頁",
    playerEmpty: "個人數據尚未公布。",
    catalogKicker: "08 — CATALOG",
    catalogTitle: "英雄與模式",
    catalogLead: "官方公開名單。不是戰隊戰績。",
    heroesCta: "英雄名單",
    modesCta: "遊戲模式",
  },
  about: {
    kicker: "02 — TEAM",
    title: "戰隊",
    lead: "公會 MOOHSIA，戰隊暮霞｜MOS。暮色未歇，戰線仍在。",
    pending: "待公布",
    manifestoKicker: "DUSK",
    manifestoTitle: "暮色未歇",
    manifesto: "名字取自暮色將盡、餘燼仍亮的時刻。我們站在傳說對決的戰場上。",
    principlesKicker: "NOW",
    principlesTitle: "此刻",
    principles: [
      "主場是傳說對決。",
      "加入只接受官網申請。Discord 不開放加入。",
      "成員資訊即將公開。",
      "賽季戰績尚未公布。",
      "贊助尚未公布。",
      "聯絡 Info@moohsia.com。",
    ],
    recruitTitle: "官網申請",
    recruitBody: "想加入請填官方網站的申請。Discord 不開放加入，邀請由擁有者在核准後個別寄出。",
  },
  roster: {
    kicker: "03 — ROSTER",
    title: "成員",
    lead: "成員資訊即將公開。",
    slot: "成員資訊即將公開",
    slotMeta: "位置尚未公布",
    stamp: "待公布",
    stampLive: "已公開",
    emptyNote: "名單即將公布。",
    liveLead: "上場名單。",
    rolePending: "位置未公開",
    stageKicker: "LINEUP // PENDING",
  },
  news: {
    kicker: "04 — SIGNAL",
    title: "動態",
    lead: "賽事與戰隊消息。",
    emptyTitle: "目前沒有新消息",
    emptyBody: "新的公告會出現在這裡。",
    silent: "SIGNAL // SILENT",
    feed: "NO PUBLIC FEED",
    wireLabel: "訊息",
    reserved: [
      { id: "01", title: "尚無公告", meta: "—" },
      { id: "02", title: "尚無賽事", meta: "—" },
      { id: "03", title: "尚無戰績", meta: "—" },
    ],
    reservedNote: "",
  },
  contact: {
    kicker: "05 — CONTACT",
    title: "聯絡",
    lead: "媒體、合作與戰隊事務，寫信到這裡。",
    emailLabel: "寫信給戰隊",
    only: "Info@moohsia.com",
    recruitTitle: "官網申請",
    recruitBody: "加入只接受這個網站的申請。Discord 不開放加入。",
    sheetKicker: "CHANNELS",
    sheet: [
      ["01  信箱", "Info@moohsia.com", "開放"],
      ["02  招募", "官網申請", "開放"],
      ["03  Discord", "不開放加入", "關閉"],
    ],
    writeTitle: "戰隊信箱",
    writeBody: "請寄到 Info@moohsia.com。加入請用官網申請。",
  },
  notFound: {
    kicker: "404 — OFF MAP",
    title: "找不到這個頁面",
    lead: "這個網址不在戰隊站內。",
    back: "回到首頁",
  },
  player: {
    kicker: "07 — PLAYER",
    title: "選手數據",
    lead: "個人戰績只顯示已公開的資料。",
    emptyTitle: "尚未公布",
    emptyBody: "個人數據還沒有公開。填上並發布之後，才會出現在這裡。",
    pending: "待公布",
    handleLabel: "遊戲 ID",
    nameLabel: "顯示名稱",
    roleLabel: "位置",
    laneLabel: "路線",
    rankLabel: "段位",
    seasonLabel: "賽季",
    serverLabel: "伺服器",
    titleLabel: "頭銜",
    heroesLabel: "常用英雄",
    bioLabel: "簡介",
    statsKicker: "RECORD",
    matchesKicker: "MATCHES",
    matchesEmpty: "沒有已公開的對局。",
    played: "場次",
    wins: "勝場",
    winRate: "勝率",
    kda: "KDA",
    kills: "擊殺",
    deaths: "死亡",
    assists: "助攻",
    gold: "經濟",
    damage: "輸出",
    mvp: "MVP",
    uidLabel: "UID",
    sections: {
      heroes: "常用英雄",
      history: "歷史戰績",
      battle: "對戰資料",
      reputation: "信譽積分",
      honors: "冠軍賽榮譽",
      titles: "榮譽頭銜",
    },
    radar: { output: "輸出", kda: "KDA", farm: "發育", teamfight: "團戰", survival: "生存" },
    medals: {
      godlike: "超神",
      penta: "五殺",
      quadra: "四殺",
      triple: "三殺",
      supreme: "頂級",
      gold: "金牌",
      silver: "銀牌",
      loseMvp: "敗方MVP",
    },
    tabs: {
      board: "總覽",
      data: "數據",
      output: "輸出",
      survival: "生存",
      farm: "發育",
      record: "戰績",
      team: "團隊",
    },
    charts: "圖表",
    highlight: "精彩對局",
    noChart: "這項還沒有可畫的數字。",
    reputationEmpty: "信譽積分尚未填寫。",
    honorsEmpty: "冠軍賽榮譽尚未公布。",
    titlesEmpty: "榮譽頭銜尚未公布。",
    heroesEmpty: "常用英雄尚未公布。",
  },
  activities: {
    kicker: "10 — OFFICIAL",
    title: "官方活動",
    lead: "Garena 公開頁上的活動、公告與賽事。不是戰隊自己的賽程。",
    emptyTitle: "目前沒有抓到活動",
    emptyBody: "每日更新或管理頁的重新整理之後，公開列表會出現在這裡。",
    source: "來源是 Garena 傳說對決公開新聞頁。是否仍在進行，以官方頁為準。",
    all: "全部",
    activity: "活動",
    announcement: "公告",
    esports: "賽事",
    open: "官方原文",
  },
  apply: {
    kicker: "11 — APPLY",
    title: "加入申請",
    lead: "公會 MOOHSIA、戰隊暮霞｜MOS 只接受這個網站的申請。Discord 不開放加入。",
    rank: "歷史排位賽最高戰績",
    rankHint: "最低黃金。低於黃金的申請不會送出。",
    uid: "使用者 UID",
    uidHint: "全數字。",
    nickname: "暱稱",
    email: "聯絡信箱",
    gender: "性別",
    age: "年齡層",
    motivation: "為什麼希望加入",
    positions: "適合的位子",
    positionsHint: "請剛好選 2 個。",
    weekday: "平日遊玩時間",
    holiday: "假日遊玩時間",
    practice: "可配合練習的時間",
    practiceHint: "請寫具體時段，例如 20:00～22:00。",
    conduct: "我了解並同意：尊重、友善、包容；禁止金錢往來；一切跟隨官方規範。",
    submit: "送出申請",
    discord: "Discord 不開放公開加入。通過之後，擁有者會用電子郵件寄出一次性邀請。",
    sent: "申請已收到。",
    sentBody: "若信件有設定，擁有者會在 Info@moohsia.com 看到這筆申請。",
    fail: "這次沒有送出。",
  },
  heroes: {
    kicker: "08 — HEROES",
    title: "英雄",
    lead: "名單來自 Garena 傳說對決公開英雄列表。",
    emptyTitle: "目錄暫時讀不到",
    emptyBody: "請稍後再看。",
    source: "資料來源：Garena 傳說對決官方網站",
    all: "全部",
    open: "官方頁面",
    count: "位英雄",
  },
  modes: {
    kicker: "09 — MODES",
    title: "模式",
    lead: "模式名稱來自 Garena 公開頁。是否正在開放，以遊戲內為準。",
    emptyTitle: "目錄暫時讀不到",
    emptyBody: "請稍後再看。",
    source: "每張卡片連到原始公告。",
    players: "人數",
  },
};

const en = {
  meta: {
    homeTitle: "MOS — Arena of Valor team",
    homeDescription: "Guild MOOHSIA, team 暮霞｜MOS. Apply only on this site. Contact Info@moohsia.com.",
    titleSuffix: "暮霞｜MOS",
  },
  nav: {
    home: "Home",
    about: "Team",
    roster: "Roster",
    news: "News",
    contact: "Contact",
    player: "Player",
    heroes: "Heroes",
    modes: "Modes",
    activities: "Events",
    apply: "Apply",
    menu: "Menu",
    close: "Close",
    lang: "切換為繁體中文",
    langShort: "中",
    skip: "Skip to content",
    recruitChip: "Apply on site",
    sys: "CH // PUBLIC",
    footerLabel: "Footer",
  },
  intro: {
    label: "暮霞｜MOS",
    sub: "ARENA OF VALOR",
    skip: "Skip intro",
  },
  footer: {
    blurb: "Guild MOOHSIA. Team 暮霞｜MOS.",
    rule: "Apply only on this website. Discord is not open to join.",
    recruit: "Apply on site",
    explore: "On this site",
  },
  home: {
    kicker: "ARENA OF VALOR",
    kickerZh: "暮霞｜MOS",
    tagline: "Dusk holds. The line stays.",
    taglineAlt: "暮色未歇，戰線仍在。",
    lead: "Guild MOOHSIA, team 暮霞｜MOS. Dusk holds. The line stays. Apply on this site. Discord is not open to join.",
    ctaTeam: "Enter the team",
    ctaRoster: "Roster",
    ctaContact: "Email",
    ctaApply: "Apply",
    chips: [
      { text: "Arena of Valor", tone: "calm" },
      { text: "Apply on site", tone: "alert" },
      { text: "Record unannounced", tone: "calm" },
      { text: "Roster pending", tone: "calm" },
    ],
    crestSig: "SIG // DUSK",
    crestRec: "APPLY // SITE",
    hudChannel: "CH // PUBLIC",
    hudGame: "AOV // ARENA OF VALOR",
    ticker: "GUILD MOOHSIA · TEAM 暮霞｜MOS · ARENA OF VALOR · APPLY ON SITE · DISCORD IS CLOSED · ROSTER PENDING · Info@moohsia.com · ",
    metricsKicker: "00 — STAGE",
    metrics: [
      { index: "01", label: "Title", value: "Arena of Valor", note: "Home game" },
      { index: "02", label: "Gate", value: "Apply", note: "Discord is closed" },
      { index: "03", label: "Lineup", value: "Soon", note: "Roster coming soon" },
      { index: "04", label: "Mail", value: "Team inbox", note: "Info@moohsia.com" },
    ],
    identityKicker: "01 — IDENTITY",
    identityTitle: "About MOS",
    identityLead: "Named for dusk. Playing Arena of Valor.",
    cards: [
      {
        index: "01",
        title: "The team",
        body: "Guild MOOHSIA. Team 暮霞｜MOS plays Arena of Valor.",
      },
      {
        index: "02",
        title: "Dusk",
        body: "Ember, violet, and dusk are the colors of this team.",
      },
      {
        index: "03",
        title: "Recruitment",
        body: "Join by applying on this website. Discord is not open to join.",
      },
      {
        index: "04",
        title: "Record",
        body: "This season’s results are not out yet.",
      },
    ],
    boardKicker: "02 — STATUS",
    boardTitle: "Right now",
    boardNote: "",
    rows: [
      ["Title", "Arena of Valor"],
      ["Recruitment", "Apply on site"],
      ["Discord", "Not open to join"],
      ["Roster", "Coming soon"],
      ["Match record", "Not published"],
      ["Sponsors", "Not published"],
      ["Contact", "Info@moohsia.com"],
    ],
    fixtureKicker: "03 — FIXTURE",
    fixtureTitle: "Next match",
    fixtureLead: "The schedule is not out yet.",
    fixtureNote: "",
    fixtures: [
      { id: "NEXT", title: "To be announced", meta: "Opponent and time TBA" },
    ],
    rosterKicker: "04 — ROSTER",
    rosterTitle: "Roster",
    rosterLead: "The lineup is coming soon.",
    rosterCta: "View roster",
    signalKicker: "05 — SIGNAL",
    signalTitle: "Team signal",
    signalCta: "Open the feed",
    finaleKicker: "06 — TRANSMIT",
    finaleTitle: "Reach the team",
    finaleBody: "Press, partners, and team business: write to this address. Apply on this site to join.",
    playerKicker: "07 — PLAYER",
    playerTitle: "Player record",
    playerLead: "Only published personal data is shown.",
    playerCta: "Open the player page",
    playerEmpty: "Personal record not published.",
    catalogKicker: "08 — CATALOG",
    catalogTitle: "Heroes and modes",
    catalogLead: "Official public catalog. Not a team result.",
    heroesCta: "Hero roster",
    modesCta: "Game modes",
  },
  about: {
    kicker: "02 — TEAM",
    title: "Team",
    lead: "Guild MOOHSIA, team 暮霞｜MOS. Dusk holds. The line stays.",
    pending: "To be announced",
    manifestoKicker: "DUSK",
    manifestoTitle: "Dusk holds",
    manifesto: "The name is the last light of dusk, while the embers are still bright. This team plays Arena of Valor.",
    principlesKicker: "NOW",
    principlesTitle: "Right now",
    principles: [
      "The game is Arena of Valor.",
      "Apply only on this website. Discord is not open to join.",
      "The roster is coming soon.",
      "This season’s results are not out yet.",
      "Sponsors are not announced.",
      "Contact Info@moohsia.com.",
    ],
    recruitTitle: "Apply on site",
    recruitBody: "To join, use the form on this website. Discord is not open to join. A one-time invite is emailed only after approval.",
  },
  roster: {
    kicker: "03 — ROSTER",
    title: "Roster",
    lead: "The roster is coming soon.",
    slot: "Roster coming soon",
    slotMeta: "Role to be announced",
    stamp: "Pending",
    stampLive: "Active",
    emptyNote: "Lineup coming soon.",
    liveLead: "The lineup.",
    rolePending: "Role unannounced",
    stageKicker: "LINEUP // PENDING",
  },
  news: {
    kicker: "04 — SIGNAL",
    title: "News",
    lead: "Matches and team news.",
    emptyTitle: "No news yet",
    emptyBody: "New posts will show up here.",
    silent: "SIGNAL // SILENT",
    feed: "NO PUBLIC FEED",
    wireLabel: "Wire",
    reserved: [
      { id: "01", title: "No announcement", meta: "—" },
      { id: "02", title: "No fixture", meta: "—" },
      { id: "03", title: "No result", meta: "—" },
    ],
    reservedNote: "",
  },
  contact: {
    kicker: "05 — CONTACT",
    title: "Contact",
    lead: "Press, partners, and team business: write here.",
    emailLabel: "Email the team",
    only: "Info@moohsia.com",
    recruitTitle: "Apply on site",
    recruitBody: "Applications are accepted only on this website. Discord is not open to join.",
    sheetKicker: "CHANNELS",
    sheet: [
      ["01  Mail", "Info@moohsia.com", "Open"],
      ["02  Recruit", "Apply on site", "Open"],
      ["03  Discord", "Not open to join", "Shut"],
    ],
    writeTitle: "Team inbox",
    writeBody: "Write to Info@moohsia.com. Apply on this site to join.",
  },
  notFound: {
    kicker: "404 — OFF MAP",
    title: "Page not on the map",
    lead: "That address is not part of the team site.",
    back: "Back home",
  },
  player: {
    kicker: "07 — PLAYER",
    title: "Player record",
    lead: "Personal stats appear only after they are published.",
    emptyTitle: "Not published",
    emptyBody: "The personal record is not public yet. It shows up here after it is filled in and published.",
    pending: "To be announced",
    handleLabel: "Game ID",
    nameLabel: "Display name",
    roleLabel: "Role",
    laneLabel: "Lane",
    rankLabel: "Rank",
    seasonLabel: "Season",
    serverLabel: "Server",
    titleLabel: "Title",
    heroesLabel: "Signature heroes",
    bioLabel: "Bio",
    statsKicker: "RECORD",
    matchesKicker: "MATCHES",
    matchesEmpty: "No published matches.",
    played: "Played",
    wins: "Wins",
    winRate: "Win rate",
    kda: "KDA",
    kills: "Kills",
    deaths: "Deaths",
    assists: "Assists",
    gold: "Gold",
    damage: "Damage",
    mvp: "MVP",
    uidLabel: "UID",
    sections: {
      heroes: "Signature heroes",
      history: "Match history",
      battle: "Battle data",
      reputation: "Reputation",
      honors: "Championship honors",
      titles: "Honor titles",
    },
    radar: { output: "Damage", kda: "KDA", farm: "Farm", teamfight: "Teamfight", survival: "Survival" },
    medals: {
      godlike: "Godlike",
      penta: "Penta",
      quadra: "Quadra",
      triple: "Triple",
      supreme: "Supreme",
      gold: "Gold",
      silver: "Silver",
      loseMvp: "Loss MVP",
    },
    tabs: {
      board: "Overview",
      data: "Stats",
      output: "Damage",
      survival: "Taken",
      farm: "Farm",
      record: "Score",
      team: "Team",
    },
    charts: "Charts",
    highlight: "Highlight",
    noChart: "No numbers to chart yet.",
    reputationEmpty: "Reputation has not been entered.",
    honorsEmpty: "No championship honors yet.",
    titlesEmpty: "No honor titles yet.",
    heroesEmpty: "No signature heroes yet.",
  },
  activities: {
    kicker: "10 — OFFICIAL",
    title: "Official events",
    lead: "Activities, news, and esports posts from public Garena pages. Not this team's fixtures.",
    emptyTitle: "No events loaded",
    emptyBody: "The daily refresh, or the admin refresh, fills this list from the public pages.",
    source: "Source: public Garena Arena of Valor news pages. What is still live is whatever those pages say.",
    all: "All",
    activity: "Event",
    announcement: "News",
    esports: "Esports",
    open: "Official post",
  },
  apply: {
    kicker: "11 — APPLY",
    title: "Apply",
    lead: "Guild MOOHSIA and team 暮霞｜MOS take applications only on this website. Discord is not open to join.",
    rank: "Highest ranked tier",
    rankHint: "Gold is the minimum. Below Gold is rejected.",
    uid: "UID",
    uidHint: "Digits only.",
    nickname: "In-game name",
    email: "Email",
    gender: "Gender",
    age: "Age band",
    motivation: "Why do you want to join?",
    positions: "Roles",
    positionsHint: "Choose exactly 2.",
    weekday: "Weekday play time",
    holiday: "Weekend play time",
    practice: "Practice time you can make",
    practiceHint: "Use a concrete range, for example 20:00～22:00.",
    conduct: "I agree: respect, kindness, and inclusion; no money between members; follow the official rules.",
    submit: "Submit application",
    discord: "Discord is not open for cold join. After approval, the owner emails a one-time invite.",
    sent: "Application received.",
    sentBody: "When mail is configured, the owner sees it at Info@moohsia.com.",
    fail: "This was not submitted.",
  },
  heroes: {
    kicker: "08 — HEROES",
    title: "Heroes",
    lead: "The list comes from the public Garena Arena of Valor hero page.",
    emptyTitle: "Catalog unavailable",
    emptyBody: "Try again in a moment.",
    source: "Source: the official Garena Arena of Valor site",
    all: "All",
    open: "Official page",
    count: "heroes",
  },
  modes: {
    kicker: "09 — MODES",
    title: "Modes",
    lead: "Mode names come from public Garena pages. What is in rotation is whatever the game shows.",
    emptyTitle: "Catalog unavailable",
    emptyBody: "Try again in a moment.",
    source: "Each card links to the original post.",
    players: "Players",
  },
};

function snapshot() {
  return {
    version: 1,
    contactEmail: CONTACT_EMAIL,
    placeholderSlots: PLACEHOLDER_SLOTS,
    profileFields: structuredClone(profileFields),
    rosterMembers: structuredClone(rosterMembers),
    newsPosts: structuredClone(newsPosts),
    player: emptyPlayer(),
    copy: {
      zh: structuredClone(zh),
      en: structuredClone(en),
    },
  };
}

let current = snapshot();

export function getDefaultDocument() {
  return snapshot();
}

function mergeCopy(base, incoming) {
  if (typeof base === "string") return typeof incoming === "string" ? incoming : base;
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (base && typeof base === "object") {
    const out = {};
    for (const key of Object.keys(base)) out[key] = mergeCopy(base[key], incoming?.[key]);
    return out;
  }
  return base;
}

function adoptPublicPlayer(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const matches = Array.isArray(value.matches) ? value.matches.map((match) => ({ ...match, publish: true })) : [];
  return toPublicPlayer(cleanPlayer({ ...value, publish: true, matches }));
}

function usableEmail(value, fallback) {
  const text = typeof value === "string" ? value.trim() : "";
  if (/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(text) && text.length <= 120) return text;
  return fallback;
}

/**
 * Overlay published CMS content onto the built-in defaults.
 * Missing pieces stay on the defaults so a partial document cannot blank the site.
 * @param {unknown} payload
 */
export function applyPublishedContent(payload) {
  const base = snapshot();
  const doc = payload && typeof payload === "object" ? /** @type {Record<string, any>} */ (payload) : {};
  const slots = Number(doc.placeholderSlots);
  current = {
    version: 1,
    contactEmail: usableEmail(doc.contactEmail, base.contactEmail),
    placeholderSlots: Number.isInteger(slots) && slots >= 0 && slots <= 12 ? slots : base.placeholderSlots,
    profileFields: Array.isArray(doc.profileFields) ? doc.profileFields : base.profileFields,
    rosterMembers: Array.isArray(doc.rosterMembers) ? doc.rosterMembers : base.rosterMembers,
    newsPosts: Array.isArray(doc.newsPosts) ? doc.newsPosts : base.newsPosts,
    player: adoptPublicPlayer(doc.player),
    copy: {
      zh: mergeCopy(base.copy.zh, doc.copy?.zh),
      en: mergeCopy(base.copy.en, doc.copy?.en),
    },
  };
}

export function getCopy(lang) {
  return lang === "en" ? current.copy.en : current.copy.zh;
}

export function getRosterMembers() {
  return current.rosterMembers;
}

export function getNewsPosts() {
  return current.newsPosts;
}

export function getProfileFields() {
  return current.profileFields;
}

export function getPlaceholderSlots() {
  return current.placeholderSlots;
}

export function getContactEmail() {
  return current.contactEmail;
}

export function getPlayer() {
  const player = current.player;
  if (!player || player.publish === false) return null;
  return player;
}

export function getMailto() {
  return `mailto:${current.contactEmail}`;
}

export const NAV = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/roster", key: "roster" },
  { href: "/player", key: "player" },
  { href: "/heroes", key: "heroes" },
  { href: "/modes", key: "modes" },
  { href: "/activities", key: "activities" },
  { href: "/news", key: "news" },
  { href: "/apply", key: "apply" },
  { href: "/contact", key: "contact" },
];
