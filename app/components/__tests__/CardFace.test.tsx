import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { CardFace } from "@/app/components/CardFace";
import { tarotCards } from "@/lib/tarot-data";

const card = tarotCards[0]; // 愚者

// 规格 G8/G17：逆位牌面必须**旋转 180°**，而不只是描个边。
//
// ⚠️ 本文件是全库唯一对「Tailwind 类名」做断言的地方（其余测试一律只断言
// 语义化 data 契约）。理由：旋转是纯视觉属性，jsdom 不加载样式表、也没有
// DOM 可观测代理；而这里恰恰漏过一次真实事故——CardFace 曾只加琥珀描边、
// 不旋转，导致选牌页与情况页的逆位牌不倒（结果页却正常，因为是另一套组件）。
// 若日后改用内联 transform，请把断言一并改为 toHaveStyle，不要直接删掉。
describe("CardFace 逆位呈现", () => {
  it("逆位时牌面旋转 180°", () => {
    const { container } = render(<CardFace card={card} reversed />);
    const rotated = container.querySelector(".rotate-180");
    expect(
      rotated,
      "逆位牌面应有 rotate-180 包裹层（仅有描边是不够的）",
    ).not.toBeNull();
  });

  it("正位时不旋转", () => {
    const { container } = render(<CardFace card={card} reversed={false} />);
    expect(container.querySelector(".rotate-180")).toBeNull();
  });

  it("逆位状态同时暴露为 data 契约（供页面级测试断言值是否传对）", () => {
    const { container: off } = render(<CardFace card={card} reversed={false} />);
    expect(off.firstElementChild?.getAttribute("data-reversed")).toBeNull();

    const { container: on } = render(<CardFace card={card} reversed />);
    expect(on.firstElementChild?.getAttribute("data-reversed")).toBe("true");
  });
});
