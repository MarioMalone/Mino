# **Mino — 轻量化 Markdown 即时预览编辑器 PRD**

> **版本**: v0.3
> **日期**: 2026-05-28
> **状态**: 待评审（已修正 v0.1 审核问题）

---

## **1\. 产品概述**

### **1.1 产品名称**

Mino

### **1.2 产品定位**

一款面向 Windows 平台的极致轻量化 Markdown 编辑器，支持**即时预览（单栏 WYSIWYG）**和**源码-预览双栏**两种编辑模式，提供类 Typora 的沉浸式写作体验，同时在启动速度、大文件处理能力和系统资源占用上全面超越现有竞品。

### **1.3 核心价值主张**

| 维度 | 竞品现状（Typora / MarkText） | Mino 目标 |
| :--- | :--- | :--- |
| 安装包体积 | 150 \- 200 MB | **< 20 MB**（不含 Pandoc） |
| 冷启动时间 | 2 \- 12 秒 | **< 500 ms**（进程启动到 UI 可交互） |
| 空载内存占用 | 150 \- 350 MB | **< 120 MB** |
| 大文件（2MB+）编辑 | 明显卡顿、假死 | **流畅打字，无感知延迟** |
| 即时预览质量 | 标杆级 | 等同或超越 |

### **1.4 目标用户**

| 用户画像 | 痛点 | 核心诉求 |
| :--- | :--- | :--- |
| **技术写作者** | 长文档频繁卡顿，大文件无法打开 | 大文件丝滑编辑、代码块高亮 |
| **学生 / 研究者** | Typora 付费，免费替代品体验差 | 免费、极简、数学公式支持 |
| **日常笔记用户** | Electron 应用吃内存，多任务卡顿 | 秒开、低资源占用 |
| **技术文档维护者** | Mermaid 图表导出困难 | 图表内嵌、多格式导出 |

---

## **2\. 技术架构**

### **2.1 推荐技术栈**

| 层级 | 技术选型 | 理由 |
| :--- | :--- | :--- |
| **桌面容器** | Tauri v2 (Rust) | 安装包 < 20MB，空载 < 80MB，冷启动 < 200ms，系统级安全沙箱 |
| **前端框架** | Svelte 5 (Runes) | 无虚拟 DOM，编译期优化，JS 产物体积极小 |
| **编辑引擎** | Milkdown (ProseMirror \+ Remark) | 专为 Markdown 设计，125KB 核心，原生 GFM/CommonMark 支持 |
| **文件 I/O** | Rust 原生异步 I/O \+ Rope 数据结构 | 大文件读写零拷贝，保存时 O(log n) 局部更新 |
| **导出引擎** | Pandoc Sidecar（按需下载） | 首次使用导出时下载 Pandoc 二进制，后台异步导出，不阻塞编辑器 |

> **Milkdown + Svelte 5 集成风险说明**：Milkdown 官方提供 React/Vue 适配器，暂无官方 Svelte 适配器。Milkdown 本身是框架无关的（基于 ProseMirror），可通过原生 API 实例化挂载到 Svelte 容器 DOM 节点上。若集成困难，降级方案为直接使用 ProseMirror 原生 API（不经过 Milkdown 封装层）。参见 R-07。

### **2.2 系统架构图**

