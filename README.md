# Mino

轻量化 Markdown 即时预览编辑器 / A lightweight Markdown WYSIWYG editor

## 特性 / Features

- ⚡ **极致轻量** — 安装包 < 20MB，冷启动 < 500ms
- 📝 **即时预览** — 类 Typora 的单栏 WYSIWYG 编辑体验
- 🔄 **双栏模式** — CodeMirror 6 源码 + Milkdown 预览
- 📊 **GFM 扩展** — 表格、任务列表、删除线
- 🧮 **数学公式** — KaTeX 行内/块级公式，双击编辑
- 📈 **Mermaid 图表** — 流程图、时序图等，双击编辑
- 🎨 **代码高亮** — 40+ 语言语法高亮
- 📁 **文件树** — 侧栏目录浏览
- 📤 **Pandoc 导出** — 支持 docx/html/pdf/latex/rst/epub
- 🌙 **暗色主题** — 跟随系统或手动切换
- 🌏 **中英双语** — 界面支持中文/英文切换
- 💾 **自动保存** — 30 秒定时 + 失焦保存

## 安装 / Installation

### 系统要求

- Windows 10/11
- WebView2 运行时（Windows 11 自带，Windows 10 自动提示安装）

### 下载安装包

从 [GitHub Releases](https://github.com/MarioMinoDev/mino/releases) 下载 `.msi` 安装包，运行安装即可。

> 如遇 SmartScreen 警告，点击"更多信息" → "仍要运行"。

### 从源码构建

#### 前置要求

- [Node.js](https://nodejs.org/) >= 20
- [Rust](https://rustup.rs/)（stable，MSVC 工具链）
- [VS Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/)（C++ 构建工具工作负载）

#### 步骤

```bash
# 克隆仓库
git clone https://github.com/MarioMinoDev/mino.git
cd mino

# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 生产构建
npm run tauri build
```

## 快捷键 / Keyboard Shortcuts

| 快捷键 | 功能 |
| --- | --- |
| `Ctrl+N` | 新窗口 |
| `Ctrl+O` | 打开文件 |
| `Ctrl+S` | 保存 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` / `Ctrl+Shift+Z` | 重做 |
| `Ctrl+B` | 加粗 |
| `Ctrl+I` | 斜体 |
| `` Ctrl+` `` | 行内代码 |
| `Alt+Shift+5` | 删除线 |
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 替换 |
| `Ctrl+/` | 源码模式 |
| `Ctrl+Shift+/` | 双栏模式 |
| `Ctrl+Shift+P` | 性能基准测试 |

## Pandoc 导出

Mino 支持通过 [Pandoc](https://pandoc.org/) 导出多种格式：

1. 安装 Pandoc：`winget install JohnMacFarlane.Pandoc`
2. 重启 Mino
3. 点击工具栏导出按钮，选择格式

支持格式：docx、html、pdf、latex、rst、epub

## 技术栈 / Tech Stack

| 层级 | 技术 |
| --- | --- |
| 桌面容器 | Tauri v2 (Rust) |
| 前端框架 | Svelte 5 + SvelteKit |
| 编辑器 | Milkdown v7 (ProseMirror) |
| 源码编辑 | CodeMirror 6 |
| 数学公式 | KaTeX |
| 图表 | Mermaid |
| 代码高亮 | lowlight |
| 导出 | Pandoc |

## 项目结构 / Project Structure

```
src/
├── lib/
│   ├── editor.ts           # 核心编辑器（创建/销毁/搜索/大纲/格式化）
│   ├── file.ts             # 文件 I/O + Tauri IPC
│   ├── i18n.ts             # 中英文国际化
│   ├── math.ts             # KaTeX 节点定义 + NodeView
│   ├── mermaid.ts          # Mermaid 节点定义 + NodeView
│   ├── perf.ts             # 性能基准测试
│   ├── split-view.ts       # 双栏模式
│   ├── SearchBar.svelte    # 查找/替换面板
│   ├── OutlinePanel.svelte # 大纲导航
│   ├── FileTree.svelte     # 文件树侧栏
│   ├── ExportDialog.svelte # Pandoc 导出对话框
│   └── PerfPanel.svelte    # 性能测试面板
├── routes/
│   └── +page.svelte        # 主编辑器页面
└── styles/
    └── themes.css          # 亮/暗主题样式

src-tauri/src/
├── main.rs                 # Tauri 入口
├── lib.rs                  # IPC 命令
└── sidecar.rs              # Pandoc 导出
```

## 许可证 / License

MIT
