import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import { tarotSpreads, useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import {
  SelectionFill,
  SHUFFLE_DURATION_MS,
  REVEAL_FLY_BACK_MS,
} from "@/lib/drawFlow";

const { pushMock, replaceMock, reducedMotionMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  // 默认 true：跳过洗牌动画，使多数用例可直接交互；
  // 「洗牌期间不可点击」用例单独置 false。
  reducedMotionMock: { value: true },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

vi.mock("framer-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("framer-motion")>();
  return { ...actual, useReducedMotion: () => reducedMotionMock.value };
});

import SelectPage from "@/app/draw/select/page";

const SPREAD = {
  id: "past-present-future",
  name: "时间之流",
  description: "经典三牌阵",
  cardCount: 3,
  positions: ["过去", "现在", "未来"],
  category: [],
};

/** 恒等牌序：位置 i 对应 tarotCards[i]——让多数用例保持确定性 */
const IDENTITY = Array.from({ length: tarotCards.length }, (_, i) => i);

/** 非恒等牌序（整体后移一位）：用于验证「点击位置 → 牌面」的映射真的走了牌序 */
const ROTATED = [...IDENTITY.slice(1), IDENTITY[0]];

function fill(cardIndex: number, reversed = false): SelectionFill {
  return { cardIndex, card: tarotCards[cardIndex], reversed };
}

function setupStore(
  selectedSlots: (SelectionFill | null)[] = [null, null, null],
  deckOrder: number[] = IDENTITY,
) {
  useTarotStore.setState({
    question: "猫咪想说什么",
    recommendedSpread: SPREAD,
    selectedSlots,
    deckOrder,
  });
}

function pickAt(position: number) {
  fireEvent.click(
    document.querySelector(`[data-card-back="true"][data-index="${position}"]`)!,
  );
}

/** 点「确认」收起揭示浮层，并让缩回动画走完（落位发生在动画结束时） */
function confirmReveal() {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "确认" }));
    vi.advanceTimersByTime(REVEAL_FLY_BACK_MS);
  });
}

const overlay = () => screen.queryByTestId("card-modal-overlay");

/** 网格中牌位的排列顺序（用于断言「位置不因选牌而位移」） */
function cellOrder(): (string | null)[] {
  return [...document.querySelectorAll("[data-grid-cell]")].map((el) =>
    el.getAttribute("data-grid-cell"),
  );
}

/** 页面上全部按钮的可读标识——「不存在重选入口」的可证伪正面形式 */
function buttonLabels(): string[] {
  return screen
    .getAllByRole("button")
    .map((b) => b.getAttribute("aria-label") ?? b.textContent?.trim() ?? "");
}

