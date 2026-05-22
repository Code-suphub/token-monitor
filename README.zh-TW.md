<p align="right">
   <a href="./README.md">EN</a> | <a href="./README.zh-CN.md">简</a> | <strong>繁</strong>
</p>
<div align="center">
    <img src=".github/assets/app.png" alt="Token Monitor logo" width="120">
    <h1>Token Monitor</h1>
</div>

<p align="center">
    <em>跨裝置聚合每個 AI 編程工具的即時用量。</em>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Windows-10%2B-0078D4?style=flat-square" alt="Windows 10 或更新" />
    <img src="https://img.shields.io/badge/macOS-14%2B-0A84FF?style=flat-square&logo=apple&logoColor=white" alt="macOS 14 或更新" />
    <img src="https://img.shields.io/badge/iOS-16%2B-0A84FF?style=flat-square&logo=apple&logoColor=white" alt="iOS 16 或更新" />
    <a href="docs/API.md"><img src="https://img.shields.io/badge/API-Docs-0B7285?style=flat-square" alt="API 文件" /></a>
    <a href="worker/README.md"><img src="https://img.shields.io/badge/Worker-Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Worker" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-A855F7?style=flat-square" alt="授權：MIT" /></a>
</p>

<div align="center">
    <img src=".github/assets/demo.gif">
</div>

## 什麼是 Token Monitor？

一款桌面小工具，即時顯示你各種 AI 編程工具——Claude Code、Codex、Hermes、OpenCode、OpenClaw、Cursor 等——的 Token 用量與 AI 工具用量上限，並支援依工具、裝置、模型分項顯示。

預設完全在你自己的機器上執行。可選擇加上 hub，數秒內同步多台 Mac、Windows PC、無頭代理與 iPhone 小工具的 Token 變化。

離開你機器的永遠只有摘要數字。原始提示詞、原始碼與對話內容都留在本機。

## 為什麼要用 Token Monitor？

大多數用量監控工具只在它執行的那台機器上有用。Token Monitor 是為多裝置工作流而設計的：每台裝置監看自己的本機紀錄、把摘要更新送到你的 hub，每個連線中的小工具幾乎都能即時看到 Token 變化。

## 功能特色

- Claude Code、Codex、Hermes、OpenCode、OpenClaw、Cursor 的即時 Token 追蹤——每輪對話後 UI 在數秒內更新
- 即時多裝置 Token 同步——任一裝置的變化會在數秒內出現在所有小工具上
- 切換分項檢視——依工具、裝置、模型或帳戶用量上限分組統計
- Token 數量旁附帶成本分項
- Claude Code 與 Codex 的用量上限偵測——本機具備工具憑證時會顯示 session 與每週視窗
- 外觀控制——可調整玻璃透明度／模糊度與視窗外觀（含完全透明玻璃）
- 選單列／系統匣模式——可改為由 macOS 選單列或 Windows 系統匣呼出的彈出視窗，圖示旁即時顯示成本、token 數，或 Claude／Codex 最接近用完的用量上限百分比
- 本地優先——單裝置使用完全不需伺服器
- 自架同步後端——支援 Node hub 或 Cloudflare Worker，透過 Server-Sent Events 推送
- 透過 Worker hub 支援 iOS 小工具（Widgy、Scriptable）
- Discord Rich Presence——將今日 Token、花費與主要工具廣播到你的 Discord 個人檔案（需手動開啟）
- 隱私優先——只有摘要數字會離開你的機器

| 用量上限檢視 | 裝置檢視 | 模型檢視 |
|:---:|:---:|:---:|
| ![用量上限檢視](.github/assets/limits-view.png) | ![裝置檢視](.github/assets/devices-view.png) | ![模型檢視](.github/assets/models-view.png) |

## 支援的工具

Token Monitor 對「Token 用量」與「帳戶用量上限」分別支援：

| Logo | 工具 | 資料路徑 | Token 用量 | AI 工具用量上限 |
|:---:|------|-----------|:---:|:---:|
| <img src=".github/assets/tools-icon/claude.png" width="28" alt="Claude Code" /> | Claude Code | `~/.claude/projects/`、`~/.claude/transcripts/` | ✅ | ✅ |
| <img src=".github/assets/tools-icon/codex.png" width="28" alt="Codex" /> | Codex | `~/.codex/sessions/` | ✅ | ✅ |
| <img src=".github/assets/tools-icon/opencode.png" width="28" alt="OpenCode" /> | OpenCode | `~/.local/share/opencode/` | ✅ | — |
| <img src=".github/assets/tools-icon/hermes-agent.png" width="28" alt="Hermes" /> | Hermes | `$HERMES_HOME` 或 `~/.hermes/` | ✅ | — |
| <img src=".github/assets/tools-icon/openclaw.png" width="28" alt="OpenClaw" /> | OpenClaw | `~/.openclaw/agents/` | ✅ | — |
| <img src=".github/assets/tools-icon/cursor.png" width="28" alt="Cursor" /> | Cursor | `~/.config/tokscale/cursor-cache/`（由 `tokscale cursor pull` 填入） | ✅ | — |

## 安裝

### 本地模式——單一裝置

預設模式。不需要 hub、不需要代理、不需要任何設定。

```bash
npm install
npm start
```