```
┌─────────────────────────────────────────────┐
│                Svelte 5 前端                 │
│  ┌─────────────────────────────────────┐    │
│  │        Milkdown 编辑器核心           │    │
│  │  ┌──────────┐  ┌────────────────┐   │    │
│  │  │ Remark   │  │ ProseMirror    │   │    │
│  │  │ MD解析器 │◄─│ 文档模型 & 事务│   │    │
│  │  └──────────┘  └────────────────┘   │    │
│  └──────────────────┬──────────────────┘    │
│                     │                       │
│  ┌──────────────────┴──────────────────┐    │
│  │  CSS: content-visibility 消隐       │    │
│  │  装饰器: pos 闭包 + 拼写关闭        │    │
│  └─────────────────────────────────────┘    │
└──────────────────┬──────────────────────────┘
                   │ Tauri IPC (invoke/event)
┌──────────────────┴──────────────────────────┐
│              Rust 后端 (Tauri)               │
│  ┌────────────┐ ┌──────────┐ ┌───────────┐  │
│  │ 文件 I/O  │ │ Rope 缓存│ │ Sidecar   │  │
│  │ 异步读写  │ │ 保存加速 │ │ (Pandoc)  │  │
│  └────────────┘ └──────────┘ └───────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ asset:// 协议 — 本地图片安全加载       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │  Edge WebView2      │
        │  (系统原生 Chromium) │
        └─────────────────────┘
```

---

## **3\. 功能需求**

### **3.1 P0 — 必须实现（MVP）**

| 编号 | 功能 | 描述 | 验收标准 |
| :--- | :--- | :--- | :--- |
| F-01 | **文件打开与保存** | 支持打开本地 .md 文件，UTF-8 编码读取，修改后保存 | 1MB 文件（约 30 万字）在 500ms 内加载完成；10MB 文件在 3 秒内加载完成 |
| F-02 | **即时预览编辑** | 类 Typora 单栏模式，输入 Markdown 语法后即时渲染为富文本 | Top 30 CommonMark 语法渲染延迟 < 16ms（单帧） |
| F-03 | **GFM 扩展语法** | 支持表格、任务列表、删除线、自动链接 | 渲染和序列化双向无损 |
| F-04 | **标题大纲导航** | 侧边浮动或折叠面板，显示 H1-H6 标题树，点击跳转 | 大纲实时更新，点击跳转 < 100ms |
| F-05 | **源码模式切换** | 一键切换即时预览 ↔ Markdown 源码视图 | 切换无损，不丢失格式 |
| F-06 | **本地图片插入** | 支持拖拽 / 粘贴图片到编辑器，自动复制到相对路径 | 通过 asset:// 协议安全加载，CSP 无违规 |
| F-07 | **暗色 / 亮色主题** | 跟随系统或手动切换 | 主题切换 < 50ms，无闪烁 |
| F-08 | **快捷键体系** | Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+S 保存等标准快捷键 | 覆盖 Top 15 常用操作 |
| F-09 | **自动保存** | 每 30 秒自动保存或失焦保存（可配置）。自动保存期间用户手动 Ctrl+S 时，取消本次定时器、立即保存并重置计时 | 无感知，不打断输入 |
| F-10 | **大文件性能** | 前端视口消隐 + pos 闭包懒求值，Rust 端 Rope 支撑快速保存 | 10 万字文档打字帧率 ≥ 30 FPS（编辑性能由前端优化保障） |
| F-11 | **撤销 / 重做 (Undo/Redo)** | 基于 ProseMirror 内置 Undo 管理器，支持 Ctrl+Z / Ctrl+Y | 事务级精确撤销，不丢失光标位置 |
| F-12 | **查找 / 替换** | 当前文件内文本搜索与替换，支持正则表达式 | Ctrl+F 触发，搜索结果高亮，逐条跳转 |

### **3.2 P1 — 重要功能（v0.2-v0.3）**

