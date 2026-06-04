# SIU 项目 UI 组件及样式规范定义文档

本文件旨在整理并定义 SIU (Should I Upgrade?) 项目中的 UI 组件、色彩体系、字体排版以及配色方案。通过整理写死的样式，为后续将样式分离、支持多主题/多配色开发提供基础参考。

---

## 1. 颜色与配色体系 (Color Palette)

当前项目的色彩大多基于 Tailwind CSS v4 预设值或已抽离的 CSS 主题变量。整体风格呈现**社论式 (Editorial style) 暖色纸质基调**，局部配以靛蓝色的强调色以及红、黄、绿、蓝、灰的业务状态指示色。

### 1.1 基础背景色 (Backgrounds)
*   **主背景 (Paper Light)**: `#FAF9F6` 
    *   *用途*: 整个应用的主背景色、星图 Canvas 的背景色。
    *   *Tailwind/CSS 变量*: `bg-paper-light` / `--bg-paper-light: #FAF9F6`
*   **侧边栏与表单控制背景 (Paper Aside)**: `#F5F4F0`
    *   *用途*: 抽屉抽拉栏背景、设置表单内部底色、代码块底色。
    *   *Tailwind/CSS 变量*: `bg-paper-aside` / `--bg-paper-aside: #F5F4F0`
*   **卡片底色 (Paper Card)**: `#F1EFEC`
    *   *用途*: 结果页面的左侧“评估印章”区域底色。
    *   *Tailwind/CSS 变量*: `bg-paper-card` / `--bg-paper-card: #F1EFEC`
*   **提示/警告高亮背景 (Alert Banner)**: `#FFFEEF`
    *   *用途*: 设置抽屉内部顶部的警告提示框背景。
    *   *Tailwind/CSS 变量*: `bg-paper-alert` / `--bg-paper-alert: #FFFEEF`
*   **常规块白 (White)**: `#FFFFFF`
    *   *用途*: 主输入框容器背景、结果页右侧详细报告区域背景、下拉选择框背景。
    *   *Tailwind/CSS 变量*: `bg-white`

### 1.2 字体与文本颜色 (Typography Colors)
*   **主文本色 (Charcoal)**: `#1A1A1A`
    *   *用途*: 默认的正文、主要标题颜色、主操作按钮背景。
    *   *Tailwind/CSS 变量*: `text-charcoal` / `bg-charcoal` / `--text-charcoal: #1A1A1A`
*   **次要文本/辅色文本 (Charcoal Opacity)**:
    *   `text-charcoal/80`：用于卡片列表正文。
    *   `text-charcoal/70`：用于详细说明文本。
    *   `text-charcoal/60`：用于指标表项的属性名。
    *   `text-charcoal/50`：二级辅色，用于小型副标题、输入框占位符提示。
    *   `text-charcoal/40`：表单标签提示、页脚次要信息。
    *   `text-charcoal/30`：极弱的视觉修饰（如指向箭头）。

### 1.3 强调色、边框与装饰色 (Accent & Decoratives)
*   **品牌强调蓝 (Accent Indigo)**: `#4f46e5`
    *   *用途*: 设置按钮、切换选项链接高亮、Canvas 中节点与连线的主题渲染。
    *   *Tailwind/CSS 变量*: `text-accent-indigo` / `bg-accent-indigo` / `--accent-color: #4f46e5`
*   **统一 UI 边框 (UI Border)**: 
    *   *用途*: 大部分卡片、区块的分割线条、主页面分割界线。
    *   *Tailwind/CSS 变量*: `border-ui-border` / `--border-color: rgba(26, 26, 26, 0.1)`
*   **细微/轻量 UI 边框 (UI Border Light)**: 
    *   *用途*: 列表项目下划线、不突出的局部细节分割线、Canvas Blueprint 网格线。
    *   *Tailwind/CSS 变量*: `border-ui-border-light` / `--border-color-light: rgba(26, 26, 26, 0.05)`

### 1.4 业务状态指示色 (Status Colors)
用于根据审计结果动态展示不同安全等级或评估状态：
*   **是 / 强烈推荐升级 (Yes / Upgrade)**:
    *   *映射变量*: `bg-status-success-bg` / `text-status-success-text` / `border-status-success-border`
    *   *默认色彩*: 背景 `#f0fdf4`，文字 `#047857`，边框 `rgba(16, 185, 129, 0.2)`
