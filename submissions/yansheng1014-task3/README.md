# 题 3 · 打地鼠（Vela 快应用）

小米 Vela 手表/手环快应用，336×480，四页路由，单关卡 30 秒倒计时，本地最高分持久化。

- 包名：`com.bluebridge.review.mole`
- 构建产物：`com.bluebridge.review.mole.debug.1.0.0.rpk`（约 70 KB）
- 设计基准：`designWidth: 336`（1px = 1 物理像素）

## 一、构建与运行

```bash
npm install          # 安装 aiot-toolkit（Node ≥ 20）
npm run build        # → dist/*.debug.rpk
```

也可以用 AIoT-IDE 打开本目录直接调试/打包。

安装到模拟器或真机（模拟器示例，adb 来自 `node_modules/@miwt/adb`）：

```bash
adb push dist/com.bluebridge.review.mole.debug.1.0.0.rpk /data/local/tmp/mole.rpk
adb shell pm install /data/local/tmp/mole.rpk   # 不要加 -r，否则返回 -38
adb reboot && sleep 25 && adb shell am start com.bluebridge.review.mole
```

开发辅助脚本（可选，不影响构建）：

```bash
npm run tokens       # design/tokens.json → src/common/tokens.{js,css}
npm run tokens:check # 校验生成物与令牌源一致（build 前自动执行）
npm run art          # design/art/*.svg → src/common/{icons,art}/*.png（需要 sharp）
npm test             # 玩法逻辑单测 + 机器人对局（41 项）
npm run test:layout  # 九宫格几何/对齐单测（13 项）
npm run audit:ux     # UX 校验：对比度/字号下限/触控尺寸/一屏预算（26 项）
```

## 二、玩法与规则

| 项 | 规则 |
|---|---|
| 时长 | 30 秒（`duration` 可由路由传入，15 秒局可直接用） |
| 棋盘 | 3×3，同时最多 2 只地鼠；**同一格不会连续两次刷新** |
| 命中 | 基础 10 分；连击每层 +2，封顶 +10（单次最高 20 分） |
| 连击 | **2 秒内连续命中**才累积；超时自然断连（暂停时连击窗口冻结） |
| 金地鼠 | 出现概率 18%，**3 倍分**（最高 60 分），插画与普通鼠明显区分 |
| 漏打 | 不扣分，只中断连击（记为 escaped） |
| 点空地 | 不扣分、不断连击（只统计 misses），也不振动 |
| 难度曲线 | 刷新间隔 900ms → 480ms、存活时长 1150ms → 700ms，随剩余时间线性加快 |
| 暂停 | 可暂停/继续，倒计时冻结且**不补时**，暂停期间不刷新地鼠 |
| 结算 | 本局得分 + 最高分（本地 storage，`bb_mole_best_v1`），破纪录显示「新纪录」；可「再玩一局」或回主页 |

## 三、页面结构与状态管理

manifest 注册 4 个路由（题目要求 ≥3）：

```
pages/home   主页：插画 + 标题 + 最高分 + 开始游戏 + 玩法说明
pages/game   游戏页：HUD（时间/得分/连击）+ 3×3 棋盘 + 暂停遮罩
pages/result 结算页：本局得分 / 最高分 / 新纪录 / 再玩一局 / 返回主页
pages/about  关于页：玩法说明 + 规则 + 版权（整页 scroll）
```

状态传递：

- 主页 → 游戏：`router.push({ uri: "/pages/game", params: { duration: "30" } })`
- 游戏 → 结算：`router.replace({ uri: "/pages/result", params: { score, duration } })`（用 replace 让栈保持 home → result）
- 结算 → 再玩：`router.replace({ uri: "/pages/game", params: { duration } })`
- 结算/关于 → 返回：`router.back()`

Vela 的路由参数**统一转成 String**，所以目标页用 `protected` 声明同名字段，`onInit` 里 `parseInt` 兜底（NaN/负数 → 0 或 30）。

逻辑与视图分离：

- `src/common/game.js`：纯逻辑引擎（无 `@system.*` 依赖、随机数与时间可注入），负责刷新、难度曲线、计分、连击、暂停、结束；
- `src/common/store.js`：最高分读写（唯一数据源，脏数据回落 0）；
- `src/pages/game/game.ux`：只做「读引擎快照 → 写响应式字段」与交互，计时器在 `onHide`/`onDestroy`/结算时清理。

