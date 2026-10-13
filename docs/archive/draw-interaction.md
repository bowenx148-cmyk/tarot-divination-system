# 🟢 绿级：抽牌交互模块重做（G8）

> ⚠️ **本文是历史记录，不描述当前状态。** G8–G13 已完成并归档。

> **后续变更（G17，2026-09-18）**：本文的选牌交互已被
> [G17](./g17-draw-ritual.md) 重做，三处结论不再成立，**原文保留不改写**：
> - **G9**「选过的牌从牌堆中减去（不再渲染、网格重排）」→ 改为**棋盘填满**（牌位位置全程不变，已选位显示牌面 + 金色描边）
> - **G10**「点选一张 → 自动返回 /draw」→ 改为**子页内连续选满**，完成后一次返回（往返 2N → 2）
> - **G11** select 网格 `repeat(8, ...)` → 改为 **6 列**（37.6px → 50.5px，跨过 44px 热区门槛）
>
> 另：G8 记录的「点击的牌即抽到的牌」在 G9–G16 期间**只兑现了因果、丢了随机**——
> 牌序从未打乱（第 1 格永远是愚者），该存量缺陷已由 G17 修复。


> 塔罗占卜 H5 抽牌交互模块需求说明的落地条目（最终形态）：选牌情况页（未完成/完成两态）→ 选牌子页（剩余牌 8 列平铺）→ 逐张选牌（点击即选 + 原位翻牌）→ 情况页槽位回填 → 完成页（开始解析）→ 结果页（核心建议前置 + 免责声明）。G8–G10 为演进历史存档，最终交互以 G10/G11/G12/G13 为准。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| G8 | 抽牌交互模块重做（点击即选 + 原位翻牌 + 飞入槽位 + 多轮循环） | 质量提升（交互） | ✅ 完成 |
| G9 | 选牌改为平铺网格（移除扇形/旋转/缩放，减去已选牌） | 质量提升（交互） | ✅ 完成（网格移至 /draw/select 子页；13×6 已由 G11 改一行 8 张） |
| G10 | 选牌拆分为「选牌情况页」与「选牌子页」 | 质量提升（交互） | ✅ 完成 |
| G11 | 选牌/结果展示优化（select 一行 8 张；核心建议前置；结果页排版+位置标注） | 质量提升（交互/视觉） | ✅ 完成 |
| G12 | 核心建议结论先行（prompt 顺序 + 解析顺序无关） | 质量提升（AI 输出结构） | ✅ 完成 |
| G13 | 结果页末尾 AI 免责声明 + 牌背图案恢复 | 质量提升（视觉/合规） | ✅ 完成 |

---

## [G8] 抽牌交互模块重做

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: ✅ 完成
- **关联条目**: G6（牌桌抽牌体验：点击的牌即抽到的牌，30% 逆位保留）

### 问题描述

- 现状：`app/draw/page.tsx` 为「推荐牌阵 → 一次性选满 N 张 → 逐张点击揭示」三段式流程；选牌界面无轮盘旋转（仅横向原生滚动）、无惯性；翻牌与牌面填入是分离步骤。
- 问题：与需求不符——需要「初始牌阵空位 → 扇形轮盘 → 点击即选中（无确认按钮）→ 原位 3D 翻牌 → 缩小飞入目标槽位 → 自动聚焦下一空位 → 循环至填满 → 完成页仅有开始解析」的连贯体验。
- 影响：交互割裂、体验差；且完成页无"开始解析"入口（旧流程为"获取AI解读"）。

### 目标

将 `app/draw/page.tsx` 重做为 G8 流程：spread（空牌阵 + 点击选牌）→ draw（扇形轮盘逐张选牌，单指旋转 + 双指缩放 + 惯性阻尼 + 双击空白缩放，点击即选中并原位翻牌，随后飞入槽位并聚焦下一空位）→ complete（牌阵齐 + 开始解析）。

### 验收标准