| 编号 | 功能 | 描述 |
| :--- | :--- | :--- |
| F-13 | **双栏编辑模式** | 左侧为 Markdown 源码编辑器（CodeMirror 6），右侧为 Milkdown 实时预览。源码修改后以防抖（~300ms）方式同步到预览面板。支持通过工具栏按钮或快捷键（Ctrl+/）与即时预览模式无缝切换 |
| F-14 | **数学公式** | 支持 KaTeX 行内 / 块级 LaTeX 公式渲染与编辑 |
| F-15 | **Mermaid 图表** | 支持 Mermaid 流程图、时序图、甘特图渲染 |
| F-16 | **代码块高亮** | 基于 Prism.js / Highlight.js 的多语言语法高亮 |
| F-17 | **Pandoc 导出** | 首次使用时按需下载 Pandoc（约 60-100MB），之后 Sidecar 调用导出 Word / PDF / HTML。安装包内不含 Pandoc |
| F-18 | **文件树侧栏** | 打开文件夹，左侧显示目录树，支持多文件切换 |
| F-19 | **字数统计** | 实时显示字数、字符数、阅读时长估算 |
| F-20 | **粘贴 Markdown** | 从剪贴板粘贴时自动识别并渲染 Markdown 格式 |
| F-21 | **图片缩放** | 插入图片后可拖拽调整显示尺寸 |
| F-22 | **文件拖拽打开** | 将 .md 文件拖拽到窗口即可打开 |
| F-23 | **最近打开文件列表** | 菜单中显示最近编辑的文件列表 |
| F-24 | **Windows 文件关联** | 安装时注册 .md 文件类型，双击用 Mino 打开 |

### **3.3 P2 — 增强功能（v0.4+）**

| 编号 | 功能 | 描述 |
| :--- | :--- | :--- |
| F-25 | **多窗口 / 多标签** | 支持同时打开多个文件，标签页管理 |
| F-26 | **Vim / Emacs 模式** | 提供经典编辑器键绑定模式 |
| F-27 | **自定义 CSS** | 允许用户导入自定义渲染样式表 |
| F-28 | **导出模板** | 预设多种导出排版模板（论文、博客、笔记） |
| F-29 | **Typora 主题兼容** | 兼容 Typora 的 .css 主题文件格式 |

---

## **4\. 非功能需求**

### **4.1 性能指标**

| 指标 | 目标值 | 测量方式 |
| :--- | :--- | :--- |
| 安装包体积（不含 Pandoc） | **< 20 MB** | 构建产物 `bundle.zip` 大小 |
| 含 Mermaid 完整包体积 | **< 25 MB** | 构建产物大小 |
| 冷启动到 UI 可交互 | **< 500 ms** | 从 `tauri::Builder` 启动到 WebView2 `document.readyState === 'interactive'`，不含首次 WebView2 运行时初始化 |
| 空载内存占用 | **< 120 MB** | 任务管理器 Private Working Set |
| 10 万字文档加载 | **< 1 秒** | 从文件读取到首次渲染完成 |
| 10 万字文档打字延迟 | **< 33 ms** (≥ 30 FPS) | `requestAnimationFrame` 间隔监控 |
| 保存 1MB 文件 | **< 300 ms** | Rust `fs::write` 耗时 |
| 保存 10MB 文件 | **< 500 ms** | Rust Rope 局部更新 + `fs::write` 耗时 |

### **4.2 兼容性**

| 维度 | 要求 |
| :--- | :--- |
| 操作系统 | Windows 10 (1903+) / Windows 11（x64；ARM64 暂不在首版支持范围，后续评估） |
| WebView2 | 系统自带或安装包内附引导安装程序 |
| Markdown 规范 | CommonMark 0.30 + GFM 扩展 |
| 文件编码 | UTF-8（含 BOM 自动处理） |
| 行尾符 | 自动检测 CRLF / LF，存盘时保持一致 |

### **4.3 安全性**

| 要求 | 实现方式 |
| :--- | :--- |
| 文件访问沙箱 | Tauri Capability System，仅允许用户当前打开文件所在目录及其子目录 |
| 本地资源加载 | asset:// 协议 + CSP，杜绝目录穿越 |
| assetScope 限定 | 限定为当前打开文件所在目录（非 `$DOCUMENT/**` 或 `$DESKTOP/**`） |
| XSS 防护 | 渲染管道末端 DOMPurify 过滤 |
| Markdown 内嵌 HTML 安全 | 禁止 `<script>`、`<iframe>`、`<object>`、事件处理器属性（`onclick` 等），通过 DOMPurify 白名单过滤 |
| Mermaid 安全 | Mermaid 渲染结果为纯 SVG，禁用 SVG 内 `<foreignObject>` 和内联脚本 |
| KaTeX 安全 | KaTeX 输出为纯 HTML + CSS，禁用 `\url` 等可触发外部请求的宏 |
| 无网络请求 | 除用户主动触发的 Pandoc 下载/导出/更新检查外，不发起任何网络请求 |

