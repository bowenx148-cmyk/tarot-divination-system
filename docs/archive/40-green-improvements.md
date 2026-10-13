# 🟢 绿级：质量提升（G1–G7、G14）

> ⚠️ **本文是历史记录，不描述当前状态。** 条目 G1–G7、G14 已完成并归档，正文保留的是当时的
> 问题描述、验收标准、技术方案与 TDD 计划。

> 绿级条目为可选的质量提升，红/橙/黄全部完成后按需实施。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| G1 | 牌阵推荐逻辑增强（评分制） | 质量提升 | ✅ 完成 |
| G2 | AI 解析健壮性（降级提取 + prompt 加固） | 质量提升 | ✅ 完成 |
| G3 | .env.example 与部署文档 | 质量提升 | ✅ 完成 |
| G4 | 收尾：依赖审计、分支处置、可选 CI | 质量提升 | ⬜ 待开发 |
| G5 | 每日熔断配额 + 管理开关接口 | 质量提升（成本控制） | ✅ 完成 |
| G6 | 牌桌抽牌体验升级（78 张铺开 + 缩放 + 盲选抽取） | 质量提升（交互） | ✅ 完成（旧扇形/缩放流程，已被 G9/G10 取代） |
| G7 | 结果页 UI 视觉升级（深邃夜空风） | 质量提升（视觉） | ✅ 完成 |
| G8 | 抽牌交互模块重做（点击即选 + 原位翻牌 + 飞入槽位 + 多轮循环） | 质量提升（交互） | ✅ 完成 |
| G9 | 选牌改为平铺网格（移除扇形/旋转/缩放，减去已选牌） | 质量提升（交互） | ✅ 完成（网格移至 /draw/select 子页；13×6 已由 G11 改一行 8 张） |
| G10 | 选牌拆分为「选牌情况页」与「选牌子页」 | 质量提升（交互） | ✅ 完成 |
| G11 | 选牌/结果展示优化（select 一行 8 张；核心建议前置；结果页排版+位置标注） | 质量提升（交互/视觉） | ✅ 完成 |
| G12 | 核心建议结论先行（prompt 顺序 + 解析顺序无关） | 质量提升（AI 输出结构） | ✅ 完成 |
| G13 | 结果页末尾 AI 免责声明 + 牌背图案恢复 | 质量提升（视觉/合规） | ✅ 完成 |

> 注：G8–G13 的详细条目（问题描述/技术方案/TDD 计划）见 [draw-interaction.md](./draw-interaction.md)，不在本文件重复展开。

---

## [G1] 牌阵推荐逻辑增强（评分制）

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ✅ 完成

### 问题描述

- 现状：`lib/store.ts` L183–211 `recommendSpread` 用关键词 `includes` 顺序匹配：单个字 `'爱'`（L189）命中关系牌阵，导致"热爱工作"这类问题误判；匹配顺序固定、无评分；`question.length > 50` 直接强制生命指引。
- 影响：推荐结果误判率偏高。

### 目标

评分制推荐：按关键词命中数计分取最高，修正单字误判；默认无匹配返回单张牌；保持既有 5 种牌阵集合。

### 验收标准

- [ ] "热爱工作"类问题不命中情感十字
- [ ] 表驱动用例全部通过（见测试计划）
- [ ] 无匹配时默认返回单张牌
- [ ] 平局取规则表靠前者

### 技术方案

新增 `lib/spread.ts` 纯函数，`lib/store.ts` 复用：

