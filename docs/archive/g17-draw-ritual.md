# G17：抽牌流程仪式化重做（连续选满 + 揭示浮层飞入/缩回 + 棋盘填满 + 每局洗牌）

> **归档日期**：2026-09-18 ｜ **条目状态**：✅ 已完成（真机验收通过）
>
> ⚠️ **本文是历史记录，不描述当前状态。** 文中"现状 / 当前"等表述均指归档当时。
> **本文只负责**：G17 这一件事——三轮决策过程、验收标准、牌序缺陷证据链、实现偏离、测试覆盖边界、已知缺口。

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: ✅ 已完成
- **关联条目**: G8（点击即选 + 原位翻牌）、G9（平铺网格 + 减去已选牌）、G10（情况页/子页拆分）、G11（一行 8 张）、G15/D12（卡牌图片唯一小档）、O2（`mystical-*` 全局类）
- **关联决策**: **本条目部分推翻 D12 的适用边界**（见「设计决策」第 12 条）

## 问题描述

抽牌链路现为 `/` → `/draw`（情况页）→ `/draw/select`（选牌子页）→ `/draw` → `/result`，
**每选一张牌往返一次**（2N 次路由跳转），且整条链路有若干处结构性缺陷：

1. **揭示时刻被压缩到最小画布与零驻留**：`app/draw/select/page.tsx` 点牌后原位翻牌 `FLIP_DURATION_MS`（700ms），
   `setTimeout` 一到立刻 `router.push("/draw")`。用户看到牌面的时间恰好等于翻牌动画时长。
   而该牌在移动端仅约 **37.6px 宽**（8 列 + `gap-1.5`，375px 屏）。
   塔罗最有价值的一刻发生在全站最小的画布上，且不给驻留时间。
2. **位置记忆每次清零**：`remainingCards` 以 `filter` 减去已选牌并重排，选得越多网格漂移越厉害。
   该行为是 [G9 规格自己记录的已知风险](../../docs/archive/draw-interaction.md)（"网格重排会轻微跳动"），
   当时可接受的前提是"每次只选一张、选完就走"。连续选牌时该前提不成立。
3. **没有任何撤销能力**：`selectedSlots` 仅内存态，UI 无任何入口可修改已选牌；选错只能刷新重来。
4. **这副牌从未被洗过**：进入子页时 78 张牌已整齐码好，无任何随机性叙事。
   而洗牌是塔罗仪式中唯一由用户参与、把"随机"变成"我抽到的牌"的动作——缺了它，
   78 张平铺退化为"78 选 1 的随机数生成器"。
5. **子页无全局感**：连续决策过程中看不到已选了几张、长什么样、还剩几位。
6. **两处纯人为延迟**：首页提交后 666ms 假加载、情况页点解析后 500ms 全屏遮罩，底下均无异步任务。
7. **返回首页丢问题**：`/draw` 左上角回 `/`，而首页 `localQuestion` 硬编码 `useState("")`，store 里的 `question` 未回填。
8. **无 `prefers-reduced-motion` 处理**：全站 5 处 `repeat: Infinity` 无限动画。

## 目标

把抽牌从"逐张往返的选牌器"重做为**一段由用户掌控节奏的仪式**：

`/` → `/draw`（情况页）→ `/draw/select`（**洗牌进场 → 连续选满 → 一次返回**）→ `/result`

- **节奏由用户掌控**：揭示时长由用户点「继续」（或点浮层外）结束，不再由 `setTimeout` 决定；
- **往返从 2N 降到 2**：子页内连续选满，完成后一次回情况页；
- **棋盘填满**：网格位置全程不动，已选位留空坑，用户保有空间记忆；
- **不可逆**：不提供任何重选（见「设计决策」第 5 条）；
- **有洗牌**：进场播放一次洗牌动画，为 78 张牌赋予随机性叙事。

## 验收标准

### A. 选牌子页 `/draw/select`