### **4.4 可用性**

| 要求 | 描述 |
| :--- | :--- |
| 零配置启动 | 安装后双击即可打开 .md 文件编辑，无需任何设置 |
| 界面极简 | 最大化写作区域，工具栏可隐藏，无侧边栏默认展开 |
| 中文优先 | 界面默认中文，支持中英文切换 |
| 高 DPI 适配 | 支持 100%-300% 缩放，4K 显示器清晰 |

---

## **5\. 核心技术实现细节**

### **5.1 双向 Markdown ↔ DOM 状态机**

```
                    读取路径 (Read Path)
   .md 文件 → Rust UTF-8 读取 → IPC → Milkdown Remark 解析
   → Markdown AST → ProseMirror Schema 映射 → DOM 节点树

                    写入路径 (Write Path)
   DOM 变动 → ProseMirror Transaction → 内存状态树更新
   → 存盘触发 → Milkdown/Turndown 序列化 → 纯净 .md 文本
   → Rust 异步 I/O → 磁盘写入
```

### **5.2 大文件优化策略**

大文件卡顿涉及两个独立问题，由不同模块解决：

| 问题 | 解决模块 | 策略 |
| :--- | :--- | :--- |
| **文件 I/O 性能**（读写慢） | Rust 后端 | Rope 数据结构（ropey crate）：平衡二叉树分块存储，保存时仅更新变更节点，O(log n) 复杂度。解决的是磁盘读写速度，**不直接改善编辑流畅度** |
| **编辑渲染性能**（打字卡） | 前端 (ProseMirror) | 1) `content-visibility: auto` CSS 视口消隐 — 跳过视口外 DOM 节点的 Layout 2) pos 闭包懒求值 — 传递 `getPos` 闭包替代数值 prop，避免前方编辑导致后继组件级联重渲染 3) 拼写检查关闭 — `spellcheck: 'false'` 释放主线程 4) 懒渲染块 — 长代码块 / 公式默认折叠，按需渲染 |

> **注意**：Rope 优化的是 Rust 端的文件读写路径（Read/Save），与前端编辑时的 DOM 渲染性能无直接关系。编辑卡顿的根因是 DOM 树过大导致的重排重绘，应由前端视口消隐和 ProseMirror 事务优化解决。

### **5.3 协议级图片加载**

```typescript
// 前端：将本地文件路径转为 asset:// URL
import { convertFileSrc } from '@tauri-apps/api/core';
const imgSrc = convertFileSrc("C:\\Users\\Notes\\images\\shot.png");
// → asset://localhost/C%3A%2FUsers%2FNotes%2Fimages%2Fshot.png
```

```json
// tauri.conf.json 安全配置 — assetScope 限定为当前打开文件所在目录
{
  "bundle": {
    "security": {
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost;"
    }
  },
  "plugins": {
    "protocol": {
      "asset": true,
      "assetScope": ["$CURRENT_FILE_DIR/**"]
    }
  }
}
```

### **5.4 Pandoc 按需下载与 Sidecar 导出管道**

Pandoc Windows 二进制约 60-100MB，**不打包进安装包**，采用首次使用时按需下载：

```
用户首次点击 "导出为 Word"
  → 前端检查本地是否已缓存 Pandoc 二进制
  → 若无：弹出下载确认 → 从 GitHub Release 下载 → 保存到应用数据目录
  → 若有：直接进入导出流程

导出流程：
  → 前端 invoke('export_docx', { input: filePath, output: outPath })
  → Rust 后端接收，启动 Pandoc sidecar 进程
  → Pandoc 异步执行 .md → .docx 转换
  → Rust 通过 Tauri Event 通知前端 "export_complete"
  → 前端显示 "导出成功" 提示
```

