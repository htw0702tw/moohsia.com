import {
  emptyArcanaRow,
  emptyBadges,
  emptyBoardPlayer,
  emptyBuild,
  emptyHeroCard,
  emptyHighlight,
  emptyHonor,
  emptyMatch,
  emptyPlayer,
  emptyPrivilege,
  emptyReputation,
  emptySeason,
  emptyTitle,
  matchRecency,
} from "../shared/player.js";

const TABS = [
  ["profile", "檔案"],
  ["battle", "對戰資料"],
  ["builds", "配裝"],
  ["matches", "歷史戰績"],
  ["heroes", "常用英雄"],
  ["honors", "榮譽"],
  ["media", "媒體"],
];

const RADAR = [
  ["output", "輸出", "80"],
  ["kda", "KDA", "70"],
  ["farm", "發育", "60"],
  ["teamfight", "團戰", "75"],
  ["survival", "生存", "55"],
];

const MEDALS = [
  ["godlike", "超神"],
  ["penta", "五殺"],
  ["quadra", "四殺"],
  ["triple", "三殺"],
  ["supreme", "頂級"],
  ["gold", "金牌"],
  ["silver", "銀牌"],
  ["loseMvp", "敗方 MVP"],
];

const SKILLS = [
  ["", "未填"],
  ["1", "技能 1"],
  ["2", "技能 2"],
  ["3", "技能 3"],
  ["4", "大招"],
];

const RESULTS = [
  ["", "未填"],
  ["勝", "勝利"],
  ["敗", "敗北"],
];

const SIDES = [
  ["", "未填"],
  ["blue", "藍方"],
  ["red", "紅方"],
];

const ARCANA_COLORS = [
  ["red", "紅銘文"],
  ["purple", "紫銘文"],
  ["green", "綠銘文"],
  ["", "其他"],
];

