# 🟠 橙级：功能缺陷修复（O1–O5）

> ⚠️ **本文是历史记录，不描述当前状态。** 条目 O1–O5 已完成并归档，正文保留的是当时的
> 问题描述、验收标准、技术方案与 TDD 计划。

> 橙级条目为可复现的功能缺陷，按 O1 → O5 顺序执行。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| O1 | 结果页动态 grid 类名失效（5/7 张牌阵单列） | 功能缺陷 | ✅ 完成 |
| O2 | draw/result 页 mystical-* 类不生效 | 功能缺陷 | ✅ 完成 |
| O3 | 结果页 setState-in-updater 反模式 + AI 输出容错解析 | 功能缺陷 | ✅ 完成 |
| O4 | 洗牌算法有偏 | 功能缺陷 | ✅ 完成 |
| O5 | SSE Content-Type 错误 | 功能缺陷 | ✅ 完成 |

---

## [O1] 结果页动态 grid 类名失效（5/7 张牌阵单列）

- **优先级**: 🟠
- **类别**: 功能缺陷
- **状态**: ✅ 完成

### 问题描述

- 现状：`app/result/page.tsx` L272–277 用模板字符串 `` `grid-cols-${drawnCards.length}` `` 拼接 Tailwind 类名。
- 问题：Tailwind 扫描源码时看不到完整类名（源码中不存在 `grid-cols-5` / `grid-cols-7` 字面量），这些类**不会生成**。5 张（选择之路）与 7 张（生命指引）牌阵的 grid 容器没有列模板 → 所有卡牌**单列堆叠**，`grid-rows-2` 与 `col-start-2` 的补偿逻辑全部失效。
- 影响：两种牌阵的结果展示布局错误。

### 目标

5/7 张牌阵在结果页按预期多列布局；1/3/4 张行为不变。

### 验收标准

- [ ] 5 张牌阵容器 className 包含字面量 `grid-cols-5`；7 张包含 `grid-cols-7`
- [ ] 1/3/4 张分别为 `grid-cols-1` / `grid-cols-3` / `grid-cols-4`
- [ ] 未知数量回退 `grid-cols-1`（不抛错）
- [ ] 手工验收：抽取 5 张与 7 张牌阵，结果页呈两行多列居中布局

### 技术方案

在 `lib/utils.ts` 新增字面量映射（字面量字符串出现在源码中 → Tailwind 正常生成）：

```ts
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  7: "grid-cols-7",
};

export function gridClassFor(count: number): string {
  return GRID_COLS[count] ?? "grid-cols-1";
}
```

结果页 L272–277 改为 `gridClassFor(drawnCards.length)`；保留既有 `grid-rows-2`、`col-start-2` 定位逻辑（5 张第 5 位、7 张第 5–7 位放第二行）。

