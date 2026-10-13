# 🟡 黄级：清理 / 文档 / 小功能（Y1–Y9）

> ⚠️ **本文是历史记录，不描述当前状态。** 黄级条目 Y1–Y9 已完成并归档。


> 黄级条目为代码清理、文档修正与小功能。执行顺序注意：**Y1（历史记录）先于 Y2（死代码清理）**，避免误删 readings 相关代码；Y7 与 R3 共享模块合并实施。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| Y1 | 实现最小版历史记录页 | 小功能 | ✅ 完成 |
| Y2 | 死代码清理 | 重构 | ✅ 完成 |
| Y3 | README 更新 | 文档 | ✅ 完成 |
| Y4 | layout metadata 定制 | 文档 | ✅ 完成 |
| Y5 | API Key 双份存储统一 | 重构 | ✅ 已并入 R1 |
| Y6 | 图片目录整理 + 数据完整性测试 | 重构 | ✅ 完成 |
| Y7 | 路由重复逻辑抽取 | 重构 | ✅ 核心完成（共享模块随 R3 落地；Y2 删除路由后收尾） |
| Y8 | 历史页展开区去重 + 核心建议高亮 | 小功能/视觉 | ✅ 完成 |
| Y9 | 历史页展开区收尾：核心建议去分隔线 + 摘要区嵌套按钮修复 | 小功能/重构 | ✅ 完成 |

---

## [Y1] 实现最小版历史记录页

- **优先级**: 🟡
- **类别**: 小功能
- **状态**: ✅ 完成

### 问题描述

- 现状：README（L86–87、L132–135）宣传"历史记录"功能；`lib/store.ts` 已有骨架——`TarotReading` 类型（L16–25）、`readings` / `addReading` / `removeReading`（L54–56、147–153）、`partialize`（L177）已持久化 readings——但**没有任何调用方与 UI**：`addReading` 从未被调用，也没有历史页面。功能名存实亡。
- 影响：宣传与实现不符；用户占卜记录无法回看。

### 目标

占卜完成后自动保存记录；新增 `/history` 页面支持查看详情与删除（上限 50 条，localStorage 持久化，刷新不丢）。

### 验收标准

- [ ] 结果页流式完成后自动 `addReading`（字段：question、spread、cards、cardReversals、interpretation 完整内容、advice 核心建议、timestamp）
- [ ] `/history` 页面按时间倒序列出记录：问题、牌阵名、牌名列表（含逆位标记）、时间
- [ ] 记录可展开查看完整 AI 解析（`MarkdownRenderer` 渲染）与核心建议
- [ ] 记录可删除（确认后 `removeReading`）
- [ ] 空状态有提示文案；首页与结果页有"历史记录"入口
- [ ] 刷新页面记录仍在（localStorage）
- [ ] 流式失败/未完成时**不**保存记录

### 技术方案

1. **结果页保存**（`app/result/page.tsx`）：`onComplete`（L102–105）内追加：

   ```ts
   addReading({
     id: crypto.randomUUID(),
     question,
     spread: recommendedSpread,
     cards: drawnCards,
     cardReversals,
     interpretation: contentRef.current, // 完整累计内容
     advice: coreAdvice || "正在生成核心建议...",
     timestamp: new Date(),
   });
   ```

   从 store 解构 `addReading`；用 ref 保存完整 content（O3 重构后已有 `contentRef` 或直接取自 `streamingContent` 的最终值）。
   保护条件：`contentRef.current` 为空或 `streamComplete` 为 false 时跳过。

2. **历史页面**（新增 `app/history/page.tsx`，"use client"）：
   - 读 `useTarotStore((s) => s.readings)`；
   - 列表卡片：问题（截断）、牌阵名、牌名摘要（`card.name` + `(逆)`）、时间（`toLocaleString("zh-CN")`）；
   - 展开：`MarkdownRenderer` 渲染 `interpretation` + 核心建议块；
   - 删除：`confirm()` 后 `removeReading(id)`；
   - 空状态："暂无占卜记录"；顶部返回按钮。