const LANES = ["對抗路", "中路", "發育路", "打野", "輔助"];
const RANKS = ["黃金", "白金", "鑽石", "星耀", "永恆傳說"];
const MODE_EXTRAS = ["排位賽", "巔峰對決", "冠軍賽", "5V5經典競技", "混沌大亂鬥", "三人對決"];
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif";
const MEDIA_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm`;

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function newId() {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 12);
}

function problem(value, kind) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  const plain = text.replace(/,/g, "");
  if (kind === "int" && !/^\d+$/.test(plain)) return "請填整數，例如 14。";
  if (kind === "rate" && !/^\d{1,3}(\.\d{1,2})?$/.test(plain)) return "請填數字，不要加 %。例如 71.4。";
  if (kind === "radar") {
    if (!/^\d{1,3}(\.\d{1,2})?$/.test(plain)) return "請填 0 到 100，例如 80。";
    const number = Number(plain);
    if (number < 0 || number > 100) return "請填 0 到 100，例如 80。";
  }
  if (kind === "clock" && !/^\d{1,3}:\d{2}$/.test(text)) return "請用分:秒，例如 12:16。";
  if (kind === "uid" && !/^\d+$/.test(text)) return "UID 只能是數字。";
  if (kind === "when" && !/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2})?$/.test(text)) return "例如 2026-09-25 12:25。";
  return "";
}

function field(label, control, hint = "", error = "") {
  return `<label><span>${esc(label)}</span>${control}${error ? `<small class="field-error">${esc(error)}</small>` : ""}${hint ? `<small class="hint">${esc(hint)}</small>` : ""}</label>`;
}

function textInput(attrs, value, extra = "") {
  return `<input ${extra} value="${esc(value ?? "")}" ${attrs}>`;
}

function area(attrs, value) {
  return `<textarea rows="4" ${attrs}>${esc(value ?? "")}</textarea>`;
}

function select(attrs, value, options) {
  const known = options.some(([option]) => option === value);
  const extra = value && !known ? `<option value="${esc(value)}" selected>${esc(value)}</option>` : "";
  const body = options
    .map(([option, label]) => `<option value="${esc(option)}"${option === value ? " selected" : ""}>${esc(label)}</option>`)
    .join("");
  return `<select ${attrs}>${extra}${body}</select>`;
}

function check(attrs, checked, label) {
  return `<label class="check"><input type="checkbox" ${attrs}${checked ? " checked" : ""}>${esc(label)}</label>`;
}

function heroChoices(catalog) {
  return (catalog?.heroes || [])
    .map((hero) => {
      const name = hero?.name?.zh || hero?.name?.en || "";
      if (!name) return null;
      return { id: String(hero.id || ""), name, role: hero?.roleLabel?.zh || "" };
    })
    .filter(Boolean);
}

function modeChoices(catalog) {
  const names = MODE_EXTRAS.slice();
  for (const mode of catalog?.modes || []) {
    const name = mode?.name?.zh || mode?.name?.en || "";
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function roleChoices(catalog) {
  const names = ["坦克", "戰士", "刺客", "法師", "射手", "輔助"];
  for (const role of catalog?.roles || []) {
    const name = role?.zh || role?.en || "";
    if (name && !names.includes(name)) names.push(name);
  }
  return names;
}

function heroIdFor(name, catalog) {
  return heroChoices(catalog).find((hero) => hero.name === String(name || "").trim())?.id || "";
}

function datalist(id, values) {
  return `<datalist id="${id}">${values.map((value) => `<option value="${esc(value)}"></option>`).join("")}</datalist>`;
}

function lists(catalog) {
  return [
    datalist("hero-choices", heroChoices(catalog).map((hero) => hero.name)),
    datalist("mode-choices", modeChoices(catalog)),
    datalist("role-choices", roleChoices(catalog)),
    datalist("lane-choices", LANES),
    datalist("rank-choices", RANKS),
  ].join("");
}

function padArcana(build) {
  build.arcana = Array.isArray(build.arcana) ? build.arcana : [];
  for (const color of ["red", "purple", "green"]) {
    if (!build.arcana.some((row) => row?.color === color)) build.arcana.push(emptyArcanaRow(color));
  }
}

export function ensurePlayerRecord(player) {
  const base = emptyPlayer();
  const record = player && typeof player === "object" ? player : emptyPlayer();
  record.stats = { ...base.stats, ...(record.stats || {}) };
  record.name = { ...base.name, ...(record.name || {}) };
  record.role = { ...base.role, ...(record.role || {}) };
  record.lane = { ...base.lane, ...(record.lane || {}) };
  record.rank = { ...base.rank, ...(record.rank || {}) };
  record.peakRank = { ...base.peakRank, ...(record.peakRank || {}) };
  record.season = { ...base.season, ...(record.season || {}) };
  record.server = { ...base.server, ...(record.server || {}) };
  record.title = { ...base.title, ...(record.title || {}) };
  record.bio = { ...base.bio, ...(record.bio || {}) };
  record.signatureHeroes = { ...base.signatureHeroes, ...(record.signatureHeroes || {}) };
  record.avatar = { ...emptyHighlight(), ...(record.avatar || {}), caption: { zh: "", en: "", ...(record.avatar?.caption || {}) } };
  record.reputation = {
    ...emptyReputation(),
    ...(record.reputation || {}),
    note: { zh: "", en: "", ...(record.reputation?.note || {}) },
    privileges: (record.reputation?.privileges || []).map((item) => ({
      ...emptyPrivilege(),
      ...item,
      name: { zh: "", en: "", ...(item?.name || {}) },
      note: { zh: "", en: "", ...(item?.note || {}) },
    })),
  };
  record.seasons = (record.seasons || []).map((season) => ({
    ...emptySeason(),
    ...season,
    radar: { ...emptySeason().radar, ...(season?.radar || {}) },
    medals: { ...emptySeason().medals, ...(season?.medals || {}) },
  }));
  record.heroPool = (record.heroPool || []).map((card) => ({
    ...emptyHeroCard(),
    ...card,
    note: { zh: "", en: "", ...(card?.note || {}) },
  }));
  record.championships = (record.championships || []).map((item) => ({
    ...emptyHonor(),
    ...item,
    note: { zh: "", en: "", ...(item?.note || {}) },
  }));
  record.honorTitles = (record.honorTitles || []).map((item) => ({
    ...emptyTitle(),
    ...item,
    note: { zh: "", en: "", ...(item?.note || {}) },
  }));
  record.builds = (record.builds || []).map((build) => {
    const next = {
      ...emptyBuild(),
      ...build,
      name: { zh: "", en: "", ...(build?.name || {}) },
      note: { zh: "", en: "", ...(build?.note || {}) },
      skillOrder: Array.isArray(build?.skillOrder) ? build.skillOrder.slice(0, 4) : ["", "", "", ""],
      items: Array.isArray(build?.items) ? build.items.slice(0, 6) : [],
      shot: { ...emptyHighlight(), ...(build?.shot || {}), caption: { zh: "", en: "", ...(build?.shot?.caption || {}) } },
    };
    while (next.skillOrder.length < 4) next.skillOrder.push("");
    while (next.items.length < 6) next.items.push("");
    padArcana(next);
    return next;
  });
  record.matches = (record.matches || []).map((match) => ({
    ...emptyMatch(),
    ...match,
    badges: { ...emptyBadges(), ...(match?.badges || {}) },
    note: { zh: "", en: "", ...(match?.note || {}) },
    highlight: {
      ...emptyHighlight(),
      ...(match?.highlight || {}),
      caption: { zh: "", en: "", ...(match?.highlight?.caption || {}) },
    },
    board: (Array.isArray(match?.board) ? match.board : []).map((row) => ({
      ...emptyBoardPlayer(),
      ...row,
      items: Array.from({ length: 6 }, (_, index) => row?.items?.[index] || ""),
    })),
  }));
  return record;
}

function mediaPreview(media) {
  if (!media?.key?.startsWith("hl/")) return "";
  const id = media.key.slice(3);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return "";
  const src = `/api/admin/media/${id}`;
  if (media.kind === "video") return `<video class="media-preview" controls playsinline preload="metadata" src="${src}"></video>`;
  return `<img class="media-preview" alt="" src="${src}">`;
}

function dropzone(kind, index, current, accept, title, hint) {
  const indexAttr = index == null ? "" : ` data-index="${index}"`;
  return `<div class="dropzone" data-upload="${kind}"${indexAttr}>
    <p class="group-label">${esc(title)}</p>
    <input data-file="${kind}"${indexAttr} type="file" accept="${accept}">
    <p class="hint">${esc(hint)} ${current?.key ? "已上傳。記得按儲存草稿。" : "尚未上傳。"}</p>
    ${mediaPreview(current)}
    <div class="row-actions">
      <button class="btn" type="button" data-action="media-upload" data-upload="${kind}"${indexAttr}>上傳</button>
      ${current?.key ? `<button class="ghost" type="button" data-action="media-clear" data-upload="${kind}"${indexAttr}>移除</button>` : ""}
    </div>
  </div>`;
}

function pair(html) {
  return `<div class="pair">${html}</div>`;
}

function profileTab(player, text, choice) {
  const bi = (label, key, hint = "") =>
    pair(
      field(`${label} 繁中`, textInput(`data-player="${key}" data-lang="zh"`, player[key]?.zh, text), hint) +
        field(`${label} EN`, textInput(`data-player="${key}" data-lang="en"`, player[key]?.en, text)),
    );
  return `<div class="stack">
    <p class="hint">照遊戲內個人頁填。留白就是尚未填寫，公開頁會顯示待公布。勾選公開之後，還要按「發布到網站」。</p>
    ${check(`data-player="publish"`, player.publish, "公開這份個人數據")}
    ${pair(
      field("遊戲 ID", textInput(`data-player="handle"`, player.handle, text), "遊戲內暱稱，不能剛好是 moohsia。") +
        field("UID", textInput(`data-player="uid"`, player.uid, text), "全數字。例如 1234567890123456。", problem(player.uid, "uid")),
    )}
    ${bi("顯示名稱", "name", "對外顯示的名字。可與遊戲 ID 不同。")}
    ${pair(
      field("位置 繁中", textInput(`data-player="role" data-lang="zh" list="role-choices"`, player.role?.zh, text), "例如：射手。可從目錄選，也可自己打。") +
        field("位置 EN", textInput(`data-player="role" data-lang="en"`, player.role?.en, text)),
    )}
    ${pair(
      field("路線 繁中", textInput(`data-player="lane" data-lang="zh" list="lane-choices"`, player.lane?.zh, text), "例如：發育路、打野。") +
        field("路線 EN", textInput(`data-player="lane" data-lang="en"`, player.lane?.en, text)),
    )}
    ${pair(
      field("目前段位 繁中", textInput(`data-player="rank" data-lang="zh" list="rank-choices"`, player.rank?.zh, text), "例如：永恆傳說 50 星。") +
        field("目前段位 EN", textInput(`data-player="rank" data-lang="en"`, player.rank?.en, text)),
    )}
    ${pair(
      field("歷史最高段位 繁中", textInput(`data-player="peakRank" data-lang="zh" list="rank-choices"`, player.peakRank?.zh, text), "例如：永恆傳說。") +
        field("歷史最高段位 EN", textInput(`data-player="peakRank" data-lang="en"`, player.peakRank?.en, text)),
    )}
    ${bi("賽季", "season", "例如：2026-S4。")}
    ${bi("伺服器", "server")}
    ${bi("頭銜", "title")}
    ${bi("常用英雄摘要", "signatureHeroes", "一句話即可。詳細場次請到「常用英雄」。")}
    ${pair(field("加入日期", textInput(`data-player="joinDate" type="date"`, player.joinDate, text), "入隊日期。"))}
    ${field("簡介 繁中", area(`data-player="bio" data-lang="zh" ${text}`, player.bio?.zh), "對外的短介紹。")}
    ${field("簡介 EN", area(`data-player="bio" data-lang="en" ${text}`, player.bio?.en))}
    ${dropzone("avatar", null, player.avatar, IMAGE_ACCEPT, "頭像", "拖放圖片，或選擇檔案後按上傳。接受 jpg、png、webp、gif，最大 8MB。")}
    ${field("頭像說明 繁中", textInput(`data-player="avatar" data-lang="zh" data-part="caption"`, player.avatar?.caption?.zh, text))}
  </div>`;
}

function battleTab(player, text) {
  const seasons = player.seasons
    .map((season, index) => {
      const radar = RADAR.map(([key, label, example]) =>
        field(label, textInput(`data-season="${index}" data-radar="${key}"`, season.radar?.[key], text), `0–100。例如 ${example}。留白就不會畫。`, problem(season.radar?.[key], "radar")),
      ).join("");
      const medals = MEDALS.map(([key, label]) =>
        field(label, textInput(`data-season="${index}" data-medal="${key}"`, season.medals?.[key], text), "次數。例如 1。沒有就留白，遊戲裡是 0 才填 0。", problem(season.medals?.[key], "int")),
      ).join("");
      return `<article class="repeat"><header><b>賽季 ${index + 1}</b><button class="ghost" type="button" data-action="season-remove" data-index="${index}">刪除</button></header>
        ${pair(
          field("賽季名稱", textInput(`data-season="${index}" data-field="label"`, season.label, text), "例如：2026-S4。") +
            field("模式", textInput(`data-season="${index}" data-field="mode" list="mode-choices"`, season.mode, text), "例如：排位賽。"),
        )}
        ${pair(
          field("場次", textInput(`data-season="${index}" data-field="played"`, season.played, text), "例如：7。", problem(season.played, "int")) +
            field("勝場", textInput(`data-season="${index}" data-field="wins"`, season.wins, text), "例如：5。", problem(season.wins, "int")) +
            field("勝率", textInput(`data-season="${index}" data-field="winRate"`, season.winRate, text), "不要加 %。例如 71.4。", problem(season.winRate, "rate")) +
            field("MVP", textInput(`data-season="${index}" data-field="mvp"`, season.mvp, text), "例如：3。", problem(season.mvp, "int")),
        )}
        <h3>雷達</h3>
        <p class="hint">對齊遊戲內五個軸：輸出、KDA、發育、團戰、生存。</p>
        <div class="pair">${radar}</div>
        <h3>勳章</h3>
        <div class="pair">${medals}</div>
      </article>`;
    })
    .join("");
  const reputation = player.reputation;
  const perks = (reputation.privileges || [])
    .map(
      (item, index) => `<article class="repeat"><header><b>特權 ${index + 1}</b><button class="ghost" type="button" data-action="perk-remove" data-index="${index}">刪除</button></header>
      ${pair(
        field("等級", textInput(`data-perk="${index}" data-field="level"`, item.level, text), "例如：3。") +
          check(`data-perk="${index}" data-field="unlocked"`, item.unlocked, "已解鎖"),
      )}
      ${field("名稱 繁中", textInput(`data-perk="${index}" data-lang="zh" data-part="name"`, item.name?.zh, text))}
      ${field("說明 繁中", textInput(`data-perk="${index}" data-lang="zh" data-part="note"`, item.note?.zh, text))}
    </article>`,
    )
    .join("");
  const stats = player.stats;
  return `<div class="stack">
    <h2>總覽數字</h2>
    <p class="hint">這列是個人頁上方的總數。賽季雷達請填在下面每一季。K、D、A 分開填。KDA 可留白，公開頁會用 (擊殺+助攻)/死亡 計算。</p>
    <div class="pair">
      ${field("場次", textInput(`data-player-stat="played"`, stats.played, text), "例如：7。")}
      ${field("勝場", textInput(`data-player-stat="wins"`, stats.wins, text), "例如：5。")}
      ${field("勝率", textInput(`data-player-stat="winRate"`, stats.winRate, text), "例如：71.4。", problem(stats.winRate, "rate"))}
      ${field("KDA", textInput(`data-player-stat="kda"`, stats.kda, text), "可留白。例如：4.67。")}
      ${field("MVP", textInput(`data-player-stat="mvp"`, stats.mvp, text), "例如：3。")}
      ${field("擊殺 K", textInput(`data-player-stat="kills"`, stats.kills, text), "例如：14。", problem(stats.kills, "int"))}
      ${field("死亡 D", textInput(`data-player-stat="deaths"`, stats.deaths, text), "例如：6。", problem(stats.deaths, "int"))}
      ${field("助攻 A", textInput(`data-player-stat="assists"`, stats.assists, text), "例如：4。", problem(stats.assists, "int"))}
      ${field("經濟", textInput(`data-player-stat="gold"`, stats.gold, text), "例如：10079。", problem(stats.gold, "int"))}
      ${field("輸出", textInput(`data-player-stat="damage"`, stats.damage, text), "例如：165385。", problem(stats.damage, "int"))}
    </div>
    <h2>賽季雷達與勳章</h2>
    <div class="repeats">${seasons || `<p class="hint">還沒有賽季。按下面新增，例如先建「2026-S4／排位賽」。</p>`}</div>
    <button class="btn" type="button" data-action="season-add">新增賽季</button>
    <h2>信譽積分</h2>
    <p class="hint">沒有官方接口。照遊戲內信譽頁自己填。留白就不會出現在公開頁。</p>
    <div class="pair">
      ${field("分數", textInput(`data-reputation="score"`, reputation.score, text), "例如：100。", problem(reputation.score, "int"))}
      ${field("等級", textInput(`data-reputation="level"`, reputation.level, text), "例如：5。", problem(reputation.level, "int"))}
      ${field("經驗", textInput(`data-reputation="exp"`, reputation.exp, text), "例如：210。", problem(reputation.exp, "int"))}
      ${field("經驗上限", textInput(`data-reputation="expMax"`, reputation.expMax, text), "例如：270。", problem(reputation.expMax, "int"))}
    </div>
    ${field("說明 繁中", textInput(`data-reputation="note" data-lang="zh"`, reputation.note?.zh, text), "例如：滿分。")}
    <div class="repeats">${perks}</div>
    <button class="btn" type="button" data-action="perk-add">新增特權說明</button>
  </div>`;
}

function buildCard(build, index, text, choice, total) {
  const skills = build.skillOrder
    .map((value, slot) => field(`第 ${slot + 1} 優先`, select(`data-build="${index}" data-skill="${slot}" ${choice}`, value, SKILLS), "照遊戲內升級順序。"))
    .join("");
  const items = build.items
    .map((value, slot) => field(`裝備 ${slot + 1}`, textInput(`data-build="${index}" data-slot="${slot}"`, value, text), slot === 0 ? "例如：破甲弓。" : "照出裝格從左到右。"))
    .join("");
  const arcana = build.arcana
    .map((row, rowIndex) => {
      const extra = row.color ? "" : `<button class="ghost" type="button" data-action="arcana-remove" data-index="${index}" data-arcana="${rowIndex}">刪除</button>`;
      return `<div class="pair">
        ${field("顏色", select(`data-build="${index}" data-arcana="${rowIndex}" data-field="color" ${choice}`, row.color, ARCANA_COLORS))}
        ${field("銘文", textInput(`data-build="${index}" data-arcana="${rowIndex}" data-field="name"`, row.name, text), "例如：異變、紅月、隱匿。目錄沒有銘文表，請照遊戲內名稱打。")}
        ${field("數量", textInput(`data-build="${index}" data-arcana="${rowIndex}" data-field="count"`, row.count, text), "例如：10。", problem(row.count, "int"))}
        ${extra}
      </div>`;
    })
    .join("");
  return `<article class="repeat"><header><b>配裝 ${index + 1}${build.hero ? ` · ${esc(build.hero)}` : ""}</b>
      <span class="row-actions">
        <button class="ghost" type="button" data-action="build-up" data-index="${index}"${index === 0 ? " disabled" : ""}>上移</button>
        <button class="ghost" type="button" data-action="build-down" data-index="${index}"${index === total - 1 ? " disabled" : ""}>下移</button>
        <button class="ghost" type="button" data-action="build-remove" data-index="${index}">刪除</button>
      </span>
    </header>
    ${pair(
      field("英雄", textInput(`data-build="${index}" data-field="hero" list="hero-choices"`, build.hero, text), "從英雄目錄選，或自己打名字。") +
        field("配裝名稱 繁中", textInput(`data-build="${index}" data-field="name" data-lang="zh"`, build.name?.zh, text), "例如：輸出裝。") +
        field("配裝名稱 EN", textInput(`data-build="${index}" data-field="name" data-lang="en"`, build.name?.en, text)) +
        field("路線", textInput(`data-build="${index}" data-field="lane" list="lane-choices"`, build.lane, text), "例如：發育路。"),
    )}
    <h3>技能升級順序</h3>
    <div class="pair">${skills}</div>
    <h3>六件裝備</h3>
    <p class="hint">可填官方裝備名稱，或戰績裡的裝備編號。公開頁會對上 Garena 裝備圖與說明。鞋子與附魔另外填，不要佔掉這六格，除非你的出裝就是這樣排。</p>
    <div class="slots">${items}</div>
    ${pair(
      field("鞋子", textInput(`data-build="${index}" data-field="boots"`, build.boots, text), "例如：聖者戰靴。") +
        field("附魔", textInput(`data-build="${index}" data-field="enchant"`, build.enchant, text), "例如：極限法穿。"),
    )}
    <h3>銘文</h3>
    ${arcana}
    <button class="btn" type="button" data-action="arcana-add" data-index="${index}">再加一條銘文</button>
    ${field("備註 繁中", area(`data-build="${index}" data-field="note" data-lang="zh" ${text}`, build.note?.zh), "對線思路、幾級成型。")}
    ${field("備註 EN", area(`data-build="${index}" data-field="note" data-lang="en" ${text}`, build.note?.en))}
    ${dropzone("build", index, build.shot, IMAGE_ACCEPT, "配裝截圖", "可上傳出裝截圖。拖放或選擇圖片後按上傳。")}
    ${field("截圖說明", textInput(`data-build="${index}" data-field="shot" data-lang="zh"`, build.shot?.caption?.zh, text))}
  </article>`;
}

function buildsTab(player, text, choice) {
  const cards = player.builds.map((build, index) => buildCard(build, index, text, choice, player.builds.length)).join("");
  return `<div class="stack">
    <p class="hint">一個英雄可以有多套配裝。順序可用上移、下移調整。公開頁會照這個順序顯示。</p>
    <div class="repeats">${cards || `<p class="hint">還沒有配裝。新增後選英雄，再填技能順序與六件裝備。</p>`}</div>
    <button class="btn" type="button" data-action="build-add">新增配裝</button>
  </div>`;
}

function boardRow(matchIndex, row, rowIndex, text, choice) {
  const items = (row.items || [])
    .map((value, slot) => field(`裝備 ${slot + 1}`, textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-item="${slot}"`, value, text)))
    .join("");
  return `<article class="repeat board-row">
    <header><b>${row.owner ? "自己" : `選手 ${rowIndex + 1}`}</b><button class="ghost" type="button" data-action="board-remove" data-index="${matchIndex}" data-row="${rowIndex}">刪除此列</button></header>
    ${pair(
      field("陣營", select(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="side" ${choice}`, row.side, SIDES)) +
        field("英雄", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="hero" list="hero-choices"`, row.hero, text), "例如：娜塔亞。") +
        field("IGN", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="ign"`, row.ign, text)) +
        field("路線", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="lane" list="lane-choices"`, row.lane, text)) +
        field("徽章", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="badge"`, row.badge, text), "例如：金牌。"),
    )}
    <div class="pair">
      ${field("K", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="kills"`, row.kills, text), "例如：14。", problem(row.kills, "int"))}
      ${field("D", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="deaths"`, row.deaths, text), "例如：6。", problem(row.deaths, "int"))}
      ${field("A", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="assists"`, row.assists, text), "例如：4。", problem(row.assists, "int"))}
      ${field("評分", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="score"`, row.score, text), "例如：11.7。", problem(row.score, "rate"))}
      ${field("經濟", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="gold"`, row.gold, text), "例如：10079。", problem(row.gold, "int"))}
      ${field("GPM", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="gpm"`, row.gpm, text), "每分鐘經濟。", problem(row.gpm, "int"))}
    </div>
    <div class="pair">
      ${field("英雄傷害", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="heroDamage"`, row.heroDamage, text), "例如：165385。", problem(row.heroDamage, "int"))}
      ${field("傷害占比", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="heroDamagePct"`, row.heroDamagePct, text), "0–100。例如 36.8。", problem(row.heroDamagePct, "radar"))}
      ${field("承受傷害", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="taken"`, row.taken, text), "例如：98447。", problem(row.taken, "int"))}
      ${field("承傷占比", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="takenPct"`, row.takenPct, text), "例如：34.0。", problem(row.takenPct, "radar"))}
      ${field("補兵", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="minions"`, row.minions, text), "補兵，不是治療。例如：30。", problem(row.minions, "int"))}
      ${field("控場", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="control"`, row.control, text), "例如：8.382。")}
      ${field("治療", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="healing"`, row.healing, text), "治療量，不是補兵。例如：7964。", problem(row.healing, "int"))}
      ${field("塔傷", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="tower"`, row.tower, text), "例如：2743。", problem(row.tower, "int"))}
      ${field("參團次數", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="teamfightCount"`, row.teamfightCount, text), "", problem(row.teamfightCount, "int"))}
      ${field("參團率", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="teamfightRate"`, row.teamfightRate, text), "例如：47.4。", problem(row.teamfightRate, "radar"))}
      ${field("輸出轉化", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="damageRatio"`, row.damageRatio, text), "例如：1.70。", problem(row.damageRatio, "rate"))}
      ${field("每次承傷", textInput(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="takenPer"`, row.takenPer, text), "例如：16407。", problem(row.takenPer, "int"))}
    </div>
    <h3>此列裝備</h3>
    <div class="slots">${items}</div>
    <div class="row-actions">
      ${check(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="mvp"`, row.mvp, "MVP")}
      ${check(`data-board="${matchIndex}" data-row="${rowIndex}" data-field="owner"`, row.owner, "這列是自己")}
    </div>
  </article>`;
}

function matchSummary(match) {
  const kda = [match.kills, match.deaths, match.assists].filter((part) => part !== "").join("/");
  return [match.result === "勝" ? "勝利" : match.result === "敗" ? "敗北" : match.result, match.hero, kda, match.duration, match.playedAt || match.date || "未填時間"]
    .filter(Boolean)
    .join(" · ");
}

function matchCard(match, index, open, text, choice) {
  const tone = match.result === "勝" ? "is-win" : match.result === "敗" ? "is-loss" : "";
  const badges = check(`data-match="${index}" data-field="mvp"`, match.mvp, "本場 MVP") + MEDALS.map(([key, label]) => check(`data-match="${index}" data-badge="${key}"`, match.badges?.[key], label)).join("");
  const board = (match.board || []).map((row, rowIndex) => boardRow(index, row, rowIndex, text, choice)).join("");
  const body = open
    ? `<div class="stack">
      ${pair(
        field("名稱", textInput(`data-match="${index}" data-field="label"`, match.label, text), "可留白。例如：練習賽。") +
          field("日期", textInput(`data-match="${index}" data-field="date" type="date"`, match.date, text)) +
          field("對局時間", textInput(`data-match="${index}" data-field="playedAt"`, match.playedAt, text), "例如：2026-09-25 12:25。", problem(match.playedAt, "when")) +
          field("時長", textInput(`data-match="${index}" data-field="duration"`, match.duration, text), "例如：12:16。", problem(match.duration, "clock")),
      )}
      ${pair(
        field("模式", textInput(`data-match="${index}" data-field="mode" list="mode-choices"`, match.mode, text), "例如：排位賽。") +
          field("地圖", textInput(`data-match="${index}" data-field="map"`, match.map, text), "沒有特別地圖可留白。") +
          field("英雄", textInput(`data-match="${index}" data-field="hero" list="hero-choices"`, match.hero, text), "自己使用的英雄。") +
          field("造型", textInput(`data-match="${index}" data-field="skin"`, match.skin, text), "沒有造型可留白。"),
      )}
      ${pair(
        field("結果", select(`data-match="${index}" data-field="result" ${choice}`, match.result, RESULTS)) +
          field("K", textInput(`data-match="${index}" data-field="kills"`, match.kills, text), "擊殺，分開填，不要寫成 14/6/4。", problem(match.kills, "int")) +
          field("D", textInput(`data-match="${index}" data-field="deaths"`, match.deaths, text), "死亡。例如：6。", problem(match.deaths, "int")) +
          field("A", textInput(`data-match="${index}" data-field="assists"`, match.assists, text), "助攻。例如：4。", problem(match.assists, "int")) +
          field("KDA 手填", textInput(`data-match="${index}" data-field="kda"`, match.kda, text), "可留白，公開頁會用 K、D、A 計算。"),
      )}
      ${pair(
        field("經濟", textInput(`data-match="${index}" data-field="gold"`, match.gold, text), "例如：10079。", problem(match.gold, "int")) +
          field("英雄傷害", textInput(`data-match="${index}" data-field="damage"`, match.damage, text), "例如：165385。", problem(match.damage, "int")) +
          field("承受傷害", textInput(`data-match="${index}" data-field="taken"`, match.taken, text), "例如：98447。", problem(match.taken, "int")) +
          field("補兵", textInput(`data-match="${index}" data-field="minions"`, match.minions, text), "補兵，不是治療。例如：30。", problem(match.minions, "int")),
      )}
      ${pair(
        field("控場", textInput(`data-match="${index}" data-field="control"`, match.control, text), "例如：8.382。") +
          field("治療", textInput(`data-match="${index}" data-field="healing"`, match.healing, text), "治療量，不是補兵。例如：7964。", problem(match.healing, "int")) +
          field("塔傷", textInput(`data-match="${index}" data-field="tower"`, match.tower, text), "例如：2743。", problem(match.tower, "int")),
      )}
      ${pair(
        field("藍方比分", textInput(`data-match="${index}" data-field="blueScore"`, match.blueScore, text), "例如：38。", problem(match.blueScore, "int")) +
          field("紅方比分", textInput(`data-match="${index}" data-field="redScore"`, match.redScore, text), "例如：18。", problem(match.redScore, "int")) +
          field("勝方", select(`data-match="${index}" data-field="winner" ${choice}`, match.winner, SIDES)) +
          field("自己在", select(`data-match="${index}" data-field="ownerSide" ${choice}`, match.ownerSide, SIDES)),
      )}
      <h3>本場勳章</h3>
      <div class="row-actions">${badges}</div>
      ${field("註記 繁中", textInput(`data-match="${index}" data-field="note" data-lang="zh"`, match.note?.zh, text))}
      ${field("註記 EN", textInput(`data-match="${index}" data-field="note" data-lang="en"`, match.note?.en, text))}
      ${check(`data-match="${index}" data-field="publish"`, match.publish, "這場對局公開")}
      ${dropzone("match", index, match.highlight, MEDIA_ACCEPT, "精彩對局", "截圖或影片。圖片 8MB，mp4／webm 32MB。拖放後按上傳。")}
      ${field("媒體說明", textInput(`data-match="${index}" data-field="highlight" data-lang="zh"`, match.highlight?.caption?.zh, text))}
      <h3>記分板</h3>
      <p class="hint">至少留自己那一列。想對齊遊戲內結算，可補滿十人：前五藍方、後五紅方。K、D、A、經濟、傷害分開填。</p>
      ${board || `<p class="hint">這場還沒有記分板。</p>`}
      <div class="row-actions">
        <button class="btn" type="button" data-action="board-add" data-index="${index}">新增一列</button>
        <button class="btn" type="button" data-action="board-fill" data-index="${index}">補滿十人</button>
      </div>
    </div>`
    : "";
  return `<article class="match-card ${tone}${open ? " is-open" : ""}">
    <header>
      <button class="match-summary" type="button" data-action="match-toggle" data-index="${index}">${esc(matchSummary(match) || `對局 ${index + 1}`)}</button>
      <button class="ghost" type="button" data-action="match-remove" data-index="${index}">刪除</button>
    </header>
    ${body}
  </article>`;
}

function matchesTab(player, ui, text, choice) {
  const ordered = player.matches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => matchRecency(b.match) - matchRecency(a.match) || b.index - a.index);
  const cards = ordered.map(({ match, index }) => matchCard(match, index, ui.openMatch === match.id, text, choice)).join("");
  return `<div class="stack">
    <p class="hint">最新的對局排在上面。點一列展開，照遊戲內結算填。自己的 K、D、A 要分開，不要合成一個欄位。沒勾「這場對局公開」就不會出現在網站上。</p>
    <div class="repeats">${cards || `<p class="hint">還沒有對局。新增後先填英雄、勝敗、K、D、A。</p>`}</div>
    <button class="btn" type="button" data-action="match-add">新增對局</button>
  </div>`;
}