## 四、设计说明

### 4.1 设计令牌体系（无 CSS 变量怎么办）

Vela **不支持 CSS 变量、不支持后代选择器/伪类**，所以视觉规范不能靠 CSS 继承。本工程用「令牌源 → 代码生成 → class + 内联样式绑定」三层：

```
design/tokens.json           唯一事实来源（颜色/字号/间距/圆角/尺寸/动效/图标/插画）
  ├─ scripts/gen-tokens.cjs  → src/common/tokens.js  （COLORS/TYPE/SIZE/ICONS/STYLES…）
  │                          → src/common/tokens.css （.t-*/.c-*/.bg-*/.m-*/.w-*/.anim-*）
  └─ scripts/gen-art.cjs     → src/common/icons/*.png、art/*.png、logo.png（sharp 渲染）
```

约束（由 `scripts/check-ux.cjs` 静态校验）：页面 `<style>` 里不出现裸 hex/rgb、不出现裸 `font-size`、不使用不支持的选择器；颜色/字号/尺寸只能来自生成的 class 或 `STYLES` 角色。`npm run build` 会先跑 `tokens:check`，令牌与产物不同步直接构建失败。

### 4.2 视觉：卡通高对比（非深色）

| 角色 | 值 | 说明 |
|---|---|---|
| 背景 | `#2A55C4` 宝蓝 | 卡通底色，非纯黑；与奶白格子 5.5:1，格子边界清晰 |
| 棋盘格 | `#FFE9A3` 奶白 + `#0B2350` 3px 描边 | 厚描边 = 卡通语言，格子与格子之间不会糊在一起 |
| 主色（得分/主按钮） | `#FFD86B` 暖黄 | 与宝蓝对比 4.8:1 |
| 文字 | `#FFFFFF`（主）/ `#EAF1FF`（次） | 与背景 5.7:1 / 5.0:1 |
| 格子内文字（无） | — | 数字只用背景上的白/黄，格子内不放文字 |
| 危险（≤5 秒） | `#FFD1DC` 浅粉 | 只在最后 5 秒替换时间数字颜色 |

实测对比度（`npm run audit:ux` 自动校验 26 项）：主文字 5.72:1、次要文字 5.0:1、暖黄 4.8:1、格子内墨色 12.7:1、按钮文字 9.98:1，全部 ≥4.5:1；格子填充与背景 5.46:1。

字号（336×480，1px = 1 物理像素）：HUD 数字 56、结算主分数 104、页面标题 48、区块标题 40、正文 34、按钮 38、辅助 30–32 —— 全工程无小于 30 的正文。

### 4.3 交互与反馈（克制，不打扰）

- 命中：**短振动 + 格子金色闪（160ms）+ 分数弹一次（260ms）**，三件事都在 1 帧内触发；空点不振动、不闪、不扣分，避免「乱点也有奖励」。
- 连击：≥2 连击时 HUD 标签从「得分」变为「×N 连击」并转薄荷色；不加飘字（手表上飘字会遮棋盘）。
- 最后 5 秒：时间数字转红并脉冲一次（不循环），只提醒一次。
- 暂停：全屏 94% 不透明遮罩 + 两个按钮（遮罩靠 DOM 顺序覆盖，Vela 无 z-index）；暂停后关闭屏幕常亮。
- 按压态：所有可点元素 `touchstart` 切 `.press`（scale 0.96），不做 transition（Vela 不支持 transform 过渡）。

### 4.4 布局与九宫格对齐（336×480）

九宫格几何**由函数统一计算**，页面不写死坐标（`src/common/layout.js`）：

```
内容宽 board = 336 - 2*safeX = 312
格距 gap = 9
格子 cell = (312 - 2*9) / 3 = 98   ← 整除，严格对齐，无 1px 缝
3*98 + 2*9 = 312 = board
```

- 9 个格子用 `position: absolute` + `left/top` 由 `cellOffset()` 计算，避开 flex 累积误差；
- `cellSize()` 若除不尽会直接抛错，构建/单测立刻失败（防止改令牌后悄悄错位）；
- 单测 `npm run test:layout`（13 项）校验：整除、九宫格不重叠、列距=行距、右/下边界贴合、整屏预算。

