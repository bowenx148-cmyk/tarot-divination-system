import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readSource(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

// 规格 O2：draw/result 页 mystical-* 类不生效
// 这些类原仅定义于 ui.module.css（CSS Module，类名被 hash），
// 而 draw/result 页以裸字符串引用 → 样式不生效。方案：迁移到 globals.css。
describe("O2 设计系统类全局契约", () => {
  it("页面用到的 mystical 裸类均在 globals.css 中有定义", () => {
    const globals = readSource("app/globals.css");
    const pages = [
      "app/draw/page.tsx",
      "app/result/page.tsx",
      "app/components/ui.tsx",
    ];
    const used = new Set<string>();
    for (const f of pages) {
      const src = readSource(f);
      for (const m of src.matchAll(/mystical-[a-z]+/g)) {
        used.add(m[0]);
      }
    }
    expect(used.size).toBeGreaterThan(0);
    for (const cls of used) {
      // 类名以 . 开头出现在 globals.css（.mystical-bg { ... } 或 .mystical-bg,）
      expect(globals, `${cls} 应在 globals.css 中有定义`).toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });

  it(".stars 与 @keyframes twinkle 已迁移到 globals.css", () => {
    const globals = readSource("app/globals.css");
    expect(globals).toContain(".stars");
    expect(globals).toContain("@keyframes twinkle");
  });

  it("ui.module.css 不再包含同名设计系统类（单一来源）", () => {
    // 文件已删除（样式全部迁至 globals.css）= 无任何定义，契约通过
    let moduleCss: string | null = null;
    try {
      moduleCss = readSource("app/components/ui.module.css");
    } catch {
      moduleCss = null;
    }
    for (const cls of ["mystical-bg", "mystical-card", "mystical-button", "mystical-input", "stars"]) {
      if (moduleCss === null) continue; // 文件不存在 → 无定义
      expect(moduleCss, `ui.module.css 不应再定义 .${cls}`).not.toMatch(
        new RegExp(`\\.${cls}\\b`),
      );
    }
  });

  // 规格 G17：无障碍只做 prefers-reduced-motion（键盘与 SR 明确记为已知缺口）。
  // 契约锁定"CSS 动画必须被降级"——framer-motion 一侧由 MotionConfig reducedMotion="user" 覆盖，
  // CSS 一侧（animate-pulse / .stars 的 twinkle）必须在此显式停用，二者缺一即漏。
  it("G17 prefers-reduced-motion 降级块存在，且确实停用了 CSS 动画", () => {
    const globals = readSource("app/globals.css");
    const block = globals.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*?)\n\}/,
    );
    expect(
      block,
      "globals.css 应含 @media (prefers-reduced-motion: reduce) 块",
    ).not.toBeNull();
    const body = block![1];

    // 必须是真实的属性声明——注释里提到 "animation" 不算
    expect(body, "该块应含真实的 animation 属性声明").toMatch(
      /animation(-duration|-iteration-count)?\s*:/,
    );
    // 必须覆盖本仓库实际的无限 CSS 动画：
    //   .astro-stars::before → animation: twinkle（注意 .stars 是 display:none，与动画无关）
    //   .animate-pulse       → Tailwind 的脉冲（首页骨架屏、SpreadSlots 聚焦空位）
    // 逐类点名或用通配符统一降级，两种都接受。
    const universal = /(^|\n)\s*\*[^{]*\{/.test(body);
    const named = /\.astro-stars/.test(body) && /\.animate-pulse/.test(body);
    expect(
      universal || named,
      "该块应逐类停用（.astro-stars 的 twinkle、.animate-pulse），或用通配符统一降级",
    ).toBe(true);
  });

  it("mystical 样式依赖的 CSS 变量已在 :root 定义", () => {
    const globals = readSource("app/globals.css");
    for (const v of [
      "--purple-50",
      "--purple-100",
      "--purple-200",
      "--purple-300",
      "--secondary",
      "--accent",
    ]) {
      expect(globals, `${v} 应在 :root 定义`).toContain(v);
    }
  });
});
