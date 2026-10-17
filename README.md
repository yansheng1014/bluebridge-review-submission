# 题 1 · 一屏挑战：手环天气（Vela 快应用）

小米 Vela 手表（手环 10 Pro / 336 × 480）单页天气 rpk。全部天气数据为本地模拟值，**不发起任何网络请求**，单页 `.ux` 完成，构建产物可直接安装到 Vela 模拟器 / 真机。

![Vela 模拟器真实运行截图（336×480）](screenshots/emu-task1-main.png)

## 一、交付物

| 内容 | 路径 |
|---|---|
| 源码 | `src/`（单页 `src/pages/index/index.ux` + `manifest.json` + 自绘资产） |
| 构建产物（**已提交进仓库**） | `vela-weather-336x480.debug.rpk`（152,782 B，md5 `f3069a6a057ff8003de4e5e5e6b4de11`；`dist/` 下同名文件） |
| 模拟器真实截图 | `screenshots/emu-task1-main.png`（336×480 主屏）、`@2x` 放大版、`emu-task1-hours-scroll.png`（5 小时横滑后）、`emu-task1-metrics-scroll.png`（指标横滑到「风向」）、`emu-task1-dev.png`（开发者信息）、`emu-task1-rightswipe.png`（右滑不退出）、`emu-task1-exit.png`（‹ 退出后） |
| 资产生成脚本 | `assets/gen_assets.py`（背景、天气图标、指标图标、应用图标全部本地生成） |
| 模拟器脚本 | `tools/emulator-run.cjs`（创建 VVD + 启动 + 安装 rpk）、`tools/emulator-shot.cjs`（gRPC 抓真实截图） |
| 交互面板 | `tools/emulator-panel.cjs` + `tools/panel-ui.html`（移动端自适应；画布手势录制 + 服务端 60Hz gRPC 回放，点击/拖拽/横滑可用；实时画面 + 唤醒/重启/重装/截图/全屏/状态/动作日志，`/api/logs` 可查）；本机经 nginx 暴露为 `/emu-panel/`，详见 `docs/emulator-verification.md` 第十节 |
| 预览渲染脚本 | `tools/render-preview.cjs` + `tools/screenshot.cjs`（同源 HTML 渲染，快速迭代用） |
| 调研笔记 | `docs/research/`（官方文档要点、336×480 UI 规范、决策记录）；**专业文档索引** `vela-official-docs.md`；**手环 UI 设计原则（少即是多）** `wearable-ui-design.md`（官方设备矩阵/信息预算/字号地板/审计清单） |

## 二、构建与运行

环境：Node.js ≥ 20（本机 v22.23.3），依赖 `aiot-toolkit@2.0.5`。

```bash
# 1. 安装依赖（已内置 .npmrc 指向 npmmirror）
npm install

# 2. 构建 rpk
npm run build
# 产物：dist/com.bluebridge.review.weather.debug.1.0.0.rpk（development 调试签名）

# 3. 运行
#    - 方式 A：AIoT-IDE / Vela 开发者工具打开本目录 → 选模拟器/真机 → 调试
#    - 方式 B：把 rpk 安装到设备（小米运动健康 App → 我的 → 关于 → Debug → 第三方应用）

# 4. 无图形界面的 Linux 上直接跑官方 Vela 模拟器（本仓库验证方式）
node tools/emulator-run.cjs      # 创建 VVD + 启动模拟器 + 安装并启动本应用（后台常驻）
node tools/emulator-shot.cjs emu-01-main.png   # 任意时刻抓真实截图（gRPC，336×480）

# 5. 可选：浏览器交互面板（实时画面 + 点击测试）
node tools/emulator-panel.cjs    # 本机 http://127.0.0.1:8770/；服务器上经 nginx 反代为 /emu-panel/
#    - 点击/拖拽画布 = 真实鼠标事件注入（已在点击计数测试应用上验证有效）
#    - 按钮：重启应用 / 重装当前 rpk / 保存当前帧
```

模拟器配置与日志证据见 [docs/emulator-verification.md](docs/emulator-verification.md)。

- 设计基准：`manifest.json` 中 `config.designWidth = 336`，画布 336 × 480，设备类型 `watch`；
- 包名：`com.bluebridge.review.weather`，版本 1.0.0；
- 页面路由：`pages/index`（**单页**，无路由跳转，符合题面「必须单页 .ux」要求）。

