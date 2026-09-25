/** Traditional Chinese for admin API codes. Unknown codes stay visible. */
export const GENERIC_FAILURE = "沒有完成。請再試一次。";

const MESSAGES = {
  invalid_login: "帳號或密碼不正確。",
  rate_limited: "嘗試次數過多，請稍後再試。",
  admin_not_configured: "尚未設定管理員密鑰。請先用 wrangler secret put。",
  storage_unconfigured: "尚未綁定 CMS 資料庫。",
  storage_unavailable: "現在讀不到內容資料庫。",
  forbidden: "這個操作被拒絕。請重新整理後再試。",
  unauthorized: "請先登入。",
  blocked_content: "內容含有 Discord 邀請連結，或選手名字是保留名稱 moohsia，沒有儲存。",
  invalid_content: "內容格式不正確。",
  payload_too_large: "內容太長。",
  notion_not_configured: "尚未設定 Notion 權杖或資料庫。草稿沒有改動。",
  notion_sync_failed: "Notion 沒有同步成功。草稿沒有改動。",
  catalog_refresh_failed: "官方英雄目錄沒有更新。",
  invite_required: "核准時要貼上一次性 Discord 邀請。",
  invite_reused: "這個邀請已經用過。",
  mail_not_configured: "尚未設定寄信密鑰，申請已留在資料庫，但信沒有送出。",
  mail_failed: "信沒有送出。狀態沒有改。",
  already_reviewed: "這筆申請已經審過。",
  media_type: "只接受圖片或 mp4／webm。",
  media_too_large: "檔案太大。圖片 8MB，影片 32MB。",
  media_unconfigured: "還沒有綁定 R2。",
  media_invalid: "這個檔案無法使用。",
  not_found: "找不到這個項目。",
  method_not_allowed: "這個操作的方式不正確。",
  unsupported_media: "送出的格式不對。",
  invalid_json: "送出的資料無法讀取。",
  network: "連不到管理服務。請再試一次。",
  server_error: "管理服務發生錯誤。請再試一次。",
  bad_response: "伺服器沒有回傳可讀的結果。請再試一次。",
  aov_challenge: "AOVRanking 要求人機驗證，這次沒有抓到戰績。請打開歷史戰績頁，通過驗證後檢視原始碼或另存，貼到下面，再按「用貼上的頁面匯入」。",
  aov_rate_limited: "AOVRanking 暫時拒絕查詢（請求太頻繁）。請稍後再試，不要連續重抓。",
  aov_cooldown: "剛剛才查過。請稍候再查，避免對 AOVRanking 造成負擔。",
  aov_empty: "這份頁面裡沒有讀到對局。請確認是歷史戰績頁的原始碼。",
  aov_shell: "這是還沒載入完成的空殼頁（檢視原始碼看不到對局）。請等畫面上出現戰績後，用 F12 → 元素 → 複製 html 的 outerHTML，或改上傳已載入完成的 .html 檔。",
  aov_blocked: "現在連不到 AOVRanking。請改貼歷史戰績頁的原始碼，再按「用貼上的頁面匯入」。",
  aov_invalid: "請填遊戲名稱，或填 UID 並選擇伺服器。",
};

function httpLabel(http) {
  const status = Number(http);
  if (!Number.isInteger(status) || status < 100 || status > 599) return "";
  return `HTTP ${status}`;
}

/**
 * @param {unknown} code
 * @param {unknown} [http]
 */
export function adminMessage(code, http) {
  const key = typeof code === "string" ? code.trim() : "";
  if (key && MESSAGES[key]) return MESSAGES[key];
  const detail = [key, httpLabel(http)].filter(Boolean).join("，");
  if (!detail) return GENERIC_FAILURE;
  return `${GENERIC_FAILURE}（${detail}）`;
}

const PASTE_FAILURES = new Set(["", "bad_response", "network", "server_error"]);

/**
 * Import failures name the paste path when the server did not return a match code.
 * @param {unknown} code
 * @param {unknown} [http]
 */
export function importFailureMessage(code, http) {
  const key = typeof code === "string" ? code.trim() : "";
  if (!PASTE_FAILURES.has(key)) return adminMessage(code, http);
  const detail = [key, httpLabel(http)].filter(Boolean).join("，");
  const base = "沒有讀到戰績。請打開歷史戰績頁，通過驗證後貼上原始碼，再按「用貼上的頁面匯入」。";
  return detail ? `${base}（${detail}）` : base;
}

/** Live textarea wins when it has text; otherwise keep what was already stored. */
export function choosePastedHtml(live, stored) {
  const fromDom = String(live ?? "");
  if (fromDom.trim()) return fromDom;
  return String(stored ?? "");
}

export function aovNeedsPaste(code) {
  const key = typeof code === "string" ? code.trim() : "";
  return key === "aov_challenge" || key === "aov_blocked" || key === "aov_empty" || key === "aov_shell" || PASTE_FAILURES.has(key);
}
