import { genderLabel, normalizeInvite, positionLabel, rankLabel, validateApplication } from "./apply.js";
import { ownerInbox, sendMail } from "./mail.js";
import { logFailure } from "./log.js";
import { digestBytes } from "./session.js";

function nowIso() {
  return new Date().toISOString();
}

function bytesToHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function inviteHash(url) {
  return bytesToHex(await digestBytes(url));
}

export function createMemoryApplications() {
  /** @type {Array<Record<string, string | null>>} */
  const rows = [];
  return {
    async insert(row) {
      rows.unshift({ ...row });
      return { ...row };
    },
    async list() {
      return rows.map((row) => ({ ...row }));
    },
    async get(id) {
      const row = rows.find((item) => item.id === id);
      return row ? { ...row } : null;
    },
    async update(id, patch) {
      const row = rows.find((item) => item.id === id);
      if (!row) return null;
      Object.assign(row, patch);
      return { ...row };
    },
    async findPendingUid(uid) {
      const row = rows.find((item) => item.uid === uid && item.status === "pending");
      return row ? { ...row } : null;
    },
    async findInviteHash(hash) {
      const row = rows.find((item) => item.invite_hash === hash);
      return row ? { ...row } : null;
    },
  };
}

/** @param {D1Database} db */
export function createD1Applications(db) {
  return {
    async insert(row) {
      await db
        .prepare(
          `INSERT INTO applications (id, created_at, status, email, uid, payload_json, reviewed_at, decision_note, invite_hash)
           VALUES (?, ?, ?, ?, ?, ?, NULL, '', NULL)`,
        )
        .bind(row.id, row.created_at, row.status, row.email, row.uid, row.payload_json)
        .run();
      return row;
    },
    async list() {
      const result = await db
        .prepare(
          `SELECT id, created_at, status, email, uid, payload_json, reviewed_at, decision_note, invite_hash
           FROM applications ORDER BY created_at DESC LIMIT 200`,
        )
        .all();
      return result.results || [];
    },
    async get(id) {
      return db
        .prepare(
          `SELECT id, created_at, status, email, uid, payload_json, reviewed_at, decision_note, invite_hash
           FROM applications WHERE id = ?`,
        )
        .bind(id)
        .first();
    },
    async update(id, patch) {
      await db
        .prepare(
          `UPDATE applications
           SET status = ?, reviewed_at = ?, decision_note = ?, invite_hash = ?
           WHERE id = ?`,
        )
        .bind(patch.status, patch.reviewed_at, patch.decision_note || "", patch.invite_hash || null, id)
        .run();
      return this.get(id);
    },
    async findPendingUid(uid) {
      return db
        .prepare(`SELECT id FROM applications WHERE uid = ? AND status = 'pending' LIMIT 1`)
        .bind(uid)
        .first();
    },
    async findInviteHash(hash) {
      return db.prepare(`SELECT id FROM applications WHERE invite_hash = ? LIMIT 1`).bind(hash).first();
    },
  };
}

export function applicationsFromEnv(env) {
  if (env?.APP_STORE) return env.APP_STORE;
  if (env?.CMS_DB) return createD1Applications(env.CMS_DB);
  return null;
}

function clipNote(value) {
  return typeof value === "string" ? value.trim().slice(0, 500) : "";
}

export function presentApplication(row) {
  let payload = {};
  try {
    payload = JSON.parse(row.payload_json);
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    email: row.email,
    uid: row.uid,
    reviewedAt: row.reviewed_at || "",
    note: row.decision_note || "",
    inviteSent: Boolean(row.invite_hash),
    application: payload,
  };
}

function lines(value, lang) {
  const zh = lang !== "en";
  return [
    `${zh ? "歷史排位賽最高戰績" : "Highest ranked tier"}: ${rankLabel(value.rank, lang)}`,
    `UID: ${value.uid}`,
    `${zh ? "暱稱" : "Nickname"}: ${value.nickname}`,
    `${zh ? "聯絡信箱" : "Email"}: ${value.email}`,
    `${zh ? "性別" : "Gender"}: ${genderLabel(value.gender, lang)}`,
    `${zh ? "年齡層" : "Age band"}: ${value.ageBand}`,
    `${zh ? "位子" : "Positions"}: ${value.positions.map((id) => positionLabel(id, lang)).join("、")}`,
    `${zh ? "平日" : "Weekdays"}: ${value.weekday}`,
    `${zh ? "假日" : "Weekends"}: ${value.holiday}`,
    `${zh ? "可配合練習" : "Practice"}: ${value.practice}`,
    `${zh ? "為什麼希望加入" : "Why join"}: ${value.motivation}`,
    zh
      ? "已勾選：尊重、友善、包容；禁止金錢往來；一切跟隨官方規範。"
      : "Acknowledged: respect, kindness, inclusion; no money between members; follow official rules.",
  ].join("\n");
}

