import { archiveBeforeAovWrite, ensureAovArchive } from "./aov-archive.js";
import { logFailure } from "./log.js";
import { storeAovCaptureFrame } from "./media.js";

const MODEL = "@cf/moondream/moondream3.1-9B-A2B";

function clip(value, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function integer(value, max = 999999999) {
  const raw = String(value ?? "").trim().replace(/,/g, "");
  if (!/^[+-]?\d+$/.test(raw)) return "";
  const n = Number(raw);
  if (!Number.isInteger(n) || n < -max || n > max) return "";
  return String(n);
}

function decimal(value, max = 999999999) {
  const cleaned = String(value ?? "").replace(/,/g, "").match(/-?\d+(?:\.\d+)?/)?.[0] || "";
  if (!cleaned) return "";
  const n = Number(cleaned);
  return Number.isFinite(n) && Math.abs(n) <= max ? cleaned : "";
}

function truth(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

function side(value) {
  const raw = String(value || "").toLowerCase();
  return raw === "red" || raw === "blue" ? raw : "";
}

function resultLabel(value) {
  const raw = clip(value, 20);
  if (/win|victory|勝利|^勝$/i.test(raw)) return "勝";
  if (/loss|defeat|失敗|^敗$/i.test(raw)) return "敗";
  return raw;
}

function hash(text) {
  let value = 2166136261;
  for (const char of String(text || "")) {
    value ^= char.codePointAt(0);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0).toString(16).padStart(8, "0");
}

function cleanItems(value) {
  const list = Array.isArray(value) ? value : [];
  return Array.from({ length: 6 }, (_, index) => clip(list[index], 40));
}

function cleanBoard(value, ownerName) {
  const list = Array.isArray(value) ? value : [];
  return list.slice(0, 10).map((raw) => {
    const row = raw && typeof raw === "object" ? raw : {};
    const ign = clip(row.ign || row.player || row.name, 40);
    return {
      side: side(row.side),
      hero: clip(row.hero, 40),
      ign,
      lane: clip(row.lane, 24),
      badge: clip(row.badge, 24),
      kills: integer(row.kills, 999),
      deaths: integer(row.deaths, 999),
      assists: integer(row.assists, 999),
      gold: integer(row.gold),
      score: decimal(row.score, 999),
      mvp: truth(row.mvp),
      owner: truth(row.owner) || Boolean(ownerName && ign && ign.toLowerCase() === ownerName.toLowerCase()),
      items: cleanItems(row.items),
      heroDamage: integer(row.heroDamage || row.damage),
      heroDamagePct: decimal(row.heroDamagePct || row.damagePct, 100),
      taken: integer(row.taken),
      takenPct: decimal(row.takenPct, 100),
      healing: integer(row.healing),
      teamfightCount: integer(row.teamfightCount, 999),
      teamfightRate: decimal(row.teamfightRate, 100),
      damageRatio: decimal(row.damageRatio, 999),
      takenPer: integer(row.takenPer),
      gpm: integer(row.gpm),
      level: integer(row.level, 999),
      minions: integer(row.minions || row.lastHits),
      lastHits: integer(row.lastHits || row.minions),
      jungleGold: integer(row.jungleGold),
      control: decimal(row.control, 999999),
      tower: integer(row.tower),
      rankDelta: integer(row.rankDelta, 999999),
      reputation: integer(row.reputation, 999999),
      powerDelta: integer(row.powerDelta, 999999),
      skin: clip(row.skin, 40),
    };
  });
}

function matchIdentity(raw, fallback) {
  const external = clip(raw.externalMatchId || raw.matchId, 40);
  if (/^[A-Za-z0-9_-]{1,40}$/.test(external)) return { id: external, externalMatchId: external };
  const time = clip(raw.playedAt || raw.time, 40);
  const hero = clip(raw.hero, 80);
  // Partial screens must never collapse unrelated games of the same hero.
  const timed = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(time);
  const seed = timed && hero ? `${time}|${hero}` : fallback;
  return { id: `capture-${hash(seed)}`, externalMatchId: "" };
}

function cleanMatch(raw, ownerName, fallback) {
  const source = raw && typeof raw === "object" ? raw : {};
  const identity = matchIdentity(source, fallback);
  const board = cleanBoard(source.board || source.players, ownerName);
  const owner = board.find((row) => row.owner) || {};
  const kills = integer(source.kills ?? owner.kills, 999);
  const deaths = integer(source.deaths ?? owner.deaths, 999);
  const assists = integer(source.assists ?? owner.assists, 999);
  const playedAt = clip(source.playedAt || source.time, 40);
  const date = /^\d{4}-\d{2}-\d{2}/.exec(playedAt)?.[0] || clip(source.date, 10);
  return {
    ...identity,
    label: clip(source.label, 80),
    date,
    playedAt,
    duration: clip(source.duration, 8),
    mode: clip(source.mode, 80),
    map: clip(source.map, 80),
    hero: clip(source.hero || owner.hero, 80),
    skin: clip(source.skin || owner.skin, 80),
    result: resultLabel(source.result),
    kda: [kills, deaths, assists].every((value) => value !== "") ? `${kills} / ${deaths} / ${assists}` : "",
    kills,
    deaths,
    assists,
    gold: integer(source.gold ?? owner.gold),
    damage: integer(source.damage ?? source.heroDamage ?? owner.heroDamage),
    taken: integer(source.taken ?? owner.taken),
    minions: integer(source.minions ?? source.lastHits ?? owner.minions),
    lastHits: integer(source.lastHits ?? source.minions ?? owner.lastHits),
    jungleGold: integer(source.jungleGold ?? owner.jungleGold),
    damageRatio: decimal(source.damageRatio ?? owner.damageRatio, 999),
    takenPer: integer(source.takenPer ?? owner.takenPer),
    control: decimal(source.control ?? owner.control, 999999),
    healing: integer(source.healing ?? owner.healing),
    tower: integer(source.tower ?? owner.tower),
    lane: clip(source.lane || owner.lane, 24),
    reputation: integer(source.reputation ?? owner.reputation, 999999),
    rankDelta: integer(source.rankDelta ?? owner.rankDelta, 999999),
    powerDelta: integer(source.powerDelta ?? owner.powerDelta, 999999),
    source: "capture",
    blueScore: integer(source.blueScore, 9999),
    redScore: integer(source.redScore, 9999),
    winner: source.winner === "red" || source.winner === "blue" ? source.winner : "",
    ownerSide: source.ownerSide === "red" || source.ownerSide === "blue" ? source.ownerSide : owner.side || "",
    mvp: truth(source.mvp) || truth(owner.mvp),
    badges: source.badges && typeof source.badges === "object" ? source.badges : {},
    note: { zh: "", en: "" },
    publish: false,
    board,
  };
}

function jsonFromAnswer(answer) {
  const text = String(answer || "").trim().replace(/^\`\`\`(?:json)?/i, "").replace(/\`\`\`$/i, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export function normalizeAovVision(value, options = {}) {
  const data = value && typeof value === "object" ? value : {};
  const rawMatches = Array.isArray(data.matches) ? data.matches : data.match && typeof data.match === "object" ? [data.match] : [];
  const ownerName = clip(options.ownerName, 40);
  const fallback = `${clip(options.importId, 80)}:${Number(options.frameIndex) || 0}`;
  const matches = rawMatches
    .map((raw, index) => cleanMatch(raw, ownerName, `${fallback}:${index}`))
    .filter((match) => match.hero || match.playedAt || match.externalMatchId || match.board.length);
  return {
    kind: clip(data.kind || data.screenType || "other", 40),
    confidence: decimal(data.confidence, 1),
    summary: data.summary && typeof data.summary === "object" ? data.summary : {},
    profile: data.profile && typeof data.profile === "object" ? data.profile : {},
    matches,
  };
}

export function aovVisionPrompt(ownerName = "") {
  const owner = clip(ownerName, 40);
  return `你正在讀取台灣版 Garena《傳說對決》遊戲畫面。只抄寫畫面上真的看得到的資料，不要猜測。
玩家本人遊戲名稱：${owner || "未知"}。
請只回傳一個 JSON 物件，不要 Markdown、不要說明。
{
  "kind": "history_list|match_result|match_scoreboard|combat_stats|rank|profile|hero_stats|other",
  "confidence": 0.0,
  "summary": {},
  "profile": {},
  "matches": [
    {
      "externalMatchId":"","playedAt":"","date":"","duration":"","mode":"","map":"","hero":"","skin":"",
      "result":"","kills":"","deaths":"","assists":"","gold":"","damage":"","taken":"","lastHits":"",
      "jungleGold":"","damageRatio":"","takenPer":"","control":"","healing":"","tower":"","lane":"",
      "reputation":"","rankDelta":"","powerDelta":"","blueScore":"","redScore":"","winner":"","ownerSide":"",
      "mvp":false,
      "board":[
        {"side":"blue","hero":"","ign":"","lane":"","kills":"","deaths":"","assists":"","gold":"","score":"",
         "mvp":false,"owner":false,"items":[],"heroDamage":"","heroDamagePct":"","taken":"","takenPct":"",
         "healing":"","teamfightCount":"","teamfightRate":"","lastHits":"","control":"","tower":"",
         "rankDelta":"","powerDelta":"","skin":""}
      ]
    }
  ]
}
規則：
1. 看不到的欄位一律空字串、false 或空陣列；絕對不要推測。
2. 歷史列表若同時看得到多場，就全部放進 matches。
3. 詳細對戰若看得到藍紅雙方，board 最多放 10 人。
4. 勝利/失敗保留畫面語意；數字不要加千分位。
5. 如果不是對戰畫面，matches 可以空陣列，但 profile/summary 要保存畫面上可讀到的段位、場次、勝率、英雄等資訊。
6. 玩家名稱等於「${owner}」時 owner=true。`;
}

async function saveFrameMetadata(env, record) {
  if (!env?.CMS_DB || typeof env.CMS_DB.prepare !== "function") return false;
  try {
    await env.CMS_DB
      .prepare(
        `INSERT INTO aov_capture_frames
           (id, import_id, frame_index, video_time, captured_at, frame_key, kind, data_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, data_json = excluded.data_json`,
      )
      .bind(
        record.id,
        record.importId,
        record.frameIndex,
        record.videoTime,
        record.capturedAt,
        record.frameKey,
        record.kind,
        JSON.stringify(record.data || {}),
      )
      .run();
  } catch (error) {
    logFailure("aov_frame_archive_failed", error);
    return false;
  }
  return true;
}

export async function analyzeAovFrame(env, input = {}) {
  if (!env?.AI || typeof env.AI.run !== "function") return { ok: false, code: "aov_ai_unconfigured" };
  const ready = await ensureAovArchive(env);
  if (!ready.ok) return { ok: false, code: ready.code || "aov_archive_unavailable" };
  const image = String(input.image || "");
  if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(image) || image.length > 5_500_000) {
    return { ok: false, code: "aov_frame_invalid" };
  }
  const importId = clip(input.importId, 80) || crypto.randomUUID();
  const frameIndex = Math.max(0, Math.min(10000, Number(input.frameIndex) || 0));
  const videoTime = Math.max(0, Math.min(86400, Number(input.videoTime) || 0));
  const capturedAt = new Date().toISOString();
  const frameId = `${importId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 52)}-${String(frameIndex).padStart(4, "0")}`;

  const stored = await storeAovCaptureFrame(env, image, frameId);
  if (!stored.ok) return { ok: false, code: stored.code || "media_unconfigured", importId, frameIndex };
  const batch = await archiveBeforeAovWrite(env, [], { source: "capture", importId, capturedAt });
  if (!batch.ok) return { ok: false, code: "aov_archive_unavailable", stored: true, importId, frameIndex };
  const frameRecord = { id: frameId, importId, frameIndex, videoTime, capturedAt, frameKey: stored.key };
  if (!await saveFrameMetadata(env, { ...frameRecord, kind: "pending", data: {} })) {
    return { ok: false, code: "aov_archive_unavailable", stored: true, importId, frameIndex };
  }
  try {
    const ai = await env.AI.run(MODEL, {
      task: "query",
      image,
      question: aovVisionPrompt(input.ownerName),
      reasoning: false,
      temperature: 0,
      max_tokens: 8192,
      stream: false,
    });
    const raw = jsonFromAnswer(ai?.answer || ai?.response || ai?.description || "");
    if (!raw) {
      await saveFrameMetadata(env, {
        id: frameId,
        importId,
        frameIndex,
        videoTime,
        capturedAt,
        frameKey: stored.key,
        kind: "unreadable",
        data: { raw: clip(ai?.answer || ai?.response || "", 4000) },
      });
      return { ok: false, code: "aov_vision_failed", stored: true, importId, frameIndex };
    }
    const normalized = normalizeAovVision(raw, { ownerName: input.ownerName, importId, frameIndex });
    const archive = await archiveBeforeAovWrite(env, normalized.matches, {
      source: "capture",
      importId,
      capturedAt,
      note: `video frame ${frameIndex} @ ${videoTime.toFixed(2)}s`,
    });
    const metadataSaved = await saveFrameMetadata(env, {
      id: frameId,
      importId,
      frameIndex,
      videoTime,
      capturedAt,
      frameKey: stored.key,
      kind: normalized.kind,
      data: normalized,
    });
    if (!archive.ok || !metadataSaved) return { ok: false, code: "aov_archive_unavailable", stored: true, importId, frameIndex };
    return {
      ok: true,
      importId,
      frameIndex,
      frameKey: stored.key,
      stored: true,
      archive,
      ...normalized,
    };
  } catch (error) {
    logFailure("aov_vision_failed", error);
    return { ok: false, code: "aov_vision_failed", stored: true, importId, frameIndex };
  }
}
