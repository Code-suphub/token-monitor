# English

**Open-source build, not paid-signed.** macOS and Windows will ask you to confirm on first launch — instructions below.

## What's changed

### Added
- **Codex account toggles:** Settings -> Accounts -> Codex Accounts now lets you enable or disable tracking for each saved Codex account without removing the account.
- **Collection frequency:** Settings -> Collection now lets you choose how often usage is collected: live tracking by default, or every 5, 15, or 30 minutes.
- **Codex reset credits:** AI Tool Limits now shows Codex reset counts when the signed-in account reports them.

### Improved
- The main view switcher and renderer icons have smoother hover states and more consistent labels.

### Fixed
- Deleted OpenCode profiles no longer reappear after restart when they match the old default cookie, and enabling or disabling a profile now updates the limits source immediately.

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
- **Codex 账号追踪开关：** 设置 -> 账号 -> Codex 账号 现在可以对已添加的 Codex 账号逐一启用或停用追踪，无需移除账号。
- **采集频率：** 设置 -> 采集 现在可以选择用量采集频率：默认即时追踪，也可以改为每 5、15、30 分钟采集。
- **Codex 重置次数：** AI 工具限制现在会在账号提供数据时显示 Codex 重置次数。

### 改进
- 主视图切换器和渲染器图标的 hover 状态更顺滑，标签也更一致。

### 修复
- 删除 OpenCode 账号设定档后，如果它对应旧版默认 cookie，重启后不再重新出现；启用或停用设定档后，额度来源也会立即更新。

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