```ts
interface SpreadRule { spreadId: string; keywords: string[]; }
// 四组规则：关系（爱情/恋爱/感情/喜欢/对象/伴侣/结婚/分手/表白/复合…）、
// 决策（选择/决定/应该/还是/换工作/工作/事业/创业/跳槽…）、
// 时间（未来/将来/发展/趋势/前景/这个月/明年…）、
// 人生（人生/命运/指引/迷茫/方向/整体/全面…）
// 注意：移除单字 '爱'、'关系' 等过宽词

export function recommendSpread(question: string): TarotSpread {
  const lower = question.toLowerCase();
  const scores = RULES.map((rule) => ({
    spreadId: rule.spreadId,
    score: rule.keywords.filter((k) => lower.includes(k)).length + (lower.length > 50 && rule.spreadId === "life-guidance" ? 1 : 0),
  }));
  const best = scores.reduce((a, b) => (b.score > a.score ? b : a), scores[0]);
  return (best.score > 0 ? tarotSpreads.find((s) => s.id === best.spreadId) : null)
    ?? tarotSpreads.find((s) => s.id === "single-card")!;
}
```

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/spread.test.ts` | 爱情类 | "我在感情方面应该如何选择" → `relationship-cross` |
| | 事业类 | "我的事业发展前景如何" → `decision-making` |
| | 时间类 | "未来三个月的发展趋势" → `past-present-future` |
| | 人生类/长问题 | "如何找到人生方向"、60 字长问题 → `life-guidance` |
| | 默认 | "今天适合出门吗" → `single-card` |
| | 边界 | "热爱工作" 不含关系词 → 非 `relationship-cross` |
| | 平局 | 同时含关系+决策词 → 规则表靠前者 |

### 影响范围

- 新增：`lib/spread.ts`
- 修改：`lib/store.ts`（recommendSpread 委托纯函数）

### 风险与假设

- 假设：行为变化会改变既有推荐结果——以表驱动测试为验收基准。
- 风险：低。

---

## [G2] AI 解析健壮性（降级提取 + prompt 加固）

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ✅ 完成
- **关联条目**: O3（parseStreamContent 产出）

### 问题描述

- 现状：结果页依赖 AI 输出严格包含 `## 🔮 深度解析过程` 与 `## 💡 核心建议` 小节（`app/result/page.tsx` L55–68 正则）；若模型未按结构输出，核心建议区永远不显示；分析区靠 L354 显示完整 `streamingContent` 兜底，但 `coreAdvice` 缺失无兜底。
- 影响：模型输出不稳定时功能降级不优雅。

### 目标

结构缺失时优雅降级：核心建议有兜底文案、分析区显示完整内容、不抛错不白屏；prompt 降低未命中概率。

### 验收标准

- [ ] 流完成但无 `## 💡` 节 → 核心建议区显示兜底文案（如固定文案），分析区显示完整内容
- [ ] prompt（`lib/deepseek.ts` L78–104）追加明确结构约束（必须包含两个小节、示例格式）
- [ ] 不抛错、不白屏

### 技术方案

