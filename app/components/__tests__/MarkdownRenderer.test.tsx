import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";

describe("R1-A MarkdownRenderer XSS 消毒", () => {
  it("script 标签按文本渲染，不创建 script 元素", () => {
    render(<MarkdownRenderer content={'<script>alert(1)</script>'} />);
    expect(document.querySelector("script")).toBeNull();
    // 原始文本应可见（react-markdown 将其作为文本输出）
    expect(screen.getByText(/alert\(1\)/)).toBeInTheDocument();
  });

  it("img onerror 不执行，不渲染 img 元素", () => {
    render(<MarkdownRenderer content={'<img src="x" onerror="alert(1)" />'} />);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText(/onerror/)).toBeInTheDocument();
  });

  it("javascript: 链接被过滤", () => {
    render(<MarkdownRenderer content="[点我](javascript:alert(1))" />);
    const links = Array.from(document.querySelectorAll("a"));
    expect(links.every((a) => !a.getAttribute("href")?.includes("javascript:"))).toBe(true);
  });

  it("标准 markdown 特性仍渲染（标题/粗体/列表/代码/引用/hr/链接）", () => {
    const content = [
      "## 标题二",
      "",
      "这是**粗体**和 `行内代码`",
      "",
      "- 列表项一",
      "- 列表项二",
      "",
      "> 引用内容",
      "",
      "---",
      "",
      "[链接文本](https://example.com)",
    ].join("\n");
    render(<MarkdownRenderer content={content} />);

    expect(document.querySelector("h2")).toBeInTheDocument();
    expect(document.querySelector("strong")).toBeInTheDocument();
    expect(document.querySelector("code")).toBeInTheDocument();
    expect(document.querySelector("ul")).toBeInTheDocument();
    expect(document.querySelector("li")).toBeInTheDocument();
    expect(document.querySelector("blockquote")).toBeInTheDocument();
    expect(document.querySelector("hr")).toBeInTheDocument();
    const link = document.querySelector("a");
    expect(link).toBeInTheDocument();
    expect(link?.getAttribute("href")).toBe("https://example.com");
  });

  it("hideHr：content 含 --- 时不再渲染 hr 元素（Y9 建议卡用）", () => {
    const { container } = render(
      <MarkdownRenderer content={"---\n\n正文内容"} hideHr />,
    );
    expect(container.querySelector("hr")).toBeNull();
    expect(screen.getByText("正文内容")).toBeInTheDocument();
  });

  it("空内容返回 null", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("流式增量拼接不丢失（分多次渲染累积文本）", () => {
    const parts = ["你好，", "这是**流式**", "内容。"];
    const { rerender } = render(<MarkdownRenderer content="" />);
    let acc = "";
    for (const part of parts) {
      acc += part;
      rerender(<MarkdownRenderer content={acc} />);
    }
    expect(screen.getByText(/你好/)).toBeInTheDocument();
    expect(screen.getByText(/流式/)).toBeInTheDocument();
    expect(screen.getByText(/内容/)).toBeInTheDocument();
  });
});
