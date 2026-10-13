import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

describe("F0 冒烟测试：jsdom + React Testing Library 可用", () => {
  it("RTL 渲染并断言文本", () => {
    render(<div>hello vitest</div>);
    expect(screen.getByText("hello vitest")).toBeInTheDocument();
  });

});