1. `lib/stream-parse.ts`（O3 产出）保持返回 `coreAdvice: null`；UI 侧降级：`streamComplete && !coreAdvice` 时显示兜底文案（如"请结合以上解析，听从内心的声音"）。
2. `lib/deepseek.ts` prompt 末尾追加："务必严格包含 `## 🔮 深度解析过程` 与 `## 💡 核心建议` 两个小节，核心建议为单独一句话。"

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/stream-parse.test.ts` | 缺 💡 节 | 输入仅解析节 → `coreAdvice: null` |
| | 缺 🔮 节 | `analysis: null` |
| `app/result/__tests__/page.test.tsx` | 完成后无 advice 显示兜底 | mock 流完成且无 💡 → 核心建议区显示兜底文案 |
| | 完成后有 advice | 正常显示提取的 advice |

### 影响范围

- 修改：`lib/deepseek.ts`（prompt）、`app/result/page.tsx`（兜底文案）

### 风险与假设

- 假设：兜底文案风格与现有 UI 一致。
- 风险：低。

---

## [G3] .env.example 与部署文档

- **优先级**: 🟢
- **类别**: 文档
- **状态**: ✅ 完成

### 问题描述

- 现状：无 `.env.example`；`.gitignore` L37 的 `.env*` 连 `.env.example` 也一并忽略（git 无法跟踪示例文件）；README 只提及 `DEEPSEEK_API_KEY` 一个变量（R3 引入的 UPSTASH_* 未记录）。
- 影响：新环境配置靠猜。

### 目标

仓库含 `.env.example`，变量清单完整，README 部署章节引用它。

### 验收标准

- [ ] 仓库含 `.env.example`：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`（可选）、`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`（可选）、`QUOTA_DAILY_LIMIT`、`ADMIN_TOKEN`，均带中文注释（原为 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`，G14 迁移后变更）
- [ ] `.gitignore` 增加 `!.env.example` 例外，`.env.example` 可被 git 跟踪
- [ ] README 部署章节引用 `.env.example` 并说明部署环境变量配置（G14 后部署平台由 Vercel 改为腾讯云自建，见 `docs/DEPLOYMENT.md`）

### 技术方案

新增 `.env.example`；`.gitignore` L37 后追加 `!.env.example`；README 补充。

### TDD 测试计划

文档类条目：手工验收。

### 影响范围

- 新增：`.env.example`
- 修改：`.gitignore`、`README.md`

### 风险与假设

- 假设：`.env.example` 只含占位值，不含真实密钥（安全约定）。
- 风险：无。

---

## [G4] 收尾：依赖审计、分支处置、可选 CI

- **优先级**: 🟢
- **类别**: 质量提升
- **状态**: ✅ 完成（2026-09-16；可选 CI 经评估决定不加）
- **关联条目**: O2（less-modules 分支处置依据）

### 问题描述

- 现状：无 `npm audit` 记录；`feature/less-modules` 分支方向与 O2 方案冲突（样式统一到 globals 后该分支失去意义，存在误合并风险）；无 CI 守护。
- 影响：依赖漏洞未知、分支状态不清、质量无自动守护。

### 目标

依赖安全、分支处置明确、可选 CI 模板就绪。

### 验收标准

- [x] `npm audit` 无 high/critical 漏洞
- [x] 分支处置：**已直接删除远端 `feature/less-modules`**（比"README 注明废弃"更彻底——分支不存在即无误合并风险）
- [x] （可选）CI：**经评估决定不加**，理由见 `docs/archive/migration-2026-09.md` §13（使用周期约 2 个月、GitHub runner 海外到国内服务器链路不稳、SSH 私钥入 Secrets 增加泄露面、手工部署仅一条命令）

### 技术方案

1. 执行 `npm audit`，高危项升级或记录计划（写入本条目备注）。
2. README 分支说明段落标注 less-modules 废弃状态。
3. CI workflow（可选）：

   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     quality:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: npm }
         - run: npm ci
         - run: npm run type-check
         - run: npm run lint
         - run: npm run test:run
   ```

### TDD 测试计划

基础设施类：CI 上线后以流水线绿为验收；本地以三命令通过为验收。

### 影响范围

- 可选新增：`.github/workflows/ci.yml`（**未创建**）
- 修改：`package.json`、`package-lock.json`（依赖升级）
- 备注：`feature/less-modules` 分支已删除，README 无需再加废弃声明

### 风险与假设

- 假设：仓库启用 GitHub Actions（免费）；未启用则跳过 CI 部分。
- 风险：`npm audit` 若发现漏洞，按严重度安排修复或记录豁免理由。

### 处理记录（2026-09-16）

**审计基线**：`npm audit` 报 15 项（1 critical / 10 high / 3 moderate / 1 low），其中**仅 `next` 为直接依赖**，其余均为传递依赖。

**可达性分析**（升级前）：

| 漏洞 | 是否可达 |
|---|---|
| critical：Windows 宿主未认证 RCE（GHSA-p293-qw3h-jr36） | ❌ 服务器为 Ubuntu 22.04 |
| critical：Image Optimization AVIF RCE（GHSA-2xp9-vwfh-vxw4） | ❌ 无 `images` 配置 → 默认 `formats: ['image/webp']`；未配 `remotePatterns`（远程 URL 被拒），本地图片全为 JPG |
| 7 条 middleware/proxy bypass（high） | ❌ 项目无 `middleware.ts` |
| Server Actions 相关 DoS/SSRF（high） | ❌ 项目未使用 Server Actions |
| 其余（DoS、缓存投毒、图片优化 DoS） | ⚠️ 部分可达——`/_next/image` 公网开放 |