3. **入口**：结果页底部加"历史记录"按钮（`router.push("/history")`）；首页"📚 历史记录"从纯展示改为可点击入口。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/store.test.ts` | addReading 头部插入 | 依次添加 2 条 → `readings[0]` 为最新 |
| | 上限 50 条 | 添加 55 条 → 长度 50 且保留最新 50 条 |
| | removeReading 删除 | 按 id 删除后记录不存在 |
| `app/history/__tests__/page.test.tsx` | 渲染记录列表 | `useTarotStore.setState` 注入记录 → 断言问题文本渲染 |
| | 展开详情 | 点击展开 → 解析内容可见 |
| | 删除记录 | mock `confirm` 返回 true，点击删除 → readings 长度减 1 |
| | 空状态 | 无记录 → 空状态文案可见 |
| `app/result/__tests__/page.test.tsx` | 完成后保存 | mock `generateTarotReadingStream` 触发 `onComplete` → `addReading` 被调用且字段完整 |
| | 失败不保存 | 触发 `onError` → `addReading` 未被调用 |

### 影响范围

- 新增：`app/history/page.tsx`
- 修改：`app/result/page.tsx`（onComplete 保存 + 入口按钮）、`app/page.tsx`（历史记录入口）

### 风险与假设

- 假设：localStorage 容量可容纳 50 条 × 完整解析文本（估算单条约 2–8KB，总量 ~400KB，可接受）。
- 风险：`crypto.randomUUID()` 需现代浏览器（提供 fallback：`Date.now() + Math.random()` 字符串）。
- 备注：`resetSession` 不清 readings（现状如此，符合预期）。

---

## [Y2] 死代码清理

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ✅ 完成
- **关联条目**: Y1（readings 保留）、Y3（README 同步）、R3/Y7（路由重写时一并处理）

### 问题描述

- 现状（均为无调用方代码）：
  - `lib/deepseek.ts` L23–53 `callDeepSeek`、L179–236 `generateTarotReading`（非流式；页面只用 `generateTarotReadingStream` L64–176）；
  - `app/api/deepseek/route.ts` 整文件（非流式接口，无调用方）；
  - `lib/useImagePreloader.ts` 整文件（无引用）；
  - `lib/store.ts` 中 `currentReading` / `setCurrentReading`（L50–51、128、145、164，无调用方；`readings` 系列因 Y1 保留）。
- 影响：维护面扩大，改动时容易被"死代码"误导。

### 目标

删除全部无引用代码；类型检查、lint、测试、构建全绿。

### 验收标准

- [ ] grep 确认无残留引用（`callDeepSeek`、`generateTarotReading`（非流式）、`useImagePreloader`、`currentReading`）
- [ ] `npm run type-check`、`npm run lint`、`npm run test:run` 全绿
- [ ] `npm run build` 通过

### 技术方案

1. 删除文件：`app/api/deepseek/route.ts`、`lib/useImagePreloader.ts`。
2. 修改 `lib/deepseek.ts`：删除 `callDeepSeek`、`generateTarotReading` 及仅它们使用的类型（`DeepSeekResponse` 若无引用一并清理），保留流式路径与 `StreamCallbacks`。
3. 修改 `lib/store.ts`：删除 `currentReading` / `setCurrentReading`（接口、初始值、实现、`resetSession` 中的相关行）。
4. 若 Y2 先于 R3/Y7 执行，`/api/deepseek` 的限流逻辑随文件删除；R3 只重写 stream 路由。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| 全量现有测试 | 全部通过 | type-check / lint / test:run 三绿（行为不变，编译守护） |
| `tests/no-dead-code.test.ts`（可选） | 无残留引用 | 读源码 grep `callDeepSeek|useImagePreloader|currentReading`，断言无匹配（`/api/deepseek` 文件已删） |

### 影响范围

- 删除：`app/api/deepseek/route.ts`、`lib/useImagePreloader.ts`
- 修改：`lib/deepseek.ts`、`lib/store.ts`、`README.md`（随 Y3 删除该接口文档）

### 风险与假设

- 假设：`generateTarotReadingStream` 不依赖被删函数（已确认独立）。
- 风险：低；删除前 grep 复核。

---

## [Y3] README 更新

- **优先级**: 🟡
- **类别**: 文档
- **状态**: ✅ 完成

### 问题描述

- 现状：README 多处与代码事实不符——
  - L14 技术栈写 "Next.js 14"（实际 16.1.6 + React 19.2.3）；
  - L107–129 API 文档写 `POST /api/deepseek` 请求体 `{question, cards, layout}`（实际 `{prompt, userApiKey}`，且主接口为流式 `/api/deepseek-stream`）；
  - L69–77 写"每次 git push 前自动运行检查"（提交 46c41ae 已改为 **commit 时**，`.husky/pre-commit` 跑 `npm run pre-commit` = type-check + lint）；
  - 功能列表含"历史记录"（Y1 完成后变为已实现，需同步描述）。
- 影响：新开发者按文档配置会踩坑。

### 目标

README 与代码事实一致。

### 验收标准

- [ ] 技术栈版本准确（Next.js 16、React 19、Tailwind 4、Zustand、Vitest）
- [ ] API 文档准确：`/api/deepseek-stream`（流式 SSE）、`/api/suggested-questions`；删除 `/api/deepseek`（Y2）
- [ ] Git hooks 时机为 commit；新增测试命令（`npm test` / `test:run`）
- [ ] 功能列表含历史记录（Y1）；env 变量表：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`（可选）、`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`（可选，R3/G3；G14 后由 `UPSTASH_*` 变更而来）
- [ ] 隐私章节补充 localStorage Key 风险说明（R1）与 CSP 说明

