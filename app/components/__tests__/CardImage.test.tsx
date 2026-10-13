import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CardImage } from "@/app/components/CardImage";
import { tarotCards } from "@/lib/tarot-data";

// 规格 G15：卡牌图片唯一入口
// （档位正确性由 tests/card-image-variant.test.ts 的静态契约保证——
//   vitest.setup.ts 的 next/image mock 会剥离 sizes，DOM 层断言不到）
describe("G15 CardImage 唯一图片入口", () => {
  const card = tarotCards[0]; // 愚者，有图

  it("渲染牌面图片，src 指向牌面资源，alt 为牌名", () => {
    render(<CardImage card={card} />);
    const img = screen.getByAltText("愚者");
    expect(img).toHaveAttribute("src", card.image);
  });

  it("透传 className 与 onError（供调用方做加载失败回退）", () => {
    let errored = false;
    render(
      <CardImage
        card={card}
        className="object-cover"
        onError={() => {
          errored = true;
        }}
      />,
    );
    const img = screen.getByAltText("愚者");
    expect(img).toHaveClass("object-cover");
    img.dispatchEvent(new Event("error"));
    expect(errored).toBe(true);
  });

  it("放大模态可显式覆盖 sizes（唯一例外）", () => {
    render(<CardImage card={card} sizes="320px" />);
    expect(screen.getByAltText("愚者")).toBeInTheDocument();
  });
});