用量會即時從你的本機 AI 客戶端目錄讀取——完整路徑清單請見 [支援的工具](#支援的工具) 表格。檔案一變動小工具就立刻更新，另有 5 分鐘的備援輪詢。

### 多裝置同步

挑一個所有裝置（與任何無頭代理）都連得到的 hub 後端。在每台裝置上打開小工具，填入 設定 → 多裝置同步 → Hub URL + Secret。小工具會自動回報本機用量；只在沒有小工具的機器上跑 `npm run agent`。

hub HTTP API 參考請見 [docs/API.md](docs/API.md)。

#### 選項 A——自架 Node hub（同一區網）

在一台會持續開機的機器上跑一次 hub，然後讓每台裝置指向它。

```bash
# 在會持續開機的機器上
cp .env.example .env
# 把 TOKEN_MONITOR_SECRET 設成你私有的值，然後：
npm run hub
```

#### 選項 B——Cloudflare Worker hub（跨網路，包括 iPhone）

以 Worker 部署的 hub，協定與 Node hub 完全相同。
公開 HTTPS、無需常時開機、免費方案足夠小團隊使用、
iOS 上的 Widgy / Scriptable 都連得到。

[![部署到 Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Javis603/token-monitor/tree/main/worker)

一鍵部署——Cloudflare 會在過程中請你輸入 `TOKEN_MONITOR_SECRET`。或手動部署：

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put TOKEN_MONITOR_SECRET
npx wrangler deploy
```

Wrangler 會印出部署的 URL——把它貼到每台裝置的小工具 設定 → 多裝置同步。完整部署說明、iOS 小工具設定步驟與端點參考請見 [worker/README.md](worker/README.md)。

## 運作原理

```text
模式 A——本地（預設，免設定）
    小工具 (Electron) ──▶ tokscale ──▶ ~/.claude、~/.codex、$HERMES_HOME

模式 B——同步（選用，多裝置）
    裝置 A agent ──▶
    裝置 B agent ──▶  hub  ──▶  任一裝置上的小工具
    裝置 C agent ──▶
```

小工具會根據設定裡是否填了 Hub URL 自動切換模式，沒有獨立的「模式」開關。同步模式下，hub 透過 Server-Sent Events 把彙總後的統計推送給每個連線中的小工具，所以一台裝置上的更新會在數秒內出現在其他裝置上。

## 設定

### 小工具（GUI）

點擊小工具標題列上的 `⚙` 按鈕開啟設定面板。

- **多裝置同步**——Hub URL 與 secret。Hub URL 留空即為本地模式（僅本機）。
- **追蹤的工具**——各支援 AI 工具的勾選框。切換立即生效，並會用新的客戶端清單重啟收集器。
- **AI 工具用量上限**——選擇 Claude Code 與 Codex 的用量上限偵測與更新頻率。
- **顯示模式**——可將浮動視窗改為 macOS 選單列或 Windows 系統匣的彈出視窗，並選擇圖示旁顯示的內容：成本、今日 token 數、累計 token 數、成本＋token、最接近用完的 Claude／Codex 用量上限百分比，或只顯示圖示。
- **外觀**——系統玻璃、即時點、工具圖示、Discord Rich Presence、玻璃透明度、玻璃模糊度。
- **進階**——開啟底層 `settings.json` 來調整較少用的選項，例如 `allTimeSince`。

小工具標題列上的釘選按鈕可切換「永遠置頂」。

### 無頭代理與 hub（`.env`）

代理與 hub 沒有 UI。請在專案根目錄用 `.env` 檔案設定（從 `.env.example` 複製）:

```env
TOKEN_MONITOR_HUB_URL=               # 同步模式必填——Worker URL 或 http://<lan-ip>:17321
TOKEN_MONITOR_SECRET=                # 共用 secret，必須與 hub 一致
TOKEN_MONITOR_DEVICE_ID=             # 選填——預設為主機名稱
TOKEN_MONITOR_CLIENTS=               # 選填——預設為所有支援的工具
TOKEN_MONITOR_LIMITS_ENABLED=        # 選填——預設啟用；設為 0 可跳過 CLI 探測
TOKEN_MONITOR_LIMIT_PROVIDERS=       # 選填——預設為所有支援的供應商（claude、codex）
```

小工具會把同樣的環境變數讀作首次啟動的預設值，之後改由 GUI 設定接手。

每個值也都可以用 CLI 旗標傳入（`--hub=`、`--secret=`、`--device=`、`--clients=`、`--limits=`、`--limitProviders=`）——旗標優先於環境變數。較少用的調整項（`TOKEN_MONITOR_INTERVAL_MS`、`TOKEN_MONITOR_PORT`、`TOKEN_MONITOR_STALE_AFTER_MS`、`TOKEN_MONITOR_LIMITS_REFRESH_MS`、…）一樣可透過環境變數／旗標設定，但為了減少雜訊，不放進 `.env.example`。

一次性執行範例：

```bash
npm run agent -- --clients=claude,codex,opencode --once
```

## 隱私

hub 與代理只傳輸摘要欄位：

- 裝置 id、主機名稱、平台
- 每個時段的 Token 總數（今日 / 本月 / 全部）
- 成本總額（若 `tokscale` 回傳成本資料）
- 依客戶端與模型的分項統計
- 啟用 AI 工具用量上限時，正規化後的 Claude Code／Codex 用量狀態

完全不會傳輸原始 AI 紀錄、提示詞、原始碼或對話內容。也不會傳輸 OAuth 憑證、存取權杖、刷新權杖、電子郵件或供應商原始回應。`.env`、`data/`、`node_modules/` 已加入 gitignore。

## 系統需求

- macOS 或 Windows
- Node.js 18.17+
- 僅同步模式：每個代理／小工具到 hub 的網路連通性

## 致謝

- [tokscale](https://github.com/junhoyeo/tokscale) 提供紀錄解析與 Token 計算。
- [CodexBar](https://github.com/steipete/CodexBar) 提供 AI 工具用量上限的研究參考。

## 授權

[MIT](LICENSE) © [@Javis](https://github.com/Javis603)