describe("G17 选牌子页(/draw/select)：洗牌 → 连续选满 → 飞入揭示 → 缩回落位", () => {
  beforeEach(() => {
    setupStore();
    reducedMotionMock.value = true;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it('报数按固定牌堆位置和牌位顺序逐张翻开，拒绝重复', () => {
    setupStore([null, null, null], ROTATED);
    render(<SelectPage />);
    fireEvent.click(screen.getByRole('button', { name: '报数抽牌' }));
    fireEvent.change(screen.getByLabelText(/请输入 3 个不重复的数字/), { target: { value: '1,1,78' } });
    fireEvent.click(screen.getByRole('button', { name: '按报数翻牌' }));
    expect(screen.getByRole('alert')).toHaveTextContent('不能重复');
    fireEvent.change(screen.getByLabelText(/请输入 3 个不重复的数字/), { target: { value: '78,1,23' } });
    fireEvent.click(screen.getByRole('button', { name: '按报数翻牌' }));
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(ROTATED[77]);
    expect(document.querySelector('[data-number-revealed="78"]')).not.toBeNull();
    confirmReveal(); expect(useTarotStore.getState().selectedSlots[1]?.cardIndex).toBe(ROTATED[0]);
    confirmReveal(); expect(useTarotStore.getState().selectedSlots[2]?.cardIndex).toBe(ROTATED[22]);
    confirmReveal(); expect(screen.getByRole('button', { name: '完成选牌' })).toBeInTheDocument();
  });

  it.each(['gain-loss', 'venus'])('所选%s牌阵从78张牌中按实际牌位顺序连续填满', id => {
    const spread = tarotSpreads.find(s => s.id === id)!;
    useTarotStore.setState({ recommendedSpread: spread, selectedSlots: Array(spread.cardCount).fill(null), deckOrder: ROTATED });
    render(<SelectPage />);
    for (let i = 0; i < spread.cardCount; i++) {
      const steps = within(screen.getByRole('list', { name: '牌阵选牌顺序' })).getAllByRole('listitem');
      expect(steps).toHaveLength(spread.cardCount);
      expect(steps[i]).toHaveAttribute('aria-current', 'step');
      expect(steps[i]).toHaveTextContent(`${i + 1}. ${spread.positions[i]}`);
      pickAt(i * 2);
      expect(useTarotStore.getState().selectedSlots[i]?.cardIndex).toBe(ROTATED[i * 2]);
      confirmReveal();
      expect(document.querySelectorAll('[data-grid-cell]')).toHaveLength(78);
    }
    const slots = useTarotStore.getState().selectedSlots;
    expect(new Set(slots.map(s => s!.cardIndex)).size).toBe(spread.cardCount);
    expect(pushMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /完成选牌/ }));
    expect(pushMock).toHaveBeenCalledWith('/draw');
  });

  it("S1 洗牌期间不可点击；推进 SHUFFLE_DURATION_MS 后恢复可点", () => {
    reducedMotionMock.value = false;
    render(<SelectPage />);

    pickAt(7);
    expect(useTarotStore.getState().selectedSlots[0]).toBeNull();

    act(() => {
      vi.advanceTimersByTime(SHUFFLE_DURATION_MS);
    });
    pickAt(7);
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("S1b reduced-motion 开启时跳过洗牌，进场即可点击", () => {
    reducedMotionMock.value = true;
    render(<SelectPage />);
    pickAt(7);
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("S1c 已有选牌时不再播放洗牌（已开局的牌堆不该再洗）", () => {
    reducedMotionMock.value = false; // 且未跳过洗牌
    setupStore([fill(7), null, null]);
    render(<SelectPage />);

    // 无需推进 SHUFFLE_DURATION_MS 即可点击
    pickAt(20);
    expect(useTarotStore.getState().selectedSlots[1]?.cardIndex).toBe(20);
  });

  it("S2 网格6列、78个牌位；页头展示真实牌位与编号顺序", () => {
    render(<SelectPage />);
    expect(
      document.querySelector("[data-grid-columns]")!.getAttribute("data-grid-columns"),
    ).toBe("6");
    expect(document.querySelectorAll("[data-grid-cell]")).toHaveLength(78);

    expect(screen.getByText("为「过去」选一张牌")).toBeInTheDocument();
    expect(screen.getByText(/关于「猫咪想说」的过去/)).toBeInTheDocument();
    expect(screen.getByText(/已选\s*0\s*\/\s*3/)).toBeInTheDocument();
  });

  it("S3 点击位置 p 落定的是 deckOrder[p] 对应的牌（牌序真的生效）", () => {
    setupStore([null, null, null], ROTATED);
    render(<SelectPage />);

    pickAt(7);
    // ROTATED 整体后移一位 → 位置 7 上是 tarotCards[8]
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(8);
    expect(useTarotStore.getState().selectedSlots[0]?.card.id).toBe(
      tarotCards[8].id,
    );
  });

  it("S4 棋盘填满：已选位保留原位，牌位排列顺序不变", () => {
    render(<SelectPage />);
    const before = cellOrder();
    expect(before).toHaveLength(78);

    pickAt(7);
    confirmReveal();

    expect(cellOrder()).toEqual(before);
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"]'),
    ).toBeNull();
  });

  it("S5 点击后立即进入揭示：无需推进任何计时器，弹窗与飞行元素即存在", () => {
    render(<SelectPage />);
    pickAt(7);

    // 落定先于动画：点击瞬间即写入 store
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
    // 无 700ms 翻牌等待——弹窗立刻出现
    expect(overlay()).not.toBeNull();
    expect(screen.getByTestId("reveal-flying-card")).toBeInTheDocument();

    const modal = within(screen.getByTestId("card-modal-content"));
    // 位置信息（牌位名）已按用户要求从揭示浮层移除，故不再断言
    expect(modal.queryByText("过去")).toBeNull();
    expect(modal.getByText(tarotCards[7].name)).toBeInTheDocument();
    // 逆位为 30% 随机，故只断言二者必居其一
    expect(modal.getByText(/^(正位|逆位)$/)).toBeInTheDocument();
  });

  it("S6 三种收起方式：均先进入缩回，动画走完后弹窗消失，全程不跳转", () => {
    render(<SelectPage />);

    // ① 「确认」按钮
    pickAt(7);
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "确认" }));
    });
    expect(overlay()).not.toBeNull(); // 缩回动画期间仍挂载
    act(() => {
      vi.advanceTimersByTime(REVEAL_FLY_BACK_MS);
    });
    expect(overlay()).toBeNull();

    // ② 点浮层外（遮罩）
    pickAt(20);
    act(() => {
      fireEvent.click(screen.getByTestId("card-modal-overlay"));
      vi.advanceTimersByTime(REVEAL_FLY_BACK_MS);
    });
    expect(overlay()).toBeNull();

    // ③ ESC
    pickAt(33);
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
      vi.advanceTimersByTime(REVEAL_FLY_BACK_MS);
    });
    expect(overlay()).toBeNull();

    expect(pushMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("S7 缩回落位后：该位为已选牌面（全亮展示，含牌面图）", () => {
    render(<SelectPage />);
    pickAt(7);
    // 揭示期间该位让位给飞行元素：格子仍在（不能塌陷，否则飞行目标会移位），
    // 但对视觉与读屏都隐藏
    expect(
      document.querySelector('[data-selected-card="7"]')!.getAttribute("aria-hidden"),
    ).toBe("true");

    confirmReveal();
    const selected = document.querySelector('[data-selected-card="7"]');
    expect(selected).not.toBeNull();
    expect(selected!.getAttribute("aria-hidden")).toBeNull();
    // 正面展示 = 挂载了牌面图
    expect(selected!.querySelector("img")).not.toBeNull();
    // 不再是可选牌背
    expect(
      document.querySelector('[data-card-back="true"][data-index="7"]'),
    ).toBeNull();
  });

  it("S8 连续选满全程不跳转；选满后「完成选牌」→ /draw", () => {
    render(<SelectPage />);
    for (const pos of [7, 20, 33]) {
      pickAt(pos);
      confirmReveal();
      expect(pushMock).not.toHaveBeenCalled();
    }

    expect(
      useTarotStore.getState().selectedSlots.map((s) => s?.cardIndex),
    ).toEqual([7, 20, 33]);
    expect(screen.getByText(/已选\s*3\s*\/\s*3/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /完成选牌/ }));
    expect(pushMock).toHaveBeenCalledWith("/draw");
  });

  it("S9 不可逆：只允许关闭与切换抽牌方式，已选位不可交互", () => {
    render(<SelectPage />);
    pickAt(7);
    confirmReveal();

    // 切换方式共用已有牌堆，不提供重选、撤销或清空入口。
    expect(buttonLabels()).toEqual(["关闭选牌", "♪ 音效：关闭", "点选抽牌", "报数抽牌"]);

    const selected = document.querySelector('[data-selected-card="7"]')!;
    expect(selected.getAttribute("role")).toBeNull();
    expect(selected.getAttribute("tabindex")).toBeNull();

    const before = useTarotStore.getState().selectedSlots[0];
    fireEvent.click(selected);
    expect(useTarotStore.getState().selectedSlots[0]).toEqual(before);
  });

  it("S10 防误触：揭示中与缩回中点击其他牌均无效", () => {
    render(<SelectPage />);

    // ① 揭示中
    pickAt(7);
    pickAt(9);
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
    expect(overlay()).not.toBeNull();

    // ② 缩回动画进行中
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "确认" }));
    });
    pickAt(9);
    expect(useTarotStore.getState().selectedSlots[1]).toBeNull();
  });

  it("S11 退出 ≠ 放弃：关闭按钮回 /draw 且已选保留", () => {
    render(<SelectPage />);
    pickAt(7);
    confirmReveal();
    fireEvent.click(screen.getByLabelText("关闭选牌"));
    expect(pushMock).toHaveBeenCalledWith("/draw");
    expect(useTarotStore.getState().selectedSlots[0]?.cardIndex).toBe(7);
  });

  it("S12 已选位保留各自的逆位状态（不随当前揭示或收起而丢失）", () => {
    setupStore([fill(7, true), null, null]);
    render(<SelectPage />);

    // 逆位槽位必须渲染成逆位——而不是被 reveal 的状态或默认值覆盖
    const face = document.querySelector(
      '[data-selected-card="7"] [data-reversed="true"]',
    );
    expect(face).not.toBeNull();
  });

  it("S12b 揭示新牌时，先前已选位的逆位状态不受影响", () => {
    setupStore([fill(7, true), null, null]);
    render(<SelectPage />);
    pickAt(20);

    // 揭示中的是位置 20，位置 7 是早先选的逆位牌——它不该被"传染"成当前这张的朝向
    expect(
      document.querySelector('[data-selected-card="7"] [data-reversed="true"]'),
    ).not.toBeNull();
  });

  it("若已全满（直接访问）则回退到情况页", () => {
    setupStore([fill(7), fill(20), fill(33)]);
    render(<SelectPage />);
    expect(replaceMock).toHaveBeenCalledWith("/draw");
  });
});