### 本仓库的验证记录

- `npm run build` 通过（aiot-toolkit 2.0.5，Node v22.23.3，Linux x64），产物 152,782 字节，md5 `f3069a6a057ff8003de4e5e5e6b4de11`；
- 解包核对 rpk：包含 `manifest.json`、`pages/index/index.js`、21 个本地资产文件，无网络请求代码；
- 336×480 布局预算校验：内容底边 ≈471px（画布 480），无溢出、无垂直滚动；指标行与小时行为 `scroll-x` 横向滚动；
- **官方 Vela 模拟器（VVD）实测**：`Boot completed in 5729 ms` → `pm install → onInstallResult: com.bluebridge.review.weather(success 0)` → `am start → AMS pushNewActivity ... [resumed]`；gRPC `getScreenshot` 返回 336×480 真实帧，见 `screenshots/emu-*.png`；
- **交互注入实测**：通过面板 HTTP 接口发送鼠标按下→分步移动→抬起，可模拟真实滑动：5 小时行从「现在…18时」滑到「17时…21时」，指标行滑出第 4 张「风向」卡；右滑（从左往右拖）不会退出应用（`onBackPress` 拦截 + 横滑容器消费手势）；`‹` 点击退出、`⋯` 打开发者信息均实测有效；同条件 `sendTouch`/`sendKey` 对 Vela 5.0 镜像无效（已在面板中如实标注）；
- 9 项必含信息逐项核对见下表。

> **截图说明**：开发机为无图形界面的 Linux 服务器，未安装 AIoT-IDE，但已通过**小米官方 Vela 模拟器 SDK**（`@aiot-toolkit/emulator` + `vela-watch-5.0` 镜像）以 `-no-window` + SwiftShader 方式启动 VVD，adb 安装 rpk 并抓取真实渲染帧（`tools/emulator-shot.cjs`）。`screenshots/emu-task1-main.png` 为模拟器原始帧（336×480），`@2x` 为放大版；`hours-scroll` / `metrics-scroll` / `dev` / `rightswipe` / `exit` 为同一台模拟器上的交互实测帧。

## 三、设计说明

### 1. 信息层级（第一眼 → 最后一眼）

| 层级 | 内容 | 位置 | 处理 |
|---|---|---|---|
| 1 | 温度 23° + 天气状态 | 主视觉 | 80px 白色粗体，暖黄「多云」；右上天气插画 80px |
| 2 | 地区 / 风向 | 顶栏 | 地区 22px 粗体 + 定位图标；风向 16px 次要色 |
| 3 | 湿度 / 空气 / 紫外线 | 指标卡 | 3 张 96×58 半透明卡，数值 26px 粗体，单位着色（良=绿、中等=黄） |
| 4 | 未来 5 小时 | 中段面板 | 横排 5 列：时间 15px → 图标 24px → 温度 23px |
| 5 | 未来 7 天 | 下段面板 | 横排 7 列：星期 15px → 图标 20px → 高 17px / 低 14px |
| 6 | 日出 / 日落 | 底部细行 | 太阳图标 + 时间 14px，中间细线分隔 |

> 为什么把 7 天做成横排而不是列表：336 宽下 7 行列表会吃掉约 200px 高度，横排只要约 104px，这是在「9 项信息都必须一屏可见」硬约束下的关键取舍。App「只做一屏」时，横向等分列比纵向列表更省空间，也更容易保持对齐。

### 2. 一屏高度预算（480px 全部花完）

| 区块 | 高度 |
|---|---|
| 顶部安全边距 | 16 |
| 顶栏（地区 / 风向） | 24 |
| 主视觉（温度 + 状态 + 插画） | 104 |
| 三张指标卡 | 58 |
| 未来 5 小时面板 | 102 |
| 未来 7 天面板 | 104 |
| 日出日落行 | 20 |
| 区块间距（4×8 + 6） | 14 |
| 底部安全边距 | 12 |
| **合计** | **462 / 480** |

### 3. 配色与可读性

