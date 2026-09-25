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
| `npm run catalog:refresh` | 從 Garena 公開頁重抓英雄與模式，寫進 `data/aov-catalog.json` |

## 頁面

| 路徑 | 內容 |
| --- | --- |
| `/` | 戰隊首頁：暮色舞台、識別、狀態、預留席位、選手數據空狀態、英雄預覽、動態、聯絡 |
| `/about` | 戰隊。未確認欄位顯示待公布 |
| `/roster` | 成員。沒有名單時以待公布席位呈現，並附個人數據入口 |
| `/player` | 個人數據。未發布時是空狀態，不顯示段位或頭銜 |
| `/heroes` | 官方英雄名單（Garena 公開頁） |
| `/modes` | 官方模式名稱（Garena 公開公告），不代表遊戲內正在開放 |
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

`migrations/0001_init.sql` 建 `site_documents`。`migrations/0002_player_and_catalog.sql` 再加 `player_records` 與 `aov_catalog`。表是空的時候，Worker 會把 [`src/content.js`](src/content.js) 的內建文案寫成第一份草稿與已發布內容。就算 migration 還沒跑、或 D1 暫時讀不到，公開頁也會退回這份內建文案，不會變成空白。英雄與模式則退回倉庫裡的官方快照。第二次 migration 不會改掉已經發布的文案。

## 個人數據

個人戰績跟戰隊文案放在同一份 CMS 文件的 `player` 欄位，並在 D1 的 `player_records`（id 為 `owner`）留一份可查詢的複本。儲存草稿只更新 `draft_json`。按 **發布到網站** 才寫入 `published_json`。

公開頁只在 `publish` 為 true 時顯示這份資料。預設是 false，所以 `/player` 與首頁是空狀態，不會出現段位、頭銜、場次或勝率。空白欄位在已公開的資料裡顯示「待公布」，系統不會補數字。

遊戲 ID 留空，等擁有者自己填。現有 CMS 測試允許選手名字 `htw0702aov`；保留名稱仍是剛好等於 `moohsia`（大小寫、空白、標點去掉之後）。不要把這個 ID 寫進公開程式的預設文案。

對局也有自己的公開勾選。個人檔案沒有公開時，對局不會出現在網站上。

管理頁在 **選手數據**。Notion 的選手資料庫可以覆寫這份草稿，規則見下一節。

## Notion 同步

Notion 是編輯來源。同步**只寫入 CMS 草稿**，不會直接改公開網站。擁有者在 admin.moohsia.com 看過草稿後，按 **發布到網站**，公開頁才換。這是唯一的發布閘門：資料列還要勾 **Publish**，沒勾的不會進公開頁。

觸發方式有三種，做的是同一件事：

| 方式 | 怎麼跑 |
| --- | --- |
| 管理按鈕 | 總覽的 **從 Notion 同步草稿**。要已登入，並帶 CSRF |
| 排程 | Worker cron `15 18 * * *`（UTC 18:15，台北約 02:15）。只更新草稿與英雄目錄 |
| Webhook | `POST https://moohsia.com/api/notion/webhook`，標頭 `Authorization: Bearer <NOTION_WEBHOOK_SECRET>` |

密鑰用 `wrangler secret put`，不要寫進 git，也不要在 `wrangler.jsonc` 的 `vars` 放同名空字串（同名 var 與 secret 不能並存）。

```bash
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_WEBHOOK_SECRET
npx wrangler secret put NOTION_ROSTER_DB
npx wrangler secret put NOTION_NEWS_DB
npx wrangler secret put NOTION_COPY_DB
npx wrangler secret put NOTION_PROFILE_DB
npx wrangler secret put NOTION_PLAYER_DB
npx wrangler secret put NOTION_MATCH_DB
```

`NOTION_TOKEN` 是 Notion 內部整合權杖。每個資料庫 ID 是網址裡那串 32 碼，整合要被邀請進那些資料庫。沒設權杖或一個資料庫都沒設時，同步回 `notion_not_configured`，管理頁仍可手動編輯。只設定其中幾個資料庫也可以，沒設定的區塊維持原草稿。

API 版本是 `2022-06-28` 的 `POST /v1/databases/{id}/query`。每個資料庫的標題屬性（title）可以改名；程式讀的是 title 型別那一欄。其餘欄位名稱要一致。勾選欄位是 checkbox。

### 成員 `NOTION_ROSTER_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 繁中名字 |
| Name EN | rich text | 英文名字 |
| Role | rich text | 繁中位置 |
| Role EN | rich text | 英文位置 |
| Hidden | checkbox | 勾了就留在草稿，但公開頁不顯示 |
| Publish | checkbox | 沒勾的列不會進草稿 |
| Order | number | 小的排前面 |

名字剛好是 `moohsia` 會整次同步失敗，草稿不改。Discord 邀請網址也會擋下。

### 動態 `NOTION_NEWS_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 繁中標題 |
| Title EN | rich text | 英文標題 |
| Body | rich text | 繁中內文 |
| Body EN | rich text | 英文內文 |
| Date | date | `YYYY-MM-DD` |
| Publish | checkbox | 勾了是公開稿，沒勾是草稿 |
| Order | number | 排序 |

沒勾 Publish 的公告會進草稿，狀態是 draft。就算之後發布整站，公開頁仍不顯示。