function heroesTab(player, text) {
  const cards = player.heroPool
    .map((card, index) => {
      return `<article class="repeat"><header><b>英雄 ${index + 1}</b><button class="ghost" type="button" data-action="hero-remove" data-index="${index}">刪除</button></header>
      ${pair(
        field("英雄", textInput(`data-hero-card="${index}" data-field="hero" list="hero-choices"`, card.hero, text), "例如：娜塔亞。") +
          field("場次", textInput(`data-hero-card="${index}" data-field="matches"`, card.matches, text), "例如：42。", problem(card.matches, "int")) +
          field("勝率", textInput(`data-hero-card="${index}" data-field="winRate"`, card.winRate, text), "例如：61.9。", problem(card.winRate, "rate")) +
          field("MVP 次數", textInput(`data-hero-card="${index}" data-field="mvp"`, card.mvp, text), "例如：6。", problem(card.mvp, "int")),
      )}
      <p class="hint">K、D、A 是這個英雄的累計或場均，跟遊戲內常用英雄頁同一套拆法。</p>
      <div class="pair">
        ${field("K", textInput(`data-hero-card="${index}" data-field="kills"`, card.kills, text), "例如：320。", problem(card.kills, "int"))}
        ${field("D", textInput(`data-hero-card="${index}" data-field="deaths"`, card.deaths, text), "例如：140。", problem(card.deaths, "int"))}
        ${field("A", textInput(`data-hero-card="${index}" data-field="assists"`, card.assists, text), "例如：210。", problem(card.assists, "int"))}
      </div>
      ${field("註記 繁中", textInput(`data-hero-card="${index}" data-lang="zh" data-field="note"`, card.note?.zh, text))}
    </article>`;
    })
    .join("");
  return `<div class="stack">
    <p class="hint">公開頁的常用英雄。英雄可從目錄選。</p>
    <div class="repeats">${cards || `<p class="hint">還沒有常用英雄。</p>`}</div>
    <button class="btn" type="button" data-action="hero-add">新增英雄</button>
  </div>`;
}