- [ ] **A1 洗牌进场**：进入页面后播放一次洗牌动画（约 `SHUFFLE_DURATION_MS` = 1200ms），78 张牌由散乱/堆叠状态归位为 6 列网格；动画结束后才可点击
- [ ] **A2 网格 6 列**：网格以 **6 列**渲染，列数经 `data-grid-columns="6"` 显式暴露（见「DOM 契约」）；单张牌宽 ≥ 44px（375px 屏下约 50.5px）
- [ ] **A3 棋盘填满**：始终渲染全部 78 张牌位；已选牌的牌位渲染为**不可点的空坑**，其余牌位在 DOM 中位置不变（`data-index` 与网格位置一一对应，不因选牌而位移）
- [ ] **A4 常驻紧凑槽位条**：子页顶部显示牌阵名 + 紧凑槽位（已填显示牌面、当前待选位高亮）+ 计数文案 `已选 k / N`；用户全程无需离开子页即可掌握进度。
      进度须**同时**以结构（已填槽位数 / 空槽位数）与文案两种形式可观测——测试以结构为主、文案为辅
- [ ] **A5 点击即落定**：点击牌背 → 立即写入 store（该位落定，不可逆）→ 原位 3D 翻牌；翻牌完成后**弹出揭示浮层**
- [ ] **A6 揭示浮层**：居中放大展示该牌，标注牌位名 + 牌名 + **正位/逆位** + 关键词；**不自动关闭**
- [ ] **A7 收起方式**：点「继续」按钮、点浮层外任意处、或按 ESC，三者均可收起；收起后留在 `/draw/select`（**不跳转**），该牌位变为空坑，紧凑槽位条更新，待选位前移
- [ ] **A8 连续选满**：选满 N 张前不离开子页；选满后底部出现「完成选牌」，点击 `push("/draw")`
- [ ] **A9 不可逆**：已选空坑与紧凑槽位条中的已填槽位均不可点击；无任何重选入口
- [ ] **A10 动画期间防误触**：翻牌/揭示期间点击其他牌无效；已落定的牌位不可重复选择
- [ ] **A11 退出语义**：左上角关闭按钮 `push("/draw")`，**退出 ≠ 放弃**——已选牌保留在 store，从情况页可再次进入接着选

### B. 选牌情况页 `/draw`

- [ ] **B1 去掉假等待**：点「开始解析」**同步**写入 store 并 `push("/result")`；点击后**不残留任何待触发的计时器**（旧实现的 500ms 遮罩即在此露馅）
- [ ] **B3 双入口保留**：点高亮空位与点「开始选牌」仍等价（均 `push("/draw/select")`）

### C. 首页 `/`

- [ ] **C1 去掉假等待**：提交问题后直接 `push("/draw")`，**不再有 666ms 假加载**
- [ ] **C2 问题回填**：从 `/draw` 返回首页时，问题输入框从 store 的 `question` 回填，不再要求重输

### D. 无障碍与动效

- [ ] **D1 `prefers-reduced-motion` 降级**：用户在系统开启"减弱动态效果"时，洗牌动画跳过、无限循环动画停用、翻牌改为淡入；由 `MotionConfig reducedMotion="user"`（覆盖 framer-motion）+ `globals.css` 的媒体查询（覆盖 CSS 动画）两层实现
- [ ] **D2 已知缺口登记**：键盘可达与屏幕阅读器支持**本轮不做**，作为已知缺口写入本文档「已知缺口」一节（不实现、不假装）

## 技术方案

### 1. `lib/drawFlow.ts`

- 新增常量 `SHUFFLE_DURATION_MS = 1200`。
- 保留 `FLIP_DURATION_MS`、`REVERSAL_PROBABILITY`、`randomReversal`、`firstEmptySlot`、`pickedIndexesFromSlots`、`buildPositionMeanings`。
- `pickedIndexesFromSlots` 语义不变，但消费方从"filter 掉已选牌"改为"渲染为空坑"。

### 2. `app/draw/select/page.tsx`（重写）

状态机：`shuffling → idle → flipping → revealing → complete`。