### 文案 `NOTION_COPY_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 鍵，例如 `zh.home.tagline` |
| Text | rich text | 要寫入的句子 |
| Publish | checkbox | 沒勾就保留網站上原來的句子 |

只會改已經存在、而且是字串的欄位。陣列（標籤、原則、狀態列）請在管理頁改。`contactEmail` 這把鍵會改公開信箱，仍必須是合法 email，預設維持 `Info@moohsia.com`。

常用鍵：`zh.home.tagline`、`en.home.tagline`、`zh.home.lead`、`zh.about.lead`、`zh.about.manifesto`、`en.about.manifesto`、`zh.contact.lead`、`zh.contact.writeBody`、`zh.roster.lead`、`zh.player.emptyBody`。英文把前綴換成 `en`。

### 戰隊欄位 `NOTION_PROFILE_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 繁中欄名 |
| Label EN | rich text | 英文欄名 |
| Value | rich text | 繁中內容 |
| Value EN | rich text | 英文內容 |
| Publish | checkbox | 沒勾的欄位不會出現 |
| Order | number | 排序 |

這個資料庫有設定而且同步成功時，會整份換掉戰隊欄位。沒有任何 Publish 列時，關於頁的欄位表是空的。

### 個人數據 `NOTION_PLAYER_DB`

一個資料庫可以有多列。有勾 Publish 的列裡，Order 最小的那列勝出。一列都沒勾時，草稿裡的個人檔案改回未公開，下次發布網站後公開頁回到空狀態。

標題屬性請命名成遊戲 ID（程式把 title 欄當成 handle）。不要把標題欄命名成 `Title`，否則會和頭銜欄撞名。

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| Handle（標題） | title | 遊戲 ID。留到你要公開再填 |
| Name / Name EN | rich text | 顯示名稱 |
| Role / Role EN | rich text | 位置 |
| Lane / Lane EN | rich text | 路線 |
| Rank / Rank EN | rich text | 段位。沒有就留白 |
| Season / Season EN | rich text | 賽季 |
| Server / Server EN | rich text | 伺服器 |
| Title / Title EN | rich text | 頭銜。沒有就留白 |
| Bio / Bio EN | rich text | 簡介 |
| Heroes / Heroes EN | rich text | 常用英雄，純文字 |
| Played、Wins、Win Rate、KDA、MVP | rich text | 數字。留白表示尚未填 |
| Publish | checkbox | 整份個人頁的公開開關 |
| Order | number | 多列時取最小 |

### 對局 `NOTION_MATCH_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 這場的名稱 |
| Date | date | 日期 |
| Mode | rich text | 模式 |
| Hero | rich text | 英雄 |
| Result | rich text 或 select | 結果，原樣顯示 |
| KDA | rich text | KDA |
| Note / Note EN | rich text | 註記 |
| Publish | checkbox | 這場是否可公開 |
| Order | number | 排序 |

個人檔案的 Publish 沒勾時，這些對局也不會出現在公開頁。

## 官方英雄與模式

英雄來自 Garena 傳說對決公開列表 <https://moba.garena.tw/game/heroes/>。頁面上的 `data-tags` 對應六種定位：坦克、戰士、刺客、法師、射手、輔助。肖像圖在官方 CDN `cdngarenanow-a.akamaihd.net`，卡片連回 `https://moba.garena.tw/game/hero/<id>`。英文定位是這六個中文標籤的譯名，不是另一份官方英文英雄名。

模式名稱只在官方公開頁裡真的出現該字串時才收錄，並附上原文摘錄與來源網址。目前來源包括：

| 模式 | 公開頁 |
| --- | --- |
| 5V5經典競技 | <https://moba.garena.tw/news/show/2504> |
| 混沌大亂鬥 | <https://moba.garena.tw/news/show/1768> |
| 三人對決、死鬥競技場、幻影激鬥、足球總動員、飛鉤奪寶戰、隨機單中、單人對戰 | <https://moba.garena.tw/news/show/2397> |
| 幻化之戰 | <https://moba.garena.tw/news/show/3148> |
| 雙人飛車賽 | <https://moba.garena.tw/news/show/2914> |

這些頁面證明 Garena 公開使用過這些名稱。季節與限時模式是否正在開放，以遊戲內為準。網站不把舊公告說成目前賽季。

快照在 [`data/aov-catalog.json`](data/aov-catalog.json)。更新方式：

```bash
npm run catalog:refresh
```

這支腳本只讀上述公開頁，不登入、不打需要帳號的介面。把新的 JSON 提交後再部署，Worker 在 D1／KV 還沒有目錄時會用這份快照。

正式環境還可以把目錄寫進 D1 `aov_catalog` 與 `CMS_KV` 鍵 `aov-catalog`：

- 每日 cron 會抓公開頁並寫入。抓取失敗就留著上一份。
- 管理頁 **更新官方英雄目錄** 做同一件事，前提是已經跑過 `0002` migration，或至少綁了 `CMS_KV`。

`GET /api/catalog` 回英雄、定位與模式。沒有帳號資料。

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

Worker 名稱是 **`moohsia-com`**。它只負責戰隊網站。正式部署由協調者執行，不要在這次變更裡直接部署，也不要改或部署 **`moohsia-cloud`** / `api.moohsia.com`。

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