function honorsTab(player, text) {
  const honors = player.championships
    .map(
      (item, index) => `<article class="repeat"><header><b>冠軍賽榮譽 ${index + 1}</b><button class="ghost" type="button" data-action="honor-remove" data-index="${index}">刪除</button></header>
      ${pair(
        field("名稱", textInput(`data-honor="${index}" data-field="title"`, item.title, text)) +
          field("賽季", textInput(`data-honor="${index}" data-field="season"`, item.season, text), "例如：2026-S4。"),
      )}
      ${field("註記", textInput(`data-honor="${index}" data-lang="zh" data-field="note"`, item.note?.zh, text))}
    </article>`,
    )
    .join("");
  const titles = player.honorTitles
    .map(
      (item, index) => `<article class="repeat"><header><b>頭銜 ${index + 1}</b><button class="ghost" type="button" data-action="title-remove" data-index="${index}">刪除</button></header>
      ${field("名稱", textInput(`data-title-row="${index}" data-field="name"`, item.name, text))}
      ${field("註記", textInput(`data-title-row="${index}" data-lang="zh" data-field="note"`, item.note?.zh, text))}
    </article>`,
    )
    .join("");
  return `<div class="stack">
    <h2>冠軍賽榮譽</h2>
    <div class="repeats">${honors || `<p class="hint">還沒有冠軍賽榮譽。</p>`}</div>
    <button class="btn" type="button" data-action="honor-add">新增榮譽</button>
    <h2>榮譽頭銜</h2>
    <div class="repeats">${titles || `<p class="hint">還沒有頭銜。</p>`}</div>
    <button class="btn" type="button" data-action="title-add">新增頭銜</button>
  </div>`;
}

