import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RootLayout from "@/app/layout";
import { metadata } from "@/app/layout";

describe("Y4 layout metadata 定制", () => {
  it("metadata.title 为中文品牌文案", () => {
    expect(metadata.title).toContain("塔罗指引");
  });

  it("metadata.description 非空且为中文品牌描述", () => {
    expect(metadata.description).toBeTruthy();
    expect(String(metadata.description).length).toBeGreaterThan(10);
  });

  it('html 标签 lang="zh-CN"', () => {
    const html = renderToStaticMarkup(RootLayout({ children: <div /> }));
    expect(html).toContain('<html lang="zh-CN"');
  });
});