### **5.5 双栏编辑模式实现**

#### **5.5.1 架构设计**

双栏模式复用 Milkdown 预览渲染管线，新增 CodeMirror 6 作为源码编辑器：

```
┌─────────────────────────────────────────────────┐
│                  双栏模式布局                     │
│                                                 │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │   CodeMirror 6   │  │   Milkdown 预览      │ │
│  │   (源码编辑)      │  │   (只读渲染)         │ │
│  │                  │  │                      │ │
│  │  # 标题          │  │   标题               │ │
│  │  正文 **加粗**   │  │   正文 加粗          │ │
│  │                  │  │                      │ │
│  └────────┬─────────┘  └──────────▲───────────┘ │
│           │                       │             │
│           │  用户编辑，300ms 防抖  │             │
│           └───────────────────────┘             │
│           源码变更 → Remark 解析 → 预览更新      │
└─────────────────────────────────────────────────┘
```

#### **5.5.2 同步机制**

| 环节 | 实现方式 |
| :--- | :--- |
| **源码 → 预览** | CodeMirror `UpdateListener` 监听文档变更，防抖 300ms 后调用 Milkdown 的 `editor.action(replaceAll(newMarkdown))` 触发预览重渲染 |
| **防抖策略** | 短暂暂停输入（300ms）后才触发预览更新，避免每次按键都触发 Remark 解析和 ProseMirror 全量更新 |
| **滚动同步** | 计算 CodeMirror 当前可见行的百分比位置，将预览面板 `scrollTop` 设为对应比例。双向可选，但默认仅"源码滚动 → 预览跟踪" |
| **模式切换** | 从即时预览切到双栏时：序列化 ProseMirror 文档为 Markdown 文本，填充 CodeMirror。从双栏切回即时预览时：将 CodeMirror 文本重新注入 Milkdown |

#### **5.5.3 CodeMirror 6 轻量化配置**

CodeMirror 6 采用模块化按需加载，仅引入必要插件以控制体积：

| 插件 | 必要性 | 体积影响 |
| :--- | :--- | :--- |
| `@codemirror/view` | 必需（编辑器核心） | ~40 KB |
| `@codemirror/state` | 必需（状态管理） | ~15 KB |
| `@codemirror/commands` | 必需（基础键绑定） | ~10 KB |
| `@codemirror/language` | 必需（Markdown 语言支持） | ~20 KB |
| `@codemirror/lang-markdown` | 必需（Markdown 语法高亮） | ~25 KB |
| `@codemirror/search` | 必需（搜索功能） | ~15 KB |
| `@codemirror/autocomplete` | 可选 | ~30 KB（P2 阶段再引入） |
| **合计（P1 最小集）** | | **~125 KB**（gzip 后 ~40 KB） |

> CodeMirror 6 不引入额外的安装包体积压力——其 gzip 后体积与 Milkdown 核心相当，且只在用户切换到双栏模式时才动态加载（tree-shaking + lazy import）。

#### **5.5.4 模式切换状态转换**

```
                  Ctrl+/ 或工具栏按钮
    ┌────────────┐ ◄───────────────► ┌────────────┐
    │  即时预览   │                   │  双栏模式   │
    │ (ProseMirror│ ── 序列化 AST ──► │ (CodeMirror │
    │  编辑 DOM)  │ ◄── 解析 MD ──── │  + 预览)    │
    └────────────┘                   └────────────┘

    切换耗时目标: < 200ms（10 万字文档）
```

---

## **6\. 里程碑与开发计划**

### **Phase 0 — 基础搭建（2 周）**

> Phase 0 尚未开始，以下为待执行清单。