**处置**：尽管 critical 不可达，同版本区间内仍有大量 high 且 `next` 为唯一直接依赖，故直接升级而非记录豁免。

1. `npm audit fix`（非破坏性）→ 15 项降至 3 项（仅剩 next / postcss / sharp）；
2. `next` 与 `eslint-config-next` 同步 `16.1.6` → `16.3.5`（保持 `--save-exact` 精确锁定，与既有风格一致）→ **`found 0 vulnerabilities`**。

**升级后验证（2026-09-16 当时快照）**：`npm run build`（Next.js 16.3.5 + Turbopack，12 个路由全部产出）✅、`type-check` ✅、`lint` ✅、测试全绿 ✅。

> 上行为升级当天的历史快照；本文档不记录当前测试数量（该数字随时变化，记录无意义）。

**部署（2026-09-16 已完成）**：服务器已按归档 §11 流程重新部署（下载 tarball → `npm ci` → `npm run build` → `pm2 restart`），构建 `BUILD_EXIT=0`、10 个路由全部产出，`node_modules/next` 实测 `16.3.5`；站点外部验证 HTTP 200、`/api/trial-status` 与 `/api/suggested-questions` 均正常（Redis 连接未受影响）。

> 部署前已备份旧构建产物至服务器 `/root/next-backup-before-upgrade`，确认稳定后可删除。

---

## [G5] 每日熔断配额 + 管理开关接口

- **优先级**: 🟢
- **类别**: 质量提升（成本控制）
- **状态**: ✅ 完成

### 问题描述

- 现状：系统 Key 是免费试用的付费来源，仅有 deviceId 试用一次 + IP 限流，缺少全局成本熔断；用户（Key 持有者）无法在发布后控制系统 Key 的日用量。
- 需求（2026-08 用户确认）：每日用量上限 50 次（自然日 0 点起算），超限自动熔断（停止系统 Key，只允许用户自填 Key）；提供开关接口可随时关闭/开启熔断；**重新开启后从关闭时刻的计数继续，不清零**。

### 目标

1. 系统 Key 每天最多 50 次（上海时区自然日），超限熔断返回 `quota_exhausted`；
2. 管理接口可查询状态、开启/关闭熔断（Bearer ADMIN_TOKEN 认证）；
3. 关闭期间不计数不熔断；重新开启后从关闭时刻计数继续（不清零）；
4. Redis 持久化，重启/跨实例不清零；未配置回退内存（开发）。

### 验收标准

- [ ] 每日 50 次：第 50 次放行，第 51 次返回 429 `quota_exhausted`（`needApiKey: true`）
- [ ] 自然日 0 点（Asia/Shanghai）计数归零
- [ ] 关闭开关：放行且不计数；重新开启：计数从关闭时刻继续（不清零）
- [ ] `GET/POST /api/admin/quota`：无/错误 token → 401；正确 token → 查询/切换成功
- [ ] 用户自带 Key 完全不受熔断影响
- [ ] 上游错误（非 200）不计数
- [ ] Redis 版跨实例持久化；内存版单实例回退

### 技术方案

