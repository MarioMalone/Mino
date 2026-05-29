# **Windows端轻量化Markdown编辑器技术可行性研究与系统构建方案**

## **1\. 桌面端Markdown编辑器市场格局与开源竞品分析**

在目前的桌面文本编辑器市场中，Markdown编辑器主要分为两大交互阵营：一类是双向实时预览（WYSIWYG）编辑器，其核心特征是在输入时直接隐藏Markdown语法标记，提供直观的排版视觉效果；另一类是传统的双栏分栏编辑器或源码模式编辑器，通过左侧源码、右侧预览的方式提供排版反馈 1。Typora作为双向实时预览编辑器的商业先驱，其凭借极简的单栏写作界面和卓越的排版美学奠定了行业标杆地位 1。然而，随着技术演进，各类开源替代方案和专有工具在不同的应用场景下展现出各自的优势与局限。

### **主流竞品分析与功能评估**

#### **商业及学术专用编辑器**

Typora在Windows、macOS和Linux上提供了高度一致的单栏即时渲染写作体验，支持复杂的表格编辑、数学公式（KaTeX/MathJax）、Mermaid图表生成以及基于Pandoc的深度多格式导出 4。然而，为防止极高字数文档导致的内存溢出和渲染挂起，Typora在其底层核心配置中设定了默认 ![][image1] 的文件大小限制（由 frame.js 中的 MAX\_FILE\_SIZE 定义） 8。当文档容量达到这一上限，或者文本长度突破一万至两万字且包含大量嵌套列表和代码块时，其大纲视图往往会完全卡顿，代码语法高亮也会表现出严重的输入延迟 10。与之相对的 adoc Studio 则专注于 macOS 和 iOS 生态下的 AsciiDoc 写作，侧重于多文件项目管理和高可扩展的工程文档编写，但由于缺乏跨平台支持且格式不属于标准 Markdown，因而不适合作为通用轻量编辑器的竞品 4。

#### **开源专用桌面编辑器**

在开源领域，MarkText 作为 Typora 曾经最瞩目的替代者，采用 Electron 框架和自主研发的 Muya 实时预览渲染引擎构建，严格遵循 CommonMark 和 GitHub Flavored Markdown (GFM) 规范 11。然而，该项目自2022年3月起已处于事实上的停滞维护状态 13。其底层在内存中使用简单的原生字符串（String）来承载整个文档内容，随着文档体积增加，频繁的编辑与字符变更会导致高频的内存重分配与字符串拷贝，引发严重的 CPU 抖动 14。此外，其冷启动时间在现代处理器上往往需要12秒以上，且由于打包了完整的 Chromium，其空载内存占用居高不下 13。 除了 MarkText，Ghostwriter 也是一款优秀的 Windows 与 Linux 端无干扰 Markdown 编辑器，但其并不支持纯粹的单栏实时预览模式（即在编辑时无法完全隐藏 Markdown 语法标记符号），无法提供类似 Typora 的极致视觉沉浸感 1。Simplenote 提供了极致轻量的全平台同步体验，但其本质上属于轻量笔记工具，缺乏对复杂 Markdown 语法和高级渲染功能的支持 1。新兴的 Nimbalyst 则是一款支持 WYSIWYG 实时渲染、带有 AI 智能差异分析与代码 spec 同步的先进编辑器，非常适合技术文档编写 2。而 Yank Note 是一款基于 Monaco Editor 构建的面向开发者的 Markdown 编辑器，内置了代码执行、多类图表和高度可定制的插件，其在结构化笔记和极客写作中表现优异 17。

#### **知识管理及笔记系统**

Obsidian 和 Joplin 作为目前顶级的开源笔记应用，虽然深度集成了解析和渲染 Markdown 的功能，但它们的底层设计专注于知识库管理、双向链接和多端加密同步，其界面包含了繁杂的侧边栏、网状图和插件应用面板，因而并不适合作为极简、纯粹的文件型编辑器 1。Zettlr 则专注于学术研究，集成了 Zotero 文献引用、LaTeX 导出和写作统计分析 1。然而，Zettlr 并没有提供完美的 WYSIWYG 交互，其在渲染时依然会在段落中保留 Markdown 的标记符号（例如 Hashtag 符号），且由于只由极少数开发者维护，其技术迭代速度和插件生态扩展受到了极大的安全限制 16。

#### **浏览器端与插件化方案**

在轻量化在线编辑和插件生态中，Slate.ink 提供了基于浏览器的极简 Markdown 体验 16。同时，众多开发者在 VS Code 中通过安装 Markdown All in One、Markdown Inline Editor 以及 Vditor Markdown Editor 等扩展插件，实现了在代码编辑器中进行实时预览和可视化的 Markdown 编辑 1。虽然这种配置对于已处于 VS Code 生态中的开发人员极为便利，但由于 VS Code 本身挂载了大量的辅助插件和项目进程，其作为专职写作工具时，难以保证系统资源占用的绝对轻量化 16。 在更早期的开源替代方案中，Laverna 曾以高隐私保护、内置 Dropbox 离线同步和实时预览为卖点，但目前也已基本停止维护；PeerPad 曾尝试利用冲突无界复制数据类型（CRDTs）和星际文件系统（IPFS）构建分布式的在线协作编辑器；而 Etherpad 则专注于实时富文本的多人无缝协作 21。这些方案在特定历史节点推动了协同编辑的演进，但在单机高性能排版方面表现不足。  
下表详细总结了市面上代表性 Markdown 桌面编辑器的功能与性能表现，旨在明确本技术方案的优化基准：

| 编辑器名称 | 授权协议 | 底层运行时容器 | UI渲染范式 | Windows安装包大小 | 空载运行内存 (RAM) | 2MB+ 大文件编辑表现 |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **Typora** 1 | 商业专有 16 | Electron | 纯单栏即时渲染 5 | \~150 MB | 150 \- 300 MB 22 | 卡顿明显，配置默认强制拦截限制 8 |
| **MarkText** 1 | MIT 1 | Electron | 纯单栏即时渲染 12 | \~200 MB | 180 \- 350 MB | 内存频繁重分配，字符输入出现延迟 14 |
| **Ghostwriter** 1 | GPL-3.0 | Qt / C++ | 分栏/混合非纯即时渲染 16 | \~60 MB | 50 \- 90 MB | 渲染平稳，但缺少纯粹沉浸式视觉 |
| **Joplin** 1 | GPL-2.0 | Electron | 双栏/富文本切换 18 | \~180 MB | 150 \- 300 MB | 中规中矩，非针对极简写作优化 1 |
| **Zettlr** 1 | GPL-3.0 | Electron | 混合语法标签渲染 16 | \~170 MB | 160 \- 300 MB | 学术引用和AST解析较重 1 |
| **Yank Note** 17 | 专有/免费 | Electron | Monaco 代码+混合预览 17 | \~140 MB | 150 \- 250 MB | 代码渲染极快，但非 Typora 极简风 17 |
| **Nimbalyst** 2 | 开源自由 | Web 宿主 / Electron | 纯单栏即时渲染 \+ AI 2 | \~110 MB | 130 \- 220 MB | AI 差异比对时消耗额外 CPU 2 |

## **2\. 核心编辑引擎及WYSIWYG实现机制的技术选型**

构建一个轻量的即时渲染 Markdown 编辑器，其核心在于前端编辑引擎（Editor Engine）的选择。此类引擎必须能够在内存中维护一套结构化文档模型，一方面承载用户编辑时的实时格式化 DOM 树，另一方面能够无缝、无损地将该模型序列化为干净的、符合 CommonMark 或 GFM 规范的标准 Markdown 文本存盘 2。当前，开源社区提供了数款高成熟度的无头（Headless）富文本框架和 Markdown 专用渲染库。

### **核心编辑器框架技术评估**

#### **ProseMirror**

ProseMirror 是现代富文本编辑器技术的基石，其最大的技术贡献在于完全抛弃了不确定的、极易导致浏览器 DOM 脏乱的原生 contenteditable 接口，转而在内存中设计了一套由 Schema 严格约束的自定义文档模型 3。

* **架构优势**：ProseMirror 通过“事务（Transaction）”和“步骤（Step）”来精确控制和应用文档状态的变化，其底层的扁平化内联内容存储设计极大地降低了树状操作的复杂度，使得撤销历史（Undo History）以及协同编辑变得非常稳定且可控 24。  
* **技术瓶颈**：ProseMirror 本身并不是开箱即用的编辑器，它是一套底层的工程框架 23。如果要利用它构建具有 Typora 效果的 Markdown 实时预览编辑器，开发者需要徒手编写极其复杂的段落语法转换（NodeView）、选区重算以及复杂的 Markdown 双向解析层，技术实现成本极高 25。

#### **Tiptap**

Tiptap 是目前流行度最高的无头富文本编辑框架，其本质上是对 ProseMirror 的一层优雅的现代 JavaScript 封装 17。

* **架构优势**：它提供了极具表现力的声明式扩展（Extensions）系统，极大地简化了 ProseMirror 的概念 17。在开源领域中，Zenmark 项目便成功利用 Tiptap 作为核心引擎，构建出了高度可定制、支持 KaTeX 公式、Highlight.js 语法高亮和 Yjs 多人实时协同编辑的类 Typora 编辑器，并能够作为高内聚的前端组件进行轻松调用 29。  
* **技术瓶颈**：由于其封装了较多的响应式框架抽象层（如 Vue/React 桥接层），在面临数十万字的超长文档编辑时，其性能比原生的 ProseMirror 稍逊，且核心打包体积（通常在 ![][image2] 以上）对极致轻量化项目有一定压力 17。

#### **Lexical**

Lexical 是 Meta 开源的最新一代可扩展富文本编辑器框架，旨在替代老旧的 Draft.js 17。

* **架构优势**：Lexical 的底层设计精巧，核心包仅约 ![][image3]，其不仅与 React 等框架无缝结合，且在初始载入速度、内存开销以及打字输入延迟上表现出了极致的高性能，非常适合处理大规模的可编辑文档 17。  
* **技术瓶颈**：Lexical 目前在底层缺乏原生“纯粹装饰器（Pure Decorations）”支持 25。在 ProseMirror 或 Slate 中，开发者可以使用装饰器在不改变文档实际节点结构的前提下，对局部文本样式进行标记（例如临时语法高亮、协同光标）；而 Lexical 的 Decorator Nodes 在改变样式时会直接触发文档节点的突变（Mutation），这就导致在实现复杂的协同光标时，不得不采用在 DOM 树上绘制绝对定位浮层，并高频监听滚动和窗口缩放事件的低效工作方案 25。

#### **Slate**

Slate 是基于 React 生态设计的高度可定制无头编辑器，它通过彻底的嵌套 JSON 数据结构来模拟 DOM 26。

* **架构优势**：Slate 的数据结构极易理解，拥有极高水准的开发人员体验（DX），在构建类似 Notion 或 Discord 的卡片式/富文本混合编辑界面时非常敏捷 26。  
* **技术瓶颈**：由于 Slate 的渲染机制完全依赖于 React 的虚拟 DOM 差分算法，用户每一次按键都会导致整棵文档树进行虚拟 DOM 节点的递归 Diff 运算 26。在超长文本（如十万字以上）中，由于虚拟 DOM 的重载开销，输入延迟会急剧上升，无法实现“极致轻量、秒开不卡”的物理性能指标 26。