- 背景：深夜蓝渐变 + 暖色/冷色柔光 + 星点（自绘 336×480 PNG），给 OLED 手表省电、对比度高；
- 主文字 `#f1f5f9`、次文字 `#8b9bb4`、强调色 `#fbbf24`（暖黄）、辅助绿 `#86efac`；
- 正文对比度约 15:1（主）/ 5.7:1（次），均高于 WCAG AA 的 4.5:1；
- 卡片用 `rgba(255,255,255,0.045~0.06)` 微透明面板分层，不依赖阴影（Vela 的 `box-shadow` 需要 APILevel 3+，本项目 `minAPILevel: 2`，因此不用阴影）；
- 字体只用系统字重 normal / bold（Vela `text` 不支持自定义字体），层级靠字号 + 字重 + 颜色三件套。

### 4. 小屏适配

- `designWidth = 336` 时 1 设计 px = 1 物理像素（手环 10 Pro 屏宽 336），所有尺寸按物理像素设计；
- 左右安全边距 16px，顶部 16px、底部 12px，避开屏幕 48px 圆角裁切区；
- 所有文字显式 `line-height`，避免不同平台默认行高导致排版漂移；
- 单页无**垂直**滚动，9 项信息一屏内完成；指标行与未来 5 小时为 `scroll-x` 横向滚动（初始露出全部必含信息，滑动可看第 4 张指标与更多小时）。

### 5. 资产

全部资产由 `assets/gen_assets.py` 用 Pillow 本地绘制并导出 PNG，**没有使用任何第三方素材**（不涉及 Lucide / Meteocons 等图标库的许可问题）：

| 资产 | 尺寸 | 说明 |
|---|---|---|
| `bg-sky.png` | 336×480 | 深夜蓝渐变 + 柔光 + 星点 + 云带 + 暗角 + 轻噪点 |
| `w-clear/partly/cloudy/overcast/rain@2x.png` | 128×128 | 主天气图标（太阳渐变、云朵多层渐变 + 柔和阴影、雨滴） |
| `w-*.png` | 48×48 | 5 小时 / 7 天列表用小图标 |
| `m-humidity/aqi/uv/wind/sunrise/sunset/location.png` | 40×40 | 指标与太阳图标 |
| `app-icon.png` | 192×192 | 应用图标（深色圆角底 + 太阳云） |

绘制细节：4× 超采样后 LANCZOS 缩放抗锯齿；渐变通过 alpha 蒙版合成，避免「预乘 alpha 黑边」；图标 alpha 在画布边缘归零，避免深色背景上出现方形光晕（迭代日志 v3→v4 修复）。

## 四、9 项信息核对

| 题面要求 | 实现 |
|---|---|
| 地区 | 顶栏「北京 · 朝阳」+ 定位图标 |
| 温度 | 主视觉 23°，含「°」 |
| 湿度 | 指标卡 62% |
| 未来 5 小时预报 | 中段面板初始 5 列（现在 / 15–18 时），左滑可看 19–21 时（共 8 列） |
| 未来 7 天预报 | 下段面板 7 列（今天–周三，图标 + 高低温） |
| 空气状况 | 指标卡 42 良（绿色） |
| 紫外线 | 指标卡 3 中等（黄色） |
| 风向 | 顶栏「东南风 2级」+ 指标第 4 卡「风向 东南 2级」（左滑指标行可见） |
| 日出日落 | 底部行「日出 06:28 / 日落 17:26」+ 图标 |

另附：体感温度 22°、5 小时趋势说明「多云转小雨」、7 天提示「周六有雨，随身带伞」。

## 五、现场改动预案

| 改动 | 改法 |
|---|---|
| 5 小时 → 8 小时 | 已内置 8 项：初始显示 5 列，横滑显示剩余 3 列（`scroll-x`，`.hour` 52px） |
| 增加体感温度 | 已内置（主视觉「体感 22°」），可移动到指标卡 |
| 增加降水概率 | 加到 5 小时每列（时间下方 12px），或替换面板副标题 |
| 192×490 重新适配 | `designWidth` 改 192 + 媒体查询 `@media (max-width: 160)` 覆写字号/边距；`.page` 高度改 490，纵向多出的 10px 给主视觉 |
| 336×336 方屏 | 媒体查询 `@media (shape: rect) and (max-height: 336)`，隐藏日出日落行、7 天缩为 5 列、主视觉高度压到 90 |

## 六、AI 使用说明（透明披露）

