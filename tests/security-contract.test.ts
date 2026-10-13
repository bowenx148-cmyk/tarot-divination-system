import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readSource(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

describe("R1 静态契约：API Key 安全", () => {
  it("源码中不再读写 deepseek_api_key（仅允许 removeItem 清理旧数据）", () => {
    const files = [
      "app/page.tsx",
      "lib/store.ts",
      "app/components/ApiKeySettings.tsx",
    ];
    for (const f of files) {
      const content = readSource(f);
      expect(
        content,
        `${f} 不应再读取/写入 deepseek_api_key`,
      ).not.toMatch(/localStorage\.(setItem|getItem)\("deepseek_api_key"/);
    }
  });

  it("store 持久化不包含明文 apiKey 字段（partialize 仅 readings + encryptedApiKey）", () => {
    const content = readSource("lib/store.ts");
    expect(content).toContain("encryptedApiKey");
    expect(content).not.toMatch(
      /partialize:[\s\S]*?apiKey: state\.apiKey/,
    );
  });

  it("MarkdownRenderer 无 dangerouslySetInnerHTML 残留", () => {
    const content = readSource("app/components/MarkdownRenderer.tsx");
    expect(content).not.toContain("dangerouslySetInnerHTML");
  });

  it("store 明文 apiKey 不参与持久化（partialize 仅 readings + encryptedApiKey）", () => {
    const content = readSource("lib/store.ts");
    const partializeBlock =
      content.match(/partialize:\s*\(state\)\s*=>\s*\(\{([\s\S]*?)\}\),/)?.[1] ??
      "";
    expect(partializeBlock).toContain("readings");
    expect(partializeBlock).toContain("encryptedApiKey");
    // 明文 apiKey 字段（小写 apiKey:）不允许出现在持久化块中
    expect(partializeBlock).not.toContain("apiKey:");
  });
});

// 2026-09-16 上线前安全清单：安全响应头补全
describe("安全响应头契约（next.config.ts）", () => {
  const config = () => readSource("next.config.ts");

  it("配置了 nosniff（防 MIME 嗅探）", () => {
    expect(config()).toContain("X-Content-Type-Options");
    expect(config()).toContain("nosniff");
  });

  it("配置了点击劫持防护（X-Frame-Options + CSP frame-ancestors 双保险）", () => {
    const c = config();
    expect(c).toContain("X-Frame-Options");
    expect(c).toContain("DENY");
    expect(c).toContain("frame-ancestors 'none'");
  });

  it("配置了 Referrer-Policy", () => {
    expect(config()).toContain("Referrer-Policy");
    expect(config()).toContain("strict-origin-when-cross-origin");
  });

  it("CSP 同时限制了 base-uri 与 form-action", () => {
    const c = config();
    expect(c).toContain("base-uri 'self'");
    expect(c).toContain("form-action 'self'");
  });

  it("未引入 HSTS（站点为 HTTP 明文，HSTS 无意义且会干扰后续 HTTPS 迁移）", () => {
    expect(config()).not.toContain("Strict-Transport-Security");
  });
});
