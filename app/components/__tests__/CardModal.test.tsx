import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CardModal } from "@/app/components/CardModal";
import { tarotCards } from "@/lib/tarot-data";

describe("G7 CardModal 牌放大模态", () => {
  const card = tarotCards[0]; // 愚者

  it("显示牌图、牌名、牌位标注、正逆位与关键词", () => {
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("过去")).toBeInTheDocument(); // 牌位
    expect(screen.getByText("愚者")).toBeInTheDocument(); // 牌名
    expect(screen.getByText("正位")).toBeInTheDocument();
    expect(screen.getByText(/新开始/)).toBeInTheDocument(); // 关键词
  });

  it("逆位时标注逆位", () => {
    render(
      <CardModal
        card={card}
        position="未来"
        isReversed
        onClose={() => {}}
      />,
    );
    expect(screen.getByText("逆位")).toBeInTheDocument();
  });

  it("点击遮罩触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    // 遮罩层(模态最外层)点击 → 关闭
    fireEvent.click(screen.getByTestId("card-modal-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC 键触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("内容区点击不触发 onClose(防止误关)", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="现在"
        isReversed={false}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("card-modal-content"));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// 规格 G17：选牌子页复用 CardModal 作为揭示浮层。
// reveal 为可选 prop——结果页不传，行为与 G7 完全一致（上方用例即回归保证）。
describe("G17 CardModal 的 reveal 形态", () => {
  const card = tarotCards[0];
  const ORIGIN = { x: 40, y: 300, width: 51, height: 76 };

  const renderReveal = (props: Partial<{ actionLabel: string; exiting: boolean }> = {}) =>
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
        actionLabel="确认"
        reveal={{ origin: ORIGIN, exiting: props.exiting ?? false }}
      />,
    );

  it("揭示形态不渲染右上角关闭按钮（由「确认」与点击蒙层承担退出）", () => {
    renderReveal();
    const labels = screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");
    expect(labels).toEqual(["确认"]);
  });

  it("揭示形态的蒙层使用淡紫半透明，而非 G7 的黑蒙层", () => {
    renderReveal();
    const overlay = screen.getByTestId("card-modal-overlay");
    expect(overlay.className).toContain("purple");
    expect(overlay.className).not.toContain("black/85");
  });

  it("飞行元素存在且载有源格矩形（jsdom 无布局，坐标本身不可断言）", () => {
    renderReveal();
    expect(screen.getByTestId("reveal-flying-card")).toBeInTheDocument();
  });

  it("非揭示形态（结果页）仍保留黑蒙层与关闭按钮", () => {
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId("card-modal-overlay").className).toContain(
      "black/85",
    );
    expect(screen.getByLabelText("关闭")).toBeInTheDocument();
    expect(screen.queryByTestId("reveal-flying-card")).toBeNull();
  });
});

// 规格 G17：选牌子页复用 CardModal 作为揭示浮层，需要一个「确认」主按钮。
// 该 prop 为可选——结果页不传，行为与 G7 完全一致（上方用例即回归保证）。
describe("G17 CardModal 的 actionLabel 主按钮", () => {
  const card = tarotCards[0];

  /** 模态内全部按钮的可读标识 */
  const modalButtons = () =>
    screen
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");

  it("传入 actionLabel 时多出一个同名按钮，点击触发 onClose", () => {
    const onClose = vi.fn();
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={onClose}
        actionLabel="继续"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "继续" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("不传 actionLabel 时按钮集合恰为关闭按钮（结果页行为不变）", () => {
    render(
      <CardModal
        card={card}
        position="过去"
        isReversed={false}
        onClose={() => {}}
      />,
    );
    // 正面断言:任何多余的主按钮都会出现在这个集合里并使断言失败
    expect(modalButtons()).toEqual(["关闭"]);
  });
});
