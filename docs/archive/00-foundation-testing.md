# F0 测试基础设施（TDD 前提）

> ⚠️ **本文是历史记录，不描述当前状态。** 条目 F0 已完成并归档，正文保留的是当时的
> 问题描述、验收标准、技术方案与 TDD 计划。

> 本条目是所有 TDD 工作的前置条件：项目当前**零测试设施**（package.json 无 test 脚本、无测试依赖、无配置文件）。必须先建立设施，后续条目的"红→绿"循环才有执行环境。

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| F0 | 测试基础设施（Vitest + RTL） | 基础设施 | ✅ 完成 |

---

## [F0] 测试基础设施（Vitest + React Testing Library）

- **优先级**: 🔴（前置，不按颜色归类）
- **类别**: 基础设施
- **状态**: ✅ 完成

### 问题描述

- 现状：`package.json` 只有 dev/build/start/lint/type-check 脚本，无任何测试依赖与测试文件。
- 问题：没有测试设施，SDD+TDD 无从开展；后续 R1–G4 每个条目都依赖"先写失败测试"。
- 影响：阻塞全部修复项。

### 目标

建立 Vitest 测试设施：`npm test` 可运行，支持 jsdom 组件测试、`@` 路径别名、`next/image` 与 `next/font` 的 mock，且不请求网络。

### 验收标准

- [ ] `npm run test:run`（vitest run）退出码 0，冒烟测试通过
- [ ] `npm test`（vitest watch）可交互运行
- [ ] 冒烟测试验证：`@` 别名可用（`@/lib/utils` 导入成功）、jsdom 环境可用（RTL 渲染断言）
- [ ] `vitest.setup.ts` 中 `next/image`、`next/font/google` 被 mock，组件测试不发起网络请求
- [ ] 测试文件与被测文件就近放置（colocated），如 `lib/__tests__/x.test.ts`、`app/components/__tests__/x.test.tsx`

### 技术方案

1. **依赖**（devDependencies）：
   - `vitest`（最新稳定版）
   - `@vitejs/plugin-react`（JSX/TSX 转换）
   - `@testing-library/react`（≥ v16，支持 React 19）
   - `@testing-library/jest-dom`（DOM 断言扩展）
   - `jsdom`（DOM 环境）

2. **`vitest.config.ts`**（项目根）：

   ```ts
   import { defineConfig } from "vitest/config";
   import react from "@vitejs/plugin-react";
   import path from "path";

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: "jsdom",
       globals: true,
       setupFiles: ["./vitest.setup.ts"],
     },
     resolve: {
       alias: { "@": path.resolve(__dirname, ".") },
     },
   });
   ```

3. **`vitest.setup.ts`**：

   ```ts
   import "@testing-library/jest-dom/vitest";
   import { vi } from "vitest";

   // next/image → 普通 img（去掉 fill/priority 等非标准属性）
   vi.mock("next/image", () => ({
     default: (props: Record<string, unknown>) => {
       const { fill, priority, sizes, loading, ...rest } = props as Record<string, unknown>;
       void fill; void priority; void sizes; void loading;
       return { type: "img", props: rest };
     },
   }));

   // next/font/google → 静态对象（避免构建期联网下载字体）
   vi.mock("next/font/google", () => ({
     Geist: () => ({ variable: "--font-geist-sans" }),
     Geist_Mono: () => ({ variable: "--font-geist-mono" }),
   }));
   ```

   > 说明：`next/image` 的 mock 返回 React 元素描述对象即可（React 测试渲染会自动转成元素）；`next/font` 必须在 setup 中全局 mock，否则 `app/layout.tsx` 的测试（Y4）会尝试联网。

4. **package.json scripts**：

   ```json
   "test": "vitest",
   "test:run": "vitest run",
   "test:watch": "vitest watch"
   ```

5. **冒烟测试**（验证设施本身）：

   - `lib/__tests__/foundation.test.ts`：验证 `@/lib/utils` 的 `cn` 函数。
   - `app/components/__tests__/foundation.test.tsx`：RTL 渲染 `<div>hello</div>` 断言文本。

### TDD 测试计划

> 本条目是基建：先搭配置，再写冒烟测试证明设施可用（冒烟测试是设施验证，不是业务红）。后续条目的测试都按各自文档执行。

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/__tests__/foundation.test.ts` | 别名与纯函数可用 | `cn("a", "b")` 返回 `"a b"`（验证 `@` 别名解析） |
| `app/components/__tests__/foundation.test.tsx` | jsdom + RTL 可用 | `render(<div>hello</div>)`，`screen.getByText("hello")` 存在 |

### 影响范围

- 新增：`vitest.config.ts`、`vitest.setup.ts`、`lib/__tests__/foundation.test.ts`、`app/components/__tests__/foundation.test.tsx`
- 修改：`package.json`（devDependencies + scripts）

### 风险与假设

- 假设：Node ≥ 18（本机 v24 满足）；vitest 最新版与 React 19.2 兼容（`@testing-library/react` ≥ v16 官方支持 React 19）；Next 16 的 Turbopack 不影响 vitest（vitest 独立运行，不经 Next）。
- 风险：若 `@vitejs/plugin-react` 与 vitest 版本冲突，退回 `esbuild` 默认转换（vitest 内置）亦可用。
- 备选方案：若未来需要 E2E，再评估 Playwright（不在本规格范围）。