- 新增 `lib/server/quota.ts`：`QuotaGuard`（`getStatus` / `setEnabled` / `consume` / `increment`），内存版（Map + 上海日期 key + 惰性清理）+ Redis 版（`quota:enabled`、`quota:count:<dateKey>` + `EXPIRE` 到当天 24:00），工厂 `getQuotaGuard()`（`REDIS_HOST`/`REDIS_PASSWORD` 决定，见 G14）；
- 路由 `/api/deepseek-stream` 系统 key 路径：先配额熔断检查（`getStatus`），成功后 `increment`（与试用 markUsed 同处，上游错误不计数）；
- 管理接口 `app/api/admin/quota/route.ts`：`GET` 查询 / `POST {enabled}` 切换，`Authorization: Bearer <ADMIN_TOKEN>` 认证；
- 客户端 `lib/deepseek.ts` 识别 `quota_exhausted` → `onError`；result 页显示引导文案；
- 环境变量：`QUOTA_DAILY_LIMIT`（默认 50）、`ADMIN_TOKEN`（管理认证）、`REDIS_HOST` / `REDIS_PASSWORD`（原为 `UPSTASH_REDIS_REST_URL/TOKEN`，G14 迁移后变更）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/server/__tests__/quota.test.ts` | 计数累加/第 51 次熔断/关闭不计数/重开不清零/自然日归零/工厂回退 | 见用例 |
| `app/api/__tests__/admin-quota.route.test.ts` | 401/查询/切换/非布尔 400 | 见用例 |
| `app/api/__tests__/deepseek-stream.route.test.ts` | 熔断 429/关闭跳过/成功后 increment/上游错误不计数 | 见用例 |

### 影响范围

- 新增：`lib/server/quota.ts`、`app/api/admin/quota/route.ts` 及测试
- 修改：`app/api/deepseek-stream/route.ts`、`lib/deepseek.ts`、`app/result/page.tsx`
- 环境：`.env.local`（DEEPSEEK_API_KEY、QUOTA_DAILY_LIMIT、ADMIN_TOKEN）

### 风险与假设

- 假设：自然日以 Asia/Shanghai（UTC+8）为界；计数按"成功解析次数"，token 消耗监控留作后续。
- 风险：内存版重启即清零（仅开发）；生产必须配置 Redis 才能持久化。


---

## [G7] 结果页 UI 视觉升级（深邃夜空风）

- **优先级**: 🟢
- **类别**: 质量提升（视觉）
- **状态**: ✅ 完成
- **关联条目**: G6（抽牌交互，独立条目）；Y3（README 视觉描述）

### 问题描述

- 现状（用户反馈 2026-08）：结果页视觉松散、缺乏高级审美——
  - **俄罗斯套娃卡片**：每个区块 `mystical-card` 外层再套彩色圆角盒（`bg-blue-50`/`bg-purple-50`/黄橙渐变），三层边框+阴影叠加，层级混乱；
  - **标题失衡**：四块全是 `text-2xl md:text-3xl font-bold` 巨标题 + `mb-6`，标题区挤压内容；
  - **色板混乱**：蓝（问题）/紫（牌阵）/紫蓝渐变（解析）/黄橙（建议）/琥珀（逆位）5+ 色系并置；
  - **牌展示弱**：`w-28 h-44` 小牌夹在卡片里，非视觉中心；
  - **按钮风格分裂**：顶部紫渐变圆钮 vs 底部白底描边方钮。
- 影响：结果页是占卜体验的终点，视觉质量直接决定产品观感。

### 目标

结果页整体重构为**深邃夜空风**（深紫/藏蓝渐变背景 + 玻璃拟态卡片 + 金紫点缀），保留四块信息结构并统一为连贯叙事流；抽牌结果**轻量呈现 + 点击放大（标注牌位）**；功能逻辑与现有结果页测试全部保持绿。

### 验收标准（用户确认）

- [ ] 视觉方向：深邃夜空风（深紫/藏蓝渐变 + 玻璃拟态 + 金紫点缀）
- [ ] 牌展示：轻量小图 + 点击放大，放大时标注该牌在牌阵中的位置
- [ ] 信息结构：保留四块（问题/抽牌/解析/建议），统一为叙事流
- [ ] 四块均为 `astro-card` 玻璃卡片 + `astro-card-title` 小号大写标题 + 金线
- [ ] 点击任意牌 → CardModal 放大显示牌位名+牌名+正逆位+关键词；遮罩/ESC/关闭按钮均可关闭
- [ ] 解析正文深色可读（`MarkdownRenderer variant="dark"`），行宽收窄、流式光标金色
- [ ] 历史页（浅色）不受影响（variant 默认 light）
- [ ] `npm run test:run` / `type-check` / `lint` 三绿

### 技术方案

1. **`app/globals.css`**：`:root` 新增 `--gold`/`--gold-light`/`--astro-deep`/`--astro-mid`/`--astro-glow`；`@theme` 注册 gold 色系；`@layer components` 新增 `.astro-bg`（深紫→藏蓝渐变）、`.astro-stars`（深色星点）、`.astro-card`（玻璃拟态 + 金线）、`.astro-card-title`（小号大写 + 金线）、`.astro-button`（玻璃按钮）、`.astro-divider`。
2. **`app/components/CardModal.tsx`（新增）**：全屏深色遮罩 + 居中放大牌图 + 牌位徽章 + 牌名/正逆位/关键词；遮罩/ESC/按钮关闭，内容区点击不关闭；`data-testid` 供测试。
3. **`app/result/page.tsx`**：`astro-bg` + `astro-stars`；四块 `astro-card` + `astro-card-title`；问题区去内层盒、衬线大字；牌阵区轻量小图 + 点击打开 CardModal；解析区 `max-w-2xl` + `variant="dark"`；建议区金色氛围；底部按钮统一 `astro-button`。
4. **`app/components/MarkdownRenderer.tsx`**：新增 `variant?: "light" | "dark"`，dark 白字/金强调，默认 light 兼容历史页。
5. **字体**：标题/问题/建议用系统衬线栈 `font-serif`（不新增 next/font 依赖与 CSP/mock 风险）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/components/__tests__/CardModal.test.tsx` | 显示牌图/牌名/牌位/正逆位/关键词 | 渲染 → 各文本可见 |
| | 逆位标注 | isReversed → "逆位" |
| | 遮罩点击关闭 / ESC 关闭 / 内容区点击不关闭 | onClose 调用与否 |
| `app/result/__tests__/page.test.tsx` | 点击牌 → 放大模态显示牌位标注，关闭后消失 | 点第一张牌 → 模态含 positions[0] 与牌名；点遮罩 → waitFor 消失 |
| | 现有用例保持绿 | `.prose` 与 grid 类名结构保留 |