- [ ] Tauri v2 项目初始化，Svelte 5 前端脚手架
- [ ] Milkdown 编辑器集成，基础 CommonMark 渲染
- [ ] 文件打开 / 保存（Rust I/O）
- [ ] 暗色 / 亮色主题切换

### **Phase 1 — MVP（4 周）**

- [ ] Undo/Redo（ProseMirror Undo 管理器）
- [ ] 查找 / 替换（含正则）
- [ ] GFM 扩展（表格、任务列表、删除线）
- [ ] 即时预览 + 源码模式切换
- [ ] 大纲导航
- [ ] 本地图片拖拽插入 + asset:// 协议
- [ ] 快捷键体系
- [ ] 自动保存（定时 + 失焦，手动保存时重置计时器）
- [ ] **性能基线测试**: 10 万字文档 ≤ 33ms 输入延迟

### **Phase 2 — 增强体验（4 周）**

- [ ] 双栏编辑模式（CodeMirror 6 源码 + Milkdown 预览，含防抖同步、滚动联动、模式切换）
- [ ] KaTeX 数学公式渲染与编辑
- [ ] Mermaid 图表渲染
- [ ] 代码块语法高亮
- [ ] Pandoc 按需下载 + Sidecar 导出（Word / PDF / HTML）
- [ ] 字数统计
- [ ] 文件树侧栏（打开文件夹）
- [ ] 文件拖拽打开
- [ ] 最近打开文件列表

### **Phase 3 — 打磨发布（2 周）**

- [ ] 安装包签名与 Windows SmartScreen 兼容
- [ ] WebView2 运行时缺失检测与引导安装
- [ ] Windows .md 文件关联
- [ ] 性能优化回归测试
- [ ] 多语言界面（中/英）
- [ ] 用户文档与 README
- [ ] GitHub Release 首版发布

### **Phase 4 — 增长（持续）**

- [ ] 多窗口 / 多标签
- [ ] 自定义 CSS / Typora 主题兼容
- [ ] Vim 模式
- [ ] 自动更新（Tauri updater）

---

## **7\. 风险登记**

| 编号 | 风险 | 影响 | 概率 | 缓解措施 |
| :--- | :--- | :--- | :--- | :--- |
| R-01 | **Milkdown 社区活跃度不足** | 缺陷修复慢，功能扩展受限 | 中 | Fork 核心仓库，保留 ProseMirror 层直接操作能力作为逃生舱 |
| R-02 | **WebView2 未预装** | 首次启动失败 | 低（Win10 1903+ 覆盖率 >95%） | 安装包内附 WebView2 引导安装程序（+5MB） |
| R-03 | **macOS/Linux 兼容性** | Tauri v2 的 WKWebView/WebKitGTK 行为差异 | 低（v1 仅聚焦 Windows） | v1 不承诺跨平台，后续版本逐步适配 |
| R-04 | **Rust 开发效率低** | 后端迭代慢 | 中 | Rust 代码仅用于文件 I/O 和 Sidecar 调度，业务逻辑集中在前端 |
| R-05 | **Svelte 5 生态不成熟** | 缺少现成组件 | 中 | 仅使用 Svelte 核心语法，不依赖第三方 UI 组件库 |
| R-06 | **视口消隐导致光标异常** | 某些场景下 `content-visibility: auto` 的实现不稳定 | 中 | 仅使用 `content-visibility: auto`（不叠加 `display: none`）；提供配置项让用户关闭消隐 |
| R-07 | **Milkdown + Svelte 5 集成不确定** | 缺少官方 Svelte 适配器，两者范式存在冲突（signal-based vs transaction-based） | 中 | Milkdown 是框架无关的，可通过原生 DOM API 挂载；若集成困难，降级为直接使用 ProseMirror 原生 API |

---

## **8\. 成功指标**