> 注（历史）：G11 起结果页抽牌结果改为居中换行（flex），`grid-rows-2`/`col-start-2` 定位与 `gridClassFor` 的页面引用已移除。
> **后续（2026-09-16）**：`gridClassFor` 因无生产调用方（仅剩单测引用）已彻底删除，并加入 `tests/no-dead-code.test.ts` 契约禁止再现。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/grid.test.ts` | 已知数量返回字面量 | 5→`grid-cols-5`、7→`grid-cols-7`、1/3/4→对应 |
| | 未知数量回退 | 0/2/6/9 → `grid-cols-1` |
| `app/result/__tests__/page.test.tsx`（可选） | 5 张渲染含 grid-cols-5 | mock store 状态后渲染结果页，断言容器 className 含 `grid-cols-5` |

### 影响范围

- 修改：`lib/utils.ts`（新增 `gridClassFor`）、`app/result/page.tsx`

### 风险与假设

- 假设：Tailwind v4 能扫描到映射表中的字面量类名（v4 全文扫描源码，成立）。
- 风险：无。
- 备选方案：在 `globals.css` 用 `@source inline("grid-cols-5")` 之类强制生成——仅在字面量方案不生效时启用。

---

## [O2] draw/result 页 mystical-* 类不生效

- **优先级**: 🟠
- **类别**: 功能缺陷
- **状态**: ✅ 完成

### 问题描述

- 现状：`.mystical-bg` / `.mystical-card` / `.mystical-button` / `.mystical-input` / `.stars` 仅定义于 `app/components/ui.module.css`（**CSS Module，类名会被 hash**），而 `app/draw/page.tsx`（L116、123–124、130、184、199、227、248、304、373）与 `app/result/page.tsx`（L178、188–189、196、206、215、230、252、336、378、405）以**裸字符串**引用这些类。
- 问题：裸字符串不匹配 hash 后的模块类名 → 这些样式**全部不生效**，两页仅靠额外补充的 Tailwind 类兜底（首页通过 `ui.tsx` 组件正确引用模块样式，正常）。
- 影响：draw/result 页与首页视觉不一致（背景渐变、卡片圆角阴影、按钮渐变、星空动画缺失）。

### 目标

三页视觉一致：这些设计系统类全局可用，且只有一份样式定义。

### 验收标准

- [ ] `app/globals.css` 定义 `.mystical-bg` / `.mystical-card` / `.mystical-button` / `.mystical-input` / `.stars`（含 `@keyframes twinkle`）
- [ ] `ui.module.css` 中的同名定义移除（单一来源）
- [ ] CSS 契约测试通过：所有以裸字符串形式出现在页面中的 `mystical-*` 类均在 `globals.css` 有定义
- [ ] 手工验收：首页、draw、result 三页背景/卡片/按钮/星空效果一致

### 技术方案

1. 把 `ui.module.css` 的样式（`.mystical-bg`、`.mystical-card`、`.mystical-button`、`.mystical-input`、`.stars` 及 `@keyframes twinkle`）迁移至 `app/globals.css` 的 `@layer components`（与现有 `.btn` / `.card` 等并列）。
2. 核对 CSS 变量：`--purple-50`、`--purple-100`、`--purple-200`、`--purple-300`、`--secondary`、`--accent` 等若在 globals.css 的 `:root` 未定义需补齐（当前只定义了 `--primary`、`--primary-hover`、`--primary-light`、`--accent-purple` 等）。
3. `ui.tsx` 中 `styles["mystical-x"]` 改为裸类名字符串（或保留 import 指向已被移空的模块——直接改裸字符串最简）。
4. 清空或删除 `ui.module.css`。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `tests/css-contract.test.ts` | 页面用到的 mystical 类均有定义 | 读取 `app/draw/page.tsx`、`app/result/page.tsx`、`app/components/ui.tsx` 中出现的 `mystical-[a-z]+` 裸类名，断言每个都在 `globals.css` 中有对应定义 |
| | 无重复定义 | `globals.css` 有定义且 `ui.module.css` 不再包含同名类 |

### 影响范围

- 修改：`app/globals.css`（新增设计系统类）、`app/components/ui.tsx`（改裸类名）、`app/components/ui.module.css`（删除或清空）
- draw/result 页**无需改动**（裸字符串本就指向全局名）

### 风险与假设

- 假设：迁移时逐一核对 CSS 变量引用，防止样式失真。
- 风险：低。`.stars` 与 twinkle 动画必须一并迁移。
- 备选方案：让 draw/result 页 import module 并用 `styles["mystical-card"]`（改动两页多处，不推荐）。

---

## [O3] 结果页 setState-in-updater 反模式 + AI 输出容错解析

- **优先级**: 🟠
- **类别**: 功能缺陷
- **状态**: ✅ 完成

### 问题描述

- 现状 1（反模式）：`app/result/page.tsx` L50–100，`setStreamingContent((prev) => {...})` 的 updater 内部调用 `setCoreAdvice`（L55–60）、`setAnalysisContent`（L62–68）、`setCurrentCardIndex`（L71–97，含滚动 setTimeout）。
- 现状 2（实测缺陷，2026-03 复现）：prompt 要求 AI 输出 `## 🔮 深度解析过程` / `## 💡 核心建议` 标题，但 **DeepSeek 实际输出 `🔮 **深度解析过程**`（普通段落 + 粗体）**——现有正则只匹配 `## ` 前缀 → **提取全部失败**：
  - `analysisContent` 为空 → 解析区渲染 `streamingContent` 完整内容（**包含 💡 核心建议节与结束语**）；
  - `coreAdvice` 为空 → 核心建议区显示"正在生成核心建议..."占位符；
  - 用户感知："核心建议重复/断裂"（💡 内容在解析区末尾出现，核心建议区又占一个位置）。
- 问题：解析正则对 AI 实际输出格式零容错；核心建议只取第一行（`[^\n]+`）导致多行建议被截断。
- 影响：结果页展示异常；解析逻辑不可单测。

### 目标

解析逻辑纯函数化（`parseStreamContent`），**对 AI 输出的标题格式容错**（支持 `## ` 标题与 `**粗体**` 两种形式）；`streamingContent` 为唯一状态源，派生状态由 `useMemo` 计算；updater 内无任何副作用；**核心建议区显示完整 💡 节**，**解析区剥离 💡 节**（杜绝重复）。

### 验收标准