export async function submitApplication(env, input) {
  const parsed = validateApplication(input);
  if (!parsed.ok) return parsed;
  const store = applicationsFromEnv(env);
  if (!store) return { ok: false, code: "storage_unconfigured" };
  try {
    const pending = await store.findPendingUid(parsed.value.uid);
    if (pending) return { ok: false, code: "already_pending", field: "uid" };
    const id = crypto.randomUUID();
    const row = {
      id,
      created_at: nowIso(),
      status: "pending",
      email: parsed.value.email,
      uid: parsed.value.uid,
      payload_json: JSON.stringify(parsed.value),
      reviewed_at: null,
      decision_note: "",
      invite_hash: null,
    };
    await store.insert(row);
    const mailed = await sendMail(env, {
      to: ownerInbox(env),
      subject: `MOOHSIA 加入申請 ${parsed.value.nickname}`,
      text: `公會 MOOHSIA、戰隊暮霞｜MOS 收到一筆官網申請。\n\n${lines(parsed.value, "zh")}\n\n編號 ${id}\n請到管理後台審核。Discord 不開放公開加入。`,
    });
    return { ok: true, id, mailed: mailed.ok === true };
  } catch (error) {
    logFailure("application_store_failed", error);
    return { ok: false, code: "storage_unavailable" };
  }
}

export async function approveApplication(env, id, input) {
  const store = applicationsFromEnv(env);
  if (!store) return { ok: false, code: "storage_unconfigured" };
  const invite = normalizeInvite(input?.inviteUrl);
  if (!invite) return { ok: false, code: "invite_required" };
  try {
    const row = await store.get(id);
    if (!row) return { ok: false, code: "not_found" };
    if (row.status !== "pending") return { ok: false, code: "already_reviewed" };
    const hash = await inviteHash(invite);
    const used = await store.findInviteHash(hash);
    if (used) return { ok: false, code: "invite_reused" };
    const payload = JSON.parse(row.payload_json);
    const lang = payload.lang === "en" ? "en" : "zh";
    const text =
      lang === "en"
        ? `Your application to guild MOOHSIA, team 暮霞｜MOS, was approved.\n\nThis Discord invite is single-use. Discord is not open for cold join. Do not post the link.\n\n${invite}\n\nQuestions: Info@moohsia.com`
        : `你的加入申請已通過。公會 MOOHSIA，戰隊暮霞｜MOS。\n\n下面是一次性 Discord 邀請，用過即失效。Discord 不開放公開加入，請不要把連結公開或轉傳。\n\n${invite}\n\n有問題寫到 Info@moohsia.com`;
    const mailed = await sendMail(env, {
      to: row.email,
      subject: lang === "en" ? "MOOHSIA application approved" : "暮霞｜MOOHSIA 申請通過",
      text,
    });
    if (!mailed.ok) return { ok: false, code: mailed.code || "mail_failed" };
    const saved = await store.update(id, {
      status: "approved",
      reviewed_at: nowIso(),
      decision_note: clipNote(input?.note),
      invite_hash: hash,
    });
    return { ok: true, application: presentApplication(saved) };
  } catch (error) {
    logFailure("application_approve_failed", error);
    return { ok: false, code: "storage_unavailable" };
  }
}

export async function rejectApplication(env, id, input) {
  const store = applicationsFromEnv(env);
  if (!store) return { ok: false, code: "storage_unconfigured" };
  try {
    const row = await store.get(id);
    if (!row) return { ok: false, code: "not_found" };
    if (row.status !== "pending") return { ok: false, code: "already_reviewed" };
    const notify = input?.notify === true;
    let mailed = false;
    if (notify) {
      const payload = JSON.parse(row.payload_json);
      const lang = payload.lang === "en" ? "en" : "zh";
      const note = clipNote(input?.note);
      const text =
        lang === "en"
          ? `Your application to guild MOOHSIA, team 暮霞｜MOS, was not accepted this time.\n${note ? `\n${note}\n` : ""}\nDiscord is not open for cold join. Questions: Info@moohsia.com`
          : `你這次的加入申請沒有通過。公會 MOOHSIA，戰隊暮霞｜MOS。\n${note ? `\n${note}\n` : ""}\nDiscord 不開放公開加入。有問題寫到 Info@moohsia.com`;
      const sent = await sendMail(env, {
        to: row.email,
        subject: lang === "en" ? "MOOHSIA application update" : "暮霞｜MOOHSIA 申請結果",
        text,
      });
      if (!sent.ok) return { ok: false, code: sent.code || "mail_failed" };
      mailed = true;
    }
    const saved = await store.update(id, {
      status: "rejected",
      reviewed_at: nowIso(),
      decision_note: clipNote(input?.note),
      invite_hash: null,
    });
    return { ok: true, mailed, application: presentApplication(saved) };
  } catch (error) {
    logFailure("application_reject_failed", error);
    return { ok: false, code: "storage_unavailable" };
  }
}