纵向预算：

```
游戏页：24(上) + 94(HUD) + 16 + 312(棋盘) + 34(余量) = 480
```

HUD 左右对称：左「时间 + 数字」左对齐、中间 56×56 暂停按钮、右「得分/连击 + 数字」右对齐，中间对称轴是屏幕中线。

触控：棋盘格 98×98、暂停 56×56、主按钮 296×88 —— 全部 ≥56×56，一屏可点目标只有两类（格子 + 暂停）。

### 4.5 审美校验（ui-ux-pro-max）

按要求用 `ui-ux-pro-max` 技能做过终检：

- `--design-system "casual arcade game wearable dark high contrast"` 给出的 pattern（Hero+Testimonials+CTA）与配色（浅底粉紫）属于 **Web 落地页**，与 336×480 手表游戏不匹配，按技能「不匹配就只取原则」处理，未采用其版式与配色；
- 采纳其中可迁移的三条：**标题与正文必须清晰分层**（本工程数字 60 vs 正文 34）、**振动只用于确认/重要动作，不可每次点击都振**（本工程仅命中时振一次）、反模式「muted colors / low energy」（因此用高饱和琥珀金 + 薄荷撞色，背景非纯黑但保持明度差）；
- 其余视觉决策以本项目 `wearable-ui-design` 技能（字大、少即是多、一屏一个主任务）与实机截图为最终依据。

## 五、资产

- 图标：`design/art/icons/*.svg`（Lucide 官方 SVG，ISC 许可），`scripts/gen-art.cjs` 用 sharp 统一渲染 96×96 PNG，颜色取自令牌（默认 `#FFF8EC`）。只保留实际用到的 3 个：info / pause / arrow-left。
- 插画：`design/art/{hero,mole,mole-gold,logo}.svg` 自绘（2.5px 圆角描边 + 少量实色），同一套视觉重量；mole / mole-gold 仅配色不同（棕 vs 金）。
- 应用图标：`src/common/logo.png`（192×192，深底 + 金色地鼠）。

## 六、AI 使用说明

本工程由 AI 编程助手（DeepSeek Harness + 多智能体协作）与本人共同完成：

| 部分 | 谁做 |
|---|---|
| 题面解读、路由/页面骨架、设计令牌体系与生成脚本、视觉与配色决策、构建/装机/截图验证、文档 | AI 生成 + 本人在模拟器逐屏确认与反馈 |
| 游戏逻辑（game.js）、棋盘页、主页/关于/结算三页、图标与插画资产 | 4 个并行 AI 子代理按冻结契约实现，AI 主控集成与验收 |
| 规则取舍（连击窗口 2s、漏打不扣分、空点不扣分、金鼠 18%/3 倍）、UI 迭代意见 | 本人决策、AI 落地 |

关键做法是**先冻结契约再并行**：`docs/CONTRACT.md` 规定令牌体系、Vela 限制、路由与状态契约、每页元素规格与文件所有权；子代理只改自己 scope 的文件，冲突与集成由主控负责。可复现校验全部脚本化：`npm test`（逻辑 32 项）、`npm run tokens:check`、`scripts/check-ux.cjs`。

## 七、迭代日志