### 技术方案

按验收清单逐节重写 README 对应章节。

### TDD 测试计划

文档类条目：无自动化测试，以验收清单手工核对。

### 影响范围

- 修改：`README.md`

### 风险与假设

- 无。

---

## [Y4] layout metadata 定制

- **优先级**: 🟡
- **类别**: 文档（站点元信息）
- **状态**: ✅ 完成

### 问题描述

- 现状：`app/layout.tsx` L15–18 仍为 create-next-app 默认 `title: "Create Next App"`、`description: "Generated by create next app"`；L26 `<html lang="en">`。
- 影响：浏览器标签页与搜索引擎展示错误；中文应用声明英文语言。

### 目标

中文品牌标题/描述；`lang="zh-CN"`。

### 验收标准

- [ ] `metadata.title` / `metadata.description` 为中文品牌文案
- [ ] `<html lang="zh-CN">`
- [ ] 浏览器标签页显示中文标题

### 技术方案

`app/layout.tsx`：

```ts
export const metadata: Metadata = {
  title: "神秘塔罗 - AI 塔罗占卜",
  description: "基于 AI 的塔罗占卜应用：智能牌阵推荐、流畅抽牌体验与深度解析。",
};
// ...
<html lang="zh-CN">
```

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/__tests__/layout.test.tsx` | metadata 正确 | `import { metadata }` 断言 title 含"神秘塔罗"、description 非空 |
| | lang 属性 | `renderToStaticMarkup(<RootLayout><div/></RootLayout>)` 断言含 `<html lang="zh-CN"`（依赖 F0 的 `next/font/google` mock） |

### 影响范围

- 修改：`app/layout.tsx`

### 风险与假设

- 假设：RootLayout 测试可通过 mock `next/font/google` 与 `globals.css` 导入（vitest 对 CSS 导入默认空实现）正常渲染。

---

## [Y5] API Key 双份存储统一（已并入 R1）

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ✅ 已并入 R1

### 说明

R1 已重写为「API Key 安全加固」综合条目（`docs/archive/10-red-security.md`），本条目内容（删除 `deepseek_api_key` 双份存储、Key 走 store 单一来源）纳入其 **C 层（收窄暴露面）**，不再单独实施。实施时以 R1 为准。

原方案摘要（供 R1-C 参考）：
- 现状：API Key 同时存在于 store persist（localStorage `tarot-store`，`lib/store.ts` L177）与 `app/page.tsx` 手写的 `deepseek_api_key`（L34–40 读取、L79–87 写入/删除）——两份状态需手动同步，易漂移。
- 方案：`app/page.tsx` 删除 L34–40 的 `localStorage.getItem("deepseek_api_key")` 与 L79–87 的 `setItem/removeItem`，全部走 store；初始值从 store 读取。

> 注意：R1-B 加密改造后，store 持久化字段为 `encryptedApiKey`（密文），不再是明文 `apiKey`——Y5 的"persist 持久化 Key"表述在 R1 中已更新。旧版本 localStorage 中残留的明文 `apiKey` 字段由 R1 的初始化逻辑清理（见 R1-B 旧数据迁移说明）。

---

## [Y6] 图片目录整理 + 数据完整性测试

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ✅ 完成

### 问题描述

- 现状：56 张小阿卡纳图片全部放在 `public/tarot-images/major/`（命名 `Cups01.jpg`、`Pents14.jpg` 等，且 Pentacles 缩写为 Pents）；`major-11-Justice.jpg` 大小写不统一（`lib/tarot-data.ts` L185 引用路径同样大写）；目录结构与数据声明的 arcana/suit 脱节。
- 影响：目录语义混乱；后续新增牌面易放错位置；无任何校验防止数据与文件脱节。

### 目标

目录按 arcana/suit 组织、命名统一 kebab-case；新增完整性测试守护 78 张牌数据与图片路径（目录契约 + 存在性）。

### 验收标准

- [ ] 大阿卡纳 22 张位于 `public/tarot-images/major/`，命名 kebab-case 全小写（含 `major-11-justice.jpg`）
- [ ] 小阿卡纳 56 张位于 `public/tarot-images/minor/<suit>/`（如 `minor/wands/wands-01.jpg` … `minor/pentacles/pentacles-14.jpg`）
- [ ] `lib/tarot-data.ts` 全部 `image` 路径与磁盘实际一致
- [ ] 完整性测试绿：78 张、id/name 唯一、大 22 / 小 56、四花色各 14、目录契约、路径存在

### 技术方案

1. **先写完整性测试**（红：当前 minor 卡全部在 `major/`，目录契约必然失败）→ 再执行文件移动（绿）。
2. 文件移动用 `git mv`（保留历史）：
   - `major-11-Justice.jpg` → `major-11-justice.jpg`；
   - 56 张小阿卡纳：`CupsNN.jpg` → `minor/cups/cups-NN.jpg`，`WandsNN` → `minor/wands/wands-NN`，`SwordsNN` → `minor/swords/swords-NN`，`PentsNN` → `minor/pentacles/pentacles-NN`。
3. 更新 `lib/tarot-data.ts` 中 57 处 `image` 路径。
4. 新增 `lib/__tests__/tarot-data.integrity.test.ts`：断言目录契约（`major` 卡路径以 `/tarot-images/major/` 开头；`minor` 卡以 `/tarot-images/minor/` 开头）与 `fs.existsSync` 文件存在。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/tarot-data.integrity.test.ts` | 牌数 | `tarotCards.length === 78` |
| | id/name 唯一 | id 与 name 各自 Set 大小均为 78 |
| | arcana 数量 | major 22 / minor 56；四花色各 14 |
| | 目录契约 | major 卡路径以 `/tarot-images/major/` 开头；minor 卡以 `/tarot-images/minor/` 开头（**红→绿 核心**） |
| | 图片存在 | 每张牌 `fs.existsSync(public + image)` 为 true |