### 影响范围

- 新增：`app/components/CardModal.tsx`、`app/components/__tests__/CardModal.test.tsx`
- 修改：`app/result/page.tsx`、`app/globals.css`、`app/components/MarkdownRenderer.tsx`、`app/result/__tests__/page.test.tsx`
- 不动：`lib/` 全部逻辑、store、路由、历史页

### 风险与假设

- 假设：系统衬线栈 `font-serif` 提供足够高级感；若需更强字体可另立条目用 next/font（Cormorant Garamond）。
- 风险1：深色结果页与浅色首页/draw 的视觉跳变——本条目仅结果页，全站统一可另立条目。
- 风险2：AnimatePresence exit 在 jsdom 延迟移除节点——测试用 `waitFor`。
- 风险3：CSP 不受影响（未新增外联字体）。


---

## [G6] 牌桌抽牌体验升级（78 张铺开 + 整桌缩放 + 严格盲选）

> 历史条目：本条目实现的扇形铺开 + 整桌缩放 + 点击即抽流程已被 **G9（平铺网格）**、**G10（情况页 + 选牌子页）**、**G11（一行 8 张）** 取代；`lib/useSpreadZoom.ts` 已无调用方，随文档审查（G13）**删除**。

- **优先级**: 🟢
- **类别**: 质量提升（交互）
- **状态**: ✅ 完成
- **关联条目**: O4（Fisher-Yates 洗牌）、G7（结果页视觉，独立条目）

### 问题描述

- 现状：选牌步骤铺开的是 `Array.from({ length: 24 })` 装饰占位（非真实牌），点击位置与结果无关——选满后 `getRandomCards` 随机抽牌，用户"选了却抽到别的牌"，体验割裂、无仪式感。
- 影响：占卜最核心的"凭直觉选牌"环节失真。

### 目标

选牌步骤铺开 **78 张真实牌（CSS 牌背，用户确认不需要真实背面图片）**，支持**整桌缩放浏览**（桌面滚轮/移动双指 + 拖拽平移），**严格盲选**（只显示牌背），点击第 N 张牌背 → 抽中的就是 `tarotCards[N]`（一一对应）。

### 验收标准（用户确认）