function mediaTab(player) {
  const builds = player.builds
    .map((build, index) => dropzone("build", index, build.shot, IMAGE_ACCEPT, `配裝 ${index + 1}${build.hero ? ` · ${build.hero}` : ""}`, "出裝截圖。"))
    .join("");
  const matches = player.matches
    .map((match, index) => dropzone("match", index, match.highlight, MEDIA_ACCEPT, `對局 ${index + 1}${match.hero ? ` · ${match.hero}` : ""}`, "截圖或影片。"))
    .join("");
  return `<div class="stack">
    <p class="hint">上傳方式與以往相同：選擇或拖放檔案，按上傳，檔案進 R2，網址記在這筆資料上。頭像與配裝只收圖片。對局可收圖片或影片。傳完要儲存草稿，公開還要發布。</p>
    <h2>頭像</h2>
    ${dropzone("avatar", null, player.avatar, IMAGE_ACCEPT, "選手頭像", "拖放圖片後按上傳。")}
    <h2>配裝截圖</h2>
    ${builds || `<p class="hint">先在配裝分頁新增一套，再回來上傳。</p>`}
    <h2>對局截圖與影片</h2>
    ${matches || `<p class="hint">先在歷史戰績新增一場，再回來上傳。</p>`}
  </div>`;
}