### 影响范围

- 移动：57 个图片文件（`git mv`）
- 修改：`lib/tarot-data.ts`（57 处路径）
- 新增：`lib/__tests__/tarot-data.integrity.test.ts`

### 风险与假设

- 假设：`git mv` 保留历史可追溯；`public/` 静态资源移动无运行时风险（路径在数据中同步更新）。
- 风险：遗漏某处路径会导致完整性测试红——这正是测试的价值。
- 备选方案（若不愿大搬家）：仅统一 `major-11-Justice.jpg` 大小写 + 按现状目录规则收紧契约测试——本规格采用全量整理。

---

## [Y7] 路由重复逻辑抽取

- **优先级**: 🟡
- **类别**: 重构
- **状态**: ✅ 核心完成（共享模块随 R3 落地；Y2 删除 `/api/deepseek` 后只作用于 stream 路由）
- **关联条目**: R3（共享模块，同批文件）、Y2（删除 /api/deepseek）

### 问题描述

- 现状：`/api/deepseek` 与 `/api/deepseek-stream` 两份几乎相同的代码（IP 提取、key 解析、限流计数、DeepSeek fetch、错误处理）各自复制一份，后续修一处漏一处（R3 已证实）。
- 影响：维护成本翻倍、修复不同步。

### 目标

共享模块唯一实现，路由变薄。

### 技术方案

与 R3 合并实施（同一批文件）：`lib/server/rate-limit.ts`（限流）、`lib/server/deepseek.ts`（resolveApiKey + chatCompletion）；两个路由改为组合调用。
注意：Y2 删除 `/api/deepseek` 后，剩余 stream 路由仍使用共享模块（同样受益——key 解析与限流收敛为单点）。
若 Y2 已先行删除 `/api/deepseek`，本条目只剩"stream 路由使用共享模块"一项，工作量并入 R3。

### TDD 测试计划

并入 R3 测试表（`lib/server/__tests__/*` 与 `app/api/__tests__/deepseek-stream.route.test.ts`）。

### 影响范围

同 R3。

### 风险与假设

同 R3。

---

## [Y8] 历史页展开区去重 + 核心建议高亮