*   **评估 / 谨慎测试 (Maybe / Conditional)**:
    *   *映射变量*: `bg-status-warning-bg` / `text-status-warning-text` / `border-status-warning-border`
    *   *默认色彩*: 背景 `#fef3c7`，文字 `#b45309`，边框 `rgba(245, 158, 11, 0.2)`
*   **否 / 暂缓升级 (No / Hold)**:
    *   *映射变量*: `bg-status-neutral-bg` / `text-status-neutral-text` / `border-status-neutral-border`
    *   *默认色彩*: 背景 `#f8fafc`，文字 `#334155`，边框 `rgba(148, 163, 184, 0.2)`
*   **错误 / 警告中断 (Error / Danger)**:
    *   *映射变量*: `bg-status-error-bg` / `text-status-error-text` / `border-status-error-border`
    *   *默认色彩*: 背景 `#fef2f2`，文字 `#991b1b`，边框 `rgba(239, 68, 68, 0.2)`
*   **信息提示 (Info / Message)**:
    *   *映射变量*: `bg-status-info-bg` / `text-status-info-text` / `border-status-info-border`
    *   *默认色彩*: 背景 `#f0f9ff`，文字 `#0369a1`，边框 `rgba(14, 165, 233, 0.2)`

---

## 2. 字体与排版规范 (Typography)

项目引入了三种主要字体系列，用于构建不同维度的视觉层次：

```css
/* index.css 中定义的字体族 */
--font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
--font-serif: "Playfair Display", Georgia, serif;
--font-mono: "JetBrains Mono", monospace;
```

### 2.1 字体族使用场景
1.  **无衬线字体 (Sans-Serif - `Plus Jakarta Sans`)**:
    *   *场景*: 全局正文、按钮、卡片辅助文本、表单输入框输入值、提示条文本等。
    *   *样式表现*: 现代、易读、规整。
2.  **衬线字体 (Serif - `Playfair Display`)**:
    *   *场景*: 巨型品牌标志 (`SIU.`)、主搜索栏输入文字（斜体）、结果亮点大段概述、主判定的评价文本。
    *   *样式表现*: 经典社论感、学术感、优雅沉稳。
3.  **等宽字体 (Monospace - `JetBrains Mono`)**:
    *   *场景*: 版本号标签（如 `18.2.0`）、时间戳、代码块预览、网络节点标签、页脚微型提示文本。
    *   *样式表现*: 严谨的工程感、高对比度。

### 2.2 字体大小与层级 (Font Size Hierarchy)
*   `text-7xl` / `text-8xl`: 首屏巨型 Masthead 品牌标志。
*   `text-3xl`: 状态报告大标题（如判定结论）、Loader 的动效文字。
*   `text-2xl`: 侧边栏/弹窗大标题、头部导航 Home 标识。
*   `text-xl` / `text-lg`: 行内关键输入、结果大段引文、历史记录库名。
*   `text-base` / `text-sm`: 常规表单文本、参数配置项正文、通用描述列表。
*   `text-xs` / `text-[11px]`: 二级导航、控制开关标签、选项卡字重。
*   `text-[10px]` / `text-[9px]` / `text-[8px]`: 审计时间、等宽标牌标识、版权声明等超微辅助文本。

---

## 3. UI 组件清单与样式细节 (Components & Elements)

### 3.1 基础容器与框架 (Layout & Core Containers)
*   **根页面布局 (Root Container)**:
    *   *类名*: `min-h-screen bg-transparent text-charcoal font-sans flex flex-col justify-between selection:bg-charcoal selection:text-paper-light transition-all duration-500 overflow-x-hidden relative`
    *   *细节*: 顶部配有主文字色实心装饰条 (`absolute inset-x-0 top-0 h-[4px] bg-charcoal z-50`)。
*   **头部导航栏 (Header)**:
    *   *类名*: `p-6 md:px-12 flex justify-between items-center bg-transparent z-40`
    *   *细节*: 右侧采用 `text-[11px] font-mono tracking-wider font-extrabold text-charcoal/60` 的面包屑式菜单，项之间以 `opacity-30` 的 `|` 分隔，包含多语言切换选项（`bg-charcoal/5 px-1.5 py-0.5 rounded-sm`）。