export function renderPlayerEditor(player, ui, attrs) {
  const record = ensurePlayerRecord(player);
  const text = attrs?.text || "";
  const choice = attrs?.choice || "";
  const tab = TABS.some(([id]) => id === ui?.tab) ? ui.tab : "profile";
  const buttons = TABS.map(
    ([id, label]) => `<button type="button" class="editor-tab${tab === id ? " is-on" : ""}" data-action="player-tab" data-tab="${id}" aria-selected="${tab === id ? "true" : "false"}">${label}</button>`,
  ).join("");
  let body = "";
  if (tab === "battle") body = battleTab(record, text);
  else if (tab === "builds") body = buildsTab(record, text, choice);
  else if (tab === "matches") body = `${attrs?.matchesLead || ""}${matchesTab(record, ui, text, choice)}`;
  else if (tab === "heroes") body = heroesTab(record, text);
  else if (tab === "honors") body = honorsTab(record, text);
  else if (tab === "media") body = mediaTab(record);
  else body = profileTab(record, text, choice);
  const catalogNote = ui?.catalog?.heroes?.length ? `英雄目錄 ${ui.catalog.heroes.length} 位，可直接選。` : "英雄目錄還沒載入時，仍可直接打名字。";
  return `<section class="stack player-editor">
    <h1>選手數據</h1>
    <p class="hint">照傳說對決遊戲內的個人頁、配裝與結算來填。不用貼 JSON。${catalogNote} 成員名單的公開名字在「成員」；這頁是網站上的個人戰績。</p>
    <div class="editor-tabs" role="tablist">${buttons}</div>
    ${body}
    ${lists(ui?.catalog)}
  </section>`;
}

