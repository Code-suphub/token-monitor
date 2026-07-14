# English

**Open-source build.** macOS is signed and notarized; Windows is unsigned (SmartScreen may appear); Linux AppImages need executable permission — see notes below.

## What's changed

<!-- app-update-notes:en:start -->
### Added
- **Tray shortcuts:** Right-click the tray icon to refresh usage, open a specific view, switch Codex accounts, change tray display and window presentation, open Settings, or quit. (#147)
- **App update notes:** See the release highlights inside Token Monitor before downloading an update, with a link to the full GitHub release. (#150)
- **VS Code Copilot Chat:** Usage is now detected automatically from local VS Code sessions on desktop and WSL, with no OpenTelemetry setup required.

### Improved
- **About Token Monitor:** Settings now show the installed version with direct links to GitHub and issue reporting. (#151)

### Fixed
- **macOS tray icon:** The menu bar icon now uses native template styling so it follows the system appearance correctly.
<!-- app-update-notes:en:end -->

## Download

- **macOS Apple Silicon** — [Token-Monitor-0.28.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0-arm64.dmg)
- **Windows Installer** — [Token-Monitor-Setup-0.28.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-Setup-0.28.0.exe) (recommended)
- **Windows Portable** — [Token-Monitor-0.28.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0.exe) (no install required)
- **Linux x64** — [Token-Monitor-0.28.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0.AppImage)

<details>
<summary><strong>First launch and other notes</strong></summary>

### First launch

**macOS:** open the `.dmg`, drag Token Monitor to Applications.

**Windows:** SmartScreen → More info → Run anyway.

**Linux:** mark the AppImage executable, then run it:

```bash
chmod +x "Token Monitor"*.AppImage
./"Token Monitor"*.AppImage
```

### Other notes

Other platforms are not pre-built — run from source per the [README](https://github.com/Javis603/token-monitor#readme). The macOS `.zip` is the same app repackaged; ignore it unless you specifically need it.

### tokscale dependency

Tokscale is bundled with this app. See **Settings → Tokscale** for the exact version
and the option to download a newer version directly from npm. Tokscale is MIT,
open-source: https://github.com/junhoyeo/tokscale

</details>

---

# 中文

**这是开源构建。** macOS 已签名并 notarize；Windows 尚未签名（可能跳出 SmartScreen）；Linux AppImage 需要先赋予执行权限，说明见下方。

## 更新内容

<!-- app-update-notes:zh:start -->
### 新增
- **托盘快捷操作：** 右键点击托盘图标即可刷新用量、打开指定视图、切换 Codex 账号、调整托盘显示与窗口模式、打开设置或退出应用。（#147）
- **应用更新说明：** 下载更新前可直接在 Token Monitor 内查看本版重点，并可前往 GitHub 阅读完整发布说明。（#150）
- **VS Code Copilot Chat：** 现可自动从桌面与 WSL 的本地 VS Code 会话中检测用量，无需配置 OpenTelemetry。

### 改进
- **关于 Token Monitor：** 设置中现会显示已安装版本，并提供 GitHub 与问题反馈的直达链接。（#151）

### 修复
- **macOS 托盘图标：** 菜单栏图标现采用系统原生模板样式，可正确适配系统外观。
<!-- app-update-notes:zh:end -->

## 下载

- **macOS Apple Silicon** — [Token-Monitor-0.28.0-arm64.dmg](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0-arm64.dmg)
- **Windows 安装版** — [Token-Monitor-Setup-0.28.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-Setup-0.28.0.exe)（推荐）
- **Windows 便携版** — [Token-Monitor-0.28.0.exe](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0.exe)（免安装）
- **Linux x64** — [Token-Monitor-0.28.0.AppImage](https://github.com/Javis603/token-monitor/releases/download/v0.28.0/Token-Monitor-0.28.0.AppImage)

<details>
<summary><strong>首次启动与其他说明</strong></summary>

### 首次启动

**macOS：** 打开 `.dmg`，把 Token Monitor 拖到 Applications。

**Windows：** SmartScreen → 更多信息 → 仍要运行。

**Linux：** 先给 AppImage 执行权限，然后运行：

```bash
chmod +x "Token Monitor"*.AppImage
./"Token Monitor"*.AppImage
```

### 其他说明

其他平台暂不提供预构建版本，请参考 [README](https://github.com/Javis603/token-monitor#readme) 从源码运行。macOS 的 `.zip` 只是同一个 app 的重新打包版本，除非你明确需要，否则可以忽略。

### tokscale 依赖

Tokscale 已随应用内置。你可以在 **设置 → Tokscale** 查看确切版本，
也可以直接从 npm 下载更新版本。Tokscale 是 MIT 开源项目：
https://github.com/junhoyeo/tokscale

</details>