- **移除**：`setTimeout(FLIP_DURATION_MS)` 后自动 `router.push("/draw")` 的逻辑。
- **落定时序**：点击 → 立即写入 `selectedSlots`（落定）→ `flipIndex = index` → `FLIP_DURATION_MS` 后挂载揭示浮层。落定先于动画，保证"不可逆"名副其实。
- **网格**：`repeat(6, minmax(0, 1fr))`；渲染全部 78 张牌位，`pickedIndexesFromSlots` 命中的位置渲染空坑。
- **紧凑槽位条**：复用 `SpreadSlots` 的 `compact` 模式（该 prop 已存在但**当前无任何调用方**，本条目将其激活）。
- **洗牌**：进场时 78 张牌带随机初始位移/旋转，`SHUFFLE_DURATION_MS` 内归位；`useReducedMotion()` 为真时跳过。

### 3. `app/components/CardModal.tsx`（复用为揭示浮层，**不新建组件**）

`CardModal` 已具备揭示浮层所需的全部能力：居中放大、牌名、正/逆位、关键词、ESC 关闭、
点遮罩关闭（`onClick={onClose}` + 内容 `stopPropagation`），且它是 G15 契约中**唯一被枚举允许显式传 `sizes` 的组件**。

**唯一改动**：新增可选 prop `actionLabel?: string`——传入时在牌面下方渲染一个主按钮（点击调用 `onClose`）。
揭示浮层传 `actionLabel="继续"`；结果页沿用现状不传，行为不变。

> **这样做的理由**：新建一个 `RevealOverlay` 组件会（a）与 `CardModal` 职责重叠，违反 [AGENTS.md](../../AGENTS.md) 第 7 节奥卡姆剃刀；
> （b）**新增第二个 `sizes` 例外，直接冲击 G15/D12 的唯一小档不变量**（见「设计决策」第 12 条）。

### 4. DOM 契约（测试与实现的接口，**必须遵守**）

测试只断言这些显式契约与可观测结果，**不断言内联样式字符串、子元素下标或具体文案**（除非本节声明）。
这样列数、间距、动画机制等可自由实现，而契约本身可被证伪。

| 选择器 | 出现在 | 含义 |
|---|---|---|
| `[data-grid-columns="6"]` | 网格容器 | **新增**。列数无法从 jsdom 布局观测，故显式暴露为契约 |
| `[data-grid-cell="<牌组索引>"]` | 每个牌位（恒 78 个） | **新增**。顺序即网格排列顺序，选牌后**顺序不变** |
| `[data-picked-hole="<牌组索引>"]` | 已选牌位 | **新增**。空坑，无 `role`/`tabindex`，不可交互 |
| `[data-compact-slots="true"]` | 子页顶部槽位条容器 | **新增**。内部复用 `SpreadSlots` 的 `data-filled-card` / `data-empty-slot` |
| `[data-card-back="true"][data-index]` | 未选牌背 | 沿用 `GridCard` 既有契约 |
| `[data-testid="card-modal-overlay"]` / `-content` | 揭示浮层 | 沿用 `CardModal` 既有契约 |

### 5. 图片不变量

所有新增/改动的牌面渲染必须落在 `CARD_IMAGE_SIZES = "112px"` 的布局宽上限内：

| 位置 | 布局宽 | 是否越界 |
|---|---|---|
| 6 列网格单张 | 50.5px | ✅ |
| 紧凑槽位条（`w-16`） | 64px | ✅ |
| 情况页槽位（`w-24`） | 96px | ✅ |
| **揭示浮层（复用 CardModal，`sizes="320px"`）** | 256px | ✅ 走既有例外通道 |

改列数（6 → 其他）前必须复算该表并跑 `tests/card-image-variant.test.ts`。

### 6. 首页 `app/page.tsx`

- 删除 `setTimeout(..., 666)`，改为同步 `resetSession()` + `setQuestion()` 后直接 `router.push("/draw")`。
- `localQuestion` 初值改为从 store 读取当前 `question`，实现 C2 回填。

### 7. `app/layout.tsx` + `app/globals.css`

