# English

**Open-source build, not paid-signed.** macOS and Windows will ask you to confirm on first launch — instructions below.

## What's changed

### Added
- Added DeepSeek API balance as an AI Tool Limits provider, with local account setup, `.env` support, balance history, and a DeepSeek icon across the limits/status surfaces.
- Expanded the experimental Status view with Cursor and DeepSeek service status, affected components, provider visibility/order controls, relative checked times, and configurable re-check intervals.

### Improved
- Refined the Status provider controls and settings icon so the service list is easier to scan and configure.
- Codex limit sources now label CLI, app RPC, and Windows Store app paths more clearly.

### Fixed
- Fixed Windows Store Codex app detection; the Limits UI now correctly shows whether Codex limits came from the app or CLI.

## Which file should I download?

- **macOS (Apple Silicon, M1 and later)** — the `.dmg` file
- **Windows 10/11** — `Token Monitor Setup ….exe` (installer, recommended)
- **Windows portable** — `Token Monitor ….exe` (runs without installing)

Intel Macs and Linux are not pre-built — run from source per the [README](https://github.com/Javis603/token-monitor#readme). The macOS `.zip` is the same app repackaged; ignore it unless you specifically need it.

## First-launch unlock

**macOS:** right-click `Token Monitor.app` → Open (once). If you see "Token Monitor" can't be opened or is damaged:

```bash
xattr -dr com.apple.quarantine "/Applications/Token Monitor.app"
```

**Windows:** SmartScreen → More info → Run anyway.

## tokscale dependency

Tokscale is bundled with this app. See **Settings → Tokscale** for the exact version
and the option to download a newer version directly from npm. Tokscale is MIT,
open-source: https://github.com/junhoyeo/tokscale

---

# 中文

**这是开源构建，不是付费签名版本。** macOS 和 Windows 首次启动时会要求你手动确认，操作说明见下方。

## 更新内容

### 新增
- 新增 DeepSeek API 余额作为「AI 工具额度」来源，支持本机账号设置、`.env` 配置、余额历史记录，并在额度/状态界面显示 DeepSeek 图标。
- 扩展实验性的「状态」视图：新增 Cursor 与 DeepSeek 服务状态、受影响组件、服务显示/排序设置、相对检查时间，以及可配置的自动重查间隔。

### 改进
- 优化「状态」视图的服务设置控件和设置图标，服务列表更容易浏览和调整。
- Codex 额度来源现在能更清楚地区分 CLI、App RPC 与 Windows Store App 路径。

### 修复
- 修复 Windows Store 版 Codex App 的侦测；「额度」界面现在会正确显示 Codex 来源是 App 还是 CLI。

## 应该下载哪个文件？

- **macOS（苹果芯片，M1 及之后机型）** — 下载 `.dmg` 安装包
- **Windows 10/11** — 下载 `Token Monitor Setup ….exe`（安装版，推荐）
- **Windows 便携版** — 下载 `Token Monitor ….exe`（无需安装，直接运行）

Intel Mac 和 Linux 暂不提供预构建版本，请参考 [README](https://github.com/Javis603/token-monitor#readme) 从源码运行。macOS 的 `.zip` 只是同一个 app 的重新打包版本，除非你明确需要，否则可以忽略。

## 首次启动放行

**macOS：** 右键 `Token Monitor.app` → 打开（只需要一次）。如果看到「Token Monitor」未开启 或 已损坏：

```bash
xattr -dr com.apple.quarantine "/Applications/Token Monitor.app"
```

**Windows：** SmartScreen → 更多信息 → 仍要运行。

## tokscale 依赖

Tokscale 已随应用内置。你可以在 **设置 → Tokscale** 查看确切版本，
也可以直接从 npm 下载更新版本。Tokscale 是 MIT 开源项目：
https://github.com/junhoyeo/tokscale