- **调研阶段**：使用 2 个子代理分别调研「Vela 官方文档 / 工具链 / 组件 API」与「336×480 手表 UI 规范 / 资产策略 / 开源资源」，产出笔记见 `docs/research/`；
- **实现阶段**：AI 生成页面结构、样式与自绘资产脚本；每一轮都通过「构建 rpk + 同源 336×480 渲染截图 + 像素级检查」验证，人工逐项核对字号、间距、对比度与题面要求；
- **AI 出错与修正**（可复现的坑）：① 初版按 480px 默认 designWidth 思维排版，字号偏小（10–13px），真机上不可读，按 1px=1 物理像素重排；② 首版 4 张指标卡把「风向」挤成两行且数值溢出卡片，改为 3 卡固定 + 风向第 4 卡横向滑动；③ 图标在深色背景上出现方形光晕，定位为 PNG alpha 边缘与 RGBA 模糊黑边，修复后才出图；
- **未使用 AI 的部分**：题面解读、取舍决策、验收标准由人工确定；最终 rpk 由 aiot-toolkit 真实构建，不是伪造产物。

## 七、迭代日志

1. **v0 基线**：复制官方 `shared/starter`，`npm install`（npmmirror）+ `npm run build` 跑通，确认无 Java 也能构建 rpk（aiot-toolkit 纯 Node）。
2. **v1 首版排版**：4 张指标卡（湿度/空气/紫外线/风向）+ 5 小时 5 列 + 7 天 7 列横排，构建通过；渲染后发现字号按 480 基准偏小（10–13px）、卡片内数值溢出、底部超出画布。
3. **v2 重排**：按 UI 调研结论（designWidth=336 → 1px=1 物理像素；主温度 80+、正文 22+、辅助 14+）重构；指标减为 3 卡，风向移到顶栏，删除独立高低温行把空间让给主视觉；全部文字加显式 line-height，按 480px 预算重算高度。
4. **v3 资产修复**：渲染发现主天气图标外圈有方形光晕 → 定位为 PNG 边缘 alpha 未归零 + RGBA 直接高斯模糊把透明区黑色混入；改为「alpha 阈值 + 只模糊 alpha 通道 + 渐变用 alpha 蒙版合成」，图标干净。
5. **v4 结构加固**：指标值、日出日落改为「flex 行 + 独立 text」，不再依赖 `<span>` 的样式与 margin（Vela `text` 内嵌 span 的样式支持有限）；单位着色、对比度提升（三级文字 `#74839c`→`#8b9bb4`），重建并通过 336×480 溢出校验（内容底边 462）。
6. **v5 模拟器实机验证**：下载官方 Vela 模拟器 SDK（emulator 0.1.0 + vela-watch-5.0 镜像）→ 修复 qemu 权限/依赖库/SwiftShader → 创建 336×480 VVD → adb 安装并启动 rpk → gRPC 抓取真实帧；真实渲染与设计预览高度一致，9 项信息全部可见；补齐 `tools/emulator-run.cjs`/`emulator-shot.cjs` 与验证记录。
7. **v6 交互面板**：补 `tools/emulator-panel.cjs`（SSE 实时画面 + 点击注入 + 重启/重装）；用「点击计数」测试应用验证「面板点击 → gRPC sendMouse → UI 响应」链路（数字 0→1）；同时实测发现 Vela 5.0 镜像下 `sendTouch`/`sendKey` 无效、屏幕默认熄屏需先点击唤醒，均写入文档。
8. **v7 定稿（UI 精致化 + 横滑）**：顶栏改为单独一行（`‹` 左、`⋯` 右，32×32 半透明圆角，图标 19–21px），地区/风向回到第二行；主天气图标 80→96px 且收紧与温度的间距；指标行加第 4 张「风向」卡、小时行扩到 8 项，两处均为 `scroll-x` 横向滚动；`onBackPress` 返回 true 拦截系统右滑，避免横滑时误退出；模拟器实测横滑、右滑不退出、`‹`/`⋯` 均正常，重建 rpk 152,782 B。

## 八、目录结构