function sideValue(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "red" || text === "紅" || text === "紅方") return "red";
  if (text === "blue" || text === "藍" || text === "藍方") return "blue";
  return "";
}

function writeBilingual(target, key, lang, value) {
  target[key] = target[key] || { zh: "", en: "" };
  target[key][lang] = value;
}

export function applyPlayerInput(player, target, catalog) {
  if (!(target instanceof HTMLElement)) return false;
  const record = ensurePlayerRecord(player);
  if (target.dataset.playerStat) {
    record.stats[target.dataset.playerStat] = target.value;
    return true;
  }
  if (target.dataset.player) {
    const key = target.dataset.player;
    if (key === "publish") record.publish = target instanceof HTMLInputElement && target.checked;
    else if (key === "handle" || key === "uid" || key === "joinDate") record[key] = target.value;
    else if (key === "avatar" && target.dataset.part === "caption" && target.dataset.lang) record.avatar.caption[target.dataset.lang] = target.value;
    else if (target.dataset.lang) writeBilingual(record, key, target.dataset.lang, target.value);
    return true;
  }
  if (target.dataset.season != null) {
    const season = record.seasons[Number(target.dataset.season)];
    if (!season) return true;
    if (target.dataset.radar) season.radar[target.dataset.radar] = target.value;
    else if (target.dataset.medal) season.medals[target.dataset.medal] = target.value;
    else if (target.dataset.field) season[target.dataset.field] = target.value;
    return true;
  }
  if (target.dataset.reputation) {
    if (target.dataset.reputation === "note" && target.dataset.lang) record.reputation.note[target.dataset.lang] = target.value;
    else record.reputation[target.dataset.reputation] = target.value;
    return true;
  }
  if (target.dataset.perk != null) {
    const item = record.reputation.privileges[Number(target.dataset.perk)];
    if (!item) return true;
    if (target.dataset.field === "unlocked") item.unlocked = target instanceof HTMLInputElement && target.checked;
    else if (target.dataset.field === "level") item.level = target.value;
    else if (target.dataset.lang && target.dataset.part) item[target.dataset.part][target.dataset.lang] = target.value;
    return true;
  }
  if (target.dataset.heroCard != null) {
    const card = record.heroPool[Number(target.dataset.heroCard)];
    if (!card) return true;
    writeNamed(card, target);
    if (target.dataset.field === "hero") card.heroId = heroIdFor(target.value, catalog);
    return true;
  }
  if (target.dataset.honor != null) {
    const item = record.championships[Number(target.dataset.honor)];
    if (item) writeNamed(item, target);
    return true;
  }
  if (target.dataset.titleRow != null) {
    const item = record.honorTitles[Number(target.dataset.titleRow)];
    if (item) writeNamed(item, target);
    return true;
  }
  if (target.dataset.build != null) {
    const build = record.builds[Number(target.dataset.build)];
    if (!build) return true;
    if (target.dataset.skill != null) build.skillOrder[Number(target.dataset.skill)] = target.value;
    else if (target.dataset.slot != null) build.items[Number(target.dataset.slot)] = target.value;
    else if (target.dataset.arcana != null) {
      const row = build.arcana[Number(target.dataset.arcana)];
      if (row && target.dataset.field) row[target.dataset.field] = target.value;
    } else if (target.dataset.field === "shot" && target.dataset.lang) build.shot.caption[target.dataset.lang] = target.value;
    else if (target.dataset.field === "name" && target.dataset.lang) build.name[target.dataset.lang] = target.value;
    else if (target.dataset.field === "note" && target.dataset.lang) build.note[target.dataset.lang] = target.value;
    else if (target.dataset.field) {
      build[target.dataset.field] = target.value;
      if (target.dataset.field === "hero") build.heroId = heroIdFor(target.value, catalog);
    }
    return true;
  }
  if (target.dataset.board != null) {
    const row = record.matches[Number(target.dataset.board)]?.board?.[Number(target.dataset.row)];
    if (!row) return true;
    if (target.dataset.item != null) row.items[Number(target.dataset.item)] = target.value;
    else if (target.dataset.field === "mvp" || target.dataset.field === "owner") row[target.dataset.field] = target instanceof HTMLInputElement && target.checked;
    else if (target.dataset.field === "side") row.side = sideValue(target.value) || "blue";
    else if (target.dataset.field) row[target.dataset.field] = target.value;
    return true;
  }
  if (target.dataset.match != null && target.dataset.badge) {
    const match = record.matches[Number(target.dataset.match)];
    if (!match) return true;
    match.badges[target.dataset.badge] = target instanceof HTMLInputElement && target.checked;
    return true;
  }
  if (target.dataset.match != null) {
    const match = record.matches[Number(target.dataset.match)];
    if (!match) return true;
    const fieldName = target.dataset.field;
    if (fieldName === "publish" || fieldName === "mvp") match[fieldName] = target instanceof HTMLInputElement && target.checked;
    else if ((fieldName === "note" || fieldName === "highlight") && target.dataset.lang) {
      if (fieldName === "highlight") match.highlight.caption[target.dataset.lang] = target.value;
      else match.note[target.dataset.lang] = target.value;
    } else if (fieldName === "winner" || fieldName === "ownerSide") match[fieldName] = sideValue(target.value);
    else if (fieldName) match[fieldName] = target.value;
    return true;
  }
  return false;
}

