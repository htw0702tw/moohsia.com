# 暮霞｜MOS

傳說對決戰隊的公開網站，準備部署到 [moohsia.com](https://moohsia.com)。

這不是個人作品集。訪客只會看到戰隊資訊。公開聯絡方式只有 `Info@moohsia.com`。招募狀態是 **不開放招募**，沒有試訓報名表。內部 Discord 要通過驗證才加入；邀請網址沒有寫進頁面。

## 本地啟動

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

開啟 <http://localhost:5173>。

`npm run dev` 會同時提供頁面與驗證用的本機 API（`/api/config`、`/api/verify`、`/api/health`）。

用與正式環境相同的 Worker 方式啟動：

```bash
npm start
```

這會先建置靜態檔，再執行 `wrangler dev`，預設 <http://localhost:8787>。

其他指令：

| 指令 | 作用 |
| --- | --- |
| `npm test` | 品牌文案與驗證 API 測試 |
| `npm run build` | 輸出 `dist/` |
| `npm run check` | 以 `wrangler deploy --dry-run` 檢查 Worker 能否打包 |
| `npm run deploy` | 建置並部署名為 `moohsia-com` 的 Worker |

## 頁面

| 路徑 | 內容 |
| --- | --- |
| `/` | 戰隊首頁、暮色主視覺、招募狀態 |
| `/about` | 戰隊。未確認欄位顯示待公布 |
| `/roster` | 成員。沒有名單時顯示「成員資訊即將公開」 |
| `/news` | 動態。沒有公告時為空狀態 |
| `/contact` | 只有 `Info@moohsia.com`，以及 Discord 驗證說明 |
| `/verify` | 內部驗證入口（站內存根，不是 Garena 官方同步） |

右上角可切換 English。預設是繁體中文。

動畫包含首頁粒子、HUD 環、跑馬燈、導覽底線、捲動浮現與滑鼠視差。系統若設定 `prefers-reduced-motion: reduce`，這些動效會停用。

## 更新戰隊資料

可公開的事實寫在 [`src/content.js`](src/content.js)。空白代表尚未確認，不要填上推測的冠軍、選手、贊助或賽程。

```js
export const rosterMembers = [
  // { id: "01", name: { zh: "", en: "" }, role: { zh: "", en: "" } },
];

export const newsPosts = [
  // { id: "note-1", date: "2026-09-24", title: { zh: "", en: "" }, body: { zh: "", en: "" } },
];
```

名稱留白的項目不會被畫成選手或新聞。

## Discord 邀請

公開網站 **不會顯示邀請網址**。預設 `DISCORD_INVITE_URL` 是空的，驗證頁會寫「即將開放」，按鈕維持鎖定，文案是「通過驗證後加入內部 Discord」。

這次的驗證流程是人工審核存根：表單送出後只產生申請編號，存在這台瀏覽器。Worker 不保存申請、不連 Garena、也不因為送出表單就解鎖 Discord。

之後若要放上真正的邀請：

1. 網址必須是 `https://discord.gg/...` 或 `https://discord.com/invite/...`。
2. 不要把網址寫進 git。
3. 從 [`wrangler.jsonc`](wrangler.jsonc) 的 `vars` 移除 `DISCORD_INVITE_URL`（同名 var 與 secret 不能並存）。
4. 設定 secret：

```bash
npx wrangler secret put DISCORD_INVITE_URL
```

5. 本機開發可複製 `.dev.vars.example` 為 `.dev.vars`（此檔已在 `.gitignore`）。

設定成功後，`/api/config` 只會回 `inviteConfigured: true`，仍然不含網址。頁面改顯示「邀請已備妥」，入口維持鎖定，直到未來有真正的審核通過流程。

## 驗證 API

`POST /api/verify`

```json
{ "aovId": "傳說對決 ID", "discordHandle": "DiscordName", "ack": true }
```

成功時 HTTP 202，狀態是 `pending_review`，並註明 `stored: false`、`garenaSync: false`、`discordUnlocked: false`。這不是 Garena 官方 API，也不代表已加入戰隊。

`GET /api/health` 回 `{ "ok": true, "service": "moohsia-com" }`。

## 部署到 moohsia.com

這個專案的 Worker 名稱是 **`moohsia-com`**。它只負責戰隊網站。

既有的 Worker **`moohsia-cloud`** 是另一個 AI／聊天 API，不要用這次部署覆蓋它，也不要改它的程式。若 `moohsia.com` 目前指到 `moohsia-cloud`，先在該 Worker 拿掉這條 route，再把網域接到 `moohsia-com`。聊天 API 可繼續留在自己的 `workers.dev` 網址，或日後另放子網域；本專案不設定那條路由。

1. 確認 `moohsia.com` 的 DNS 區域在同一個 Cloudflare 帳號。
2. 安裝並登入：

```bash
npm install
npx wrangler login
```

3. 部署：

```bash
npm run deploy
```

4. 在 Cloudflare 控制台開啟 **Workers & Pages → moohsia-com → Settings → Domains & Routes**。
5. 新增自訂網域 `moohsia.com` 與 `www.moohsia.com`。區域已在此帳號時，Cloudflare 會建立被代理（橘色雲）的 DNS 紀錄。
6. SSL/TLS 維持 **Full (strict)**。
7. 若要讓 `www` 轉到裸網域，可在該 zone 加一條 Redirect Rule：`www.moohsia.com/*` → `https://moohsia.com/$1`。
8. 確認：
   - <https://moohsia.com> 是戰隊站，不是聊天 API。
   - <https://moohsia.com/api/health> 回 `service: "moohsia-com"`。

也可以在 zone 已就緒時，把 [`wrangler.jsonc`](wrangler.jsonc) 裡註解掉的 `routes` 打開再部署。帳號還沒有這個 zone 時不要打開，否則部署會去綁網域而失敗。

第一次部署後，還可以用 `moohsia-com.<你的帳號>.workers.dev` 預覽。正式網域仍建議只用在戰隊站。

## 技術

- Vite 靜態頁，前端路由。
- Cloudflare Worker `moohsia-com` 提供 `/api/*`，其餘由靜態資產處理；找不到的路徑回 `index.html`。
- 設定檔是 [`wrangler.jsonc`](wrangler.jsonc)，`compatibility_date` 為 `2026-09-24`。