- **优先级**: 🟡
- **类别**: 小功能 / 视觉
- **状态**: ✅ 完成
- **关联条目**: Y1（历史记录页）、G12（结论先行：💡 节位于 🔮 节之前）、G11（核心建议前置）

### 问题描述

- 现状：`app/history/page.tsx` 展开详情（L112–142）同时渲染三样东西，导致「核心建议」出现**两次**：
  1. `<h3>🤖 AI 深度解析</h3>`（L121–123，页面级标题）；
  2. `MarkdownRenderer` 渲染完整 `reading.interpretation`（L124–129）——由于 G12 结论先行，该 markdown 自身已含 `## 💡 核心建议`（位于 `## 🔮 深度解析过程` **上方**）与 `## 🔮 深度解析过程` 两个小节；
  3. 底部独立黄底「💡 核心建议」块（L130–138，渲染 `reading.advice`）——与 interpretation 内的 💡 节内容重复。
- 影响：用户在同一展开区看到两遍核心建议；`🤖 AI 深度解析` 标题与 markdown 内 `🔮 深度解析过程` 标题重复表达同一层级。

### 目标

展开区只保留**一个**「核心建议」模块（位于「深度解析过程」之上，带背景高亮色）；删除 `🤖 AI 深度解析` h3 与底部重复的 💡 块。

### 验收标准

- [ ] 展开详情不再渲染 `<h3>🤖 AI 深度解析</h3>`
- [ ] 展开详情只出现**一个**「核心建议」标题/模块（interpretation 内的 💡 节被剥离，底部 advice 块被删除）
- [ ] 保留的「核心建议」模块带背景高亮（`bg-yellow-50` 黄底）且位于「🔮 深度解析过程」内容**之前**
- [ ] 核心建议正文不重复（DOM 中只出现一次）
- [ ] 无 💡 节的历史记录（旧数据/纯文本）不白屏：仅隐藏高亮块，解析内容原样显示

### 技术方案

1. **`lib/stream-parse.ts`** 新增纯函数 `removeAdviceSection(content)`：删除「💡 核心建议」小节（从 💡 标题行到下一个小节标题或结尾），**保留其余内容**（含 `## 🔮 深度解析过程` 标题与其正文）。复用文件内既有 `ADVICE_HEADING` / `NEXT_HEADING` / `headingEnd`，与 `extractSection` 语义一致（粗体标题格式同样支持；无 💡 节时原样返回）。
2. **`app/history/page.tsx`** 展开区（L112–142）改造：
   - 删除 `🤖 AI 深度解析` h3（L121–123）；
   - 顶部渲染高亮「核心建议」块：`bg-yellow-50 border border-yellow-200 rounded-lg p-4` + `<h4>💡 核心建议</h4>` + `MarkdownRenderer` 渲染 `parseStreamContent(interpretation).coreAdvice ?? reading.advice`（结论先行数据以 interpretation 为准，旧数据回退 advice 字段）；块上加 `data-testid="history-advice"`；
   - 下方渲染 `removeAdviceSection(interpretation)`（保留 `🔮 深度解析过程` 标题与正文，不再出现 💡 节）。

### TDD 测试计划

> Red 阶段必须完成的测试清单；对应测试未通过（红）之前，不得开始实现（Green）。

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/stream-parse.test.ts` | removeAdviceSection：G12 结论先行（💡 在前） | 输入 `## 💡 核心建议…## 🔮 深度解析过程…` → 结果只含 🔮 节（含其标题），不含"核心建议" |
| | removeAdviceSection：旧格式（💡 在后） | 输入 `## 🔮…分析…## 💡…建议` → 结果只含 🔮 节 |
| | removeAdviceSection：粗体标题格式 | `💡 **核心建议**` / `🔮 **深度解析过程**` 同样只保留 🔮 节 |
| | removeAdviceSection：无 💡 节 | 普通文本原样返回 |
| | removeAdviceSection：仅 💡 节 | 返回空字符串（`.trim()` 后） |
| `app/history/__tests__/page.test.tsx` | 展开不再显示 🤖 AI 深度解析 | 展开后 `queryByText("🤖 AI 深度解析")` 为 null |
| | 核心建议仅一个且高亮、位于解析之前 | `getAllByText(/核心建议/)` 长度 1；`[data-testid=history-advice]` 含 `bg-yellow-50` 类；💡 块在 🔮 标题之前（`compareDocumentPosition` FOLLOWING） |
| | 核心建议正文不重复 | `getAllByText("勇敢行动，保持专注。")` 长度 1；解析正文 `分析正文内容。` 可见 |
| | 无 💡 节旧记录不白屏 | 纯文本 interpretation + advice → 高亮块可见且解析内容原样显示 |