function writeNamed(item, target) {
  const fieldName = target.dataset.field;
  if (target.dataset.lang && fieldName) {
    item[fieldName] = item[fieldName] || { zh: "", en: "" };
    item[fieldName][target.dataset.lang] = target.value;
  } else if (fieldName) item[fieldName] = target.value;
}

function swap(list, index, delta) {
  const next = index + delta;
  if (index < 0 || next < 0 || next >= list.length) return;
  const [item] = list.splice(index, 1);
  list.splice(next, 0, item);
}

export function runPlayerAction(player, action, node, ui) {
  const record = ensurePlayerRecord(player);
  const index = Number(node?.dataset?.index);
  const done = (dirty, status = "") => ({ handled: true, dirty, player: record, status });
  if (action === "player-tab") {
    if (node?.dataset?.tab) ui.tab = node.dataset.tab;
    return done(false);
  }
  if (action === "match-toggle") {
    const id = record.matches[index]?.id || "";
    ui.openMatch = ui.openMatch === id ? "" : id;
    return done(false);
  }
  if (action === "season-add") {
    const season = emptySeason();
    season.id = newId();
    record.seasons.push(season);
    return done(true);
  }
  if (action === "season-remove") {
    record.seasons.splice(index, 1);
    return done(true);
  }
  if (action === "perk-add") {
    record.reputation.privileges.push(emptyPrivilege());
    return done(true);
  }
  if (action === "perk-remove") {
    record.reputation.privileges.splice(index, 1);
    return done(true);
  }
  if (action === "hero-add") {
    const card = emptyHeroCard();
    card.id = newId();
    record.heroPool.push(card);
    return done(true);
  }
  if (action === "hero-remove") {
    record.heroPool.splice(index, 1);
    return done(true);
  }
  if (action === "honor-add") {
    const row = emptyHonor();
    row.id = newId();
    record.championships.push(row);
    return done(true);
  }
  if (action === "honor-remove") {
    record.championships.splice(index, 1);
    return done(true);
  }
  if (action === "title-add") {
    const row = emptyTitle();
    row.id = newId();
    record.honorTitles.push(row);
    return done(true);
  }
  if (action === "title-remove") {
    record.honorTitles.splice(index, 1);
    return done(true);
  }
  if (action === "build-add") {
    const build = emptyBuild();
    build.id = newId();
    record.builds.push(build);
    ui.tab = "builds";
    return done(true);
  }
  if (action === "build-remove") {
    record.builds.splice(index, 1);
    return done(true);
  }
  if (action === "build-up") {
    swap(record.builds, index, -1);
    return done(true);
  }
  if (action === "build-down") {
    swap(record.builds, index, 1);
    return done(true);
  }
  if (action === "arcana-add") {
    const build = record.builds[index];
    if (!build || build.arcana.length >= 6) return done(false);
    build.arcana.push(emptyArcanaRow(""));
    return done(true);
  }
  if (action === "arcana-remove") {
    const build = record.builds[index];
    const rowIndex = Number(node?.dataset?.arcana);
    if (!build || build.arcana[rowIndex]?.color) return done(false);
    build.arcana.splice(rowIndex, 1);
    return done(true);
  }
  if (action === "match-add") {
    const match = emptyMatch();
    match.id = newId();
    const row = emptyBoardPlayer();
    row.owner = true;
    match.board = [row];
    record.matches.push(match);
    ui.openMatch = match.id;
    ui.tab = "matches";
    return done(true);
  }
  if (action === "match-remove") {
    const removed = record.matches[index];
    record.matches.splice(index, 1);
    if (removed && ui.openMatch === removed.id) ui.openMatch = "";
    return done(true);
  }
  if (action === "board-add") {
    const match = record.matches[index];
    if (!match || match.board.length >= 10) return done(false);
    const row = emptyBoardPlayer();
    row.side = match.board.length < 5 ? "blue" : "red";
    match.board.push(row);
    return done(true);
  }
  if (action === "board-remove") {
    const match = record.matches[index];
    match?.board?.splice(Number(node?.dataset?.row), 1);
    return done(true);
  }
  if (action === "board-fill") {
    const match = record.matches[index];
    if (!match) return done(false);
    while (match.board.length < 10) {
      const row = emptyBoardPlayer();
      row.side = match.board.length < 5 ? "blue" : "red";
      if (!match.board.some((item) => item.owner) && match.board.length === 0) row.owner = true;
      match.board.push(row);
    }
    return done(true);
  }
  if (action === "media-clear") {
    const kind = node?.dataset?.upload;
    if (kind === "avatar") record.avatar = emptyHighlight();
    else if (kind === "build" && record.builds[index]) record.builds[index].shot = emptyHighlight();
    else if (kind === "match" && record.matches[index]) record.matches[index].highlight = emptyHighlight();
    else return { handled: false, dirty: false, player: record, status: "" };
    return done(true, "已移除媒體，記得儲存草稿");
  }
  return { handled: false, dirty: false, player: record, status: "" };
}

export function mediaTargetFrom(node) {
  const host = node?.closest?.("[data-upload]");
  if (!host) return null;
  const kind = host.dataset.upload;
  if (kind !== "avatar" && kind !== "build" && kind !== "match") return null;
  return { kind, index: host.dataset.index == null ? -1 : Number(host.dataset.index), node: host };
}

export function assignPlayerMedia(player, target, file) {
  const record = ensurePlayerRecord(player);
  const next = {
    caption: { zh: "", en: "" },
    key: file.key,
    mime: file.mime,
    kind: file.kind,
  };
  if (target.kind === "avatar") {
    next.caption = { ...record.avatar.caption };
    record.avatar = next;
    return true;
  }
  if (target.kind === "build") {
    const build = record.builds[target.index];
    if (!build) return false;
    next.caption = { ...build.shot.caption };
    build.shot = next;
    return true;
  }
  if (target.kind === "match") {
    const match = record.matches[target.index];
    if (!match) return false;
    next.caption = { ...match.highlight.caption };
    match.highlight = next;
    return true;
  }
  return false;
}