#### **Milkdown**

Milkdown 是一款专为 Markdown 打造的开源即时预览无头编辑器 23。

* **架构优势**：其压缩后仅有 ![][image4]（Gzip 后约 ![][image5]），底层基于 ProseMirror 和强大的标准 Markdown 解析库 Remark 构建 23。Milkdown 天然支持 CommonMark 及 GFM 规范，完全依靠插件机制来加载各项语法功能（如表格、数学公式和代码高亮） 23。它绕过了繁琐的通用富文本抽象，直接在底层驱动 Markdown 语法树与 ProseMirror 文档树的双向映射，是构建轻量化 Markdown 实时的黄金之选 23。

#### **Muya 渲染机制（MarkText 底座）**

Muya 引擎作为 MarkText 的核心，其双向同步机制具有极高的架构参考价值 11。Muya 的 Markdown 解析与还原管线非常清晰：

* **读取阶段**：利用 marked 库作为 Markdown 到 HTML 的高性能转换器，直接将文本解析为语义化的 DOM 节点加载至编辑器中 31。  
* **写入阶段**：编辑器将内存中的 DOM 节点导出，通过 turndown 库配合 joplin-turndown-plugin-gfm 插件，将其逆向解析为纯净、排版整洁的 Markdown 文本 31。为了抵御跨站脚本攻击（XSS），其输出流会经过 DOMPurify 库的安全过滤 31。

下表汇总了上述各前端编辑器核心框架的关键性能与功能差异：

| 框架名称 | 核心大小 (未压缩) | 依赖的底层技术 | 纯装饰器机制 | 框架相关性 | 协作同步支持 | 大文档运行效率 |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| **ProseMirror** 17 | \~100 KB+ 17 | 原生 DOM 模型 24 | **原生支持** 25 | 框架无关 25 | 原生 Yjs / OT 23 | **优秀 (不依赖 VDOM)** 28 |
| **Tiptap** 17 | \~100 KB+ 17 | ProseMirror 17 | **原生支持** 25 | 支持 React/Vue/Svelte 17 | Hocuspocus / Yjs 17 | 良好 (略受包装层损耗) 28 |
| **Lexical** 17 | **\~22 KB** 17 | 宿主 DOM 28 | 缺乏 25 | 深度契合 React 28 | Yjs (需额外处理光标) 25 | **极佳 (轻量快速)** 28 |
| **Slate** 17 | \~80 KB 17 | React 虚拟 DOM 26 | **原生支持** 25 | React 专享 26 | Yjs 25 | 较差 (受制于 VDOM Diff) 26 |
| **Milkdown** 23 | \~125 KB 23 | ProseMirror \+ Remark 23 | **原生支持** 23 | 框架无关 23 | 完美支持 Yjs 协同 23 | **优秀 (专为Markdown优化)** |

## **3\. 桌面端GUI容器运行时环境的架构比对与性能分析**

对于 Windows 桌面应用程序，选择何种容器来承载前端 HTML/JS 编写的编辑器界面，直接决定了该编辑器的冷启动速度、安装包体积以及运行时的内存开销 15。

### **运行时容器方案对比**

#### **Electron**

* **架构机理**：Electron 采用典型的多进程架构，其主进程通过 V8 引擎直接驱动 Node.js 运行时，为每一个独立的窗口（渲染进程）捆绑并分发一个完整的 Chromium 浏览器实例，这确保了跨操作系统平台时极为精确的无差别像素级渲染 15。  
* **核心短板**：由于其不得不将一个约 ![][image6] 的 Chromium 和约 ![][image7] 的 Node.js 运行时强行塞入每一个打包应用中，导致最终生成的 Windows 安装包体积通常高达 ![][image8]，空载时 idle 运行内存也在 ![][image9] 之间波动，冷启动时间一般需要 2 至 5 秒 15。

#### **Tauri v2**

* **架构机理**：Tauri v2 采取了完全不同的现代轻量化思路：其后端采用兼具极致内存安全与零成本抽象的 Rust 语言开发，而前端则彻底抛弃了臃肿的内置浏览器内核，转而直接调用 Windows 操作系统中原生预装的基于 Chromium 的 **Microsoft Edge WebView2** 渲染引擎 15。通过这种方式，Tauri 编译生成的二进制文件仅保留前端打包静态资产（常小于 ![][image10]）、Rust 后端业务逻辑和极其高效的微型 IPC 通信总线，从而将程序性能提升到了极致 15。  
* **核心优势**：Tauri 编译生成的 Windows 程序打包体积被压缩到了极致的 ![][image11]，空载时系统物理内存占用通常仅在 ![][image12]，冷启动时间更是缩短到了毫秒级（![][image13]） 15。此外，Tauri v2 引入了严格的“能力系统（Capability System）”，前端对任意本地操作系统 API 的调用都必须在配置文件中进行细粒度的显式权限声明，这与 Electron 默认宽松授权的 Node.js 访问模型相比，提供了卓越的系统级安全性 15。同时，Tauri v2 已经正式支持移动端（iOS/Android），有利于后续生态的多端移植 15。  
* **技术局限与调优指标**：尽管 Tauri 的内存和冷启动表现惊艳，但开发者必须认识到其中的技术细节。第一，Tauri 的初始构建由于涉及到 Rust 复杂的宏展开和 LLVM 代码优化，编译速度相对缓慢，但增量编译表现正常 33。第二，Tauri 宣称的几十兆极低内存占用往往是指其 Rust 主进程（约 ![][image14]），而 WebView2 实例在承载大型单页 Web 应用（SPA）并运行大量 JS 逻辑时，其占用的系统资源会迅速上升，在实际复杂编辑场景下，其整体物理内存开销一般在 ![][image15] 左右 34。第三，在跨平台场景下，虽然 Windows 端 WebView2（Chromium）表现极佳，但 macOS 的 WKWebView (Safari 内核) 和 Linux 的 WebKitGTK 有可能在处理高计算负载的 Web 应用时表现出比 Chromium 略高的内存消耗，需要进行针对性的平台兼容性排查 22。

#### **WPF \+ WebView2 (基于.NET)**

* **架构机理**：这是微软生态下专为 Windows 平台打造的原生混合应用方案。其使用 C\# / XAML 构建应用外壳与系统窗口，底层通过引入 Microsoft.Web.WebView2 SDK 来直接加载本地或远端的前端编辑界面 37。  
* **核心优势**：WPF 通过高度成熟的 COM/WinRT 互操作体系，可以使用原生自带的 AddHostObjectToScript 方法，将 C\# 编写的公共宿主对象以同步或异步的方式直接暴露在前端 JS 上下文中（挂载在 window.chrome.webview.hostObjects 命名空间下），从而使得前端可以毫无障碍、极速地调用原生的 Windows API 和高效的文件 I/O 流，性能极为强悍 37。  
* **核心短板**：该方案是完全绑定于 Windows 单一操作系统的，若产品未来的商业路线图中包含了跨 macOS 或是 Linux 平台的分发计划，该方案将面临彻底重构的致命代价 22。

下表量化比对这三大桌面端运行时容器在 Windows 环境下的核心指标表现：

