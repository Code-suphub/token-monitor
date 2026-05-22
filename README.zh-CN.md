<p align="right">
   <a href="./README.md">EN</a> | <strong>简</strong> | <a href="./README.zh-TW.md">繁</a>
</p>
<div align="center">
    <img src=".github/assets/app.png" alt="Token Monitor logo" width="120">
    <h1>Token Monitor</h1>
</div>

<p align="center">
    <em>跨设备聚合每个 AI 编程工具的实时用量。</em>
</p>

<p align="center">
    <img src="https://img.shields.io/badge/Windows-10%2B-0078D4?style=flat-square" alt="Windows 10 或更新" />
    <img src="https://img.shields.io/badge/macOS-14%2B-0A84FF?style=flat-square&logo=apple&logoColor=white" alt="macOS 14 或更新" />
    <img src="https://img.shields.io/badge/iOS-16%2B-0A84FF?style=flat-square&logo=apple&logoColor=white" alt="iOS 16 或更新" />
    <a href="docs/API.md"><img src="https://img.shields.io/badge/API-Docs-0B7285?style=flat-square" alt="API 文档" /></a>
    <a href="worker/README.md"><img src="https://img.shields.io/badge/Worker-Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Worker" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-A855F7?style=flat-square" alt="许可证：MIT" /></a>
</p>

<div align="center">
    <img src=".github/assets/demo.gif">
</div>

## Token Monitor 是什么？

一款桌面小部件，实时显示你各种 AI 编程工具——Claude Code、Codex、Hermes、OpenCode、OpenClaw、Cursor 等——的 Token 用量与 AI 工具用量上限，并支持按工具、设备、模型分项显示。

默认完全在你自己的机器上运行。可选择搭配 hub，数秒内同步多台 Mac、Windows PC、无头代理与 iPhone 小部件的 Token 变化。

离开你机器的永远只有汇总数字。原始提示词、源代码与对话内容都保留在本地。

## 为什么用 Token Monitor？

大多数用量监控工具只在它运行的那台机器上有用。Token Monitor 是为多设备工作流而设计的：每台设备监视自己的本地日志、把汇总更新发送到你的 hub，每个连接中的小部件几乎都能实时看到 Token 变化。

## 功能特性

- Claude Code、Codex、Hermes、OpenCode、OpenClaw、Cursor 的实时 Token 追踪——每轮对话后 UI 在数秒内刷新
- 实时多设备 Token 同步——任一设备的变化会在数秒内出现在所有小部件上
- 切换分项视图——按工具、设备、模型或账户用量上限分组统计
- Token 数量旁附带成本分项
- Claude Code 与 Codex 的用量上限检测——本机具备工具凭据时会显示 session 与每周窗口
- 外观控制——可调节玻璃透明度／模糊度与窗口外观（含完全透明玻璃）
- 菜单栏／系统托盘模式——可改为由 macOS 菜单栏或 Windows 系统托盘唤出的弹出窗口，图标旁实时显示成本、token 数，或 Claude／Codex 最接近用完的用量上限百分比
- 本地优先——单设备使用完全无需服务器
- 自托管同步后端——支持 Node hub 或 Cloudflare Worker，通过 Server-Sent Events 推送
- 通过 Worker hub 支持 iOS 小部件（Widgy、Scriptable）
- Discord Rich Presence——将今日 Token、花费与主要工具广播到你的 Discord 个人资料（需手动开启）
- 隐私优先——只有汇总数字会离开你的机器

| 用量上限视图 | 设备视图 | 模型视图 |
|:---:|:---:|:---:|
| ![用量上限视图](.github/assets/limits-view.png) | ![设备视图](.github/assets/devices-view.png) | ![模型视图](.github/assets/models-view.png) |

## 支持的工具

Token Monitor 对「Token 用量」和「账户用量上限」分别支持：

| Logo | 工具 | 数据路径 | Token 用量 | AI 工具用量上限 |
|:---:|------|-----------|:---:|:---:|
| <img src=".github/assets/tools-icon/claude.png" width="28" alt="Claude Code" /> | Claude Code | `~/.claude/projects/`、`~/.claude/transcripts/` | ✅ | ✅ |
| <img src=".github/assets/tools-icon/codex.png" width="28" alt="Codex" /> | Codex | `~/.codex/sessions/` | ✅ | ✅ |
| <img src=".github/assets/tools-icon/opencode.png" width="28" alt="OpenCode" /> | OpenCode | `~/.local/share/opencode/` | ✅ | — |
| <img src=".github/assets/tools-icon/hermes-agent.png" width="28" alt="Hermes" /> | Hermes | `$HERMES_HOME` 或 `~/.hermes/` | ✅ | — |
| <img src=".github/assets/tools-icon/openclaw.png" width="28" alt="OpenClaw" /> | OpenClaw | `~/.openclaw/agents/` | ✅ | — |
| <img src=".github/assets/tools-icon/cursor.png" width="28" alt="Cursor" /> | Cursor | `~/.config/tokscale/cursor-cache/`（由 `tokscale cursor pull` 填入） | ✅ | — |

## 安装

### 本地模式——单设备

默认模式。无需 hub、无需代理、无需任何配置。

```bash
npm install
npm start
```