- [ ] 初始页顶部展示牌阵空槽位（虚线/半透明），槽位下方文案结合占卜问题动态生成；底部主按钮文案为"点击选牌"
- [ ] 点击"点击选牌"进入选牌界面：78 张牌背组成扇形轮盘
- [ ] 单指滑动旋转轮盘，松手后有惯性阻尼滑动；双指捏合缩放；双击空白区域缩放
- [ ] 点击牌背即选中：无"确定/换一张"等确认按钮，该牌原位执行 3D 翻牌展示正面
- [ ] 翻牌完成后该牌缩小平滑飞入当前聚焦的空槽位；槽位填充后高亮聚焦下一个空位，选牌界面保持待命
- [ ] 上一轮的手势缩放/旋转状态在进入下一轮选牌时重置
- [ ] 所有槽位填满后进入完成界面：仅一个"开始解析"主按钮，无"补充更多信息"按钮
- [ ] 点击的牌即抽到的牌（`tarotCards[index]`），30% 概率逆位；已选牌不可重复选择

### 技术方案

新增纯逻辑与手势、组件，重写页面状态机：

1. **`lib/drawFlow.ts`（新增）**：纯函数与常量——`extractQuestionTheme`（从问题提取简短主题短语）、`buildPositionMeanings`（结合问题动态生成牌位含义，含"起点/核心/方向"等诗意模板）、动画时长常量 `FLIP_DURATION_MS`（翻牌 700ms）、`FLY_DURATION_MS`（飞入 650ms）、`REVERSAL_PROBABILITY`（0.3）。
2. **`lib/useFanWheelGesture.ts`（新增）**：轮盘手势 hook——单指拖动按 `dx+dy*0.35` 旋转（灵敏度 0.14°/px）；松手时按最近速度启动 rAF 惯性（阻尼 0.94/帧，阈值 0.18°/ms，0.02°/ms 停止）；双指捏合以距离比缩放（0.4–2.5）；双击空白（320ms/40px 内、未落在牌背上）切换缩放 1 ↔ 1.75；滚轮旋转；`ignoreClick()` 抑制拖动后的误触；`reset()` 重置旋转与缩放（每轮选牌后调用）。
3. **`app/components/CardFace.tsx`（新增）**：牌面（图片/回退 + 逆位琥珀描边），供扇形牌正面、飞入克隆、槽位填充共用。
4. **`app/components/FanCard.tsx`（新增）**：扇形单张牌，内部 3D 翻转容器（`perspective-1000 / transform-style-3d / backface-hidden / rotate-y-180`，framer-motion `animate rotateY`），带 `data-card-back`/`data-index` 供测试与点击。
5. **`app/components/SpreadSlots.tsx`（新增）**：牌阵槽位条（空位虚线占位、已填牌面 + 金光、聚焦位高亮放大），槽位注册 `ref` 供飞入动画取目标矩形。
6. **`app/draw/page.tsx`（重写）**：状态机 `spread → draw → complete` + `animPhase: idle → flipping → flying`；点击选牌后 `setTimeout(FLIP_DURATION_MS)` 启动飞入（捕获扇形牌与槽位 `getBoundingClientRect`，`position:fixed` 克隆以 transform 平移/缩放 + 上抛弧线飞向槽位），`setTimeout(FLY_DURATION_MS)` 提交填充（槽位写入 + 聚焦下一空位 + `gesture.reset()`），选满后写入 store（`setDrawnCards/setCardReversals`）并进入 complete。步骤切换用条件渲染（不依赖 AnimatePresence 退场，规避动画卡死回归）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/drawFlow.test.ts` | 主题提取/动态含义 | 去标点疑问词、空串回退、超长截断；含义含主题与诗意模板；单张牌阵、超长牌阵回退 |
| `lib/__tests__/useFanWheelGesture.test.ts` | 手势 | 单指拖动改变旋转、双指捏合缩放、双击空白缩放、reset 重置、拖动后抑制点击 |
| `app/draw/__tests__/page.test.tsx` | 流程 | 初始页 3 空位 + 动态文案 + 点击选牌；78 张牌背盲选；点击即选（无确认按钮）→ 翻牌 → 飞入 → 槽位填充并聚焦下一空位；多轮选满 3 张 → 完成页（开始解析、无补充更多信息）；动画期间/已选牌重复点击无效 |

### 影响范围

- 新增：`lib/drawFlow.ts`、`lib/useFanWheelGesture.ts`、`app/components/CardFace.tsx`、`app/components/FanCard.tsx`、`app/components/SpreadSlots.tsx` 及对应测试
- 修改：`app/draw/page.tsx`、`app/draw/__tests__/page.test.tsx`、`docs/README.md`、`docs/archive/40-green-improvements.md`
- 删除：`lib/useSpreadZoom.ts`（G8 重写后无调用方，随 G13 文档审查清理）；`lib/pick.ts` 当时保留，后于 **2026-09-16 删除**（选牌子页改用 `pickedIndexesFromSlots`，该文件仅剩自身测试引用）

### 风险与假设

- 假设：翻牌/飞入时长用固定 `setTimeout` 驱动状态机，framer-motion 仅负责视觉，避免动画回调时序依赖。
- 风险：jsdom 下 `getBoundingClientRect` 全 0，飞入克隆坐标在测试中不可断言（仅断言 DOM 存在与最终填充结果）。
- 备选方案：飞入动画曾考虑 framer-motion `layoutId` 魔法动效，但跨树同步时序复杂，改用固定定位克隆 + transform 动画，可控性强。

---

## [G9] 选牌改为平铺网格（移除扇形/旋转/缩放）

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: ✅ 完成
- **关联条目**: G8（翻牌/飞入/多轮循环/完成页流程复用）
- **后续变更**: 网格列数 13×6 已由 G11 改为一行 8 张；牌背已恢复 🌟 TAROT 图案（G13）。

### 问题描述

- 现状：G8 选牌界面为 78 张扇形轮盘，依赖单指旋转、双指缩放、惯性阻尼、双击缩放等手势（`lib/useFanWheelGesture.ts`）。
- 问题：用户明确要求移除扇形轮盘及旋转/缩放手势，改为直接平铺选牌。
- 影响：交互显著简化，移动端无手势学习成本；选过的牌需要从牌堆中减去。

### 目标

选牌界面改为 **13 列 × 6 行平铺网格（78 张）**；移除旋转/缩放/惯性/双击手势；选过的牌从牌堆中**减去**（不再渲染、不可再选，提交填充后网格重排）；翻牌/飞入/聚焦下一空位/完成页流程与 G8 保持一致。

### 验收标准

- [ ] 选牌界面以 13 列 × 6 行平铺渲染 78 张牌背（无扇形 rotate 样式、无缩放 transform、无手势层）
- [ ] 界面无旋转/缩放/惯性/双击手势（无 touch-none 手势容器、无 wheel/pointer 缩放处理）
- [ ] 点击牌背即选中：原位 3D 翻牌 → 缩小飞入当前槽位 → 聚焦下一空位（与 G8 相同，无确认按钮）
- [ ] 选中并填充后，该牌从牌堆中减去（不再渲染、不可再选），剩余牌网格重排
- [ ] 动画期间其他牌不可点击；已选中的牌不可重复选择
- [ ] 选满后进入完成界面（完整牌阵 + 仅"开始解析"按钮）

### 技术方案

1. **删除**：`lib/useFanWheelGesture.ts`、`lib/__tests__/useFanWheelGesture.test.tsx`（旋转/缩放/惯性/双击不再使用）。
2. **重命名并改造**：`app/components/FanCard.tsx` → `app/components/GridCard.tsx`——去掉 angle/rotate 与固定宽高，根节点 `w-full aspect-[2/3]` 自适应 13 列 grid 单元格；牌背简化为渐变 + 描边（小尺寸不渲染文字装饰）；牌面仍延迟挂载（保持严格盲选）。
3. **`app/draw/page.tsx`**：移除手势 hook 使用及手势层（`overflow-hidden`/`touch-none`/`onWheel`/`onPointer*` 全部移除）；以 `gridTemplateColumns: repeat(13, minmax(0, 1fr))` 平铺 78 张；`gridCards = tarotCards.filter(c => 未选 || c 正在动画)`（动画中的牌暂留原位用于翻牌/飞入，提交填充后移除并网格重排）；翻牌/飞入/聚焦/完成状态机复用 G8。
4. 提示文案更新为"点击牌背即选 · 选过的牌会从牌堆中移出"。

### TDD 测试计划

> Red 阶段必须完成的测试清单；对应测试未通过（红）之前，不得开始实现（Green）。

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/draw/__tests__/page.test.tsx` | 平铺网格 13 列 × 6 行 | grid 容器 `gridTemplateColumns` 含 13 列；78 张 `[data-card-back]`；牌无 rotate 样式；无缩放/旋转提示文案 |
| `app/draw/__tests__/page.test.tsx` | 选过的牌从牌堆减去 | 选第 7 张并完成填充后 `[data-index="7"]` 消失、总数 77；选满 3 张后总数 75 |
| `app/draw/__tests__/page.test.tsx` | 点击即选 → 翻牌 → 飞入 → 聚焦下一空位 | 与 G8 相同（无确认按钮、槽位填充、进度 1/3） |
| `app/draw/__tests__/page.test.tsx` | 动画期间点击无效 + 已选不可重复选 | 与 G8 相同（翻牌/飞入期间点其他牌不生效） |
| `app/draw/__tests__/page.test.tsx` | 多轮循环选满进入完成页 | 与 G8 相同（开始解析、无补充更多信息、store 一一对应） |