- [ ] 代码中不再出现 updater 内调用其他 setState 或副作用
- [ ] `parseStreamContent(content)` 为纯函数：输入累计内容 → `{ coreAdvice, analysis, currentCardIndex }`
- [ ] AI 输出 `## 🔮 深度解析过程` 或 `🔮 **深度解析过程**` 均能正确提取 analysis
- [ ] AI 输出 `## 💡 核心建议` 或 `💡 **核心建议**` 均能正确提取 coreAdvice，且**取完整 💡 节**（多行/含结束语），不只第一行
- [ ] 解析区渲染 analysis（不含 💡 节）；analysis 为空时 fallback 到 streamingContent 时**剥离 💡 节之后的内容**
- [ ] 核心建议区在流完成前显示"正在生成核心建议..."，完成后显示完整建议；不重复出现两遍
- [ ] 流式过程中：核心建议区块一旦出现即显示；解析到新牌面自动滚动（现状行为保持，滚动不重复触发）
- [ ] 内容为空 / 半截标题 / 无结构时不崩溃、不误滚

### 技术方案

1. 新增 `lib/stream-parse.ts`：

   ```ts
   export interface StreamParseResult {
     coreAdvice: string | null;       // 💡 节完整内容（到下一标题或结尾）
     analysis: string | null;         // 🔮 节至 💡 节前（不含 💡 节）
     currentCardIndex: number | null; // 最后一个 "### 牌面 N" 的 N-1（0 基）
   }
   export function parseStreamContent(content: string): StreamParseResult;
   ```

2. **标题匹配容错**（关键修复）——正则同时支持两种格式：

   ```ts
   // 匹配行首：可选 # 前缀（1-3 个）+ 可选 emoji 空格 + 可选粗体星号
   const ANALYSIS_HEADING = /^#{1,3}\s*🔮\s*\*{0,2}深度解析过程\*{0,2}/m;
   const ADVICE_HEADING   = /^#{1,3}\s*💡\s*\*{0,2}核心建议\*{0,2}/m;
   // 下一个任意标题（用于截断 advice）：# 标题或 emoji 粗体标题
   const NEXT_HEADING     = /^#{1,3}\s*(?:🔮|💡|✨|📌)\s*\*{0,2}\S+/m;
   ```

   - `analysis`：从 `ANALYSIS_HEADING` 行末到 `ADVICE_HEADING`（或结尾）的内容，`.trim()`；
   - `coreAdvice`：从 `ADVICE_HEADING` 行末到 `NEXT_HEADING` 或结尾的**完整内容**（`.trim()`），不再取单行；
   - `currentCardIndex`：`/### 牌面 (\d+)/g` 取最后一张（保留原逻辑，AI 未输出时返回 null 不崩溃）。

3. 重构 `app/result/page.tsx`：
   - `setStreamingContent` 的 updater 只做 `prev + content` 拼接，内部零副作用；
   - `const parsed = useMemo(() => parseStreamContent(streamingContent), [streamingContent])`；
   - 渲染：解析区 `content={parsed.analysis ?? stripAdvice(streamingContent)}`——fallback 时用辅助函数剥离 💡 节；核心建议区 `parsed.coreAdvice`；
   - 删除 `setCoreAdvice` / `setAnalysisContent` / `setCurrentCardIndex` 三个中间状态；
   - 滚动副作用放 `useEffect`（依赖 `parsed.currentCardIndex`），用 ref 记录上次索引防止重复滚动（保留 500ms 延迟）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/stream-parse.test.ts` | 完整结构解析（## 标题） | 标准 `## 🔮` / `## 💡` 格式 → advice、analysis、牌号正确 |
| | 完整结构解析（**粗体标题**） | `🔮 **深度解析过程**` + `💡 **核心建议**` → 同样正确（**本次 bug 回归用例**） |
| | 混合格式 | 🔮 用 ##、💡 用粗体 → 均能提取 |
| | advice 取完整节 | 💡 节含多行 + 结束语 → coreAdvice 包含全部内容（不只首行） |
| | 仅解析过程节 | 无 💡 节 → `coreAdvice: null`，analysis 有值 |
| | 半截标题容错 | 结尾为 `### 牌面 `（无数字）、`## 💡` 未完成、`💡 **核心建` 未完成 → 不抛错 |
| | 分块累积等价性 | 完整文本拆 3 块逐步拼接逐次解析，结果与一次性解析一致 |
| | 无结构内容 | 全部字段 null |
| | 多牌取最后一张 | 出现 `牌面 1`、`牌面 2` → `currentCardIndex === 1` |
| `app/result/__tests__/page.test.tsx` | 流式累积渲染 | mock `generateTarotReadingStream` 逐步调用 `onContent` → 断言界面出现累计文本 |
| | 完成后核心建议显示 | 触发 `onComplete` → 核心建议区块显示完整建议 |
| | 解析区不包含 💡 节 | 流完成后解析区 DOM 不含"核心建议"标题（**重复问题回归用例**） |

### 影响范围