用量会实时从你的本地 AI 客户端目录读取——完整路径清单见 [支持的工具](#支持的工具) 表格。文件一变动小部件就立刻刷新，另有 5 分钟的兜底轮询。

### 多设备同步

挑一个所有设备（与任何无头代理）都能连上的 hub 后端。在每台设备上打开小部件，填入 设置 → 多设备同步 → Hub URL + Secret。小部件会自动上报本机用量；只在没有小部件的机器上跑 `npm run agent`。

hub HTTP API 参考见 [docs/API.md](docs/API.md)。

#### 方案 A——自托管 Node hub（同一局域网）

在一台会长期开机的机器上跑一次 hub，然后让每台设备指向它。

```bash
# 在长期开机的机器上
cp .env.example .env
# 把 TOKEN_MONITOR_SECRET 设为你私有的值，然后:
npm run hub
```

#### 方案 B——Cloudflare Worker hub（跨网络，包含 iPhone）

基于 Worker 部署的 hub，协议与 Node hub 完全相同。
公网 HTTPS、无需常时开机、免费额度足够小团队使用、
iOS 上的 Widgy / Scriptable 都能连上。

[![部署到 Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Javis603/token-monitor/tree/main/worker)

一键部署——Cloudflare 会在过程中提示你输入 `TOKEN_MONITOR_SECRET`。或手动部署:

```bash
cd worker
npm install
npx wrangler login
npx wrangler secret put TOKEN_MONITOR_SECRET
npx wrangler deploy
```

Wrangler 会打印部署的 URL——把它贴到每台设备的小部件 设置 → 多设备同步。完整部署说明、iOS 小部件配方与端点参考见 [worker/README.md](worker/README.md)。

## 工作原理

```text
模式 A——本地（默认，免配置）
    小部件 (Electron) ──▶ tokscale ──▶ ~/.claude、~/.codex、$HERMES_HOME

模式 B——同步（可选，多设备）
    设备 A agent ──▶
    设备 B agent ──▶  hub  ──▶  任一设备上的小部件
    设备 C agent ──▶
```

小部件会根据设置里是否填了 Hub URL 自动切换模式，没有独立的「模式」开关。同步模式下，hub 通过 Server-Sent Events 把聚合后的统计推送给每个连接中的小部件，所以一台设备上的更新会在数秒内出现在其他设备上。

## 设置

### 小部件（GUI）

点击小部件标题栏上的 `⚙` 按钮打开设置面板。

- **多设备同步**——Hub URL 与 secret。Hub URL 留空即为本地模式（仅本机）。
- **追踪的工具**——各支持 AI 工具的复选框。切换立即生效，并会用新的客户端清单重启采集器。
- **AI 工具用量上限**——选择 Claude Code 与 Codex 的用量上限检测与刷新频率。
- **显示模式**——可将浮动窗口改为 macOS 菜单栏或 Windows 系统托盘的弹出窗口，并选择图标旁显示的内容：成本、今日 token 数、累计 token 数、成本＋token、最接近用完的 Claude／Codex 用量上限百分比，或仅显示图标。
- **外观**——系统玻璃、实时指示点、工具图标、Discord Rich Presence、玻璃透明度、玻璃模糊度。
- **高级**——打开底层 `settings.json` 调整较少用的选项，例如 `allTimeSince`。

小部件标题栏上的置顶按钮可切换「始终置顶」。

### 无头代理与 hub（`.env`）

代理与 hub 没有 UI。请在项目根目录用 `.env` 文件配置（从 `.env.example` 复制）:

```env
TOKEN_MONITOR_HUB_URL=               # 同步模式必填——Worker URL 或 http://<lan-ip>:17321
TOKEN_MONITOR_SECRET=                # 共用 secret，必须与 hub 一致
TOKEN_MONITOR_DEVICE_ID=             # 可选——默认为主机名
TOKEN_MONITOR_CLIENTS=               # 可选——默认为所有支持的工具
TOKEN_MONITOR_LIMITS_ENABLED=        # 可选——默认启用；设为 0 可跳过 CLI 探测
TOKEN_MONITOR_LIMIT_PROVIDERS=       # 可选——默认为所有支持的提供方（claude、codex）
```

小部件会把同样的环境变量读作首次启动的默认值，之后改由 GUI 设置接管。

每个值也都可以通过 CLI 参数传入（`--hub=`、`--secret=`、`--device=`、`--clients=`、`--limits=`、`--limitProviders=`）——参数优先于环境变量。较少用的调整项（`TOKEN_MONITOR_INTERVAL_MS`、`TOKEN_MONITOR_PORT`、`TOKEN_MONITOR_STALE_AFTER_MS`、`TOKEN_MONITOR_LIMITS_REFRESH_MS`、…）一样可通过环境变量／参数配置，但为减少噪音不放进 `.env.example`。

一次性执行示例:

```bash
npm run agent -- --clients=claude,codex,opencode --once
```

## 隐私

hub 与代理只传输汇总字段:

- 设备 id、主机名、平台
- 每个时段的 Token 总数（今日 / 本月 / 全部）
- 成本总额（当 `tokscale` 返回成本数据时）
- 按客户端与模型的分项统计
- 启用 AI 工具用量上限时，归一化后的 Claude Code／Codex 用量状态

完全不会传输原始 AI 日志、提示词、源代码或对话内容。也不会传输 OAuth 凭据、访问令牌、刷新令牌、邮箱或提供方原始响应。`.env`、`data/`、`node_modules/` 已加入 gitignore。

## 系统要求

- macOS 或 Windows
- Node.js 18.17+
- 仅同步模式:每个代理／小部件到 hub 的网络连通性

## 致谢

- [tokscale](https://github.com/junhoyeo/tokscale) 提供日志解析与 Token 计算。
- [CodexBar](https://github.com/steipete/CodexBar) 提供 AI 工具用量上限的研究参考。

## 许可证

[MIT](LICENSE) © [@Javis](https://github.com/Javis603)