### 影响范围

- 删除：`lib/useFanWheelGesture.ts`、`lib/__tests__/useFanWheelGesture.test.tsx`、`app/components/FanCard.tsx`
- 新增：`app/components/GridCard.tsx`
- 修改：`app/draw/page.tsx`、`app/draw/__tests__/page.test.tsx`、`docs/README.md`、`docs/archive/40-green-improvements.md`

### 风险与假设

- 假设：13 列在移动端牌宽约 22px，牌背仅显示渐变 + 边框（去掉文字/星标装饰）；牌面图片按 `object-cover` 缩放显示。
- 风险：提交填充瞬间网格重排会轻微跳动（符合"减去"预期）；无手势后点击即选，需保留 `ignoreClick` 之外的防误触逻辑（无滚动/拖拽场景，无需抑制）。
- 备选方案：如需保留少量浏览能力，可保留页面级滚动（grid 随页面滚动），不做轮盘手势。---

## [G10] 选牌拆分为「选牌情况页」与「选牌子页」

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: ✅ 完成
- **关联条目**: G8（翻牌/多轮循环）、G9（13×6 平铺网格 + 减去已选牌）

### 问题描述

- 现状：G8/G9 把选牌（网格、翻牌、飞入、聚焦）内联在 `/draw` 单页，页面既展示槽位又展示选牌堆。
- 问题：用户要求把「选牌情况页」与「选牌页」分离——/draw 只做两态状态机（未完成/完成）；真正的选牌移到可关闭的独立子页。
- 影响：交互更清晰；未完成时仅高亮一个待选空位并可点击，点击与"开始选牌"等价。