| 评估维度 | Electron | Tauri v2 | WPF \+ WebView2 |
| :---- | :---- | :---- | :---- |
| **底层渲染技术** | 捆绑 Chromium 15 | 操作系统 WebView2 15 | 操作系统 WebView2 37 |
| **后端语言环境** | Node.js 15 | **Rust** 15 | C\#.NET 37 |
| **Windows安装包体积** | 120 \- 200 MB 15 | **3 \- 10 MB** 15 | 15 \- 35 MB |
| **物理内存消耗 (空载)** | 150 \- 400 MB 15 | **40 \- 80 MB** (实际约120MB) 15 | 60 \- 100 MB |
| **冷启动响应速度** | 2 \- 5 秒 15 | **\< 200 毫秒** 15 | \< 300 毫秒 |
| **IPC通信吞吐效率** | 优秀 (基于V8内置桥接) | 中等 (基于JSON/序列化数据流) | **极佳 (直接互操作通道)** 37 |
| **系统安全边界控制** | 较弱 (易遭恶意代码注入) | **极强 (默认拒绝，按需授权能力)** 32 | 较强 (C\# 沙箱隔离) |
| **多窗口资源控制** | 较差 (各窗口独立消耗资源) | **优秀 (共享WebView运行时组件)** | **优秀 (共享进程实例)** |
| **多平台兼容能力** | 完美跨平台 (Windows/macOS/Linux) | 优秀 (跨平台且完美支持移动端) 15 | 仅支持 Windows 22 |

## **4\. 极轻量Typora替代方案的系统架构与构建指南**

结合上述深度调研，为了达成“极致轻量、启动秒开、安全且完美支持 Windows 实时预览”的设计构想，**本系统推荐采用如下黄金架构组合：Tauri v2 (Rust 宿主) \+ Svelte 5 (极简前端编译器) \+ Milkdown (基于 ProseMirror 规范的 Markdown 引擎)**。Svelte 5 凭借其最新引入的 Runes 反应式机制和彻底的“无虚拟 DOM”编译模型，可以将前端 JavaScript 的体积和运行负载压缩到物理极限，配合 Rust 极速的文件处理，是绝佳的搭配选择 27。  
以下为构建该编辑器的核心系统管道与技术实现路径：

### **核心管道设计**

#### **1\. 协议级本地文件安全加载机制**

传统的 Electron 编辑器通常在本地随机启动一个局域网 HTTP 服务器（如 localhost:port）来为前端提供图片等资源的加载，这不仅增加了系统的端口暴漏风险，且极易遭到防火墙拦截和恶意脚本扫描 39。 Tauri 采用了高度安全的**协议级托管机制（Protocol-based serving）**：在系统启动时，由 Rust 后端直接在操作系统注册自定义的 URI Scheme（例如本地专属的 asset:// 协议），当前端需要渲染一个位于磁盘深处的图片资源（如绝对路径 C:\\MyNotes\\images\\shot.png）时，前端通过引入 @tauri-apps/api/core 的 convertFileSrc() 函数进行转换 40：

TypeScript  
import { convertFileSrc } from '@tauri-apps/api/core';  
const assetUrl \= convertFileSrc("C:\\\\MyNotes\\\\images\\\\shot.png");  
// 转换后的结果类似于：asset://localhost/C%3A%2FMyNotes%2Fimages%2Fshot.png

为了使该协议能正常工作，必须在打包配置文件 tauri.conf.json 中配置内容安全策略（CSP）和允许的作用域限制（assetScope），通过严密地指定允许访问的文件夹路径，从系统层面杜绝目录穿越漏洞：

JSON  
{  
  "bundle": {  
    "security": {  
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost;"  
    }  
  },  
  "plugins": {  
    "protocol": {  
      "asset": true,  
      "assetScope":  
    }  
  }  
}

当 WebView 请求 asset:// URL 时，Tauri 内部的 Rust 调度模块会直接拦截该请求，跳过外部网络协议栈，直接以原生的二进制流在底层将文件数据无缝喂给渲染进程，实现本地图片秒速加载 39。

#### **2\. “伴随进程（Sidecar）”高负载任务离线调度**

Markdown 写作中不可或缺的功能是数学公式编译、Mermaid 图表离线导出和多格式转换（如通过 Pandoc 转换为 Word 文档） 5。 如果将这些沉重的解析、编译任务全部堆积在前端 JavaScript 的单线程环境中，或者是用 Node.js 的同步 I/O 来硬扛，必然会导致编辑界面高频卡死 11。 Tauri 提供了内置的**Sidecar 边车机制**：允许将编译好的原生二进制执行文件（如优化配置后的 Pandoc.exe 或离线渲染 CLI 工具）打包进应用程序中，并通过 Rust 统一接管其生命周期与输入输出流 33。当用户点击“导出为 Word”时，前端向 Rust 发送异步 Invoke 指令，Rust 后端迅速调起 Sidecar 进程在操作系统后台异步执行转换任务，完成后通过 Tauri 的 Channel 或是异步事件（Event）将成功状态通知前端，确保写作界面自始至终流畅如丝 33。

#### **3\. 稳健的双向 Markdown \<-\> DOM 状态机设计**

为了彻底避免 MarkText 在源码模式与即时预览切换时的生硬撕裂感，必须在前端构建一个“统一状态源（Single Source of Truth）”的双向状态解析环路 11。

* **反序列化（Read Path）**：利用 Milkdown 的底层架构，当用户打开一个 .md 文件时，Rust 将其以 UTF-8 编码读取为纯文本字符串，通过 IPC 传入 Svelte 5 宿主中 23。Milkdown 驱动内置的 Remark 编译器对文本进行词法、语法分析，将其解析为符合 GFM 标准的 Markdown 抽象语法树（AST），再由 ProseMirror 的 Schema 解析映射层，在浏览器的 contenteditable 容器中一次性实例化为高响应式的富文本节点树 23。  
* **序列化（Write Path）**：当用户在视觉层面上进行输入、修改、添加表格、插入本地图片或是修改待办任务列表时，任何在 DOM 中的细微变动都会被 ProseMirror 拦截并转换为结构化的 Transaction 事务 23。ProseMirror 的 Document Model 将该变更实时应用在内存状态树中。存盘时，Milkdown 会逆向调用内置的 Turndown 序列化器和 Joplin-GFM 高级格式化插件，将当前的内存状态树重新编译成格式化极佳的 Markdown 纯文本，并调用 Rust 异步 I/O 极其安全地写入到磁盘中，全过程无损、无错位 23。

## **5\. 针对大型Markdown文档的极致性能优化策略**

性能优化是衡量一款 Markdown 编辑器品质高低的核心分水岭。如前所述，即使是商业闭源的标杆产品 Typora 或是优秀的开源项目 MarkText，在面对体积巨大（如数十兆或十几万字）的 Markdown 文件时，依然难免出现卡顿、假死甚至奔溃 8。造成这一现象的本质原因在于：当文件超长时，传统的纯字符串处理方法会面临海量的字符复制开销，同时浏览器底层渲染引擎在处理含有几万个 DOM 节点的复杂树结构时，其重排与重绘的计算开销呈非线性几何级数暴涨 8。  
要在 Windows 端的 WebView2 中实现万字长文、百页文档下的“丝滑打字”体验，必须在底层数据结构和渲染管线上进行深度重构和调优。

### **1\. 内存底层引入高性能绳索数据结构（Rope / Piece Table）**

如果编辑器底层像 MarkText 或是传统的 JS 编辑器那样，将整个大文件存储为一个单一的长 JavaScript 字符串，任何局部的输入或删除都会强制导致引擎在内存中对该字符串重新申请空间、克隆并重分配 14。这种同步开销在面临几十万字时会产生明显的物理延迟 14。 **调优对策**：在本系统中，编辑器的文件持久化与后端缓存模块应在 Rust 端使用高度优化的 **Rope（绳索）** 数据结构（例如，基于优秀的 Rust 开源库 crop 或 ropey 构建，其原理类似于 Atom 或 VS Code 核心的超级文本缓冲区 Superstring） 14。 Rope 是一种基于平衡二叉树的字符块存储架构。在这种设计下，一整篇超长文档会被切分为许多固定大小的字符叶子节点。当用户在第 ![][image16] 行插入一个字符时，底层数据结构无需重写整篇文档，而只需在这颗二叉树的特定局部节点进行极小规模的节点分裂与平衡调整：  
![][image17]  
这使得海量字符的高频编辑在 Rust 后端能够永远以微秒级的开销闪电完成 14。

### **2\. 深度定制 ProseMirror 视口遮罩与消隐（Occlusion Culling）**

由于超长文档包含成千上万个段落、表格、高亮代码块和 SVG 图表，在渲染时会导致浏览器的 DOM 树体积过大，进而使浏览器的 Layout 线程遭遇计算灾难，造成输入打字时严重延迟 43。 **调优对策**：充分利用现代 Chromium 内核提供的 CSS 高级特性，结合原生的节点高度缓存进行动态消隐。

* **基于 CSS content-visibility 机制**：对于非活动视口（即用户当前没有滚到其视窗区域内）的段落或章节包裹容器，动态套用如下 CSS 样式 43：

.markdown-block-wrapper {  
content-visibility: auto;  
contain-intrinsic-size: 100px 300px; /\* 声明其近似的高度和宽度缓存，防止滚动条闪烁 \*/  
}

该 CSS 指令允许 WebView 极具智慧地跳过视口外所有子 DOM 节点的重排与重绘运算，只有当其即将滚动进入视区时才会触发 Layout 。  
\* \*\*ProseMirror 装饰器遮罩插件（Display-None Occlusion Hack）\*\*：若在某些低配置 Windows 设备上面临 content-visibility 规范实现不稳定的情况，可以在前端注册一个高内聚的 ProseMirror 滚动监听插件 。该插件通过实时获取 WebView 视口（Viewport）边界，对所有绝对坐标超出当前视窗上下各一屏距离的非活动 ProseMirror 节点，利用 \`Decoration.node\` 机制动态注入 \`display: none;\` 样式 。由于 \`display: none;\` 会将元素彻底从浏览器的重绘计算树中摘除，且 ProseMirror 具有出色的 Document View 更新保持机制，这就使得无论文档整体拥有几千页还是上万页，WebView2 中实际处于活跃渲染状态的 DOM 节点数将恒定保持在几百个以内，打字输入帧率能够稳定维持在 $60\\text{ FPS}$ 极速水平 。

\#\#\# 3\. 精细化消除 NodeView 组件的冗余编译与“位置漏斗”效应  
在使用现代前端反应式框架（如 React/Svelte）来承载自定义的 Markdown 高级块组件（例如复杂的交互式表格、带有行号的 Prism 语法高亮代码块、或是 KaTeX 数学公式面板）时，极易因 ProseMirror 内部的绝对位置变化而引发大范围的重复渲染灾难 \[6, 31, 45\]。  
在 ProseMirror 的标准事件流中，当用户在文档的开头或前方任意段落插入或删除了一个字符，其后方所有 NodeView 组件对应的绝对文档位置参数 \`pos\`（表示该节点在整个文档流中的字符偏移量）都会统一发生递增或递减 $1$ 的变化 。  
如果开发者将 \`pos\` 作为一个普通的属性（Prop）显式传入这些前端组件中，Svelte/React 在检测 Props 变化时会判定所有后继组件的属性均已改变，从而疯狂触发所有后续组件的虚拟 DOM 重渲染与重新解析逻辑，使打字操作因大规模组件刷新而彻底卡死 。  
\*\*调优对策\*\*：组件的生命周期内坚决禁止直接依赖绝对的 \`pos\` 属性 。前端包裹层组件应当只向底层的 NodeView 实例传递一个高内聚的位置检索闭包函数 \`getPos\` ：  
\`\`\`typescript  
// 传入闭包替代数值属性，闭包引用保持恒定，从而彻底避开 props 的 diff 重渲染  
const dynamicPosition \= () \=\> getPos() \+ 1;

通过这种高度精细化的“懒求值”和 Memoization 设计，后继成百上千个公式或代码块组件不会再因为前方的打字输入而触发任何无谓的重新编译，成功将渲染开销限定在当前编辑的那一行 45。

### **4\. 强行屏蔽 Chromium 全局语法和拼写扫描**

在默认状态下，WebView 容器只要检测到可编辑属性 contenteditable="true"，就会自动在后台静默启动高消耗的全局拼写和语法检查进程 43。在一万字以上的长篇大论中，这一后台扫描进程会高频抢占 CPU 主线程，导致严重的打字滞后感 43。 **调优对策**：在初始化 Milkdown 或 ProseMirror 编辑视窗 DOM 时，必须强制且显式地关闭内置的拼写扫描功能 43：

JavaScript  
new EditorView(element, {  
  attributes: {  
    spellcheck: 'false' // 彻底关闭 Chromium 拼写，移开主线程重负载山头  
  }  
});

## **6\. 结论与工程可行性综合建议**

构建一款媲美 Typora 且性能极致优化的轻量化 Windows 桌面 Markdown 编辑器，不仅在工程技术上具有高度的可行性，更是一次通过现代工具链（Rust 与现代前端技术）对陈旧、臃肿的 Electron 编辑器进行颠覆性性能重构的绝佳实践。  
在过去，开发者不得不承受 Electron 带来的超大体积和高昂内存损耗 15。而在2026年的技术格局下，**Tauri v2** 的成熟和 Windows 10/11 对 **Edge WebView2** 的全面覆盖，使得无需打包浏览器内核即可构建原生质感桌面应用的设计思路成为了黄金标准 15。通过将底层文件存取与高负载编译外包给极速安全的 **Rust**，前端界面交付给无虚拟 DOM 的 **Svelte 5**，并结合 **Milkdown / ProseMirror** 的高度可控文档事务流，开发者可以轻松打破 Typora 等工具在大文件编辑时的物理极限 15。  
本方案所倡导的高性能 Rope 绳索平衡树设计、精细化视口消隐技术以及位置闭包懒求值优化，能够从底层消除导致界面重排卡顿的核心物理诱因，从而在确保最终打包程序小于 ![][image18]、运行内存保持在 ![][image19] 范围内的同时，提供秒开、大文件不卡顿且兼具沉浸式单栏即时预览的极致写作体验，极具商业与技术分发价值 14。

#### **引用的著作**

1. The Best Open-Source Markdown Editors for Writing and Beyond ..., 访问时间为 五月 28, 2026， [https://portalzine.de/the-best-open-source-markdown-editors-for-writing-and-beyond/](https://portalzine.de/the-best-open-source-markdown-editors-for-writing-and-beyond/)  
2. Best Markdown Editor 2026: Top 5 Apps Compared \- Nimbalyst, 访问时间为 五月 28, 2026， [https://nimbalyst.com/blog/the-complete-guide-to-markdown-editors/](https://nimbalyst.com/blog/the-complete-guide-to-markdown-editors/)  
3. WYSIWYG vs Markdown: Differences, Pros, Cons, and Which to Choose \- CKEditor, 访问时间为 五月 28, 2026， [https://ckeditor.com/blog/wysiwyg-vs-markdown-editor-comparison/](https://ckeditor.com/blog/wysiwyg-vs-markdown-editor-comparison/)  
4. Best Alternative to Typora for Documentation (2026) \- adoc Studio, 访问时间为 五月 28, 2026， [https://www.adoc-studio.app/comparison/typora](https://www.adoc-studio.app/comparison/typora)  
5. I'm Glad I Revisited Typora : r/macapps \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/macapps/comments/1rj6sk2/im\_glad\_i\_revisited\_typora/](https://www.reddit.com/r/macapps/comments/1rj6sk2/im_glad_i_revisited_typora/)  
6. Typora — simple yet powerful Markdown reader., 访问时间为 五月 28, 2026， [https://typora.io/](https://typora.io/)  
7. Export \- Typora Support, 访问时间为 五月 28, 2026， [https://support.typora.io/Export/](https://support.typora.io/Export/)  
8. Fixing “The file is too large to render in Typora” by Increasing the ..., 访问时间为 五月 28, 2026， [https://dev.to/l1u7/fixing-the-file-is-too-large-to-render-in-typora-by-increasing-the-file-size-limit-hnc](https://dev.to/l1u7/fixing-the-file-is-too-large-to-render-in-typora-by-increasing-the-file-size-limit-hnc)  
9. Boost Typora's File Size Limit: A How-To Guide | Kite Metric, 访问时间为 五月 28, 2026， [https://kitemetric.com/blogs/boost-typora-s-file-size-limit-a-how-to-guide](https://kitemetric.com/blogs/boost-typora-s-file-size-limit-a-how-to-guide)  
10. Severe performance degradation and sidebar lag with large documents (\>10000 words) · Issue \#6542 \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/typora/typora-issues/issues/6542](https://github.com/typora/typora-issues/issues/6542)  
11. marktext/docs/dev/ARCHITECTURE.md at develop \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/marktext/marktext/blob/develop/docs/dev/ARCHITECTURE.md](https://github.com/marktext/marktext/blob/develop/docs/dev/ARCHITECTURE.md)  
12. marktext/marktext: A simple and elegant markdown editor, available for Linux, macOS and Windows. \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/marktext/marktext](https://github.com/marktext/marktext)  
13. low Startup Performance · Issue \#3862 · marktext/marktext \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/marktext/marktext/issues/3862](https://github.com/marktext/marktext/issues/3862)  
14. Mark Text performance improvement · Issue \#511 · marktext/marktext \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/marktext/marktext/issues/511](https://github.com/marktext/marktext/issues/511)  
15. Tauri vs Electron 2026: Performance, Bundle Size & Security \- Rustify, 访问时间为 五月 28, 2026， [https://rustify.rs/articles/rust-tauri-vs-electron-2026](https://rustify.rs/articles/rust-tauri-vs-electron-2026)  
16. Looking for a WYSIWYG Markdown Editor for Fedora Linux (Alternative to MarkText) \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/Markdown/comments/1kcy85q/looking\_for\_a\_wysiwyg\_markdown\_editor\_for\_fedora/](https://www.reddit.com/r/Markdown/comments/1kcy85q/looking_for_a_wysiwyg_markdown_editor_for_fedora/)  
17. Text Editors \- Starter DOCS, 访问时间为 五月 28, 2026， [https://starterdocs.js.org/docs/comparisons/editors](https://starterdocs.js.org/docs/comparisons/editors)  
18. Differences between Joplin and Zettlr? \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/Zettlr/comments/169tha8/differences\_between\_joplin\_and\_zettlr/](https://www.reddit.com/r/Zettlr/comments/169tha8/differences_between_joplin_and_zettlr/)  
19. Just released v1.15.1 of my Markdown Inline Editor extension \- Obsidian/Typora-like WYSIWYG editing in VS Code (100% local, no remote sources) \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/Markdown/comments/1qowgi9/just\_released\_v1151\_of\_my\_markdown\_inline\_editor/](https://www.reddit.com/r/Markdown/comments/1qowgi9/just_released_v1151_of_my_markdown_inline_editor/)  
20. WYSIWYG Markdown \- Visual Studio Marketplace, 访问时间为 五月 28, 2026， [https://marketplace.visualstudio.com/items?itemName=masaya.wysiwyg-markdown](https://marketplace.visualstudio.com/items?itemName=masaya.wysiwyg-markdown)  
21. 3 Open Source Alternatives to Typora, 访问时间为 五月 28, 2026， [https://opensourcealternative.to/alternativesto/typora](https://opensourcealternative.to/alternativesto/typora)  
22. Comparing Electron and Tauri for Desktop Applications \- OpenReplay Blog, 访问时间为 五月 28, 2026， [https://blog.openreplay.com/comparing-electron-tauri-desktop-applications/](https://blog.openreplay.com/comparing-electron-tauri-desktop-applications/)  
23. Comparing Milkdown with other WYSIWYG editors \- LogRocket Blog, 访问时间为 五月 28, 2026， [https://blog.logrocket.com/comparing-milkdown-other-wysiwyg-editors/](https://blog.logrocket.com/comparing-milkdown-other-wysiwyg-editors/)  
24. ProseMirror Guide, 访问时间为 五月 28, 2026， [https://prosemirror.net/docs/guide/](https://prosemirror.net/docs/guide/)  
25. Which rich text editor framework should you choose in 2025? | Liveblocks blog, 访问时间为 五月 28, 2026， [https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025](https://liveblocks.io/blog/which-rich-text-editor-framework-should-you-choose-in-2025)  
26. A library that does half of the stuff that notion does and manages to create som... | Hacker News, 访问时间为 五月 28, 2026， [https://news.ycombinator.com/item?id=25063925](https://news.ycombinator.com/item?id=25063925)  
27. please suggest me svelte 5 comaptible rich text editor : r/sveltejs \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/sveltejs/comments/1g53hjd/please\_suggest\_me\_svelte\_5\_comaptible\_rich\_text/](https://www.reddit.com/r/sveltejs/comments/1g53hjd/please_suggest_me_svelte_5_comaptible_rich_text/)  
28. Which is the best Rich text editor library in react today? : r/reactjs \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/reactjs/comments/1kphbcn/which\_is\_the\_best\_rich\_text\_editor\_library\_in/](https://www.reddit.com/r/reactjs/comments/1kphbcn/which_is_the_best_rich_text_editor_library_in/)  
29. Peiiii/zenmark-editor: Zenmark: An open-source, Typora ... \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/Peiiii/zenmark-editor](https://github.com/Peiiii/zenmark-editor)  
30. Best Rich Text Editors 2026: Top 10 Compared \- Velt, 访问时间为 五月 28, 2026， [https://velt.dev/blog/best-rich-text-editors-react-comparison](https://velt.dev/blog/best-rich-text-editors-react-comparison)  
31. marktext/muya: Future markdown editor for web browser applications development \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/marktext/muya](https://github.com/marktext/muya)  
32. Tauri vs Electron Comparison: Choose the Right Framework | by RaftLabs \- Medium, 访问时间为 五月 28, 2026， [https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26](https://raftlabs.medium.com/tauri-vs-electron-a-practical-guide-to-picking-the-right-framework-5df80e360f26)  
33. Tauri vs. Electron: performance, bundle size, and the real trade-offs \- Hopp, 访问时间为 五月 28, 2026， [https://www.gethopp.app/blog/tauri-vs-electron](https://www.gethopp.app/blog/tauri-vs-electron)  
34. Cross-Platform Desktop Wars: Electron vs Tauri: How do you explain the tradeoffs to users (without sounding defensive)? \- Stack Overflow, 访问时间为 五月 28, 2026， [https://stackoverflow.com/questions/79914359/cross-platform-desktop-wars-electron-vs-tauri-how-do-you-explain-the-tradeoffs](https://stackoverflow.com/questions/79914359/cross-platform-desktop-wars-electron-vs-tauri-how-do-you-explain-the-tradeoffs)  
35. Any room for memory usage improvment? · tauri-apps · Discussion \#3162 \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/orgs/tauri-apps/discussions/3162](https://github.com/orgs/tauri-apps/discussions/3162)  
36. Memory benchmark might be incorrect: Tauri might consume more RAM than Electron · Issue \#5889 \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/tauri-apps/tauri/issues/5889](https://github.com/tauri-apps/tauri/issues/5889)  
37. Sharing object between .NET host and WebView2 \- Meziantou's blog, 访问时间为 五月 28, 2026， [https://www.meziantou.net/sharing-object-between-dotnet-host-and-webview2.htm](https://www.meziantou.net/sharing-object-between-dotnet-host-and-webview2.htm)  
38. feat: synchronous communication between webview and rust · Issue \#454 · tauri-apps/wry, 访问时间为 五月 28, 2026， [https://github.com/tauri-apps/wry/issues/454](https://github.com/tauri-apps/wry/issues/454)  
39. \[Question\] How does Tauri serves delivers content to WebView? \- Reddit, 访问时间为 五月 28, 2026， [https://www.reddit.com/r/tauri/comments/1on5raz/question\_how\_does\_tauri\_serves\_delivers\_content/](https://www.reddit.com/r/tauri/comments/1on5raz/question_how_does_tauri_serves_delivers_content/)  
40. \[feat\] Load server images and cache them locally permanently · tauri-apps · Discussion \#10116 \- GitHub, 访问时间为 五月 28, 2026， [https://github.com/orgs/tauri-apps/discussions/10116](https://github.com/orgs/tauri-apps/discussions/10116)  
41. Tauri v1 \- tauri, 访问时间为 五月 28, 2026， [https://tauri.app/v1/api/js/tauri](https://tauri.app/v1/api/js/tauri)  
42. Calling the Frontend from Rust | Tauri, 访问时间为 五月 28, 2026， [https://v2.tauri.app/develop/calling-frontend/](https://v2.tauri.app/develop/calling-frontend/)  
43. Performance Issues with ProseMirror and Chrome \- Page 2 \- discuss ..., 访问时间为 五月 28, 2026， [https://discuss.prosemirror.net/t/performance-issues-with-prosemirror-and-chrome/2498?page=2](https://discuss.prosemirror.net/t/performance-issues-with-prosemirror-and-chrome/2498?page=2)  
44. Performance Issues with ProseMirror and Chrome, 访问时间为 五月 28, 2026， [https://discuss.prosemirror.net/t/performance-issues-with-prosemirror-and-chrome/2498](https://discuss.prosemirror.net/t/performance-issues-with-prosemirror-and-chrome/2498)  
45. Making React ProseMirror really, really fast, 访问时间为 五月 28, 2026， [https://handlewithcare.dev/blog/making\_react\_prosemirror\_really\_really\_fast/](https://handlewithcare.dev/blog/making_react_prosemirror_really_really_fast/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAZCAYAAACYY8ZHAAACEklEQVR4Xu2WP0gcQRTGP8GAQYOIkGghItgE0kkKIWWKQIhFVAwELKytTXsWKQXBJthZhDSBFEkghCAHsRDSBhTFImCaNAFBwcI/7/PtcG/f7e7NbWUxP/i423kzs+97M7O7QCJxK7gjGs30ILvuxABaY4ZFPdCxoc2Ksa7hoFXRpmhe1J8PtzElujL6nw+3sYx8/ybU1Klr99oXLSICJr5trt9DJ5g1bWW8EH2D9h90Mctn0UfRH2ilPSFpz4LoUvQdaroUVmPJXI+JDkXHognTXgRNvIYm8NTFAlxl9tlC9ybuiX5CjZTNf0OYoM+0hcTemLYiaIIVeoty06+gRuqYYE5fobEZF8vxV3Tm2ro1MQ3tz3EWJvEp+1/HxCPoefstuu9ilfCJsYe4gcEEYRLcmpZGJhJjYi4TV++d6J9oxfSLhtXnhE98oABrgtvJVpMH/Qu0miTGBB8yVufQObgdoxmHVvO5D5RgTTyDHkD+kg1oRQMxJooIRY1aEVbuh+ixD1RgTQyJfok+iHpFO8gf9LomHkJjXOmOcPmOzDWTq3w2I2+CNNB6SnEl7Daoa4L9i85bDt6ISzXi2llVJlkF4zapu2jd0L/86prglmRs1wcsfDPzpv5QnUA/L6p4ifakyhKqY2JSdCC6QIcviDCBVxPl28l/O1Gh7zr0XASYvO/bRNy3E99ha0gkEolEoibXtqyp7G+ibX8AAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAAZCAYAAABq35PiAAACqUlEQVR4Xu2Xz8tOQRTHzxuK/ErUm5Jf2VhJ4s3itRBFYsPO0sLGiiKytURJ1JuS/AuUhfLERmwoUkqxslCUWFB+nE8zc517npm5D4/FK/dT37pzztx7Z77PzLnziPT09PwjTER5FhaubXu5amVG82J+LBjUDh80LFHNqK7I8AATc1S7JPQ74XI5Fql+ZDQwfbi2uRuFuNcH1fnYdyQuqN6rvkl4wKl2uoEH3zVtrolZlsbYttjG3O+qk02PMvyivP+NTyirVE8kPD8H93AvxlrWql5JGNPmdirPlOqQarWEh+bMWCBhUntMjGti5BLHVJelvexfqN6ZdomaGfdVN33QkMzIcUZC7pJP1GAwJTOI4fCkiaX+R2N7i+qzam/TI8CSZjDzXdyTM4MV8VjahueomcH4yF33iRo1M5jQQNrLcJmEgV6L7f0SXooplnMxbo3MkTPjqeqqaZcomYGJdySUgN0uV6VkBgYMoqwZPs59OTNKcY81Y4PqZWxTiLtIZrDdk9gemMAP+dvMJjOoMxdjmwl1kczAOKuvqmfSvc2GmC1moIkYOx3bTKx2dihtE+C95OyXsJOSGZwneNBA8mbcllAcj0t+0smMjS7uydUMDlWPJKyOgybuqZnB2JLJI1MyA9h3D1SLTWyF6rkMF9CtTY8AnzTif1JAYTrGqSElambAXzVju+qtar2JbVJ9lF8rgQPRQ9XhpkeAVTXKQEpmAPueXGl11MxYJyH3xSdq1MzIHboOSHhJ16HrtYx/6OKzyFZhdaxxOUhmzHVxxsbKJTfKV6nZ0168gAEm9kk4VPHJQkxwp8knOHtQxTns3FOdlXrxo/b4d6OB6eNzjIMVSR+fs/qkuiX5P4JjQzHlTxp1oDRB/qhNSfgljrhcT09PT09Pz//BT27s6cPV8zoiAAAAAElFTkSuQmCC>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAACaklEQVR4Xu2WzYtPYRTHj6SUt6IwC8ls/AFCiR0rjYWXUjaa1WSryI69UlJKSshC1rKZdBslsWChiNRMjSxkoyjJy/l2nnN/x9dzz/3Fcu6nvs3vOefc5z7nOed57ogMDCxplqnWsFFZJeYD/teJ44kO/ROY+ILqmuqY2CJqbBCLgbaQj1mtalS/SLDB5zHsd9jOuqHa3kYnYLEPw/iO2ARHgg18UO0pv5erfojFrWgj6mDXF4pqFXihusfGgm8AnmXmxHyH2MF8UU2HMSrzVrWo2lZsqNwt1VoPUq6LveB4sNXIEtysui3dHeMJNmQHh8V891UryfcHXvIYdKLYzpbx3jL+1EaITIpVtZFRy9XoSvCZ2CZlZAnuV/2U/vfLe9VXsnGCmACTXWkj/i/Braqr0t/eWYJYC3wz7Ohjk+qV6qVqI/ki/oID7CA4wTdiz+Hsj5vga9XRolOq56oHqt2j0PFB1TAp2jIDZxdxfNUzMcF9qkuqJ2KXFF9kjCf4UUa3N3RXNa8600aOCVoHCz/IjgB2HS+5WH734QlioaeLDZuCMZTNkbWoX4boCKy7l3WqWdVOdhDYte9in4px4BZ1nootPqtiliC4LOY/T/YqqMq7MMbktcsDFT4Zxuslb9OuBNGu3ySvQF+CfpxusiOCxaEq+CZFcI1PhfEuscUw6eTSnSDAJYYF4jzWyBJEx+Esw59+i9EiqEo8xNBn1Y4Qh+QeUww+/v4p6SJLEPh/RLUqeoLYbOacmA/HCsl2gqCaGhm1KCrJflfchAiebeTveNh8XlSf/T4f21mPJL8MBwYGBgYGljS/AQjYxZeZfm7QAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEMAAAAZCAYAAABq35PiAAACp0lEQVR4Xu2XT0hVQRTGj5RgFJkJQSCpIEKLiGjRKnFTmwyE3LUrqLWbRNe1LCGiIAN5uHRb6CJCW0W2KAgMpUUti3JjYoHY+Twzed55M/NGTEGcH3zw5py5c2e++XcfUaFQ2CM0OFkOR37rcivrZECNLr8t0KkeG3Qg1816ynpMtR0Ex1gdVD24M6xbqmw5wloPaEbVwW+dq0TiVkus+65uFg9YP1lrJA0MVac3gNOvWMdd+ShJXTyjOe3iWncob6Ywo6j/xSaYNtZ7VrNNOPAMnoWxmg7WZxJTzlWnwlxgDbBOkTQaMqOXdYN1QMUWSTrQqWIY0DfWH5e/q3L1SJnxmjVhgwpvRogRktxDm0iBzsTMuEfS4AsVu+5iuj7aOK/KWyFkBlbEHOuQioVImXGbJDduEylSZpxlrbD6VWw3zPjAeqLKMWJmwMRpku18yeSSpMwIMU/SgRMqhjYwgHckW2+MNUnxva7RZnSxFlwZB3Y9vBl4pxe2B0yoqHrZbNUMvPyXiaENdN4fmA2UPyBtBowedWV7SIfwZuA9Wji7PlL9bVZDrhntJLN2xSYi/CDpKIxJ4c3QdYddWRscIrZNALYtci9tIkWuGWj0qw0m8B21154ldGbgo+otyeq4puKWlBlNtGlyNjlmYHZwb+N7wuMHiXNhijVI1atgO2aAiy6O1RgjZQb472bg42nWxFpYV91vLEecIY9YB//VkFsopyMxMwD2PXKx1ZEyo5Mk99smUtQzAwPFzaAPKKwEf5ViZbyh2rMBHfluYiFSZuBaxFbB6mg3OeDN0JMAcHA+c7mcQ3xj8H4ZaeEF6CCoBPJeevnDiFXWJ5KPJeT7XDxGzn8Tm8PEYBJQx+a0llnPKf3+HQWH3k2Sz9/LJlcoFAqFQmF/8Be/1N//NGRnvwAAAABJRU5ErkJggg==>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADgAAAAZCAYAAABkdu2NAAACS0lEQVR4Xu2WMUiVURTH/xKBUNEQWJHhIog4SjS1tUTUkA5C7omjgiI4uLi4BBEEIkQ4SXO0NHzUEjXoICZGkLOIk4KD6flz7nned9797vfKHKLvB39895zPd9//nnPv/YCamv+aDtEVHxQuQXPE/hrx+GaJzkyXaN0HAxdEL0SLotsu57ksKkTHTowxZ8/4vOHjXq9FfY2nf4MjNE9kfBDtReMp0S+0VsHDVd8OSlVgTfTWBwO2APxfz0do7rFP5GD1/EoajL2MxtdF30QDUSxFzuAN0TK0bVOYwcLFyRNo7p2o0+WS3IOuZoFWg4Mh9sDF36B6gjKDX0VL0ThFzuB9aAcVOG35LJ9Fo0gbfCTahxqNmRf9gFazjJTBHtEr0UV7qIScQXYTc2M+keKuqDd8LtBqcBppg2XxGG9wC/r9PKjaNbgpGg4aF62K3kN/dyVX0bxC/HxeBrkNnkO7hYfZUPRcCjO4A10Q04roJ/Sgq2QDzQdFgfMxyO+cDDGevBxTuSrmWpTX1HdoR7Dlk7B6vocLtBqcQNoIDe6K+l08xreo8QU6T66KOYOEdzLzcy7ewE7HMtEU4SFzILoTxgYn+JNDhrBdD5GvQJVBLjDzPM3bxtophpVm7GkU493Fy5+T5CgzSOze5X5MkTPI38S9zPyIy2VJGSSMxRf9LehGP8tFT+zNKVVFM8g70zMDzXGRabYSltla02QtSrqhE/EUewa9ZGejvKedd9HUnLbPfdzrk+hhePavwZftBajJay5XU1NTU1PzL3EC4S3Kdd7v1+4AAAAASUVORK5CYII=>

[image6]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHMAAAAZCAYAAAACLBHaAAAEAklEQVR4Xu2ZP4gVVxSHj6gQUTTEgEi0XQhCLEKUBAuLCEqwUQtBsYhFwFIhQbF4ImlCSBEEQSKLCEqiYCELFharjYKFVbAxsIJiIRoQtTAYPd+eOe6Z++bOm13dlxe4H/x4M/eembl3fnfuvydSKBQKhcJI8YFqddDCenYjH8pMPMcQ7xH13tivOlX9rkzyHAr/q1jc2iRv2HymOpAmBj5X/SRW1jHVgnr2NKQRR8yx6ryN7arXQXdUq2oRdU5IPf5MlR7TmnRD9U0VOys2qB7KTEUw7LBq59sI46rq73D+vepfGfwC3idfS73Sk7VcY7GYObH8HL+q8hyOSYtxnHPtIH5QXRErw/kkL3JWdV2snMvqWdN4PVJ4/6SfVC1K8lq5pBpP0paobqpWhDRuTktzaJG0zHUhbb75RLVZ7MXkzNwq1siog8MxL39LSCOOtBjHOYYOAjP5yijD4yTP4b7bxMqIcmY+TxOVNar7Yvf+NMlr5Z7UvzigNfyp+rg6pyviwRQuQoUmxMaSYZMzc0qaWzsGeJ1oFFOqgzFALIZrvd453MyLYvGx0Ts9MQMnK83GTJ5PWcnj3XfmlthNv5WZAX2jWGEcxoqmG/+o+kvax435Imcm5Wwyc4/qqWq9WD2Io14RYriWmDbczN1i8Zvq2dNmXJO5m+m9y2Wp9xwDYez4WezG6KXqSC3CCt9kZi59GOTM9Hqk+OSF33gcyaWnuJnAhHBK7Gt3zokZ3cXMf1S7KtGYflfdVe0LcbOCL9JfArpdz86alksfBqNi5pdi12Cew9hLb9XFTL5AJl2u06pn0j+P6QSTGloHMDN9JPYQfn1ykzMtl+5wv1jQNv0iNvB3ZVTMBK7xeQfdIgZDFzObulnmLL9J/2x7IFxwPJwvl5mZWq9KY6LQZBqVeiz5GdeomclXwPKGiVyTaW4mMW2kZrK082dipE+I5mom+DKMVUUneNlNJnm3O1GdU8kXqi/eRhiMF/+XCdB30j8B2lGLsBiu7ToBclhrch0m9kL6u5jpKwhWG53gc859WbQ2zAIKyY0ZoJ2lYhsJVOy/IGemv9gUuq1xsQZMvYljNh4hhmuJaYM6T4ZzGvMd1ROxyY/zLmb2xPLbNiX64AJ2HFIYR+Mim7i4aeBrtWFuGkRyZjZtGvhLHbRpMCndNg2OSP+ze2LP5b5OFzN9vhL5SmwMRuzQdeYj1R+qB2JdB788JG59AeMZa1LGN7ojCn60FjH/eNfTpIj3JBfE9popK19lCvnEEcMxMfQ4OXxMjfLulkbRq47dxFxsmp6KpQnbpXOCbgWDMGqvtG+0++Z1LmZUGBPbPKesuT8FqDdxxBxK8gqFQqFQKBQKhUKhMDveAMxPVnnaobSKAAAAAElFTkSuQmCC>

[image7]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAAAZCAYAAAAyoAD7AAAD4UlEQVR4Xu2YTahNURTHl1BEPiISCkUJGchAGSLyMcBAMVNIJigig6eYGBhIKdTrpShkIlGkFxNhQol81COlCBHykY/1s896d51977nvvOvdK9m/+tfda++z79p77Y91jkgikUgk/kMGqcZlGqPqn6+uibVHIzJ5m4m++4TtqqOq5arhUZ2B44cktJsY1bUCJmGSqp+zzVJtcGWDNgck+DotK9eDcf90up+vzkFfhyXfviOTt8X6qmqXBtiluuvK6yR0uMnZ4IrqrSvvUP2Qngffl0yX6oHjx0DfSEJgvrvyqqwct6vFTtVNCX0PiOqMjaoTEtp05qt+0ymhjl3kYfFfk+DLiqiuLvckdMgWhwmq56pbqpHWSEIbVo8xVsJqm+FszYZBv5SwIh+p9uWru2HxXHLlwVl5obMVQZAQ42VR1OKcaon0HKShkR1WSqi7EFfU44jkO5yieiEheKMz25ysDY552N78WZ+duT1AkPClHuMl+LotsjPxfkxF0I4ddFZ1Q2of/VskzFcjQVogxc+Vhm1IJ23Oxnn9UaonaL/qiYRd1QrKBMkWFD571qreq2ZH9hiCBGtU31TzXR0Q5JnSWJD8XRZfJ6WYKsExOjgd1eF4rSAV2ZsFQbqjuq1arTqmOiP51W4JQBykInuMBQlo3+XK7LCT2e8yQeJ+x0+0WcIxfFH+4B5/lokJWBrVFQWjyN4sCBJJgSUADJbJwGYUBaPIHuOD9EXCM8Zkqdx1ZYLULsE30wcJQR9mDRtllITsBvEbioJRZDeYRO9kPR2UkLT0ltcSJsRWZ1EwiuwxPkjcPTzD8QbcU/Oy32WCFB93wKsLdQ/jit7CuxAd4SRwCdcKBgNikoqyoFYE6ankJ8SyrjgYlDluuLjr4YNkSVRbVr4slaO10SABdag0XIzx5YijdGJpIgP8pJrb3SJAMFuVODA5nOdbJX+mx0GyxIFU18O7TW8SB+AOOiWVLM8WLbQsSPZH8QPHMxtBABykTIZkDJHwgusH1UyYfHYz2ZF/yWTxeP+po0zm6WFM7dLzpc14/OSyAOnvjeT/t9Eg2VzGc16IXbxfnY2OOyVcmnb+Au38yyzvI13SupdZBseKjicZv15Ftvhl1sZU5mV2t1RPLv9Bn54yQfIfA4DPanzhoY4FXhqOsMeqqxLuBjp4J9WTwX3BVwjacHTg9J5ci+aDT59VDyT4gq/LMruHgJKao/USfGUX1cMSCy/jvFTuJX/6eHVkiu1ebIbrUu7jbRU8tFdCABZL8RcE2tlHS8v8Wg3/y8RzFC+K6jwEzsb0Nz4GJxKJRCKRSCQSiX+PX383Kn5fMBK/AAAAAElFTkSuQmCC>

[image8]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAAAZCAYAAAAc5SFpAAAEf0lEQVR4Xu2ZT+gVVRTHT6RQZJoapFCZbkIIIvyHIS6iwhBbhIEgSNDCjauCBHHrRtSFiAsJxMTauAkNggKHggzaiKSCGP5BcBEVBAYmlffTmeM7c3533sx79l4u7gcO8+bcM3Pv3O/9/0QKhUKhUCiMwMJki511MTvZMzKI5/4Rd++NuP8UMlofnQ4+5khtz4U049Fkr4vGfBjSpsmaZHuTHUz2ZkjzzBUt6+FkT4Q0g5j3RWPeDWk5qmT/ONvRSJ3Jb9KMX5FsTvDlbL/0a1QzOJDs12R/ib5oZzP5PreSvVr/RliLp1Ua80Q/YHV9TyP6O9lH9yMmD2X4Otnj9f2zyb6RZrkMfMQa/Mbn4Rn8vBfiNw7jfLJDye4kWxvSjKeT7Raty00hDRCVtCr44SfRtFdiQhf0iM3Jnk92XfKi08M/EW3xxseiGW5xPlo0H4nYxqVkP7v7SUOPpBH7MtBzKOv3zkejoEFucD5+47MGw/XL2u8h5lTw5TiX7G3RvBlxcvDud6Rb9GMxIbFLhr+7E17eJvo60Zf/4nzLRHt/JToUUbG3k73lYoDC8uxjwT8pTkq+ImxINPhOeoqfI60Ottf3xPBMnEeJ8e9qA9Gpl7uSj18q2qgQexzRKSdpR6XZyHszTHREpXXTi40ouhWcj/Tsqf2x4ibFxmR/JFsZ/FF0KrESLbsxP9kPoqMYWIP1MUBMTsSIic4IQ/ysZvK/olGn44pOgyHtjZjQl2Gi56CwPkPrFVH0Nv80eUm0DDYkI2JVmxc0+rnmRG/zR0z05aKjZKzbr0TXCH1EZ13CNIwxrF8RbQgvDkJHZ1TRGcopjA0rbeK2+acFvYuee0N0dIIorhH9XHPitvkjJjpl+Ey0x9uCEHbU1z6iX5XBzgn7PNmPybYNQkenr+is1sl0X/3baBO3zW/QaLZK84OGGavxUWCljeCeKG6bn2tO3DZ/xEQHpjeesSmSBZwN931Ezw3vto7yu4uR6Cs62y8WJmzbPB9IXlwTnSEuxyRFXyI6/74Q/OzHqahK8qJ/IbrwJCYnblX7uxanXnTgmZuiYn/q/OOKTv6UlXS/i+pNX9FpWe+5+wWiwlnBV7k0YBWNf1oLOcP264uc7yn3m0r8NtmTzsee+YLMXMj5GCAGfxdR9Duizy0VXYQZ44oOVsYu3bJ0ic5hxOXolEFhqGTmLHqtx3rLNGHaOS7NEzbm84vufq3o7sPmeXg52e8yEIoYhPIxQAyNvwvq0wvJHE5dkC/vNsYVncbDyEEZ/ft60yU6gn8nzaGWAxsfz0fFw5lrMt3DGfJmCjohzbKeFf0+I3c4YwcpXYczxNhOYBgI4oU0kXin5QF9RD8ZE2RwQMb3+fVVJzbnRqOCyBCsUDmLczhz6J+ie9AzokeMIxXoAalkZhnNYm9hT0+P3VUbjfO1RoRCDPVBDNdcjKeSZr48b/XEFhfxoa1eiWUdEf3RToueqP7vsMCjILQ+jkQfdpgC+COFtUdb4ySGP1q6/rwpFAqFQqFQKBQKhUJhXO4BnTxux+EGuUQAAAAASUVORK5CYII=>

[image9]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAH0AAAAZCAYAAAAc5SFpAAAEZElEQVR4Xu2ZS6gdRRCGK2hA8YVECAGRJAgqIiJiJBsXoqKYZOEDBMWNC0XcaMBAyCIbl0oQcSEJwY0udCNREAzkkLgQ3Kj4AhUjCIKiIYJiIj7qs6Y8dep2z8w53oeL/uDn3Kmumenuv6e7Z65Io9FoNBqNOdig2hQ0xHrVRpnmc7wuHEeRt6xwo1tysOMJ1eZwfI7qOtV5Iebx21QvqXansrXiWtVTOdhxsVhdX1RdkMocch4Ry7k/lZWYqP4Kou/6OCWz+TeqLkyxkp6VcYNqCc+pflL9IXahPbPF//KjzN6Q/KdnMkQuEWvAtu6YQfSnLM1bTR6Teruo69FwzN/EIrSFOG2D3MY+PlK9oDqj2p7KnMtU+8TquDOVAaZSNklx+Eqs7IZcMMTNqvtUV6i+kXLnwEnV92JmfyHlEcaIppGY7Xym+iEcrzbcu2T6+WID8s4Q429ilAG/b3fxCDlHUqzEB6pdYvd/PpU5XPseGTb95Vyg7JX+aw/CxftMpwFMOzUo+0V1V4pTWSqWl4HV4CHV1VJuF8c8KXGN9D54tDsmh7rndZQc4kN4n/0u5fwtYoMKsxcxnXpSdlhmH7TR/FfTveI555kunjtupblS9bnU20UnTsTWTudS1fuqg92xD9iYA+SUTMx4n70nln/ubPE/pjEzLmo6A4ay23PBWGqd43yq+lBsQ8NywM1eC+X+VGTTa/GV5l2Z7qJzuzBx0ikamuP8lkyvxTNu+jVie6Lct++I7RHGmH5crN8R0/qXYgPhqmnq/JQ6J0IZu1zngFhleL2Amrm1+EqyWaajv9SubG4tzm/J3Fo846bzhL8q9sT7hhDYA8EY078W63/XG6qPVQ9PU+en1Dl9+Og9LLae1MytxR3OfVBmG9Sny+20KveKTb9OqV3Z3Fqc35K5tXgmLoksb5zDdA5s4Hy6H2N6aXr3fVR8u5iLUuf04fkTscbzHlwy101nkJRYbtNZguIaV2oX7+N01ETKpr8ltvEkp2TupIsPbU7zPohzvhUz+5UQX9R07k9dKX8glY2i1DkOo4hXtSdDLJvuFb8p5ACvE8QZ6asB9+oT9QY68YTqou4YeGf+RJZu5GIOkEN8iGz6GbHztohtwpxFTQevY8m3QfpMp+Jc2KcmwNxfVfu7YwYGaxZPbcSflrXCp8Dcru2q71RbQ+x61c8yNYocjIo5QA7XHIL+jEayhtMX3JdrO4uazuBh5qCO8Xqj6TMdQ6kwU7HjDeATZ4zljzMnZW0/ztRML32c8Q8pQx9nyDmSYiUwJBrpJnFNvweMMf31XCA2I1HGsucb6lH4mpvFAPCpEB5X/aY6JLZROq3aEcodys6KvYMeE/vEOFeFlom4EYuKbbpbbEDs7cTgvDWUO+TQH+TwW8qJTGT2npzvswf7DcwHNzuLXOqf41lvin1RXVE2iI0q1umakfzDhYqQxzv9/x02dfwjpa9N5PCPFnLuSGWNRqPRaDQajUaj0WgsB38DyxFuSiY7w5EAAAAASUVORK5CYII=>

[image10]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAZCAYAAACYY8ZHAAABuklEQVR4Xu2WvytGURjHv4qiSFJkUcqibAZZTAYLA4pS/gIz67sYSVlkM1mUASXTWwzKapBNsRiYDAY/nq/n3u65z3uv97znLobzqU+v9z7n3Hu+58frApHIv6BDHEocTL43oxtZn36xDdo3vebKWjDsPG0vFjAhfju+5csNrCPfvg4N9W6uW+/FNXiwI76Kn9COm/nyn8yJF9B+vabmcioei4/Qmbakg7Ysi1/iJTR0KZPikjgMfUirIVahA5gxtRSuLtscovUQPeIVNEjZ/XPw5iEhOENb4pM4ki//sgINEhKiUzyH1uZNrZAqIaagD+KMu3AQJ8nfISHGoeftThwwtUKqhCAcBA+qSy2R+ITgtqZcvX3xRdxw2jWlaghuJ3c2edDPoLNJfEIcGD+g9+B29KJqiFnoAeQn2YPOaIpPiCI4Hta8VqRqiD7xVjwS28Vr5A96aIgxaI0r3ZSqIUgN2a8UV8LdBqEh2L7ovBUSGsIdVBeyB9p/fqEhuCVZu7GFIkJCLKBxUGUDCgkxKj5A3yYWTS1HenCsZQ8k9t2JpttqF3ouUjh427YOv3enZ3EbkUgkEokE8gOEjp8kUYaFTgAAAABJRU5ErkJggg==>

[image11]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAF8AAAAZCAYAAABXTfKEAAADAklEQVR4Xu2YT8gOURTGH6HIv0SkbPzbKQshZUtKZOGLYmfBgoUsxOq1sLCVKNnYULKTkqTXFqVELCwQKbJQKMqf83xnjrlz5r0z881rJov7q6d555y5d2aeuXPunRdIJBKJRAdMEy0LNLeYHslS5Mfz90wXMy2C9j82x0WXRDtFC1yuT3ijR30wYL7oIPRaJ0RziukSNPu3UxVrUTz2q2h9tvX9hHohmo0pclL0JNg/AO3scBDrGhr4BfUGbRTdRT44uOU+43VwpJ6H9r3Z5YzFovuIXwMHJuMnfELYC83d8YkqnkEbLcn2l4veih6KFtpBHTNDtFu0CvkI83BU3RZtd3Hu30T9qKP5u0SvROeKqb+wr2uoN59bzzxo7pdPVHER2shq4UrRe+hD4Ujom5j5HG2Ms/aG0FTGD7m4h8exfGyBHr+vmJ6ED5f9tzF/FuLtGsPRwQ4GLt4XMfOvoDhIDL6djF92cY+Zz1LF428U05OwLHECjZlYZb7NFU99oglroKOBHVx3uT6JmT/EaPNtQh26uMfMJ59QPgfnAZtL6sw/K9qTiZ59E32ALgZa8SbTI9EOl+uTPsy3uh6u6gbB7zrzOalytWV6LPou2oQxl55cuz7IxN8xBiheQJWOaZNG9GE+6/pz5GWGEy3LmlFn/qiyQ6zdWA+AqwF2csQnAgYomxzTvzCfS8oq82+5uCc0n5yBrupWiK6iOAG3Nd/KGftsBGd/KsRWFnU31AUx823C5ZIuhCsyxptOuAZrPNvRdFvlGG3Nfw3Nh+eJEn79hfBGGIuth7skZj7NYl3lUjhkHfKv0CpovjeN5/mJ8kfXKE9InfnWrtE/BLas+hHE+ECG0Bv1F9UHMfNjH1lcGjf5yOLHozeNZYfn8m3rzN/vE8Jq5A+zMRtEL0X3oPWZHXzGmJNGC+yGvXyN58Ph630q234spkuEb7fJ3pKt0Hs3/HGUvVU2KGJ6B327psx00Wmo+RxZ/Fr7X+H/QBOiC6Jt0D/iEolEIpFIJBKJhPIHyKMAUpxG/KAAAAAASUVORK5CYII=>

[image12]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGkAAAAZCAYAAAAyoAD7AAADs0lEQVR4Xu2YTahNURTHl1BEPiIfYUBSogwkETOKAQMMhJkByciAyMAbmBgYyEjqJcWATCSKwY2JmBj4KKWeCQOhhPJt/+y93l1n3XPuPW73XWT/6l93r73vOWuf/9lfRySTyWQy/yHjgmYnzQgaXawuRdujKUk2puLaPYUEH/pggsRPBZ0Jmufq+gU5rJOYw0DQqGL1MMRPSGy3KJXbsSnoh9GTYnUBrnVaiu3PJdmY1+egQekB3yRe0HMr6K0pHwz6Lp0730smB50NGm9i5IQRFsr0Q9maymNNrIpDQfckPoMxrk7ZE3ReYptGseoXDYl1jCIL+d+WmMtmV1cbRpG67iHG26PMlPi2LTGxkWZ30BwX2x/0ycV4eW6YMqZSXm9iVWASor+LXZ1yJWijdDZpoovDFol113xFHdYGPZDmDSzLU4zELAxvbtbzObcC7scItqN3p0RTFEwk1wMmBjz4R0HTXdxDO0bQ5aC7Et9+Dy8GBnRjElN11f86QkK7pNwk5usPEs2yHA96JnFU9QPuR26YpTB9kLuiLxQ5WzDzXdAyF/dgEmwP+hK0xtQBJi+V7kyya9leV9eRlUEL0++GtJpE4mUmVcVHEu5Hfuhr0Nxi9fAGwJtUFfeoSUD7IVNmhF1Iv+uYxEu/LWmfxBF/XbpYxxnODVPm999s0uqg99I0aocUt8tVZlTFPdYk1jr7LOZLc62rY9KgxE2MiryHgiZpw7o8luLi35DemcQbY5Nsp5PSOio8PGDaskujLTtONcu2KTOjKu6xJrH28B+mN2CdWpV+1zHJT3fA0YW6p76iCkaRnxsb0moSi3CZGXTotVTvgnppkp7fppkYI+izxHx1gdddlzeDMtMNC3c7rEkLgl4GHUvlm9K8T7cmgX+x2qKLbJUwBujgx6AVqaxwsO3XxoFzRVnHNkg8d+iLon1iq2vhbPM7GwdgDboozV0eI0vpm0llPJfWC5AgMXZIygSJ043t1EjCvX1eoNtl3VpTph07QQuH4EHpvGjTH/tweQG53hspHm67NUmfZVlfalNmEhCzh1nOI0PSv8Ms93klrecWdqUvpPjw/WGWh9WQeofZI9L6cOm7PYtBHZOmujjT8+FUxwv+25R9d9LpDlgv7ktcP5g6SPqoqe8HugYh8iAfOjvLNpJo5KUkvlKQK6OoHbqxsFKuSnNdUnO8eH5lz9CKvO9IvY+3XcPF9aOlXcD7CQboLs9/fbAQH5DY7k99DM5kMplMJpPJZDL/Fj8BZo8uPPMUV3UAAAAASUVORK5CYII=>

[image13]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFMAAAAZCAYAAABNcRIKAAAC+0lEQVR4Xu2YTahNURTHl1BEPqIk6YkiMlPMERmQQpSSMpGUokgZMOSVUAwYyIABYmBgopwMKKZKkXqkFCHFgPKxfu2931lvdc65H+6Vm/2rf++ttde9Z++1915nvSeSyWQymX+FbaoLqhOqxW7Mckh1UbVONdGNJeZKiDsnIe6/YaXqrWpctNerPqnuqaanIGWL6oeUCRxSPY8/LcSR7FZxA8cE76jgtuqB8x1R/VIdN75nEpJs2a86I+VGzJEQt3w0IsB3ETdwcMXOq26plrmxKjiVLHat8c2MvlfRJlnYnFbLCtVPCZ8l5rKEuCk2SPkqIW6gWCLhKrKoduHEsFB7pX0yp0b7ymhEYGH0H5QQU0TbkzasjhkSDsEa1WTVJAnlZ5FqvInbKPU1mPlT7w+rZqt2jB1uj1WqR6pjqllurFu4vix+b7RZaFUyrZ/fSX5V0ur8iSHVsOqd6q6EhMJ1CZ/Dtz36FkSfTRYHaLexOUyFsVvCjq1WfVYdcGN/wnzVC9U1KV8i/U4mUDKIuWN8O6PvqJR1GfxcsDm1iQ2q+8auZauEHWRn6lqTbkm18Ybz/81k2qTwOz6+2+Ln8i36vkio69PMWCObJUyuH8mkrTkt5TVL8Jb2C4CUTPpJYl5G29NJMjlViXaTuUv1PfoRt9V+TyNccVoQTqhfeLdQ8D9KuUE8I9Xg9AK6Gu3E0uj3LyB7JeFD9DdBMnnr8zPRlMybzsdc8XE6GX8/drg90gvopHT/AhqSUMBtEqhXhbGZ4BNjA7s/opoXbW4LcXQDFnwjzufpNJmFsUmi7ak3SevNq4Uk8MbjqPsHt4KWgjpzScJfLkm0M/YqVTXtNPe9ato7rZmFsZmXfSZ9b0/6Wh5M3aNpp+9sBaeByVXJLoyE0TI9Ve2TUJdInIc4WhXiuC3EUQ6a8M9lk5D1Mc/C+ajFrPeh6qzqjeq16rE0/3+hY2he/UnqBXsknFzKi22oLZQb4k5JiOs36S8uEutPcSaTyWQymUymmd9altZk2UqGWAAAAABJRU5ErkJggg==>

[image14]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADEAAAAZCAYAAACYY8ZHAAACG0lEQVR4Xu2WP0gdQRDGPyGCQkQkoFgGgiAIClbpg6TRQgMJGmxtrA2kMoVlIGAj6bSJhWChgliEBwYRbS3EzqAWSWGjRYT8mc+55c3Oec99R4pA7gcfeju7e/Ptze4+oKLin6BV1JupJ3u+j4eoj3kkaoGODW1WjDXFkOi1a2sTjbg2y7Dot9FlHM4xi7h/DWrq2rV7HYumkcAM8oO/Rj2KGRVtQ8d0uphlQ7QmOoWutCe81/NS9Eu0AzVdCBP5CZ3kSjQpao96FMOxU9Cxz1wswNJgn2U0b6JDtAs1UjT/LUyk5hsT4Viu0ILoTPQ4Dt/yCmqkjAmW9RY0NuZiEX/DxFPoi7jiFiaxnv1fxsQAdL8dibpdLIKJXIhWoKt2AC2vlBMimCBMghvVMp+JpJh4kYl5LIm+ieZMv0LCngjQMZ1PmLYirAmWk11NbvRN6GqSFBMfnX5A50hZ0BzhxGpYh4hNPIduQP4li9AVDaSYuIs30FjSF7EwOQ7kBI2wJrpEh6JPogeiL4g3elkT/dAYv3Qh30Xnrq2MCTKP+inFL2HLoKwJ9mfM77cIdrhxbW+h9chTpxE0YZPi/RJe6C+/siZYkozt+4CFEw+aZybCW5i37H2X3jjySRUlVMbEE9EJ9OBpeNBwxVZFn6Ev4mR7UY88/rcTFcrqA3RfBMKcVjWk/XZimb9HIqzdd9BjrS97rqioqKj4v/kDmYqqP1Y4AZ8AAAAASUVORK5CYII=>

[image15]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEUAAAAZCAYAAABnweOlAAAC0ElEQVR4Xu2XS8hNURTH/0KRN0UmXgMSZSBkIgMTSRkYiDJgYGJEMTG4E1NJMjAzpiTEQHy+0VfGUh55ZKaYoCiP9f/WWffuve4+Z29HKbV/9a971t777L3+Z78uUKlU/nMWi1YG4nOO5YjbzBAtczFqhWh206Y3fPkuH2xg2XrRVdEV0by4eMhM0R5ovdOuLMU10S8n9tUGE/X154smEvFQn6BGFXFB9FH0A9r4bFw8Dd1+KFraPC+E1mWbkEXQzrc3z0zup+jMsEY7TOyi6JvokCsz5ohuir5A+/cw6bdQg/i+kDUYmZNlh+igaBX0hSlTdouOQWeB8QLaydogdlJ0GfGXfib6EDy3wSQOQxO6CzXAs1l0H3lTOPtS2Kwpxl6YMuU89GUcrHGkiVn9rdDB7h3WUGx5pJIMoSn7Reug9QdRqXIHaszfmtK1PCO6TNki+io6EMS8KUyIzzQnxAzlXtCFmTILWv9JXDzNbdFc9DOF7djGL/lOukxJwWXBTngSELZLmdIW95gp5CnGvyiXqS3VnCmT0C3B9BJqxoZR1TL+1BQOioMz2pJvi3tCUwbQNmYC4eZrJuVMeQ09/Uy3RN9FR6EzpphSU1aLnov2uXhb8m1xT2gKB84NleJv7iPcT4ycKanlQ6wdT8kiSk15IHrng8IppJM3Uza6uCc0hXDP4vG8EzpzKKOvKTwo2K7tyB+jxBTeV14hTtDuA7bRbgvKyKUmXrrRGlw6bDfA6NQx+prCONt15RiRM4UXsMcutgSjRDglp6BfOIQzK5WAh6b4vnnxo/yX7WvKe2g7zr4icqZwINcRb2D3EC+X1OXtDcoubwsw3jdNTs2ynCk3oEd7iB3JVPb/kK15L76cnRCbdinZ8jF4v+BOf0L0SHQO3YNIvdtm3ybocjXMDC+OYSIRD/UZensPP9g/g38F2Dln0nFXVqlUKpVKpVLCb+i36iqvk0EkAAAAAElFTkSuQmCC>

[image16]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAAAZCAYAAACCXybJAAACiElEQVR4Xu2Xz6sPURjG37tQ5FciP4pu7JSyEFJslJsSGynFioWNnaLsLFnJwkJKFq4/AGUhTVmyJEWKIgshirLw4/k459zvO8ec73fc7725fc1TTzPnOWfO874zc945Y9ahQ4dRxZh4TrwiHhIX1runsMTCmMtWHtMGa8RT4iVxIuvzOG6zFBMX3HftG+JP8aDTwEfxnmtzjva3+G7Bc15sj4vP4jFhm4W5l8Y2R/zQPaYd0xfxmGuvE5+Lr8X1UVsg/hD3pkHxHI2+tlhlIahNmc5Nvujady3M7YHfLev5DRUThnC+045E7Uxsc3xhIegEXtFX4gmn9QNL6JqFp5G/htx4nyTe+Hngh578horpjfg10/Kkr4uVuCgNEJaJD8WrTusHrq0szJXjrQW/BM4r1wb4oSe/mYhpCty5p+JjcaX1goXeoKSXkJ5CU9LoKWnmakra6yXvkj4QPF0m3xnbpYlKeglzNulxC+trn9NKE5X0EuZk0umzsDXTKTrolTUb3LF6ESyBZUPhGZQ0fv2Sxm+mYvr97fQVkwnShAT6QFzc67YV4hNrXzRSQOwDxupd9t7+LGT4eeCH7gvZtGMigNPi6kynCu6P5zssVNgNvW7bLH4WtziNufZY+Tt52MK8VFkPknnp2t8s+Hngx9JLfm1jagQ7LybjSXv6i5s2AgcsBOsTJGG0m07zGGZzgt+gzUlTTI1gUBMrq68Xihs352zkO3G36wdrLQTyIdM9TlrYivJJPC9+EjfWRgTgx1rHiyN+OdrENDQoIGzs+VFIe+ccrLHbuZhhuYWfiQvi9qzPgx8N/Cas7NcmplnHUXEyF0cdj8RduTjKoHr/s1esQ4cO/x9+Aag5y1xHq/X8AAAAAElFTkSuQmCC>

[image17]: <data:image/png;base64,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>

[image18]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAZCAYAAACPQVaOAAACaklEQVR4Xu2XO4sUURCFj6Cg+EIUF2ERNDMyMJABMRAFQTRwNxAE002MFcQ/YKCBiIiYmOgfUBDXYMBkwUARTARhFxYMRAXBhUF81KGmZqrL+2hQNrofHJip032nTve9t3uARqNRYYNot2jfWNu6dpJNohlMz+F3yr57cex/gg0ej0XHDtF90V3R1uBFGG4o+u102R+Q4Cu6xx8Zy9dSuiTagh7cEn0R/YSeeLVrT2AjL9x3fmatBu/CW+jYI9Gga0/YI7oOPe5s8Ahruf5+Qb3q7DkqmhftF60gPRivGgc87Wr8zFrtijLsG9EytKHbHXcKxzuPetiU9xLqnYxGDjaVC8vaB+h6Muz4BVdLYWGPiX5Am4ocED1DOVDJewr1zkUjRynsQ+j689Nkl+iV6IGrpbCwO0VL0KY2do7QC3YH5UAlz9b63mjkyIW1jYbyYXP1iIUlh0Sf8fdvLEIvRimQeTegy466J1oTXYFunr1Zj7C8o4+hd5jhDNul+4R9Dn0imF6LnkD3nt6sR1jCdc+mOW0JNyab1n3Cpjz2TI93mI/PKrmwfJ7yMTNEOiw3h82uHolhCRtbhYZ85OqlQCXPlgfH5GZXJReWcIPi9r7d1fhcfIf+G5RnBG3cdmGjFKjkWe/foS8hVUphB6KPooOudlj0DfXBbVwP1ygb55gc2ygFKnkXoF7cC7KUwqZeKvhM4w/UXipmodPLwzvKGu+qP78UyLyL0RDeQ725aERscUcxOC+AcQY6Ta6N9Ul0wvkRW9N+TD/NTmG6vixIVN9345vo9vpf4GbFPwF85eO/kUaj0Wg0Gmn+ANXtx8v8knDBAAAAAElFTkSuQmCC>

[image19]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFsAAAAZCAYAAABeplL+AAADFElEQVR4Xu2YTcgNURjHnzcsRL7zkYXIRrGysGQhscCChVI2FkqyQKQs3i2lhIVs3iSJlA2SLKZYkIWNUqJepawkC4p8PT/PnO65zz1zZ+6ke+/i/Orf3DnPMzPn/GfO1xXJZDKZTAXLVCtK8buOudLJRxOqWa4saHF5zVhyQqwxVRxXXVVtE2tgChpJzkWxvDq+qv5EWt8d7iHORdR3Y6Lc64BqtoyQDapXYpX5qXovZpZnj+qXdAxepXpTHmPIwehAVV6K56qHqmeq+S4W2Kq6I1bfVD13isVO+YDyWzovZyQsUu0W625UsMrs16rPruyI6oJYNwaGAHL8l0kDyaujUO0XMwVTPTznsuqa1JvN0fNELJa699CpMptGUsnHrpyuG4whZ0osZ06cJDZMkFdHIfbV8awP3aF/7FNdkvZm3xeL7fKBUVBldjCARsasKcuPieUU0psDH8Xy6ijE7vNd0vl3Vdulvdn0OmJLfaAOLkg9zFM1iaWoMpvzlNlxOb+51ucA5SnzPIWY2YfE8uk5MZPlsYnZZ1V7S11RfVOdVM3rpDZjs9gN0ZRqeXe4C1/hfoyL2avFhpHJKMaEGeaCJmY/Epuog16q7qk2dVLreaA6HZ0zwd0WG4cmonJYq1riyvoxLmYDwwXjPEfaxVgdaGJ2ahihfcT4wr1XSW5J71qRoYIl15mojEnqenTehCqzWWX0M5v1NDnvpDcH2pi9UOyam2Jf+tOyHNqavU71SazXcM9amIxSsGD/oTqq2qJ6K7Z+HoQqs8MEecOVU3nK4wmSHP/V0MBBzQauwZiwCgm0NTv0PlZHjYbXuglvgaQr0YQqs4EGvHBlO1TTqpXlOaaQw1cZw7XTriyFfzYbHK4tpHuT09Zs6kes36ZpaPQzO7WpIf9/bmr8s4M5bJ5impjN5sjDTpYYu+GRELoWlfDCzACG0miGpsOqL2IvwEMO8wc5LL/IY7jph/9vpBAbTngmL2lmmRdM9iK3yX8j5yX9gsaWg2JLKZZQM1wswNafnHMy4FIrk8lkMplMJpMZMn8BWRj/hDOJUpUAAAAASUVORK5CYII=>