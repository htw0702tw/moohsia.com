# 暮霞｜MOS

傳說對決戰隊的公開網站，準備部署到 [moohsia.com](https://moohsia.com)。

這不是個人作品集。訪客只會看到戰隊資訊。公開聯絡方式只有 `Info@moohsia.com`。招募狀態是 **不開放招募**，沒有試訓報名表。公開頁面沒有驗證入口，也沒有 Discord 邀請網址。

## 本地啟動

需要 Node.js 20 或更新版本。

```bash
npm install
npm run dev
```

開啟 <http://localhost:5173>。

`npm run dev` 會同時提供頁面與內部 API（`/api/content`、`/api/config`、`/api/verify`、`/api/health`）。這些 API 沒有掛在公開導覽上。`/api/content` 只回已發布內容。

用與正式環境相同的 Worker 方式啟動：

```bash
npm start
```

這會先建置靜態檔，再執行 `wrangler dev`，預設 <http://localhost:8787>。

其他指令：

| 指令 | 作用 |
| --- | --- |
| `npm test` | 品牌文案、驗證 API 與管理後台測試 |
| `npm run build` | 輸出 `dist/`（公開頁與管理頁） |
| `npm run check` | 以 `wrangler deploy --dry-run` 檢查 Worker 能否打包 |
| `npm run deploy` | 建置並部署名為 `moohsia-com` 的 Worker |
| `npm run cms:hash` | 產生 `ADMIN_PASSWORD_HASH` |
| `npm run cms:migrate` | 對正式 D1 套用 CMS migration |

## 頁面

| 路徑 | 內容 |
| --- | --- |
| `/` | 戰隊首頁：暮色舞台、識別、狀態、預留席位、動態空狀態、聯絡 |
| `/about` | 戰隊。未確認欄位顯示待公布 |
| `/roster` | 成員。沒有名單時以待公布席位呈現，並註明不是已公開選手 |
| `/news` | 動態。沒有公告時為廣播空狀態 |
| `/contact` | 只有 `Info@moohsia.com` |

右上角可切換 English。預設是繁體中文。

公開資訊架構沒有驗證頁。導覽、首頁按鈕、頁尾與行銷文案都不提供驗證入口；直接打開舊的驗證網址會落到站內 404。

動畫包含可略過的入場、舞台地板、粒子拖尾、HUD 環、跑馬燈、滑鼠與捲動視差、卡片傾斜、雷達掃描與懸停回饋。系統若設定 `prefers-reduced-motion: reduce`，入場與這些動效會停用，內容仍可直接閱讀。

## 管理後台

私人編輯頁在 **admin.moohsia.com**，跟公開站用同一個 Worker `moohsia-com`。不要把這個網域接到 `moohsia-cloud`。

| 網址 | 行為 |
| --- | --- |
| `https://admin.moohsia.com/login` | 登入 |
| `https://admin.moohsia.com/` | 已登入時轉到總覽，否則轉到登入 |
| `https://moohsia.com` | 公開戰隊站，只讀已發布內容 |

只有一組帳號，使用者名稱固定是 `htw0702`（寫在 [`wrangler.jsonc`](wrangler.jsonc)，不是密碼）。密碼雜湊與簽章密鑰來自 Worker secret，不寫進 git，也不要在 pull request 裡發明密碼。

本機：

- `npm run dev` 時打開 <http://admin.localhost:5173/login>。內容存在這個行程的記憶體，重開就回到內建預設。
- `npm start` 使用本機 D1。先做下面的 migration。

### 設定密鑰

在專案目錄、已 `npx wrangler login` 的情況下，由擁有者自己執行。密碼至少 10 個字。雜湊腳本不會把密碼寫進檔案。

使用者名稱不要用 `wrangler secret put`。它已經是 var `ADMIN_USERNAME=htw0702`。同名 secret 會跟 var 衝突；若之前設過，先刪掉：

```bash
npx wrangler secret delete ADMIN_USERNAME
```

密碼與 session 由協調者設定。密碼至少 10 個字。雜湊腳本不會把密碼寫進檔案。

```bash
npm run cms:hash
npx wrangler secret put ADMIN_PASSWORD_HASH
openssl rand -base64 32 | npx wrangler secret put ADMIN_SESSION_SECRET
```

`npm run cms:hash` 會問密碼，印出一行 `pbkdf2-sha256$100000$...`。把那一行貼進 `ADMIN_PASSWORD_HASH`。不要把密碼本身設成 secret。本機開發把雜湊與 `ADMIN_SESSION_SECRET` 放進 `.dev.vars`（從 [`.dev.vars.example`](.dev.vars.example) 複製，帳號已是 `htw0702`）。`.dev.vars` 已被 git 忽略。

登入失敗 8 次會鎖 15 分鐘。正式環境若有綁 `CMS_KV`，鎖在 KV；否則只算這一個 Worker isolate。Cookie 是 `HttpOnly`、`SameSite=Lax`，HTTPS 上加 `Secure`，約 8 小時過期。會改資料的請求要帶登入時拿到的 CSRF 標頭。

### 資料庫

[`wrangler.jsonc`](wrangler.jsonc) 裡的 `database_id` 與 `CMS_KV` id 已是正式環境的 `moohsia-cms` 與 `CMS_KV`。不要換成別的 id。沒有 KV 時登入鎖定仍可用，只是不會跨 isolate。

```bash
npm run cms:migrate:local
npm run cms:migrate
```

`migrations/0001_init.sql` 只建 `site_documents`。表是空的時候，Worker 會把 [`src/content.js`](src/content.js) 的內建文案寫成第一份草稿與已發布內容。就算 migration 還沒跑、或 D1 暫時讀不到，公開頁也會退回這份內建文案，不會變成空白。

### 草稿與發布

管理頁改的是草稿。公開網站不會跟著變。

按 **儲存草稿** 只更新草稿。按 **發布到網站** 才把現在這份內容整份公開。**捨棄草稿** 會回到上次發布的內容。

成員可以新增、修改、隱藏。沒有填名字的人不會出現在公開頁，預設也不會塞假選手。動態預設是草稿；狀態改成公開而且整站發布之後才會出現。再改回草稿並發布，就會從公開頁拿掉。招募文句可以改，但沒有試訓報名表。公開信箱欄位預設是 `Info@moohsia.com`，只有在這個欄位改掉時，頁面上的 mailto 才會換。

### 接上 admin.moohsia.com

先確認 `moohsia.com` 與 `www.moohsia.com` 已經在 **moohsia-com** 上，而且 `moohsia-cloud` 沒有這兩個網域。

1. Cloudflare 控制台 → **Workers & Pages → moohsia-com → Settings → Domains & Routes**。
2. Add → Custom domain → `admin.moohsia.com`。
3. 區域已在同一個帳號時，Cloudflare 會自動加一筆被代理（橘色雲）的 DNS。不要刪掉 apex 或 `www`。
4. 若 DNS 不在這個帳號，自己加 CNAME：`admin` → `moohsia-com.<帳號>.workers.dev`，並打開代理。
5. SSL/TLS 維持 **Full (strict)**。
6. 打開 <https://admin.moohsia.com/login>，帳號填 `htw0702`，密碼用你做成雜湊的那一組。未登入時只看得到登入頁，公開 API 不會回草稿。

Zone 還沒在這個帳號時，不要把 [`wrangler.jsonc`](wrangler.jsonc) 裡註解掉的 `routes` 打開。

## 更新戰隊資料

平常改公開文案用管理後台即可，不用重新部署前端。內建預設仍在 [`src/content.js`](src/content.js)。空白代表尚未確認，不要填上推測的冠軍、選手、贊助或賽程。

```js
export const rosterMembers = [
  // { id: "01", name: { zh: "", en: "" }, role: { zh: "", en: "" } },
];

export const newsPosts = [
  // { id: "note-1", date: "2026-09-24", title: { zh: "", en: "" }, body: { zh: "", en: "" } },
];
```

名稱留白的項目不會被畫成選手或新聞。

## Discord 邀請與內部 API

公開網站 **不會顯示邀請網址，也不提供驗證頁**。預設 `DISCORD_INVITE_URL` 是空的。

`POST /api/verify` 仍是人工審核存根，只留給之後的內部流程，沒有掛進公開頁面。Worker 不保存申請、不連 Garena、也不會因為請求就解鎖 Discord。

之後若要放上真正的邀請：

1. 網址必須是 `https://discord.gg/...` 或 `https://discord.com/invite/...`。
2. 不要把網址寫進 git。
3. 從 [`wrangler.jsonc`](wrangler.jsonc) 的 `vars` 移除 `DISCORD_INVITE_URL`（同名 var 與 secret 不能並存）。
4. 設定 secret：

```bash
npx wrangler secret put DISCORD_INVITE_URL
```

5. 本機開發可複製 `.dev.vars.example` 為 `.dev.vars`（此檔已在 `.gitignore`）。

設定成功後，`/api/config` 只會回 `inviteConfigured: true`，仍然不含網址。公開網站不會因此出現邀請或驗證入口。

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
