# 暮霞｜MOS

傳說對決公會的公開網站，準備部署到 [moohsia.com](https://moohsia.com)。

這不是個人作品集。訪客看到的是公會暮霞｜MOS（MOOHSIA）。公會底下有戰隊，目前有 MOOHSIA（暮霞）。公開聯絡方式只有 `Info@moohsia.com`。加入只接受官網申請。Discord 不開放加入，邀請由擁有者在核准時貼上並寄出，網站不保存邀請網址。

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
| `npm test` | 品牌文案、申請表、閒置登出、選手數據與目錄測試 |
| `npm run build` | 輸出 `dist/`（公開頁與管理頁） |
| `npm run check` | 以 `wrangler deploy --dry-run` 檢查 Worker 能否打包 |
| `npm run deploy` | 建置並部署名為 `moohsia-com` 的 Worker。這次變更不要執行 |
| `npm run cms:hash` | 產生 `ADMIN_PASSWORD_HASH` |
| `npm run cms:migrate` | 對正式 D1 套用 CMS migration |
| `npm run catalog:refresh` | 從 Garena 公開頁重抓英雄、造型圖、技能、裝備與活動，寫進 `data/aov-catalog.json` |

## 頁面

| 路徑 | 內容 |
| --- | --- |
| `/` | 公會首頁：暮色舞台、識別、狀態、預留席位、選手數據、英雄與活動預覽、加入入口、聯絡 |
| `/about` | 公會。未確認欄位顯示待公布 |
| `/teams` | 戰隊名單。目前有 MOOHSIA（暮霞） |
| `/teams/:slug` | 單一戰隊：加入條件與該隊成員，連到 `/roster/:name` |
| `/roster` | 成員。每一列有戰隊。沒有名單時以待公布席位呈現，並附個人數據入口 |
| `/roster/:name` | 玩家資料。點成員卡進入，側欄是常用英雄、歷史戰績、對戰資料。`/player` 會在瀏覽器改到這位成員，不另開選手頁 |
| `/skills` | 英雄技能。全部英雄的被動、一技能、二技能、三技能。不是奧義 |
| `/user-skills` | 使用者技能。Garena 公開頁稱挑戰者技能，例如瞬移。不是英雄技能 |
| `/ultimates` | 奧義（魔紋配裝）。資料來自 Garena 公開奧義列表。另列魔紋四個屬系；官方頁沒有逐條魔紋數值，所以不補效果 |
| `/heroes` | 官方英雄名單（Garena 公開頁）。點進去看技能與造型圖 |
| `/heroes/:id` | 單一英雄：技能與造型圖。搜尋也連到這裡 |
| `/skins` | 官方造型圖，連到所屬英雄 |
| `/items` | 官方裝備：名稱、圖示、說明，加上由歷史戰績整理的常用出裝 |
| `/modes` | 官方模式名稱（Garena 公開公告），另有排位賽說明。不代表遊戲內正在開放 |
| `/activities` | Garena 公開活動、公告與賽事 |
| `/apply` | 加入申請。最低黃金，沒有公開 Discord |
| `/news` | 動態。沒有公告時為廣播空狀態 |
| `/contact` | 只有 `Info@moohsia.com` |

右上角可搜尋英雄、造型、裝備與站內頁面，也可切換 English。預設是繁體中文。搜尋打到 Worker 的 `/api/search`。

公開資訊架構沒有驗證頁。導覽、首頁按鈕、頁尾與行銷文案都不提供驗證入口；直接打開舊的驗證網址會落到站內 404。

動畫包含可略過的入場、舞台地板、粒子拖尾、HUD 環、跑馬燈、滑鼠與捲動視差、卡片傾斜、雷達掃描與懸停回饋。系統若設定 `prefers-reduced-motion: reduce`，入場與這些動效會停用，內容仍可直接閱讀。

## 管理後台

私人編輯頁在 **admin.moohsia.com**，跟公開站用同一個 Worker `moohsia-com`。不要把這個網域接到 `moohsia-cloud`。

| 網址 | 行為 |
| --- | --- |
| `https://admin.moohsia.com/login` | 登入 |
| `https://admin.moohsia.com/` | 已登入時轉到總覽，否則轉到登入 |
| `https://moohsia.com` | 公開公會站，只讀已發布內容 |

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

登入失敗 8 次會鎖 15 分鐘。正式環境若有綁 `CMS_KV`，鎖在 KV；否則只算這一個 Worker isolate。Cookie 是 `HttpOnly`、`SameSite=Lax`，HTTPS 上加 `Secure`，閒置 15 分鐘就失效。有操作時 Cookie 與伺服器期限一起往後延。管理頁也會在 15 分鐘沒有輸入時登出。會改資料的請求要帶登入時拿到的 CSRF 標頭。登入頁不預填帳號，也不把帳號寫進 JSON。

### 資料庫

[`wrangler.jsonc`](wrangler.jsonc) 裡的 `database_id` 與 `CMS_KV` id 已是正式環境的 `moohsia-cms` 與 `CMS_KV`。不要換成別的 id。沒有 KV 時登入鎖定仍可用，只是不會跨 isolate。

```bash
npm run cms:migrate:local
npm run cms:migrate
```

`migrations/0001_init.sql` 建 `site_documents`。`migrations/0002_player_and_catalog.sql` 再加 `player_records` 與 `aov_catalog`。`migrations/0003_applications.sql` 加 `applications`。申請表只存審核需要的欄位與邀請的 SHA-256，不存邀請網址。表是空的時候，Worker 會把 [`src/content.js`](src/content.js) 的內建文案寫成第一份草稿與已發布內容。就算 migration 還沒跑、或 D1 暫時讀不到，公開頁也會退回這份內建文案，不會變成空白。英雄、模式與活動則退回倉庫裡的官方快照。後面的 migration 不會改掉已經發布的文案。

## 個人數據

個人戰績跟戰隊文案放在同一份 CMS 文件的 `player` 欄位，並在 D1 的 `player_records`（id 為 `owner`）留一份可查詢的複本。儲存草稿只更新 `draft_json`。按 **發布到網站** 才寫入 `published_json`。

公開頁只在 `publish` 為 true 時顯示這份資料。入口是名單上的成員（遊戲 ID `htw0702aov`），不是獨立的選手頁。`/player` 仍會回傳公開頁殼，瀏覽器再改到 `/roster/htw0702aov`。預設未發布時，成員頁是空狀態，不會出現段位、頭銜、場次或勝率。空白欄位顯示「待公布」。系統不會把空白補成 0，也不會發明信譽積分、段位或更早的對局。

AOVRanking 戰績的四格是 `補兵 | 控場 | 治療 | 塔傷`，用四個 div 依序拆開。補兵就是補刀數，治療就是治療量，塔傷就是對塔傷害。控場以秒儲存（22:59 娜塔亞是 6.534），公開頁的控制效果顯示成秒數 ×1000（6534）。2026-09-25 22:59:28 那場是補刀 34、治療 6077、塔傷 2089、經濟 9819、輸出 125875、承傷 113770、KDA 8/6/4。13:20 的補兵 30 是較早的另一場，不是這場讀錯。已發布的目錄維持匯入的 50 場，不另造對局。`node scripts/rewrite-player-matches.mjs` 只會把已經存在的 22:59 娜塔亞列對齊這些數字。

頁面結構對齊遊戲內玩家資料，親密關係不收：

| 區塊 | 內容 |
| --- | --- |
| 對戰資料 | 賽季雷達與勳章，下面是可展開的對局。每一場再分數據、輸出、生存、發育、戰績、團隊 |
| 信譽積分 | 分數、等級、經驗、說明、特權。沒填就不顯示 |
| 歷史戰績 | 兩隊、英雄、IGN、評分、K／D／A、經濟、裝備、MVP、時長、比分、時間 |
| 對局分頁 | 數據、輸出、生存、發育、戰績、團隊 |
| 側欄 | 常用英雄、歷史戰績、對戰資料、信譽積分、冠軍賽榮譽、榮譽頭銜 |
| 精彩對局 | 擁有者上傳的截圖或影片，存在 R2 |

KDA 可以手填。三個擊殺、死亡、助攻都有數字、又沒手填 KDA 時，公開頁用 `(K+A)/max(D,1)`。

遊戲 ID 留空，等擁有者自己填。保留名稱仍是剛好等於 `moohsia`（大小寫、空白、標點去掉之後）。不要把真實 UID 寫進公開程式的預設文案。

對局也有自己的公開勾選。個人檔案沒有公開時，對局不會出現在網站上。

管理頁在 **選手數據**。Notion 的選手、賽季、對局、榮譽、頭銜、常用英雄資料庫可以覆寫對應草稿，規則見下一節。媒體檔仍只從管理頁上傳。

## Notion 同步

Notion 是編輯來源。同步**只寫入 CMS 草稿**，不會直接改公開網站。擁有者在 admin.moohsia.com 看過草稿後，按 **發布到網站**，公開頁才換。這是唯一的發布閘門：資料列還要勾 **Publish**，沒勾的不會進公開頁。

觸發方式有三種，做的是同一件事：

| 方式 | 怎麼跑 |
| --- | --- |
| 管理按鈕 | 總覽的 **從 Notion 同步草稿**。要已登入，並帶 CSRF |
| 排程 | Worker cron `15 18 * * *`（UTC 18:15，台北約 02:15）。只更新草稿與英雄目錄。另一個 cron `0 * * * *` 每小時抓 `htw0702aov`（純潔之翼／1012）的歷史戰績，合併進選手草稿與已發布的選手資料，不改其他文案。AOVRanking 一次大約 50 場；合併會留下這 50 場以外、已經存著的較舊對局，上限 160 場。驗證頁不寫入，管理頁的貼上與檔案匯入仍可用 |
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
npx wrangler secret put NOTION_SEASON_DB
npx wrangler secret put NOTION_HONOR_DB
npx wrangler secret put NOTION_TITLE_DB
npx wrangler secret put NOTION_HERO_DB
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
| Team 或 戰隊 | rich text | 戰隊代稱，例如 `moohsia`。空白時公開頁歸到 MOOHSIA |
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

### 公會欄位 `NOTION_PROFILE_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 繁中欄名 |
| Label EN | rich text | 英文欄名 |
| Value | rich text | 繁中內容 |
| Value EN | rich text | 英文內容 |
| Publish | checkbox | 沒勾的欄位不會出現 |
| Order | number | 排序 |

這個資料庫有設定而且同步成功時，會整份換掉公會欄位。沒有任何 Publish 列時，關於頁的欄位表是空的。

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
| UID | rich text | 全數字。留白表示尚未填 |
| Played、Wins、Win Rate、KDA、MVP | rich text | 數字。留白表示尚未填 |
| Kills、Deaths、Assists、Gold、Damage | rich text | 分開的擊殺、死亡、助攻、經濟、輸出 |
| Reputation、Reputation Level、Reputation Exp、Reputation Exp Max | rich text | 信譽積分。沒有就留白 |
| Reputation Note / Reputation Note EN | rich text | 信譽說明 |
| Publish | checkbox | 整份個人頁的公開開關 |
| Order | number | 多列時取最小 |

### 對局 `NOTION_MATCH_DB`

| 屬性 | 型別 | 用途 |
| --- | --- | --- |
| 標題 | title | 這場的名稱 |
| Date | date | 日期 |
| Played At | rich text | 例如 `2026-09-25 12:25` |
| Duration | rich text | `12:16` |
| Mode | rich text | 模式 |
| Hero | rich text | 英雄 |
| Result | rich text 或 select | 結果，原樣顯示 |
| KDA、Kills、Deaths、Assists、Gold、Damage、Taken | rich text | 這場自己的數字 |
| Blue、Red | rich text | 兩隊比分 |
| Winner、Owner Side | rich text 或 select | `blue`／`red`，或藍／紅 |
| Note / Note EN | rich text | 註記 |
| Highlight / Highlight EN | rich text | 精彩對局說明。檔案本身不在 Notion |
| Scoreboard | rich text | 記分板 JSON，最多 10 列。欄位對齊管理頁：side、hero、ign、lane、badge、kills、deaths、assists、gold、score、mvp、owner、items、heroDamage、heroDamagePct、taken、takenPct、teamfightCount、teamfightRate、damageRatio、takenPer、gpm |
| Publish | checkbox | 這場是否可公開 |
| Order | number | 排序 |

個人檔案的 Publish 沒勾時，這些對局也不會出現在公開頁。同步對局時，已上傳的精彩對局檔案會留在同一場。

### 賽季 `NOTION_SEASON_DB`

標題是賽季名，例如 `2026-S4`。Mode、Played、Wins、Win Rate、MVP 是文字。雷達是 Radar Output、Radar KDA、Radar Farm、Radar Teamfight、Radar Survival，0 到 100。勳章欄名用遊戲裡的中文：超神、五殺、四殺、三殺、頂級、金牌、銀牌、敗方MVP。Publish 沒勾的列不會進草稿。

### 榮譽、頭銜、常用英雄

`NOTION_HONOR_DB` 標題是榮譽名，Season 與 Note／Note EN 是文字。`NOTION_TITLE_DB` 標題是頭銜，Note／Note EN 是文字。`NOTION_HERO_DB` 標題是英雄，Played、Win Rate、Note／Note EN 是文字。三個都要勾 Publish 才會進草稿。沒設定的資料庫不會清掉管理頁已經填的內容。

## 官方英雄與模式

英雄來自 Garena 傳說對決公開列表 <https://moba.garena.tw/game/heroes/>。頁面上的 `data-tags` 對應六種定位：坦克、戰士、刺客、法師、射手、輔助。肖像圖在官方 CDN `cdngarenanow-a.akamaihd.net`。站內英雄頁連到 `/heroes/<id>`，那一頁有技能說明，以及英雄頁上的造型圖。官方英雄頁通常沒有印出造型名稱，所以有圖就顯示圖，有名稱才顯示名稱。英文定位是這六個中文標籤的譯名，不是另一份官方英文英雄名。

裝備來自 <https://moba.garena.tw/game/props>。每一件保留官方 id、名稱、說明，圖示用 `BattleEquip/{id}.png`。戰績裡的 `裝備 1423` 會對上這份表，例如顯示名稱與圖，而不是只留編號。目錄裡沒有的 id 仍用同一條官方圖示網址，不發明名稱。

`GET /api/search?q=` 查英雄、英雄技能、使用者技能、奧義、造型、裝備與站內頁面。索引跟目錄一起存在快照、D1 與 KV。選手頁與成員頁可以只讀這些形狀，不必再抓 Garena：

`GET /api/catalog` 的 `heroes[]`：`id`、`name.zh`、`name.en`、`role`、`roleLabel`、`image`（官方肖像）、`pageUrl`、`blurb`、`skills[]`（`name`、`text`、`image`）、`skins[]`（`id`、`name`、`image`、`thumb`、`kind` 為 `default` 或 `skin`）。造型掛在所屬英雄底下。官方頁常常沒有造型名稱，`name.zh` 會是空的。

`items[]`：`id`、`name.zh`、`category`、`description`、`image`。圖示是 `https://cdngarenanow-a.akamaihd.net/mgames/kgcenter/tw/Art_Resources/UI/System_Hon/BattleEquip/{id}.png`。戰績裝備格存成 `裝備 {id}`。`shared/aov-assets.js` 的 `resolveItem(token, items)` 回 `{ id, name, image, description, href }`，`resolveHero(name, heroes)` 回 `{ id, name, image, href }`。目錄裡沒有的 id 仍給官方圖示網址，名稱留空。

`arcana[]` 來自 <https://moba.garena.tw/game/katha>：`id`、`name`、`level`（1–3）、`tags`、`effect`、`image`。這是奧義／魔紋配裝，不是英雄第四個技能。`userSkills[]` 來自 <https://moba.garena.tw/game/skill>（官方稱挑戰者技能）：`id`、`name`、`text`、`image`。魔紋四個屬系只在頁面上列名稱，官方遊戲頁沒有逐條數值，所以不寫進目錄。

`GET /api/search?q=` 回 `{ ok, query, results }`。每一筆是 `{ type, id, title, href, image }`，`type` 為 `hero`、`skill`、`userSkill`、`arcana`、`skin`、`item` 或 `page`。`href` 指到 `/heroes/{id}`、`/skills#skill-{heroId}-{index}`、`/user-skills#user-{id}`、`/ultimates#katha-{level}-{id}`、`/heroes/{id}#skin-{heroId}-{skinId}` 或 `/items#item-{id}`。

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

活動、公告與賽事來自公開列表，不登入：

| 種類 | 公開頁 |
| --- | --- |
| 活動 | <https://moba.garena.tw/news/Activity> |
| 公告 | <https://moba.garena.tw/news/> |
| 賽事 | <https://moba.garena.tw/news/Esports> |

其中一份列表抓失敗時，英雄與模式仍會更新。摘錄裡的電子郵件與 Discord 邀請會拿掉。

`GET /api/catalog` 回英雄、造型、技能、裝備、定位、模式與活動。沒有帳號資料。管理頁按鈕是 **更新官方目錄與活動**。每日 cron 會順手補一批英雄內頁；已經在快照裡的造型與裝備不會被較舊的 D1 列蓋掉。

### 草稿與發布

管理頁改的是草稿。公開網站不會跟著變。

按 **儲存草稿** 只更新草稿。按 **發布到網站** 才把現在這份內容整份公開。**捨棄草稿** 會回到上次發布的內容。

成員可以新增、修改、隱藏。沒有填名字的人不會出現在公開頁，預設也不會塞假選手。動態預設是草稿；狀態改成公開而且整站發布之後才會出現。再改回草稿並發布，就會從公開頁拿掉。加入申請不在這份文案裡，它走下面的申請表。公開信箱欄位預設是 `Info@moohsia.com`，只有在這個欄位改掉時，頁面上的 mailto 才會換。

### 接上 admin.moohsia.com

先確認 `moohsia.com` 與 `www.moohsia.com` 已經在 **moohsia-com** 上，而且 `moohsia-cloud` 沒有這兩個網域。

1. Cloudflare 控制台 → **Workers & Pages → moohsia-com → Settings → Domains & Routes**。
2. Add → Custom domain → `admin.moohsia.com`。
3. 區域已在同一個帳號時，Cloudflare 會自動加一筆被代理（橘色雲）的 DNS。不要刪掉 apex 或 `www`。
4. 若 DNS 不在這個帳號，自己加 CNAME：`admin` → `moohsia-com.<帳號>.workers.dev`，並打開代理。
5. SSL/TLS 維持 **Full (strict)**。
6. 打開 <https://admin.moohsia.com/login>，帳號填 `htw0702`，密碼用你做成雜湊的那一組。未登入時只看得到登入頁，公開 API 不會回草稿。

Zone 還沒在這個帳號時，不要把 [`wrangler.jsonc`](wrangler.jsonc) 裡註解掉的 `routes` 打開。

## 再加一支戰隊

管理頁 **戰隊**（`/edit/teams`）新增一列：網址代稱（小寫，例如 `nova`）、名稱、又稱、加入條件。到 **成員** 把選手的戰隊改成這個代稱，再按 **發布到網站**。公開頁會出現在 `/teams` 與 `/teams/nova`。

沒有進管理頁時，內建名單在 [`src/content.js`](src/content.js) 的 `teams`。再推一個物件，`slug` 就是網址。已發布的舊文案如果還寫著整站「戰隊」，讀取時只會把跟內建舊句完全一樣的句子改成公會；自己改過的句子保持原樣。成員沒填戰隊時，公開頁歸到 `moohsia`。

## 更新公會資料

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

## 加入申請與 Discord

公開網站接受申請，Discord 不開放加入。沒有邀請池，Worker 不會產生邀請，也不會把邀請網址寫進 git、D1 或公開頁。

申請人在 `/apply` 填：歷史排位賽最高戰績（最低黃金）、全數字 UID、暱稱、聯絡信箱、性別、年齡層（18 歲起）、為什麼希望加入、剛好兩個位子、平日與假日遊玩時間、可配合練習的具體時段（例如 `20:00～22:00`），並勾選尊重、友善、包容、禁止金錢往來、跟隨官方規範。

`POST /api/apply` 會寫進 D1 `applications`。同一個 UID 已有待審申請時回 409。蜜罐欄位直接丟棄。同一 IP 15 分鐘最多 5 筆。失敗時回應帶 `code` 與 `field`（例如 `positions_invalid`、`practice_time_invalid`、`rank_below_gold`）。申請頁會把已知的 code 翻成繁中或英文說明；沒有 code 時才顯示「這次沒有送出。」位子數量與練習時段會先在瀏覽器裡用跟伺服器相同的規則擋下來。信沒寄出時申請仍留下，`mailed` 為 false，頁面仍顯示已收到，並補一句通知信可能晚到。

寄信用 Resend。密鑰不要進 git：

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put MAIL_FROM
npx wrangler secret put APPLICATIONS_TO
```

`MAIL_FROM` 預設是 `MOOHSIA <Info@moohsia.com>`。`APPLICATIONS_TO` 沒設時，新申請寄到 `Info@moohsia.com`。信沒設好時，申請仍會留下，回應裡的 `mailed` 是 false。

管理頁 **加入申請** 列出待審資料。核准時貼上一則 Discord 邀請（`https://discord.gg/` 或 `https://discord.com/invite/`）。在按下核准之前這欄可以空著。按下核准後，這則網址只出現在寄給那位申請人的信裡。資料庫只留 SHA-256，用來擋同一則連結再用一次。回應 JSON 不含網址。信送失敗時狀態維持待審。拒絕可以選擇要不要寄信；有要求寄信但失敗時，也不改狀態。

`DISCORD_INVITE_URL` 留空。它只影響 `/api/config` 的 `inviteConfigured`，公開頁不印出網址。不要把它換成邀請池。

## 精彩對局媒體

截圖與短片放在 R2，綁定名稱 `MEDIA`，bucket 名稱 `moohsia-media`。擁有者自己建立，這次變更不建立正式資源：

```bash
npx wrangler r2 bucket create moohsia-media
```

圖片上限 8MB（jpeg、png、gif、webp），影片上限 32MB（mp4、webm）。程式會看檔頭，不信副檔名。公開網址只有已發布對局的 `/api/media/:id`。

## 內部 API

`POST /api/verify` 仍是舊的人工審核存根，沒有掛進公開頁面。Worker 不連 Garena 個人資料，也不會因為這個請求解鎖 Discord。

## 驗證 API

`POST /api/verify`

```json
{ "aovId": "傳說對決 ID", "discordHandle": "DiscordName", "ack": true }
```

成功時 HTTP 202，狀態是 `pending_review`，並註明 `stored: false`、`garenaSync: false`、`discordUnlocked: false`。這不是 Garena 官方 API，也不代表已加入戰隊。

`GET /api/health` 回 `{ "ok": true, "service": "moohsia-com" }`。

## 部署到 moohsia.com

Worker 名稱是 **`moohsia-com`**。它只負責公會網站。正式部署由協調者執行，不要在這次變更裡直接部署，也不要改或部署 **`moohsia-cloud`** / `api.moohsia.com`。

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
   - <https://moohsia.com> 是公會站，不是聊天 API。
   - <https://moohsia.com/api/health> 回 `service: "moohsia-com"`。

也可以在 zone 已就緒時，把 [`wrangler.jsonc`](wrangler.jsonc) 裡註解掉的 `routes` 打開再部署。帳號還沒有這個 zone 時不要打開，否則部署會去綁網域而失敗。

第一次部署後，還可以用 `moohsia-com.<你的帳號>.workers.dev` 預覽。正式網域仍建議只用在公會站。

## 技術

- Vite 靜態頁，前端路由。
- Cloudflare Worker `moohsia-com` 提供 `/api/*`。重新整理或直接打開 `/apply`、`/player`、`/activities` 這類沒有副檔名的網址時，Worker 回傳公開頁殼，瀏覽器網址留在原頁。Assets 對這些路徑會 307 到 `/`，那個重新導向只在 Worker 裡面跟著走，不會交給瀏覽器。有副檔名但找不到的檔案維持 404。
- 設定檔是 [`wrangler.jsonc`](wrangler.jsonc)，`compatibility_date` 為 `2026-09-24`。