| 指标 | v1.0 目标 | 测量方式 |
| :--- | :--- | :--- |
| GitHub Stars | 500+ (3 个月内) | GitHub 统计 |
| 安装包体积（不含 Pandoc） | < 20 MB | CI 构建产物 |
| 冷启动时间 | < 500 ms | 本地基准测试 |
| 大文件性能 | 10 万字 ≥ 30 FPS | 自动化性能测试脚本 |
| 用户满意度 | 无明显卡顿相关 Issue | GitHub Issues 分析 |

---

## **9\. 竞品差异化总结**

| 象限 | 编辑器 | 定位 |
| :--- | :--- | :--- |
| 轻量 + 单一模式 | Ghostwriter | 仅源码编辑，无沉浸感 |
| **轻量 + 多模式** | **Mino (目标)** | **极致轻量 + 即时预览 + 双栏模式** |
| 重量 + 即时预览 | Typora、MarkText | 体验好但笨重，且 Typora 无双栏模式 |
| 重量 + 非即时预览 | Obsidian、Joplin | 知识管理，非极简写作 |

**Mino 的独特定位**: 在"即时预览"这个象限内做到极致轻量——拥有 Typora 的单栏沉浸式体验，同时提供 Ghostwriter 级别的双栏源码编辑，且系统资源消耗远低于 Electron 方案。

---

## **附录 A：目录结构**

```
mino/
├── src-tauri/               # Rust 后端
│   ├── src/
│   │   ├── main.rs          # Tauri 入口
│   │   ├── commands.rs      # IPC 命令定义
│   │   ├── file_io.rs       # 文件读写 + Rope 缓存
│   │   └── sidecar.rs       # Pandoc 按需下载 + 调度
│   ├── capabilities/
│   │   └── default.json     # 权限声明
│   └── tauri.conf.json      # Tauri 配置（含 CSP + assetScope）
├── src/                     # Svelte 5 前端
│   ├── lib/
│   │   ├── editor/
│   │   │   ├── index.ts           # Milkdown 实例化（原生 DOM 挂载）
│   │   │   ├── split-view.ts      # 双栏模式：CodeMirror 6 + 预览联动
│   │   │   ├── plugins/           # ProseMirror 插件
│   │   │   └── nodeviews/         # 自定义 NodeView 组件
│   │   ├── themes/                # 亮/暗主题 CSS
│   │   └── utils/                 # 工具函数
│   ├── routes/
│   │   ├── +page.svelte           # 主编辑器页面
│   │   └── +layout.svelte         # 布局壳
│   ├── app.html
│   └── app.css
├── package.json
└── README.md
```

> 注：Pandoc 二进制**不包含在仓库或安装包中**，首次导出时按需下载到应用数据目录（`%APPDATA%/mino/pandoc/`）。

## **附录 B：关键依赖版本**

| 依赖 | 推荐版本 | 用途 |
| :--- | :--- | :--- |
| @tauri-apps/cli | ^2.x | Tauri 构建工具 |
| @tauri-apps/api | ^2.x | 前端 Tauri API |
| @milkdown/core | ^7.x | 编辑器核心 |
| @milkdown/prose | ^7.x | ProseMirror 文档模型 |
| @milkdown/preset-commonmark | ^7.x | CommonMark 语法 |
| @milkdown/preset-gfm | ^7.x | GFM 扩展语法 |
| @milkdown/plugin-katex | ^7.x | KaTeX 公式（v7 包名已变更） |
| @milkdown/plugin-mermaid | ^7.x | Mermaid 图表 |
| svelte | ^5.x | 前端框架 |
| ropey (Rust crate) | ^1.x | Rope 数据结构（文件 I/O 加速） |
| dompurify | ^3.x | XSS 防护 |
| @codemirror/view | ^6.x | 双栏模式源码编辑器核心 |
| @codemirror/state | ^6.x | CodeMirror 状态管理 |
| @codemirror/commands | ^6.x | CodeMirror 基础键绑定 |
| @codemirror/lang-markdown | ^6.x | Markdown 语法高亮 |
| @codemirror/search | ^6.x | 搜索功能 |