### 目标

- **/draw（选牌情况页）**：状态机仅两态——未完成选牌 / 完成选牌。展示已选牌（填充槽位）与待选空位（虚线占位）；未完成时**仅高亮一个待选空位**（按顺序）且其可点击，点击与底部"开始选牌"按钮等价 → 跳转子页；完成时仅"开始解析"。
- **/draw/select（选牌子页，独立路由**）：排列剩余张数（78 − 已选）的牌，13×6 平铺网格；**不展示空位与已选牌**；顶部标注当前选牌位置（第一个未选槽位）的含义；可关闭（返回 /draw，不改变已选）；点击一张牌 → 原位翻牌 → 自动写入该槽位并返回 /draw（情况页槽位入场填充）。

### 验收标准

- [ ] /draw 首次进入（未完成）：展示牌阵名 + 问题 + 全部空槽位；"已选 0 / N"；底部按钮为"开始选牌"
- [ ] 未完成时仅高亮一个待选空位（第一个未选），且该空位可点击；其余空位不可点击
- [ ] 点击"开始选牌"或点击高亮空位 → 跳转到 /draw/select（效果一致）
- [ ] /draw/select 排列剩余张数（78 − 已选），13×6 网格；无 data-slot/空位/已选牌结构；顶部标注当前选牌位置含义
- [ ] /draw/select 点选一张 → 原位翻牌 → 写入该槽位并返回 /draw；关闭按钮 → 返回 /draw 不改变已选
- [ ] 部分已选后回到 /draw：显示已填槽位（牌面）+ 聚焦下一个空位（仅该空位可点击）
- [ ] 全部填满后 /draw 进入完成态：仅"开始解析"，点击写入 store 并跳转 /result

### 技术方案

