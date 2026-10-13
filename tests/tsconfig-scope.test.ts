import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readJsonIfExists(rel: string): Record<string, unknown> | null {
  const p = resolve(root, rel);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8"));
}

// 规格 G16：测试文件移出生产构建的类型检查
// 根因：next build 的类型检查 = tsc -p tsconfig.json --noEmit，而根 tsconfig 的
// include 覆盖了测试文件，导致服务器残留的过期测试文件能打挂生产构建（2026-09-17 已发生）。
// 本契约锁定"正确划界"：生产构建不检查测试；测试仍由 tsconfig.test.json 覆盖检查。
describe("G16 测试文件移出生产构建类型检查（契约）", () => {
  const TEST_GLOBS = ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**"];
  // 测试基础设施：同样不是生产产物，且 import 的是 devDependencies
  // （vitest / @testing-library/jest-dom）。留在生产构建的类型检查里意味着
  // `npm ci --omit=dev` 会直接打挂构建——按"生产构建只检查生产代码"的原则一并排除。
  const TEST_INFRA = ["vitest.setup.ts", "vitest.config.ts"];

  it("根 tsconfig.json 的 exclude 排除测试文件与测试基础设施", () => {
    const ts = readJsonIfExists("tsconfig.json");
    expect(ts, "tsconfig.json 应存在").not.toBeNull();
    const exclude = ts!.exclude;
    expect(exclude, "根 tsconfig 应有 exclude").toBeDefined();
    for (const g of [...TEST_GLOBS, ...TEST_INFRA]) {
      expect(exclude, `根 tsconfig exclude 应包含 ${g}`).toContain(g);
    }
  });

  it("tsconfig.test.json 仍覆盖测试基础设施（检查没被关掉，只是归位）", () => {
    const tsTest = readJsonIfExists("tsconfig.test.json");
    expect(tsTest, "tsconfig.test.json 应存在").not.toBeNull();
    const exclude = (tsTest!.exclude as unknown[] | undefined) ?? [];
    for (const g of TEST_INFRA) {
      expect(exclude, `tsconfig.test.json 的 exclude 不应包含 ${g}`).not.toContain(g);
    }
  });

  it("tsconfig.test.json 存在，且 extends 根配置", () => {
    const tsTest = readJsonIfExists("tsconfig.test.json");
    expect(tsTest, "tsconfig.test.json 应存在").not.toBeNull();
    expect(tsTest!.extends).toBe("./tsconfig.json");
  });

  it("tsconfig.test.json 的 exclude 不排除测试文件（开发类型检查仍覆盖测试）", () => {
    const tsTest = readJsonIfExists("tsconfig.test.json");
    expect(tsTest, "tsconfig.test.json 应存在").not.toBeNull();
    const exclude = (tsTest!.exclude as unknown[] | undefined) ?? [];
    for (const g of TEST_GLOBS) {
      expect(exclude, `tsconfig.test.json 的 exclude 不应包含 ${g}`).not.toContain(g);
    }
  });

  it("npm run type-check 使用 tsconfig.test.json（否则测试类型检查静默丢失）", () => {
    const pkg = readJsonIfExists("package.json");
    expect(pkg, "package.json 应存在").not.toBeNull();
    const scripts = (pkg!.scripts as Record<string, string>) ?? {};
    expect(scripts["type-check"], "type-check 脚本应指向 tsconfig.test.json").toContain(
      "tsconfig.test.json",
    );
  });
});
