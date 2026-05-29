# CLAUDE.md — Mino 项目上下文

## 项目概述

Mino — 基于 Tauri v2 + Svelte 5 + Milkdown 的轻量级 Markdown 编辑器，Typora 替代品。

- 架构：Rust 后端（Tauri v2）+ SvelteKit 前端（Vite）+ Milkdown 编辑器（ProseMirror + Remark）
- 目标平台：Windows 10/11（首期），后续扩展 macOS/Linux

## 环境

- Node.js v24.15.0 / npm 11.12.1
- Rust 1.95.0（当前默认 `stable-x86_64-pc-windows-gnu`）
- 网络环境：中国大陆，Rust 需 USTC 镜像（`RUSTUP_DIST_SERVER=https://mirrors.ustc.edu.cn/rust-static`）
- **无 Visual Studio Build Tools、无 MinGW-w64 完整安装、无 Windows SDK**

## PRD

- 完整 PRD：`docs/PRD - Mino Markdown Editor.md`（v0.3）
- Phase 0（骨架搭建）→ Phase 1（核心编辑）→ Phase 2（高级功能）→ Phase 3（性能/插件）→ Phase 4（发布）

## 当前进度（Phase 0 — 已完成 90%）

### 已完成

1. **项目初始化** — SvelteKit + Tauri v2 骨架搭建完成
2. **Rust 后端** — `src-tauri/src/lib.rs` 已实现 `read_file` / `write_file` Tauri commands
3. **前端核心模块**：
   - `src/lib/editor.ts` — Milkdown 编辑器初始化/销毁/读取 Markdown
   - `src/lib/file.ts` — 文件打开/保存对话框 + Tauri invoke 封装
4. **UI** — `src/routes/+page.svelte`：工具栏（新建/打开/保存/主题切换）、编辑器区域、状态栏、快捷键（Ctrl+S/O）
5. **主题系统** — `src/styles/themes.css`：亮色/暗色模式 CSS 变量，自动检测系统偏好
6. **Tauri 配置** — `tauri.conf.json`、`capabilities/default.json` 权限声明
7. **前端编译** — `npx vite build` 通过 ✅

### 阻塞问题：Rust 链接失败 ❌

**根因**：系统缺少 C/C++ 链接器工具链。

| 方案 | 状态 | 问题 |
|:---|:---|:---|
| MSVC 工具链 | ❌ | 无 Visual Studio Build Tools，无 Windows SDK（`kernel32.lib` 等缺失） |
| MSVC + `lld-link` | ❌ | `lld-link` 需要 `-flavor link` 参数，且仍缺 `.lib` 文件 |
| GNU 工具链 | ❌ | `dlltool.exe` 需要 `as.exe`（汇编器），Rust 自带的 MinGW 不包含 |
| `choco install mingw` | 待执行 | 需要管理员权限运行 PowerShell |
| `winget install VS Build Tools` | 待执行 | 需要管理员权限 |

## 下一步计划

### 立即可做（需管理员权限）

**方案 A — 安装 MinGW-w64（推荐，轻量）**：
```powershell
# 以管理员身份运行
choco install mingw -y
```
然后切换回 GNU 工具链构建：
```powershell
rustup default stable-x86_64-pc-windows-gnu
cd D:\8.Mino\src-tauri
cargo build
```

**方案 B — 安装 Visual Studio Build Tools（完整方案）**：
```powershell
# 以管理员身份运行
winget install Microsoft.VisualStudio.2022.BuildTools --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```
然后切换 MSVC 工具链：
```powershell
rustup default stable-x86_64-pc-windows-msvc
cd D:\8.Mino\src-tauri
cargo build
```

### 链接器问题解决后

1. 运行 `npm run tauri dev` 验证端到端运行
2. 确认 Milkdown 编辑器渲染、文件打开/保存、主题切换正常
3. Phase 0 完成，进入 Phase 1

## 关键文件索引

| 文件 | 说明 |
|:---|:---|
| `docs/PRD - Mino Markdown Editor.md` | 产品需求文档 v0.3 |
| `src-tauri/src/lib.rs` | Rust 后端入口 + 文件 I/O commands |
| `src-tauri/Cargo.toml` | Rust 依赖 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置 |
| `src-tauri/capabilities/default.json` | Tauri 权限声明 |
| `src-tauri/.cargo/config.toml` | Cargo 链接器配置（当前指向 GNU） |
| `src/routes/+page.svelte` | 主页面（工具栏 + 编辑器 + 状态栏） |
| `src/lib/editor.ts` | Milkdown 编辑器封装 |
| `src/lib/file.ts` | 文件 I/O 封装 |
| `src/styles/themes.css` | 亮色/暗色主题 |

## 注意事项

- 中国大陆网络：npm 可用，Rust crate 通过 cargo 自带镜像下载，GitHub 直连困难
- Svelte 5 使用 Runes 响应式系统（`$state`、`$derived`），非 Svelte 4 写法
- Tauri v2 的 capabilities 权限系统与 v1 不同，文件操作需显式声明