```text
.
├── README.md
├── vela-weather-336x480.debug.rpk   # 构建产物（可直接安装）
├── src/
│   ├── manifest.json                # 包名 / 路由 / designWidth=336 / features
│   ├── app.ux
│   ├── common/weather/              # 自绘资产（背景 / 天气图标 / 指标图标 / app icon）
│   └── pages/index/index.ux         # 单页天气（template + style + script）
├── screenshots/                     # 模拟器真实截图（主屏 / 横滑 / 开发者信息 / 右滑 / 退出）
├── assets/gen_assets.py             # 资产生成脚本
├── tools/                           # 模拟器启动/抓帧 + 预览渲染脚本
├── docs/research/                   # 官方文档与 UI 调研笔记
├── docs/emulator-verification.md    # 模拟器运行验证记录（日志/配置/复现步骤）
├── docs/CHECKLIST.md                # 题面符合性逐条核对
├── preview/                         # 同源预览 HTML 与 3x 渲染图
├── scripts/run-jsc.cjs              # 构建入口（封装 aiot-toolkit）
├── package.json
└── quickapp.config.js
```

## 九、已知限制

- 模拟器运行在无 GPU 的 Linux 上（SwiftShader 软件渲染；guest 为 ARM，走 QEMU TCG），**帧率/性能不代表真机**，但布局、字体、颜色与组件行为来自真实 Vela 运行时；
- 使用 Vela 5.0 镜像（`vela-watch-5.0`），真机系统版本可能略有差异，建议评审在真机/ AIoT-IDE 复核一次；
- 调试签名使用 aiot-toolkit 内置证书，仅够模拟器/真机调试，不可用于正式发布；
- 模拟器 SDK（约 450MB）不随提交物分发，复现方式见 `docs/emulator-verification.md`；
- 交互面板是本地开发工具（仅监听 127.0.0.1:8770，约 4fps 轮询），不是 DSH 插件；已升级为**手势回放**：手机端录制路径 → 服务端按 60Hz 用官方 gRPC `sendMouse`（down→move→up）回放，点击/拖拽/横滑均实测有效，动作日志 `/tmp/vela-panel-actions.log`；Vela 5.0 镜像的 `sendTouch` 各种编码均无响应、`sendKey` 无效，故不采用；同一时刻只运行一个快应用（切换不同应用时 adb `am start` 可能阻塞，需重启 VVD 后再启动）。

## 十、真实模拟器复验（2026-10-17 11:48，终版）

官方 Vela 5.0 模拟器（VVD 336×480）安装终版 rpk（md5 `f3069a6a…`）后，gRPC 抓帧确认 9 项信息一屏完整、底部日出日落（06:28 / 17:26）无裁切，顶栏/横滑/右滑/退出均实测：

| 文件 | 说明 |
|---|---|
| `screenshots/emu-task1-main.png` | 336×480 主屏（顶栏 `‹`/`⋯`、地区在第二行、4 指标 + 5 小时初始态） |
| `screenshots/emu-task1-main@2x.png` | 2× 放大，便于查看字体/图标细节 |
| `screenshots/emu-task1-hours-scroll.png` | 5 小时行左滑后（17–21 时） |
| `screenshots/emu-task1-metrics-scroll.png` | 指标行左滑后（空气 / 紫外线 / 风向） |
| `screenshots/emu-task1-dev.png` | 点 `⋯` 打开的开发者信息覆盖层 |
| `screenshots/emu-task1-rightswipe.png` | 右滑后仍停留在应用（不退出） |
| `screenshots/emu-task1-exit.png` | 点 `‹` 退出后的帧（近黑/桌面） |

交互实测结论：横滑用鼠标「按下→分步移动→抬起」注入（等价触摸滑动），5 小时与指标两处均能滚动且不带动页面；右滑被横滑容器/`onBackPress` 消费，应用不退出；`‹` 退出、`⋯` 打开开发者信息、`×`/遮罩关闭均正常。

复验细节（安装命令、adb 注意点、面板状态）见 `docs/emulator-verification.md` 第九节。面板入口：`https://103.236.84.174:45665/emu-panel/`（Basic Auth）或 DSH 域名下 `/emu-panel/`。

顶栏新增两个实机验证过的入口：

| 位置 | 交互 | 实现 |
|---|---|---|
| 左上 `‹` | 退出快应用（失败回退返回键 + toast） | `@system.app` terminate / `@system.router` |
| 右上 `⋯` | 打开「开发者信息」页内覆盖层（包名/版本/设备/系统版本/屏幕/框架），`×` 或点遮罩关闭 | `@system.device` getInfo + 页内条件渲染 |

演示截图：[主屏](screenshots/emu-task1-main.png) · [开发者信息](screenshots/emu-task1-dev.png)