- 新增：`lib/stream-parse.ts`
- 修改：`app/result/page.tsx`（删除中间状态与 updater 副作用，改用 useMemo 派生）

### 风险与假设

- 假设：useMemo 每次 chunk 都重算解析（内容体量小，可接受）。
- 风险：滚动行为需与现状一致（含 500ms 延迟、仅索引变化时滚动），通过 ref 防重；AI 若改用其他标题格式（如 `### ` 三级），NEXT_HEADING 需覆盖——以测试锁定当前两类格式，后续格式变化由 G2 prompt 加固兜底。

---

## [O4] 洗牌算法有偏

- **优先级**: 🟠
- **类别**: 功能缺陷
- **状态**: ✅ 完成

### 问题描述

- 现状：`lib/store.ts` L169–172 `getRandomCards` 用 `[...tarotCards].sort(() => Math.random() - 0.5)` 洗牌。
- 问题：基于排序比较器的洗牌**非均匀分布**（比较器不稳定），部分牌被抽中的概率系统性偏高/偏低；且对 78 张执行 `sort` 的随机性依赖排序算法内部行为。
- 影响：占卜抽牌概率失真（公平性问题）。

### 目标

均匀无偏洗牌（Fisher–Yates）。

### 验收标准

- [ ] 一次抽牌结果无重复牌
- [ ] `count=0` → `[]`；`count=1` → 单张；`count≥78` → 78 张（全部牌，无重复）
- [ ] 大量抽样分布均匀（宽松容差内，防 flaky）

### 技术方案

新增 `lib/shuffle.ts` 纯函数：

```ts
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
```

`lib/store.ts` 的 `getRandomCards` 改为 `shuffle(tarotCards).slice(0, count)`。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/shuffle.test.ts` | 无重复 | `shuffle(tarotCards).slice(0, 5)` 的 id 无重复 |
| | 边界 | 0/1 长度输入；78 张洗牌后仍是全集（Set 大小 78） |
| | 确定性路径 | 用 `vi.spyOn(Math, 'random')` 注入固定序列，断言结果与手工计算一致（算法正确性） |
| | 分布均匀（统计） | 20,000 次单张抽样，每张出现次数在期望值 ±20% 内（宽松阈值防 flaky） |

### 影响范围

- 新增：`lib/shuffle.ts`
- 修改：`lib/store.ts`（getRandomCards 改用 shuffle）

> **后续变更（2026-09-16）**：`store.getRandomCards` 已被 Y2 死代码清理删除，`shuffle()` 因此失去唯一调用方沦为死代码，而 `/api/suggested-questions` 仍在用本条目要消灭的 `sort(() => Math.random() - 0.5)`。现已把 `shuffle()` 接回该路由（行为不变，仅修正分布），并在 `tests/no-dead-code.test.ts` 加契约锁定。

### 风险与假设

- 假设：统计测试阈值足够宽松（±20%）避免 CI flaky。
- 风险：低。

---

## [O5] SSE Content-Type 错误

- **优先级**: 🟠
- **类别**: 功能缺陷
- **状态**: ✅ 完成

### 问题描述

- 现状：`app/api/deepseek-stream/route.ts` L191 返回 `Content-Type: text/plain; charset=utf-8`。
- 问题：SSE 规范要求 `text/event-stream`；当前客户端手写解析能工作，但中间代理/网关可能按普通文本**缓冲整段响应**，破坏流式逐字体验。
- 影响：部分网络环境下降级为非流式（等待全部完成才显示）。

### 目标

响应头符合 SSE 规范，事件帧格式不变。

### 验收标准

- [ ] `POST /api/deepseek-stream` 响应 `Content-Type` 为 `text/event-stream; charset=utf-8`
- [ ] 事件帧仍为 `data: {json}\n\n` 格式，客户端解析不受影响
- [ ] 流式逐字渲染体验不变

### 技术方案

`app/api/deepseek-stream/route.ts` L189–195 响应头改为：

```ts
headers: {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no", // 可选：防止 nginx 缓冲
},
```

其余逻辑不变。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/api/__tests__/deepseek-stream.route.test.ts` | Content-Type 正确 | mock 全局 fetch 返回 SSE 流，调用 `POST(new Request(...))` → `headers.get("content-type")` 以 `text/event-stream` 开头 |
| | 事件帧格式 | 读取响应 body 按 `\n\n` 分割，断言 `data: {"type":"content",...}` 帧与 `type: "complete"` 帧存在 |

### 影响范围

- 修改：`app/api/deepseek-stream/route.ts`（响应头 1–2 行）

### 风险与假设

- 假设：客户端解析逻辑（`lib/deepseek.ts` L140–165 按 `data: ` 前缀解析）不受 Content-Type 影响（成立）。
- 风险：无。