- [ ] 选牌步骤渲染 78 张 CSS 牌背（`data-card-back="true"`，非占位）
- [ ] 严格盲选：无牌面图片/名称泄露
- [ ] 点击第 N 张牌背 → `drawnCards` 中该张 = `tarotCards[N]`（pickCardsByIndex）
- [ ] 整桌缩放：桌面滚轮以指针为中心缩放 + 拖拽平移；移动端双指捏合缩放 + 单指拖拽
- [ ] 拖拽与点击用位移阈值（>5px）区分，拖拽不误触选牌
- [ ] 缩放控件（放大/缩小/重置）可见可点
- [ ] 选满 cardCount 自动进入 reveal 翻牌步骤；已选牌不可重复选
- [ ] `npm run test:run` / `type-check` / `lint` 三绿

### 技术方案

1. **`lib/pick.ts`（新增）**：`pickCardsByIndex(deck, indexes)` 纯函数——按点击索引取真实牌，保持点击顺序、重复索引去重、越界忽略。
2. **`lib/useSpreadZoom.ts`（新增）**：整桌缩放 hook——scale/x/y state；pointer events 管理多指（单指拖拽平移、双指捏合缩放以中点为心）；滚轮以指针为中心缩放（0.35–2.5 倍）；位移阈值 5px 区分拖拽与点击（`ignoreClick()` 供选牌判断）；`registerContainerRef` 回调注册容器（避免 React Compiler 规则对渲染期 ref 访问的报错）。
3. **`app/draw/page.tsx`**：
   - 移除 `getRandomCards` 调用与 24 占位；`handleCardSelect(index)` 用 `pickCardsByIndex(tarotCards, newSelected)` 取牌（30% 逆位保留）；
   - draw 步骤渲染 `tarotCards.map` 78 张 CSS 牌背（紫蓝渐变 + 🌟 + TAROT），`data-card-back`/`data-index` 标记；
   - 牌桌容器绑定缩放 hook（`touch-none select-none`），内层 `translate+scale` 变换；
   - 顶部缩放控件（ZoomOut/重置 Maximize/ZoomIn + 提示文案"滚轮/双指缩放 · 拖拽浏览 · 点击选牌"）；
   - 底部提示"78 张牌背朝上铺开，凭直觉选择 N 张"。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/pick.test.ts` | 按索引取牌一一对应 | `pickCardsByIndex(tarotCards,[0,1])` → `[tarotCards[0],tarotCards[1]]` |
| | 保持点击顺序 | `[5,2,10]` → 顺序保持 |
| | 重复索引去重 | `[1,1,2]` → 2 张不重复 |
| | 空数组/越界/超量 | 空→`[]`；越界忽略；100 次取全 78 无重复 |
| `app/draw/__tests__/page.test.tsx` | 渲染 78 张 CSS 牌背 | waitFor 后 `[data-card-back="true"]` 数量 78 |
| | 严格盲选无牌面 | 无 `img[alt="愚者"]` |
| | 点击第 N 张 → 抽中该张 | 点 index=7 → `drawnCards[0].id === tarotCards[7].id` |
| | 选满自动进入 reveal | 2 张牌阵选满 → "点击卡牌揭示结果"（waitFor） |
| | 已选不可重复 | 重复点击不进入 reveal、计数不变 |
| | 缩放控件存在 | `spread-zoom-controls` testid 可见 |

### 影响范围

- 新增：`lib/pick.ts`、`lib/useSpreadZoom.ts`、`lib/__tests__/pick.test.ts`、`app/draw/__tests__/page.test.tsx`
- 修改：`app/draw/page.tsx`（draw 步骤重写 + 缩放 + 盲选）
- 备注：`lib/store.ts` 的 `getRandomCards` 自此无调用方（已于 2026-09-16 前随 Y2 死代码清理移除）；`lib/pick.ts` 随后也因选牌子页改用 `pickedIndexesFromSlots` 而失效，已于 **2026-09-16 删除**

### 风险与假设

- 假设：手写 pointer events + framer-motion 足够实现整桌缩放，不引入第三方依赖（符合项目轻依赖风格）。
- 风险1：React Compiler 规则（`react-hooks/refs`）禁止渲染期访问 ref——hook 用 `registerContainerRef` 回调 + 组件内解构局部变量规避。
- 风险2：jsdom 无法模拟真实触摸/滚轮——缩放交互以手动验收为准；测试覆盖数据流与 DOM 结构。
- 风险3：78 张 `next/image` 不涉及（CSS 牌背无图片请求）；结果页仍用真实牌图（G7 不变）。

---

## [G14] 腾讯云迁移适配：ioredis + deviceId 兼容 HTTP

- **优先级**: 🟢
- **类别**: 部署
- **状态**: ✅ 完成
- **关联条目**: D10、D11；部署记录见 [`migration-2026-09.md`](./migration-2026-09.md) §6

### 问题描述

- 项目原部署在 Vercel（海外），中国大陆访问需 VPN；迁移到腾讯云轻量应用服务器后暴露两个不兼容点：
  1. 状态存储用 Upstash Redis **REST**（海外 SaaS），需换成服务器自建的境内 Redis；
  2. 公网 IP 直连只能是 HTTP（非安全上下文），`crypto.randomUUID()` 返回 `undefined`，deviceId 生成失败 → AI 解析报 `TypeError: crypto.randomUUID is not a function`。

### 目标

1. 存储层换为 ioredis 连自建 Redis，环境变量改为 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`，**调用方零改动**；
2. deviceId 在 HTTP 下仍可生成，免费试用/限流链路可用。