1. **`lib/drawFlow.ts`**：新增 `SelectionFill` 接口（槽位填充记录）、`firstEmptySlot`（第一个未选槽位索引）、`pickedIndexesFromSlots`（已选牌索引）；删除恒量 `FLY_DURATION_MS`（跨页飞入已移除，翻牌动画保留 `FLIP_DURATION_MS`）。
2. **`lib/store.ts`**：新增非持久化 `selectedSlots: (SelectionFill | null)[]` 与 `setSelectedSlots`（两页共享内存态；`partialize` 仍只持久化 readings + encryptedApiKey）。
3. **`app/components/SpreadSlots.tsx`**：改用 `SelectionFill`；新增 `onSlotClick` 回调——仅聚焦（第一个未选）空位高亮且可点击，其余空位不可点击；移除仅飞入动画使用的 `registerSlotRef`。
4. **`app/draw/page.tsx`（重写为情况页）**：两态状态机（`firstEmptySlot` 为 null 即完成）；展示槽位 + "开始选牌"/"开始解析"；onSlotClick 与按钮均 `router.push("/draw/select")`；完成时写入 drawnCards/cardReversals 并跳转 /result。
5. **`app/draw/select/page.tsx`（新增子页路由）**：读取 store 的 `selectedSlots`；`remainingCards = tarotCards.filter(未选)`（13×6 网格 + 减去已选）；顶部标注 `meanings[firstEmptySlot]`；点选 → 本地 `flipIndex` 原位翻牌 → `setTimeout(FLIP_DURATION_MS)` 后写入该槽位并 `router.push("/draw")`；关闭按钮 `router.push("/draw")`；若已全满则 `router.replace("/draw")`。
6. **`app/components/GridCard.tsx`**：复用为子页网格牌（原 FanCard 已改名，无需再改）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/draw/__tests__/page.test.tsx` | 未完成状态 | 3 空槽位 + "开始选牌"按钮；仅聚焦空位 role=button；其余空位不可点；动态含义 |
| `app/draw/__tests__/page.test.tsx` | 开始选牌/点聚焦空位跳转 | 两者均 `push("/draw/select")` |
| `app/draw/__tests__/page.test.tsx` | 非聚焦空位不可点击 | 点击不触发跳转 |
| `app/draw/__tests__/page.test.tsx` | 部分已选 | 已填槽位显示牌面；聚焦下一空位可点 |
| `app/draw/__tests__/page.test.tsx` | 完成态 | 仅"开始解析"；点击写入 store 并 `push("/result")` |
| `app/draw/select/__tests__/page.test.tsx` | 排列剩余 78 张 | 78 张牌背；标注当前位置含义；无空位/已选结构 |
| `app/draw/select/__tests__/page.test.tsx` | 减去已选 | 已选后剩 77 张；切换下一位含义 |
| `app/draw/select/__tests__/page.test.tsx` | 点选 → 翻牌 → 返回 | 点牌后牌面挂载；推进 FLIP 后写入槽位并 `push("/draw")` |
| `app/draw/select/__tests__/page.test.tsx` | 关闭 | `push("/draw")` |
| `app/draw/select/__tests__/page.test.tsx` | 已全满回退 | `replace("/draw")` |

### 影响范围

- 新增：`app/draw/select/page.tsx`、`app/draw/select/__tests__/page.test.tsx`
- 修改：`lib/drawFlow.ts`、`lib/store.ts`、`app/components/SpreadSlots.tsx`、`app/draw/page.tsx`、`app/draw/__tests__/page.test.tsx`、规格表
- 删除：无（跨页飞入移除，但 `FLY_DURATION_MS` 常量删除；`GridCard` 保留用于子页）

### 风险与假设

- 假设：子页每次只选 1 张并自动返回；顺序依次高亮一个空位；独立路由子页（可关闭/返回）。
- 风险：zustand store 内存态跨路由共享，需确保刷新/重进时 `selectedSlots` 与牌阵长度一致（已由 /draw 的初始化 effect 兜底）。
- 备选方案：若想保留跨页飞入动画，可改为同页覆盖层（G8 曾实现）；本条目按用户确认采用独立路由 + 槽位入场填充。---

## [G11] 选牌/结果展示优化（三处）

- **优先级**: 🟢
- **类别**: 质量提升（交互/视觉）
- **状态**: ✅ 完成
- **关联条目**: G10（/draw/select 子页）、G7（结果页视觉）、G2（核心建议解析）

### 问题描述

- 现状 11a：`/draw/select` 选牌子页以 13 列平铺剩余牌（手机端单张约 22px，偏小难点）。
- 现状 11b：结果页 section 顺序为「问题 → 抽牌结果 → AI 深度解析 → 核心建议」，核心建议（最有价值的一眼信息）被排在最后。
- 现状 11c：结果页抽牌结果用 `grid-cols-N` + `grid-rows-2` + `col-start-2` 硬编码补丁排版，5/7 张牌时错位、拥挤；且每张牌未标注其牌位（位置）。

### 目标

- **11a**：`/draw/select` 网格改为**一行 8 张**（替换 13 列），卡片更大更易点选；仍按剩余张数（78 − 已选）排列。
- **11b**：结果页 section 顺序改为「问题 → 抽牌结果 → **核心建议** → AI 深度解析」，先给核心建议。
- **11c**：结果页抽牌结果改为**居中灵活换行**布局（去除 grid-cols/grid-rows-2/col-start-2 补丁），每张牌上方标注其**牌位名**（positions[index]），保留"逆"标记与点击放大。

### 验收标准

- [ ] /draw/select 网格容器 `gridTemplateColumns` 为 `repeat(8, minmax(0, 1fr))`；仍减去已选牌
- [ ] 结果页 DOM 顺序中「核心建议」section 位于「AI 深度解析」section 之前（先给核心建议）
- [ ] 结果页抽牌结果不再使用 grid-cols/grid-rows-2/col-start-2 补丁；卡片居中 flex 换行
- [ ] 结果页每张牌上方显示对应牌位名（positions[index]），点击仍放大显示牌位含义

### 技术方案

1. **`app/draw/select/page.tsx`**：`gridTemplateColumns` 由 `repeat(13, minmax(0, 1fr))` 改为 `repeat(8, minmax(0, 1fr))`。
2. **`app/result/page.tsx`**：抽牌结果区移除 `gridClassFor(...)`/`grid-rows-2`/`col-start-2`，改为 `flex flex-wrap justify-center gap-5 md:gap-6`，每张牌上方新增位置标注；把「核心建议」section 整段移到「AI 深度解析」之前（顺序：问题 → 抽牌结果 → 核心建议 → AI 深度解析）；移除 `gridClassFor` 导入。
3. **`lib/utils.ts`**：`gridClassFor` 保留（工具函数 + 单元测试，仅结果页不再引用）。**后续（2026-09-16）已彻底删除**——无生产调用方即死代码，见 `tests/no-dead-code.test.ts` 契约。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/draw/select/__tests__/page.test.tsx` | 一行 8 张 | 网格容器含 `repeat(8, minmax(0, 1fr))`；78 张牌背 |
| `app/result/__tests__/page.test.tsx` | 核心建议前置 | 输出 🔮+💡 并 onComplete 后，DOM 中「核心建议」title 在「AI 深度解析」title 之前 |
| `app/result/__tests__/page.test.tsx` | 抽牌结果居中换行 + 位置标注 | 结果卡容器为 flex flex-wrap justify-center；每张牌上方显示 positions[index] |