*   **页脚 (Footer)**:
    *   *类名*: `p-8 border-t border-ui-border bg-charcoal text-paper-light`
    *   *细节*: 包含版权与证书信息；右侧设有状态指示圆点，带绿色阴影呼吸灯效果 (`bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]`)。

### 3.2 动态星图背景 (VersionLatticeBg)
*   *载体*: `canvas` 元素，绝对定位全屏覆盖 (`fixed inset-0 pointer-events-none -z-10`)。
*   *网格绘制*: 间距 45px，线条颜色使用基于 CSS 变量的 `--text-charcoal-rgb` 灰度通道以 `0.02` 透明度绘制，线宽 1。
*   *连线*: 两点距离小于 190 时，绘制淡蓝色连线（基于 CSS 变量 `--accent-color-rgb`，线宽 0.55）。
*   *节点*: 包含内外圈。外圈为呼吸环（`rgba(accentRgb, 0.08)` 或 `rgba(charcoalRgb, 0.03)`）；内圈核心为实心圆点（`rgba(accentRgb, 0.45)` 或 `rgba(charcoalRgb, 0.2)`），半径为 3 或 5。
*   *文字*: 采用等宽字体偏移渲染 (`rgba(charcoalRgb, 0.25) 9px "JetBrains Mono"`)。

### 3.3 首屏输入区 (Landing Container)
*   **搜索框卡片**:
    *   *类名*: `bg-white p-6 md:p-8 rounded-sm border border-ui-border shadow-lg space-y-6`
    *   *输入线*: 底部通过 `border-b-2 border-charcoal` 形成下划线，无边框输入框使用 `font-serif italic text-charcoal` 格式。
*   **模式切换器 (Timeframe/Tag switcher)**:
    *   *类名*: `bg-paper-aside p-1 rounded-sm`
    *   *按钮样式*: 激活时为 `bg-white text-charcoal shadow-xs font-bold`，未激活时为 `text-charcoal/55`。
*   **快速审计触发按钮 (Popular Sandbox triggers)**:
    *   *类名*: `px-4 py-2 text-xs font-mono font-bold bg-paper-aside hover:bg-charcoal hover:text-paper-light rounded-sm border border-ui-border-light transition-all`
    *   *悬停动画*: 鼠标悬停时前景色与背景色互换。

### 3.4 加载指示器 (Editorial Loader)
*   *进度线*: `w-72 h-[2px] bg-ui-border`，其内部装载动画元素 `bg-charcoal` 进行循环滚动。
*   *动效*: 使用 `AnimatePresence` 对 LOADING_PULSES 数组内的社论短语进行淡入淡出及 Y 轴位移动画。

### 3.5 结果展示面板 (Upgrade Analysis Panel)
*   **左半边：判定徽标 (Verdict Shield Banner)**:
    *   *类名*: `lg:col-span-4 p-8 md:p-10 bg-paper-card flex flex-col justify-start text-center`
    *   *判定印章*: 双层圆环结构。外圈为 `border-ui-border` 圆，内圈为虚线圆 (`border-dashed border-ui-border-light`)。底部压盖印章微型徽章 (`bg-charcoal text-paper-light text-[8px] font-mono px-2 py-0.5`)。
*   **右半边：详细报告栏 (Report Body)**:
    *   *背景*: `bg-white`
    *   *核心亮点 (Highlights)*: 使用 `font-serif text-lg leading-relaxed italic text-charcoal` 展示主要升级成效。
    *   *安全修复 (Security Patches)*: 使用破折号列表，文本显示为强字重无衬线体。
    *   *破坏性变更 (Breaking Changes)*: 使用带警告淡黄色底的边框面板包裹 (`bg-status-warning-bg/50 rounded-xs p-2 border border-status-warning-border`)。
    *   *版本流明细 (Chronological Breakdown List)*: 可折叠风琴列表。未展开时为白底边框（`border-ui-border-light`），展开后内部详情区域变为 `bg-paper-aside border-t border-ui-border-light` 灰底。

### 3.6 历史账本抽屉 (History Ledger Drawer)
*   *滑动容器*: 视口右侧绝对定位 (`fixed top-0 right-0 w-full sm:w-96 h-screen bg-paper-light shadow-2xl border-l border-ui-border z-50`)，配以黑色半透明遮罩 (`bg-black opacity-40`)。
*   *列表记录卡片*: 鼠标悬停时，标题文字转为斜体 (`group-hover:italic`)，同时原本隐藏的垃圾桶删除键显现 (`opacity-0 group-hover:opacity-100`，删除键悬停时呈现 `text-status-error-text bg-status-error-bg`)。