1. **先跑通「能构建能装机」**：从 starter 起步，补 `manifest` 路由（home/game/result/about）与包名，先让 4 个占位页构建成功并装进模拟器，再往里填内容。踩坑：`system.router` 必须写进 `features`，否则构建报 `missing feature`；`router.push` 的 uri 必须用 manifest 的 path（`/pages/game`），写成 `/pages/game/game` 会 `pagepath is unavailable` 且静默失败。
2. **视觉体系推倒重建**：第一版每页写死颜色和字号，改一处要翻 5 个文件。改为 `design/tokens.json` 单一事实来源 + 代码生成 `tokens.js/tokens.css`，并把「页面禁止裸色值/裸字号」做成静态检查；构建前强制 `tokens:check`。
3. **棋盘从「看不见」到「看得清」**：格子和背景都太暗、九宫格边界消失；同时格子被拉满导致相互挤压。改为背景 `#101720`（非纯黑）+ 格子 `#43566A` 填充 + `#96A9BD` 描边，格距 10、格子 92（3×92+2×10=296 精确对齐内容宽），并加大地鼠比例。
4. **命中反馈重做（手感）**：初版命中只有「格子变色」，实机几乎无感。改为三通道同时触发——振动（先振再刷视图，压在 1 帧内）+ 金色闪光 160ms + 分数弹跳 260ms；空点保持完全无反馈，避免误导。分数数字从 78 降到 60，把空间让给棋盘（数字过大挤压九宫格）。
5. **连击规则修正（可玩性）**：初版「漏打立即清空连击」，在同时两只地鼠时连击几乎不可达，等于没有连击系统。改为**2 秒命中窗口**（暂停冻结、超时不补），漏打只断连击不扣分，金地鼠 3 倍分提供风险收益；单测补 4 条连击/暂停用例（共 32 项全绿）。
6. **收尾清理**：删掉重复元素（游戏页重复的倒计时进度条、结算页重复的「命中/连击」统计、关于页拆成两行的版本号），图标清单裁到实际使用的 3 个（rpk 88 KB → 70 KB）；`setKeepScreenOn` 改为只在真正进行中开启，暂停/遮罩态关闭省电。

## 八、现场改动指引

| 要求 | 改哪里 |
|---|---|
| 倒计时 30 → 15 秒 | 主页 `params.duration` 或 game 页 `FALLBACK_DURATION_S`；引擎支持任意时长 |
| 金地鼠概率/倍率 | `src/common/game.js` 的 `RULES.GOLDEN_RATE` / `GOLDEN_MULTIPLIER` |
| 难度曲线更陡 | `RULES.SPAWN_MIN_MS` / `LIFE_MIN_MS`（线性插值，单测校验单调性） |
| 暂停/继续 | 已实现（HUD 右侧按钮；`onBackPress` 在游戏中先暂停） |
| 结算「再玩一局」重置 | 已实现（`router.replace` 回游戏页，引擎在 `onInit` 重新创建） |
| 加本地排行榜 | 把 `store.js` 的 `best:number` 换成 `scores:[{score,at}]`，`submitScore` 里 push + 排序 + 截断前 10；存储已带 `v` 版本号，旧数据可平滑迁移 |

## 九、截图

`screenshots/`：`01-home`、`02-game`、`03-pause`、`04-result`、`05-about`（模拟器 VVD 抓帧，336×480）。


## 十一、自动化校验（每次改动都跑 `npm run check`）

| 脚本 | 覆盖 | 结果 |
|---|---|---|
| `npm run tokens:check` | 设计令牌与生成物同步 | OK |
| `npm test` | 玩法逻辑 41 项：计分/连击/金鼠/漏打/空点/15s 局/暂停冻结/难度单调/同格不刷新/机器人整局对局/乱点抗压 | ALL PASS (41) |
| `npm run test:layout` | 九宫格 13 项：整除对齐、无重叠、行列间距一致、边界贴合、整屏预算 | ALL PASS (13) |
| `npm run audit:ux` | UX 26 项：文字对比度 ≥4.5:1、图形 ≥3:1、字号下限、触控 ≥56、一屏 ≤480、背景非纯黑、强调色 ≤2 | ALL PASS (26) |
| `node scripts/check-ux.cjs` | 4 个页面：无裸色值/裸字号/非法选择器、script 语法 | OK ×4 |
| 模拟器实测 | 主页→游戏→命中(振动+闪光+分数弹)→暂停→继续→结算→再玩→返回→关于滚动 | 通过（截图见 screenshots/） |

```bash
npm run check   # 依次跑 tokens:check + 玩法 + 九宫格 + UX 四套校验
```

## 十、目录

```
design/tokens.json      设计令牌（唯一事实来源）
design/art/             图标与插画 SVG 源
scripts/gen-tokens.cjs  令牌生成器（含 --check）
scripts/gen-art.cjs     SVG → PNG 资产生成器
scripts/test-game.mjs   逻辑单测（32 项）
scripts/check-ux.cjs    页面静态自检（裸色值/字号/选择器/语法）
src/pages/{home,game,result,about}
src/common/{game.js,store.js,tokens.js,tokens.css,ui.css,icons,art}
tools/                  模拟器启动器 + 交互面板 + 截图脚本（开发辅助，不参与打包）
```

© 2026 蓝桥工作室 · 仅供招新评测使用