### 影响范围

- 修改：`app/draw/select/page.tsx`、`app/result/page.tsx`、`app/draw/select/__tests__/page.test.tsx`、`app/result/__tests__/page.test.tsx`、规格表
- 新增：无
- 删除：结果页 `gridClassFor` 引用（工具函数与测试当时保留，**2026-09-16 已一并删除**）

### 风险与假设

- 假设：结果页牌阵最多 7 张，居中换行在桌面单行、移动端自动换行，且每张牌有牌位名标注。
- 风险：现有 O1 测试断言 `grid-cols-5` 字面量，需随布局调整更新为"居中换行 + 位置标注"断言。
- 备选方案：若要保留固定网格对齐，可改 `grid-cols-7` 最大对齐（本条目按用户要求改为居中换行）。---

## [G12] 核心建议结论先行

- **优先级**: 🟢
- **类别**: 质量提升（AI 输出结构）
- **状态**: ✅ 完成
- **关联条目**: G2（核心建议解析）、G11（核心建议前置展示）

### 问题描述

- 现状：`lib/deepseek.ts` 的 prompt 要求 AI 先输出「## 🔮 深度解析过程」再输出「## 💡 核心建议」；`parseStreamContent` 也假定 🔮 在 💡 之前（💡 在前时 analysis 切片为空）。
- 问题：用户希望**结论先行**——先给核心建议，再展开深度解析。
- 影响：需要同时改 prompt 顺序与解析器，否则 💡 在前时分析正文提取失败。

### 目标

- prompt 调整为「## 💡 核心建议」在前、「## 🔮 深度解析过程」在后（并明确告知 AI 结论先行）；
- `parseStreamContent` 支持两种小节顺序（顺序无关切分）；
- 结果页流式阶段：核心建议先出现；解析区在正文未输出前显示占位，输出后正常渲染。