- 新增客户端边界组件 `app/components/MotionProvider.tsx`（`"use client"` + `MotionConfig reducedMotion="user"`），由 `layout.tsx` 包裹 `{children}`。**偏离原方案**，理由见「实现偏离记录」。
- `globals.css` 增加 `@media (prefers-reduced-motion: reduce)` 块，停用 `animate-pulse` 与 `.stars` 的 `@keyframes twinkle`。

## TDD 测试计划

> Red 阶段必须完成的测试清单；对应测试未通过（红）之前，不得开始实现（Green）。

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/draw/select/__tests__/page.test.tsx` | A2 网格 6 列 | `[data-grid-columns]` 为 `"6"`；78 个 `[data-grid-cell]` |
| `app/draw/select/__tests__/page.test.tsx` | A3 棋盘填满 | 选牌前后 `[data-grid-cell]` 的**顺序数组逐个相等**（不位移）；`data-index="7"` 不再是牌背、改为空坑 |
| `app/draw/select/__tests__/page.test.tsx` | A4 紧凑槽位条 | 结构断言为主：`[data-compact-slots]` 内已填/空槽位数为 `{0,3}` → `{1,2}`；文案为辅（容忍空白差异） |
| `app/draw/select/__tests__/page.test.tsx` | A5+A6 点击即落定并揭示 | 点牌后牌面挂载、揭示浮层出现；浮层含牌位名、牌名、正/逆位文案 |
| `app/draw/select/__tests__/page.test.tsx` | A7 三种收起方式 | 点「继续」/ 点浮层遮罩 / 按 ESC 均关闭浮层，且 **`router.push` 未被调用**（停留在子页） |
| `app/draw/select/__tests__/page.test.tsx` | A7 收起后状态推进 | 收起后该位为空坑、紧凑槽位条计数 +1、待选位前移 |
| `app/draw/select/__tests__/page.test.tsx` | A8 连续选满 | 连续选满 M 张全程不调用 `router.push`；选满后出现「完成选牌」，点击 `push("/draw")` |
| `app/draw/select/__tests__/page.test.tsx` | A9 不可逆 | **正面断言**：未选满时全页按钮集合恰为 `["关闭选牌"]`（任何形态的重选入口都会使其失败）；空坑无 `role`/`tabindex`；点击空坑不改槽位 |
| `app/draw/select/__tests__/page.test.tsx` | A10 防误触 | 翻牌/揭示期间点其他牌不改变 `selectedSlots` |
| `app/draw/select/__tests__/page.test.tsx` | A11 退出不放弃 | 关闭按钮 `push("/draw")`；返回后 store 中 `selectedSlots` 保持已选内容 |
| `app/draw/select/__tests__/page.test.tsx` | A1 洗牌（reduced-motion 跳过） | mock `useReducedMotion` 为 `true` 时进场即可点击；为 `false` 时 `SHUFFLE_DURATION_MS` 内点击无效 |
| `app/draw/__tests__/page.test.tsx` | B1 去掉假等待 | 点「开始解析」后未经计时器推进即 `push("/result")`；**正面断言 `vi.getTimerCount() === 0`**（任何假等待都会留下待触发计时器） |
| `app/__tests__/page.test.tsx` | C1 去掉假等待 | 提交问题后不推进计时器即 `push("/draw")` |
| `app/__tests__/page.test.tsx` | C2 问题回填 | store 中 `question` 非空时，输入框 `value` 等于该问题 |
| `app/components/__tests__/CardModal.test.tsx` | `actionLabel` 主按钮 | 传时按钮集合多出该项且点击调用 `onClose`；**不传时按钮集合恰为 `["关闭"]`**（正面断言，结果页行为不变） |
| `app/components/__tests__/CardModal.test.tsx` | 既有行为回归 | ESC / 点遮罩 / 点关闭按钮的既有断言全部保持通过 |
| `tests/css-contract.test.ts` | D1 reduced-motion 契约 | 块内须含**真实的 `animation:` 属性声明**（注释不算）；须覆盖 `.astro-stars` 的 twinkle 与 `.animate-pulse`，**或**用通配符统一降级 |
| `tests/card-image-variant.test.ts` | 图片不变量回归 | 既有 7 条断言全绿；`sizes` 例外仍**只有** `CardModal.tsx` 一处（本条目复用而非新增例外） |

## 影响范围

**新增**
- `docs/plan/g17-draw-ritual.md`（本文）
- `app/components/MotionProvider.tsx`（客户端边界，见「实现偏离记录」）
- （测试）`app/draw/select/__tests__/page.test.tsx` 大幅扩写

**修改**
- `app/draw/select/page.tsx`（重写：连续选满 + 棋盘填满 + 洗牌 + 揭示浮层 + 紧凑槽位条）
- `app/draw/page.tsx`（B1 去遮罩；并删除随之不可达的 `useState` 导入）
- `app/page.tsx`（C1 去假加载、C2 问题回填；并删除随之不可达的 `isLoading` 状态与 spinner 分支）
- `app/components/CardModal.tsx`（新增可选 `actionLabel`）
- `app/components/SpreadSlots.tsx`（`compact` 分支由死代码转为活代码，并改为不渲染含义）
- `app/layout.tsx`（挂载 `MotionProvider`）
- `app/globals.css`（`prefers-reduced-motion` 块）
- `lib/drawFlow.ts`（新增 `SHUFFLE_DURATION_MS`）
- `tests/css-contract.test.ts`（新增 D1 契约）
- `docs/archive/draw-interaction.md`（G9/G10/G11 就地补「后续变更」指针，**不改写历史结论**）

**删除**
- 无文件删除。两处因去掉假等待而不可达的代码被就地删除（`app/page.tsx` 的加载态、`app/draw/page.tsx` 的 `useState` 导入）——不留"看起来还活着"的死分支。

## 风险与假设

- **风险（高）｜不可逆 + 热区仅 50.5px，误触无兜底**：设计决策第 5、6 条明确拒绝重选与确认按钮，
  使误触代价从"再点一次"提升为"整局作废"。热区由 37.6px 提升到 50.5px 只是缓解，不是解决。
  **本风险由负责人明确接受**，记录在此而非以隐藏的确认弹窗规避。若真机验证误触率偏高，第一备选是
  上浮到 5 列（60.6px），第二备选是重开"揭示浮层内换一张"（即撤销决策 6）。
- **风险（中）｜7 张牌阵要经历 7 次「浮层弹出 + 收起」**：连续性仪式在重复 5 次之后是否变成负担，只有真机可验。
  缓解：收起通道有三条（按钮 / 点浮层外 / ESC），其中点浮层外与 ESC 的摩擦接近零。
- **风险（中）｜洗牌动画与 78 张牌的渲染性能**：78 个带 `transform` 的入场动画在低端机上可能掉帧。
  reduced-motion 路径天然规避；需真机验证普通路径。
- ~~**风险（低）｜`MotionConfig` 的可用性**~~：**已核实**——`framer-motion@12.33.0` 的 `MotionConfig` 与 `useReducedMotion` 均为可解析导出（`typeof === "function"`），本风险消除。
- **假设**：揭示浮层复用 `CardModal` 不改变其在结果页的既有行为（新增 prop 可选、默认不渲染按钮）。
- **假设**：`SpreadSlots` 的 `compact` 模式尺寸（`w-16 h-24`）足以承载 7 槽位而不在移动端严重换行；若换行过多需调整尺寸。

## 设计决策（本次对齐结论）

> 本节记录决策及其**推翻了哪条既有规格**。收口归档时，其中具长期性的条目移入 `docs/README.md` 的「决策记录」。
>
> **⚠️ 第 2–13 条中有五条已被「第二轮修订」（见下）推翻**：决策 3（改为飞入/缩回）、
> 决策 4 的呈现（空坑→已选牌面）、决策 9（去掉槽位条）、以及新增的「删掉原地翻牌」反向被推翻。
> 以「第二轮修订」为**最终**结论；下表保留首轮历史仅供追溯，**不改写**。

| # | 决策 | 影响 |
|---|---|---|
| 1 | 抽牌流程第一优先级 = **仪式感** | 定性决策，其余全部由它推导 |
| 2 | 子页内**连续选满**，完成后一次返回 | **推翻 G10**「点选一张 → 自动返回 /draw」；往返 2N → 2 |
| 3 | 揭示 = **居中放大浮层**，停留至用户收起 | 新增；替掉 38px 画布 + 700ms 零驻留。⚠️ 第二轮修订为「飞入/缩回」 |
| 4 | 网格 = **棋盘填满**（保留原位 + 空坑） | **推翻 G9**「选过的牌从牌堆中减去（不再渲染、网格重排）」。⚠️ 空坑改已选牌面 |
| 5 | **不可逆**：不提供任何重选 | 明确拒绝"任意重选/线性回退/重新抽牌"三种方案 |
| 6 | **点击即落定**，揭示浮层只做展示、无确认 | 明确拒绝"浮层内换一张"与"长按松手落定" |
| 7 | 网格 **6 列**（37.6px → 50.5px） | 改 **G11** 的 `repeat(8, ...)`；恰好跨过 44px 热区门槛 |
| 8 | 进场**洗一次牌**（约 1.2s 动画） | 新增；不引入任何手势（G9 已移除手势，本条目不恢复） |
| 9 | 子页顶部**常驻紧凑槽位条** | 新增；激活 `SpreadSlots` 无调用方的 `compact` 分支。⚠️ 第二轮移除 |
| 10 | 无障碍**只做 `prefers-reduced-motion`** | 键盘可达与屏幕阅读器明确列为已知缺口 |
| 11 | 清掉 666ms / 500ms 假等待 + 回填首页问题 | 链路省 1.2s；修复 C2 缺陷 |
| 12 | 揭示浮层**复用 `CardModal`** 而非新建组件（**负责人已确认**，含其 `actionLabel` 公共 API 变更） | 避免新增第二个 `sizes` 例外，守住 G15/D12 唯一小档不变量；符合奥卡姆剃刀 |
| 13 | 浮层收起除按钮外，**支持点浮层外任意处** | `CardModal` 既有行为，复用即得 |

## 第二轮修订（负责人反馈，最终结论）

> 2026-09-17，实现完成后负责人提出六条交互意见 + 一个 bug。本节能改动的全部采纳，
> **推翻首轮部分决策**（上表已标注 ⚠️）。以下是最终形态的完整决策表。

| # | 决策 | 推翻了首轮的哪条 |
|---|---|---|
| 2R | **去掉常驻紧凑槽位条**：选牌页是纯选牌的，已选信息改由网格已选位直接承载 | 决策 9 |
| 3R | 页头收敛为**两行纯文字**：`为「现在」选一张牌` / `「猫咪想说」的起点 · 已选 3/7` | A4 的「大号含义卡片」 |
| 4R | **点击牌背 → 立即落定 + 立即飞入揭示**，删掉「先原位翻 700ms」这一拍 | 首轮实现细节（决策 3 的时序） |
| 5R | 飞入 = 在源格处**旋转翻面（背→正）+ 放大 + 移到中央**，一次连续运动，500ms | 决策 3 |
| 6R | 收起 = 从中央**缩回源格（保持正面）**，落位为已选态，280ms（刻意短于飞入：飞入是仪式、缩回只是归位） | 决策 3 |
| 7R | 已选位 = **全亮牌面 + 1.5px 金色描边 + 轻微外发光**（不加暗蒙层、不用 ✓ 角标） | 决策 4 的「空坑」呈现 |
| 8R | 蒙层 = **淡紫半透明**（`purple-950/45 + blur-sm`），黑蒙层在浅紫底上是黑墙 | 首轮 `black/85` |
| 9R | 揭示形态**隐藏右上角关闭 icon**，退出由「确认」按钮与点击蒙层承担 | 决策 13 的呈现 |
| 10R | `GridCard` 降为**静态牌背**，3D 翻转机制搬到 `CardModal` 的飞行元素上 | 首轮「GridCard 原地翻牌」 |
| 11R | **修复存量 bug**：每局洗一次牌、整局固定 | 见「缺陷记录」 |

### 第二轮附带的设计约束

- **牌背必须共用**：飞行元素在 t=0 要与它替换掉的那个格子**完全一样**，否则起飞瞬间会闪。
  新增 `CardBack` 共用组件。
- **飞行期间锁定页面滚动**，否则缩回的目标格会移位。
- **缩回必须有可观测的结束时刻**（落位发生在动画结束时）→ 显式 `closing` 相位 + 计时器，
  而非 `AnimatePresence`（它在 jsdom 下退场完不成，且要落位时刻）。

## 缺陷记录（本条目顺带修复）

**牌序从未打乱（G8 以来的存量 bug）**：

`app/draw/select` 直接渲染 `tarotCards` 的固定数据顺序，`handleCardSelect(index)` 取 `tarotCards[index]`。
于是「第 1 格永远是愚者」，习惯性点同一位置的用户每次占卜都抽到同一张牌。

- `lib/shuffle.ts`（O4 修好的 Fisher-Yates）唯一的生产调用方一直是 `/api/suggested-questions`；
  `git log -S "shuffle("` 在 `app/draw` 下零命中。
- 初版（`3f5c50e`）用 `getRandomCards(cardCount)` 随机抽，但那时的 bug 是**点击位置与抽到的牌毫无关系**；
  G6/G8 把 `tarotCards[index]` 接上，修好了因果，却把随机性一起丢了；
  `getRandomCards` 随 `lib/pick.ts` 于 2026-09-16 作为死代码删除。一次正确的修复换掉一个 bug、留下另一个。
- 首轮 G17 的「洗牌动画」是在为一个**不存在的随机性**做表演。

**修复**：`createDeckOrder()`（Fisher-Yates 生成 0..77 的排列）+ store 非持久化 `deckOrder`；
`resetSession()` 生成、`/draw` 加刷新兜底；每局只洗一次（局中重洗会让"关掉浮层后重点同一格"得到不同的牌）。
测试：S3 断言「点击位置 p 落定的是 `deckOrder[p]`」；lib 断言它确实是排列。

## 实现偏离记录

实现过程中与原方案的三处偏离，以及一处**实现缺陷自纠**：

| # | 偏离 | 理由 |
|---|---|---|
| 1 | **不直接 `import { MotionConfig }` 进 `layout.tsx`**，改为新增客户端边界组件 `MotionProvider.tsx` | `layout.tsx` 是 Server Component，而 `MotionConfig` 需要 Client Context。已核实 `framer-motion@12.33.0` 的 **ESM** 构建带 `"use client"` 指令、但 **CJS** 构建（`dist/cjs/index.js`）中该指令为 0 处——把"Next 恰好解析到 ESM"当作契约太脆。显式界线更可靠，构建已验证通过。 |
| 2 | **揭示浮层不套 `AnimatePresence`** | 退场期间节点仍留在 DOM：浮层按钮仍可点，且一层 `fixed inset-0` 仍盖着网格。对"点击即落定、连续选满 N 张"的流程，这等于**每次收牌后多出一段约 300ms 的点击死区**。入场动画（弹簧缩放）由 `CardModal` 自身承担，它才是揭示感的来源。<br>附带事实：在本仓库的 jsdom + Vitest 环境下，推进假计时器（含一并 fake `requestAnimationFrame`/`performance`）**都无法**驱动 `AnimatePresence` 完成退场卸载——决定不为此在生产代码里做妥协。 |
| 3 | **`SpreadSlots` 的 `compact` 模式改为不渲染含义** | 见下「实现缺陷自纠」。compact 是"进度条"而非"阅读面"，含义由页头大号卡片承担。 |

### 实现缺陷自纠

初版实现中，选牌子页**页头**渲染了「当前待选位含义」的大号卡片，而**紧凑槽位条**里的 `SpreadSlots` 又把每个位的含义渲染了一遍——同一句话在屏幕上出现两次。

这正是本条目在 grilling 阶段批评过的"三处说同一件事"的冗余，实现时又犯了一遍；由 A2 测试（`Found multiple elements with the text`）撞出。已按上表第 3 条修正，并补进上表以免重蹈。

## 测试覆盖的边界（哪些靠自动化、哪些只能人工）

诚实划界，避免"有测试 = 已验证"的错觉：

| 验收项 | 自动化覆盖 | 说明 |
|---|---|---|
| A1–A11、B1、C1–C2 | ✅ 单元/组件测试 | 断言均为可证伪的正面形式 |
| **D1 reduced-motion** | ⚠️ **仅结构与接线** | 测试用 `vi.mock` 替换了 `useReducedMotion`，验证的是"页面逻辑会读这个 hook"**而非**真机行为；`MotionConfig` 与 CSS 媒体查询只有源码级文本匹配（`css-contract`）。**真机降级效果须人工验收** |
| A2 的「单张牌宽 ≥ 44px」 | ❌ jsdom 无布局 | 只能人工在 375px 设备/模拟器上量 |
| 洗牌动画观感、78 张入场性能 | ❌ | 人工真机验收（SPEC 风险区已记录低端机掉帧风险） |
| 失效文案已清除 | ❌ 刻意为之 | 见「收口动作」——不做无法证伪的断言 |

### 第三轮修订（负责人反馈 2，纯视觉/交互微调）

| 验收项 | 自动化覆盖 | 说明 |
|---|---|---|
| 正/逆位并入牌名一行 | ✅ 部分 | 现有 G7/S5 断言「正位/逆位」文本仍在（span 而非独立 p），但「同一行」是视觉结果，jsdom 无布局不可断言 → **观感须人工验收** |
| 吸顶 + 吸顶变一行 | ❌ | 依赖真实滚动与 `getBoundingClientRect`，jsdom 布局全 0 → 人工验收 |
| 锁滚动不闪动 | ❌ | `scrollbarWidth` 在 jsdom 恒 0，补偿分支不触发 → 人工在「始终显示滚动条」的系统上验收 |
| 蒙层 `/60 + blur-md`、按钮底部悬浮满宽 | ❌ | 纯视觉/触达，人工验收（尤其按钮与牌名的间距是否仍重叠，须在 375px 高度真机看） |

## 已知缺口（本轮明确不实现）

按 [AGENTS.md](../../AGENTS.md) 第 1 节「能力不够就停下来报告差距，而不是假装做完」，
以下为**已知且被明确接受**的缺口，不以"已支持无障碍"含糊表述：

- **键盘不可达**：`GridCard` 为裸 `<div onClick>`，无 `role="button"`、无 `tabIndex`、无键盘事件处理。
  键盘用户**无法完成选牌**。
- **屏幕阅读器体验错误**：`aria-label` 为 `牌 1` … `牌 78`，对 SR 用户是 78 个无差别选项。
  正确心智模型应是「从牌堆抽一张」这一**动作**，而非 78 选 1；本轮未实现该替代路径。
- **揭示浮层无 `aria-live` 播报**：选牌结果不向 SR 用户播报。

## 收口动作（完成时执行，非现在）

- [ ] `README.md` 功能特色第 2 条「流畅抽牌体验（8 列）」同步为新交互形态
      —— **经负责人确认，此项推迟到验收时执行，不在实现阶段改动**
      （依 [AGENTS.md](../../AGENTS.md) 第 1 节，约束是"完成之前更新文档"，而非"编码之前"）
- [ ] `docs/README.md`「条目状态」补 G17 一行；若第 12 条被认定为长期决策，同步补入「决策记录」D14
- [ ] `docs/archive/draw-interaction.md` 的 G9/G10/G11 各补一行「后续变更」（**不改写历史结论**）
- [ ] 本文移入 `docs/archive/g17-draw-ritual.md`，顶部加归档日期与"不描述当前状态"声明
- [ ] 跨 `代码 / docs/ / tests/` grep `8 列`、`选完自动返回`、`剩 N 张`、`减去已选` 等术语，消除不一致
      —— **失效文案的清除靠这道 grep 兜底，不设单元测试**：断言"某句话不存在"无法证伪
      （实现只要换个说法就能溜过），属于本 SPEC 明确拒绝的**假绿**形态