### 3.7 API 设置抽屉 (Settings Drawer)
*   *滑动容器*: 视口右侧绝对定位，采用 `bg-paper-light` 纸质灰白背景与 `border-l border-ui-border` 左侧边框。
*   *警告提示栏*: 顶部提示配置信息的黄色警告容器 (`bg-paper-alert p-3 border border-ui-border text-amber-900`)。
*   *表单输入项*: 包括 API 接口地址、ApiKey 凭证、模型名称输入框，均使用 `border border-ui-border bg-white text-charcoal` 规范。
*   *动作按钮*: 获取模型列表按钮采用 `bg-paper-aside text-charcoal border border-ui-border hover:bg-charcoal hover:text-paper-light` 动态过渡；重置设置按钮采用 `border border-ui-border hover:text-status-error-text hover:border-status-error-border hover:bg-status-error-bg` 风格。

---

## 4. 样式分离与多主题配置 (CSS & Tailwind Configuration)

目前项目已完全实现了样式分离，所有色彩、边框与主题样式由 [index.css](file:///f:/AI%20code/SIU/demo/src/index.css) 驱动，支持多配色/多主题的开发绑定：

1.  **全局主题变量定义**:
    在 `:root` 中定义全局主题的基准变量（例如背景色、主文本、UI边框、各业务状态颜色）：
    ```css
    :root {
      --bg-paper-light: #FAF9F6;
      --bg-paper-aside: #F5F4F0;
      --bg-paper-card: #F1EFEC;
      --bg-paper-alert: #FFFEEF;
      
      --text-charcoal: #1A1A1A;
      --text-charcoal-rgb: 26, 26, 26;
      
      --accent-color: #4f46e5;
      --accent-color-rgb: 79, 70, 229;
      --border-color: rgba(26, 26, 26, 0.1);
      --border-color-light: rgba(26, 26, 26, 0.05);

      /* 状态颜色 */
      --color-status-success-text: #047857;
      --color-status-success-bg: #f0fdf4;
      --color-status-success-border: rgba(16, 185, 129, 0.2);
      /* ...其他状态色 */
    }
    ```

2.  **Tailwind 主题绑定**:
    在 [@theme](file:///f:/AI%20code/SIU/demo/src/index.css#L43-L77) 块中注册为 Tailwind 主题缩写，以此替代所有写死的 Hex 和黑白硬编码：
    ```css
    @theme {
      --color-paper-light: var(--bg-paper-light);
      --color-paper-aside: var(--bg-paper-aside);
      --color-paper-card: var(--bg-paper-card);
      --color-paper-alert: var(--bg-paper-alert);
      --color-charcoal: var(--text-charcoal);
      --color-accent-indigo: var(--accent-color);
      --color-ui-border: var(--border-color);
      --color-ui-border-light: var(--border-color-light);

      /* 状态颜色 */
      --color-status-success-text: var(--color-status-success-text);
      --color-status-success-bg: var(--color-status-success-bg);
      --color-status-success-border: var(--color-status-success-border);
      /* ... */
    }
    ```

3.  **多主题集成**:
    项目目前已内置“暗色模式 (Dark Mode)”主题，切换逻辑通过向根节点 `<html>` 设置 `data-theme="dark"` 属性实现。
    右上角设有主题切换控制按钮（`open-theme-toggle-btn`），通过加载 `Sun` (亮色) 与 `Moon` (暗色) 图标为用户提供一键式交互切换，同时主题状态将被安全持久化在 `localStorage` (`siu_theme`) 中。
    ```css
    [data-theme='dark'] {
      --bg-paper-light: #141412;
      --bg-paper-aside: #1C1C18;
      --bg-paper-card: #23231F;
      --bg-paper-alert: #2A2415;
      
      --text-charcoal: #FAF9F6;
      --text-charcoal-rgb: 250, 249, 246;
      
      --accent-color: #818cf8;
      --accent-color-rgb: 129, 140, 248;
      --border-color: rgba(250, 249, 246, 0.1);
      --border-color-light: rgba(250, 249, 246, 0.05);
      /* ...各状态色也将在 dark 主题中相应变更 */
    }
    ```