### 验收标准

- [ ] `buildTarotPrompt` 输出中「💡 核心建议」位于「🔮 深度解析过程」之前
- [ ] `parseStreamContent` 对「💡 在前」的内容同样正确切出 `coreAdvice` 与 `analysis`
- [ ] 原有「🔮 在前」解析用例全部保持通过（向后兼容）
- [ ] 结果页流式：先显示核心建议；解析区为空时显示占位，输出后正常渲染

### 技术方案

1. **`lib/deepseek.ts`**：提取纯函数 `buildTarotPrompt(question, cards, cardReversals)`，小节顺序改为 💡 核心建议在前、🔮 深度解析在后，末尾说明"结论先行"；`generateTarotReadingStream` 改用该函数。
2. **`lib/stream-parse.ts`**：把两节提取改为**顺序无关**——`extractSection(content, heading)` 取"该小节标题后到下一个小节标题（或结尾）"的正文，analysis 与 coreAdvice 各自独立提取。
3. **`app/result/page.tsx`**：解析区正文为空且流式时显示"深度解析正在生成中…"占位（避免 💡 先流式期间解析区空白）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/deepseek-prompt.test.ts`（新增） | buildTarotPrompt 结论先行 | 输出含两小节；「💡 核心建议」index 在「🔮 深度解析过程」index 之前；含卡牌信息与问题 |
| `lib/__tests__/stream-parse.test.ts` | 结论先行切分 | 💡 在前时 coreAdvice/analysis 均正确提取；原有 🔮 在前用例不变 |
| `app/result/__tests__/page.test.tsx` | 结论先行流式 | 先 onContent(💡) → 核心建议可见、解析区占位；再 onContent(🔮) → 解析正文可见 |

### 影响范围

- 修改：`lib/deepseek.ts`、`lib/stream-parse.ts`、`app/result/page.tsx`、`lib/__tests__/stream-parse.test.ts`、`app/result/__tests__/page.test.tsx`、规格表
- 新增：`lib/__tests__/deepseek-prompt.test.ts`

### 风险与假设

- 假设：DeepSeek 会遵循 prompt 的结论先行顺序（解析器已做顺序无关兜底，无论哪种顺序都能正确切分）。
- 风险：AI 输出顺序不可 100% 保证——已通过顺序无关解析消除该风险。---

## [G13] 结果页末尾 AI 免责声明 + 牌背图案恢复

- **优先级**: 🟢
- **类别**: 质量提升（视觉/合规）
- **状态**: ✅ 完成
- **关联条目**: G11（结果页视觉）、G7（夜空主题）

### 问题描述

- 现状：结果页末尾缺少 AI 生成内容的免责声明；选牌子页牌背在 G9 简化为纯渐变描边。
- 问题：需要合规免责声明（置于历史记录按钮上方）；并恢复用户指定的 🌟 TAROT 牌背图案。

### 目标

- 结果页末尾、历史记录按钮上方显示"以上内容皆由AI生成，仅供娱乐，请勿尽信"；
- /draw/select 牌背恢复 🌟 + TAROT 图案。

### 验收标准

- [ ] 结果页 streamComplete 后，历史记录按钮上方显示免责声明"以上内容皆由AI生成，仅供娱乐，请勿尽信"
- [ ] /draw/select 牌背含 🌟 TAROT 图案

### 技术方案

1. **app/result/page.tsx**：底部操作区（streamComplete 时）在历史记录按钮上方插入免责声明 `<p>`（`text-white/40 text-xs` + 淡入）。
2. **app/components/GridCard.tsx**：牌背容器加 `flex items-center justify-center overflow-hidden`，恢复 🌟（`text-lg md:text-2xl mb-1`）与 TAROT（`text-xs font-medium tracking-wider`）图案。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/result/__tests__/page.test.tsx` | G13 结果页末尾显示 AI 免责声明 | 免责声明存在，且 DOM 位置在历史记录按钮上方（compareDocumentPosition） |

### 影响范围

- 修改：`app/result/page.tsx`、`app/components/GridCard.tsx`、`app/result/__tests__/page.test.tsx`、规格表

### 风险与假设

- 假设：免责声明随完成态（streamComplete）显示，与历史记录按钮同刻出现。