### 影响范围

- 新增：`lib/stream-parse.ts` 导出 `removeAdviceSection`
- 修改：`app/history/page.tsx`（展开区）、`lib/__tests__/stream-parse.test.ts`、`app/history/__tests__/page.test.tsx`
- 删除：展开区 `🤖 AI 深度解析` h3 与底部 advice 块

### 风险与假设

- 假设：历史记录的 `interpretation` 为结果页保存的完整流式内容（含 G12 结构标题）；`removeAdviceSection` 与 `parseStreamContent` 使用同一套标题正则，行为一致。
- 风险：旧数据 interpretation 无 💡/🔮 标题时——`coreAdvice` 为 null 回退 `reading.advice`，`removeAdviceSection` 原样返回，不白屏（有测试守护）。
- 备选方案（已否决）：在 `MarkdownRenderer` 内按标题文本给 💡 节加背景——react-markdown 无法把「标题 + 后续段落」包进同一高亮容器，需改渲染器，侵入面大。


---

## [Y9] 历史页展开区收尾：核心建议去分隔线 + 摘要区嵌套按钮修复

- **优先级**: 🟡
- **类别**: 小功能 / 重构
- **状态**: ✅ 完成
- **关联条目**: Y8（核心建议高亮）、Y1（历史记录页）

### 问题描述

- 现状 1：AI 输出常在 💡 核心建议小节内/结尾带 `---` 分隔线；`MarkdownRenderer` 将其渲染为 `<hr class="border-t-2 border-purple-200 my-6">`，出现在 Y8 新增的高亮建议卡（`history-advice` 块）内部，与卡片边框视觉重复。
- 现状 2：摘要区外层展开按钮 `<button>` 内嵌删除 `<button>`（`app/history/page.tsx` L71–107）——无效 HTML，React 控制台报 `<button> cannot be a descendant of <button>`，引发 hydration error，对辅助技术不友好。
- 影响：控制台报错（hydration）；建议卡内出现冗余分隔线。

### 目标

核心建议模块内不再出现 `<hr>`；摘要区无嵌套按钮（hydration 修复），展开/删除交互不变。

### 验收标准

- [ ] `history-advice` 块内 `querySelector("hr")` 为 null（建议内容含 `---` 时）
- [ ] 页面 DOM 无 `button button` 嵌套
- [ ] 点击问题文本可展开/收起（交互不变）
- [ ] 删除按钮独立可用（交互不变）
- [ ] `MarkdownRenderer` 默认行为不变（无 `hideHr` 时 `---` 仍渲染 hr）

### 技术方案

1. **`app/components/MarkdownRenderer.tsx`**：新增可选 prop `hideHr?: boolean`；为 true 时组件表 `{ ...base, hr: () => null }`（light/dark 均生效），默认 false 不影响既有调用方（结果页、解析区）。
2. **`app/history/page.tsx`**：
   - 建议卡 `MarkdownRenderer` 加 `hideHr`；
   - 摘要区重构：外层整行 `<button>` 拆为「文本区展开按钮（`flex-1 min-w-0 text-left`）+ 右侧操作区（删除按钮 + 独立展开/收起按钮）」，消除嵌套 button。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/components/__tests__/MarkdownRenderer.test.tsx` | hideHr 不渲染 hr | `content="---"` + `hideHr` → `querySelector("hr")` 为 null；正文仍可见 |
| `app/history/__tests__/page.test.tsx` | 核心建议内无 hr | 💡 节含 `---` → 展开后 `history-advice` 块内无 hr |
| | 无嵌套 button | `container.querySelector("button button")` 为 null |
| | 展开/删除交互回归 | 点击问题文本展开、删除记录（既有用例守护） |

### 影响范围

- 修改：`app/components/MarkdownRenderer.tsx`、`app/history/page.tsx`、`app/components/__tests__/MarkdownRenderer.test.tsx`、`app/history/__tests__/page.test.tsx`

### 风险与假设

- 假设：AI 输出中的 `---` 属于 💡 小节（`parseStreamContent` 的 coreAdvice 提取会包含小节内 `---`）。
- 风险：低；`hideHr` 默认 false，不影响其它调用方。