### 验收标准

- [x] `redisCommand(commands)` 接口与返回结构 `RedisCommandResult[]` 不变，`trial.ts` / `rate-limit.ts` / `quota.ts` 无需改动
- [x] 单命令直连、多命令走 pipeline（语义与旧 Upstash REST `/pipeline` 一致）
- [x] `hasRedisConfig()` 判定 `REDIS_HOST && REDIS_PASSWORD`；缺一回退单实例内存
- [x] HTTP 部署下 deviceId 可正常生成（`crypto.getRandomValues()` 手写 UUID v4）
- [x] `type-check` / `lint` / 全量测试通过

### 技术方案

1. **存储层**（commit `01db5a6`）：`package.json` 增加 `ioredis`；`lib/server/upstash.ts` 内 `redisCommand` 由「Upstash REST fetch」改为「ioredis 执行命令」（单命令 `redis.call`，多命令 `pipeline`）；连接错误用空 handler 挂起，避免进程退出，命令失败仍由 `redisCommand` 捕获返回。
2. **deviceId**（commit `c09d5c1`）：`lib/deviceId.ts` 改用 `crypto.getRandomValues()` 手写 UUID v4，HTTP 下同样可用。
3. **连带降级**（D10）：`crypto.subtle` 同样仅在安全上下文可用 → `setApiKey` 已 try/catch 降级为不持久化 API Key（内存可用、刷新需重填），上 HTTPS 才能恢复。

### TDD 测试计划

| 测试文件 | 断言要点 |
|---|---|
| `lib/__tests__/deviceId.test.ts` | 生成的 ID 符合 UUID v4 格式；重复调用不重复；无 `crypto.randomUUID` 依赖 |
| `lib/server/__tests__/{trial,rate-limit,quota}.test.ts` | 工厂在无 Redis 配置时回退内存版；内存版行为不变（本次改动不影响这些契约） |

### 影响范围

- 修改：`package.json`（+ioredis）、`lib/server/upstash.ts`、`lib/deviceId.ts`
- 环境：`UPSTASH_*` / `KV_*` → `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`（同步 `.env.example` 与部署文档）
- 文档：`docs/DEPLOYMENT.md`、`docs/OPERATIONS.md`、`docs/archive/migration-2026-09.md`

### 风险与假设

- 假设：自建 Redis 只监听 `127.0.0.1` + `requirepass` + AOF，语义与 Upstash 等价（`SET/GET/EXISTS/INCR/EXPIRE` 均为原生命令）。
- 风险1：客户端用模块级单例连接，Next.js 热重载/多实例下可能产生多条连接（已用 `client.on("error", () => {})` 防止错误冒泡退出进程）。
- 风险2：HTTP 下 API Key「记住」功能永久失效，属固有限制，非本条目可解（需 HTTPS + 域名 + ICP 备案）。