"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { CardFace } from "@/app/components/CardFace";
import { CardModal, type CardOrigin } from "@/app/components/CardModal";
import { GridCard } from "@/app/components/GridCard";
import { cn } from "@/lib/utils";
import { parseCardNumbers } from '@/lib/number-draw';
import { NumberSpreadBoard } from '@/app/components/NumberSpreadBoard';
import { DrawAtmosphere, DrawControls, useDrawEffects } from '@/app/components/DrawAtmosphere';
import {
  SHUFFLE_DURATION_MS,
  REVEAL_FLY_BACK_MS,
  buildPositionMeanings,
  firstEmptySlot,
  pickedIndexesFromSlots,
  randomReversal,
  type SelectionFill,
} from "@/lib/drawFlow";

// 选牌子页(规格 G17):洗牌进场 → 连续选满 → 飞入揭示 → 缩回落位
// - 洗牌动画结束后才可点击(reduced-motion 时跳过;已开局的牌堆不再洗)
// - 点击即落定(立即写入 store,不可逆)→ 该牌飞入中央揭示 → 用户收起 → 缩回原位
// - 棋盘填满:78 个牌位位置全程不变;已选位正面全亮展示 + 金色描边
// - 选满后「完成选牌」回情况页;中途关闭 = 退出(进度保留在 store),不等于放弃
const GRID_COLUMNS = 6;

// 状态机:shuffling(不可点) → idle(可点) → revealing(揭示浮层开着) → closing(缩回中)
type Phase = "shuffling" | "idle" | "revealing" | "closing";

/** 本次揭示:源格位置、牌阵槽位、逆位状态、以及源格在视口中的矩形 */
interface Reveal {
  position: number;
  slot: number;
  reversed: boolean;
  origin: CardOrigin;
}

/**
 * 与牌组位置绑定的确定性伪随机(0–1)。
 * 用确定性函数而非 Math.random:子页会被服务端预渲染,渲染期取随机数会造成 hydration 不一致。
 */
function shuffleNoise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export default function SelectPage() {
  const router = useRouter();
  const { question, recommendedSpread, selectedSlots, deckOrder, setSelectedSlots } =
    useTarotStore();

  const systemReduced = !!useReducedMotion();
  const effects = useDrawEffects();
  const { play } = effects;
  const reducedMotion = systemReduced || !effects.preferences.animation;
  // 仅在「尚未选任何牌」时播放洗牌动画——已经选中几张还回子页时,已开局的牌堆不该再洗。
  // 用 useState 的惰性初值冻结首帧取值:否则第一次选牌后 hasPicks 变真,
  // 会把这个 effect 重跑成「跳过洗牌」。
  // (不用 useRef —— 在 render 期读 ref.current 会触发 React Compiler 的纯净性规则)
  const [hadPicksOnMount] = useState(() =>
    selectedSlots.some((slot) => slot !== null),
  );

  const [phase, setPhase] = useState<Phase>(() =>
    reducedMotion || hadPicksOnMount ? "idle" : "shuffling",
  );
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [drawMode, setDrawMode] = useState<'click' | 'numbers'>('click');
  const [numberInput, setNumberInput] = useState('');
  const [numberError, setNumberError] = useState('');
  const [numberQueue, setNumberQueue] = useState<number[]>([]);
  const [reportedNumbers, setReportedNumbers] = useState<(number | null)[]>([]);
  // 页头是否已吸顶(sticky 生效)。用于切换「两行 → 一行」
  const [isStuck, setIsStuck] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const deckReady = deckOrder.length === tarotCards.length;

  // 无问题 / 未进入牌阵 / 牌序缺失 → 回到首页或情况页
  useEffect(() => {
    if (!question) {
      router.replace("/");
      return;
    }
    if (!recommendedSpread || !deckReady) {
      router.replace("/draw");
    }
  }, [question, recommendedSpread, deckReady, router]);

  // 仅首次进入时校验:直接访问一个已选满的子页 → 回退情况页。
  // 刻意用 ref 守卫而非以 focus 为依赖——否则选满最后一张会被立刻弹走,
  // 用户根本看不到揭示浮层、也点不到「完成选牌」。
  const enteredRef = useRef(false);
  useEffect(() => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    if (firstEmptySlot(useTarotStore.getState().selectedSlots) === null) {
      router.replace("/draw");
    }
  }, [router]);

  // 洗牌:动画结束后才放开点击
  useEffect(() => {
    if (hadPicksOnMount) return;
    const id = window.setTimeout(() => setPhase("idle"), reducedMotion ? 0 : SHUFFLE_DURATION_MS);
    timersRef.current.push(id);
    return () => window.clearTimeout(id);
  }, [reducedMotion, hadPicksOnMount]);

  // 揭示/缩回期间锁定页面滚动,否则缩回的目标格会在动画途中移位。
  // 锁定用 overflow:hidden 会让滚动条消失 → 内容宽度变化 → 页面闪动。
  // 修复:先测出滚动条宽度(有则非 0),锁定同时给 body 补等宽 padding-right,占位不变。
  useEffect(() => {
    if (drawMode === 'numbers' || (phase !== "revealing" && phase !== "closing")) return;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [phase, drawMode]);

  // 吸顶检测:header sticky top-0,当它的顶边贴到视口顶部(rect.top <= 0)即已吸住。
  // rAF 节流,避免滚动时高频调用 getBoundingClientRect。
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsStuck(header.getBoundingClientRect().top <= 0);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const meanings = useMemo(
    () =>
      recommendedSpread
        ? buildPositionMeanings(question, recommendedSpread.positions)
        : [],
    [question, recommendedSpread],
  );

  const focus = useMemo(() => firstEmptySlot(selectedSlots), [selectedSlots]);
  const pickedIndexes = useMemo(
    () => pickedIndexesFromSlots(selectedSlots),
    [selectedSlots],
  );
  // 牌组索引 → 该牌的槽位填充。网格按 cardIndex 取自己的逆位状态——
  // 不能用 reveal 的状态:那会让所有已选位跟着当前揭示的牌一起翻面,
  // 且收起浮层后 reveal 为 null,全部退回正位。
  const fillByCardIndex = useMemo(() => {
    const map = new Map<number, SelectionFill>();
    for (const slot of selectedSlots) {
      if (slot) map.set(slot.cardIndex, slot);
    }
    return map;
  }, [selectedSlots]);
  const filledCount = useMemo(
    () => selectedSlots.filter((s) => s !== null).length,
    [selectedSlots],
  );
  const isComplete = focus === null;

  const closeSelect = useCallback(() => router.push("/draw"), [router]);

  // 点击牌背即落定:先写 store(不可逆),同时让该牌飞入揭示
  const handleCardSelect = useCallback(
    (position: number) => {
      if (phase !== "idle" || focus === null) return;
      const cardIndex = deckOrder[position];
      const card = cardIndex === undefined ? undefined : tarotCards[cardIndex];
      if (!card || pickedIndexes.includes(cardIndex)) return;

      // 记录源格矩形:飞入从此处起飞,缩回回到此处
      const cell = document.querySelector(`[data-grid-cell="${position}"]`);
      const rect = cell?.getBoundingClientRect();
      const origin: CardOrigin = rect
        ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        : { x: 0, y: 0, width: 0, height: 0 };

      const reversed = randomReversal();
      setSelectedSlots(
        selectedSlots.map((slot, i) =>
          i === focus ? { cardIndex, card, reversed } : slot,
        ),
      );
      setReveal({ position, slot: focus, reversed, origin });
      setPhase("revealing");
      play('reveal');
    },
    [phase, focus, deckOrder, pickedIndexes, selectedSlots, setSelectedSlots, play],
  );

  // 收起揭示浮层:先播缩回动画,落位后才卸载浮层
  const closeReveal = useCallback(() => {
    if (phase === 'closing') return;
    setPhase("closing");
    play(isComplete ? 'complete' : 'settle');
    const id = window.setTimeout(() => {
      setReveal(null);
      setPhase("idle");
    }, reducedMotion ? 0 : REVEAL_FLY_BACK_MS);
    timersRef.current.push(id);
  }, [phase, isComplete, play, reducedMotion]);

  useEffect(() => {
    if (phase !== 'idle' || numberQueue.length === 0 || focus === null) return;
    handleCardSelect(numberQueue[0] - 1);
    setNumberQueue(queue => queue.slice(1));
  }, [phase, numberQueue, focus, handleCardSelect]);

  function submitNumbers(event: React.FormEvent) {
    event.preventDefault(); setNumberError('');
    try {
      const used = selectedSlots.filter((slot): slot is SelectionFill => !!slot).map(slot => deckOrder.indexOf(slot.cardIndex) + 1);
      const numbers = parseCardNumbers(numberInput, (recommendedSpread?.cardCount ?? 0) - filledCount, used);
      let next = 0;
      setReportedNumbers(selectedSlots.map(slot => slot ? deckOrder.indexOf(slot.cardIndex) + 1 : numbers[next++]));
      play('shuffle');
      setNumberQueue(numbers);
    } catch (error) { setNumberError(error instanceof Error ? error.message : '报数格式不正确'); }
  }

  if (!recommendedSpread || !deckReady) {
    return (
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300"></div>
      </div>
    );
  }

  const isShuffling = phase === "shuffling";
  const revealedFill = reveal ? selectedSlots[reveal.slot] : null;

  return (
    // 注意:这里不能有 overflow-hidden —— 任何祖先的 overflow 裁剪都会破坏 sticky 吸顶。
    // 原扇形轮盘(G8)需要它裁剪,平铺网格不需要;stars 早已 display:none 亦无需裁剪。
    <div className="min-h-screen mystical-bg relative">
      <DrawAtmosphere animated={!reducedMotion} />

      <main
        className={cn(
          "relative z-10 min-h-screen px-4 py-8",
          // 悬浮的「完成选牌」会盖住网格最后一行 → 让出底部空间
          isComplete && "pb-28",
        )}
      >
        {/* 关闭(退出)按钮:进度保留在 store,退出 ≠ 放弃 */}
        <motion.button
          onClick={closeSelect}
          className="fixed top-6 left-6 z-30 mystical-button p-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="关闭选牌"
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="max-w-3xl mx-auto pt-20">
          {/* 页头:吸顶(sticky top-0)。未吸顶两行,吸顶收敛为一行(标题 + 进度),
              含义在吸顶时隐藏——滚动选牌时最重要的是「在选哪一位」与「选了几张」。 */}
          <div
            ref={headerRef}
            className={cn(
              "sticky top-0 z-20 text-center mb-6 rounded-b-xl transition-all duration-200",
              isStuck && "bg-white/90 backdrop-blur-sm shadow-sm -mx-4 px-4 py-2",
            )}
          >
            <p className="text-xs text-purple-700" aria-live="polite">
              {recommendedSpread.name} · {isComplete ? '已按顺序选满' : `当前第 ${focus + 1} / ${recommendedSpread.cardCount} 位`}
            </p>
            <h2
              className={cn(
                "font-bold text-gray-800",
                isStuck ? "text-base" : "text-xl md:text-2xl",
              )}
            >
              {isComplete
                ? "牌阵已就位"
                : `为「${recommendedSpread.positions[focus]}」选一张牌`}
              {isStuck && (
                <span className="text-sm font-normal text-gray-500">
                  {" "}
                  · 已选 {filledCount} / {recommendedSpread.cardCount}
                </span>
              )}
            </h2>
            {!isStuck && (
              <p className="text-sm text-gray-500 mt-2">
                {!isComplete && `${meanings[focus]} · `}
                已选 {filledCount} / {recommendedSpread.cardCount}
                {isShuffling ? " · 洗牌中…" : ""}
              </p>
            )}
            <ol className="mt-2 flex flex-wrap justify-center gap-1.5 text-xs" aria-label="牌阵选牌顺序">
              {recommendedSpread.positions.map((position, index) => (
                <li key={`${index}-${position}`} aria-current={focus === index ? 'step' : undefined} className={cn('rounded-full border px-2 py-1', focus === index ? 'border-amber-600 bg-amber-100 text-amber-950 font-semibold' : 'border-purple-100 bg-white/80 text-gray-600')}>
                  {selectedSlots[index] ? '✓ ' : ''}{index + 1}. {position}
                </li>
              ))}
            </ol>
          </div>

          <DrawControls effects={effects} systemReduced={systemReduced} />
          {/* 棋盘填满:78 个牌位位置全程不变 */}
          {!isComplete && <section className="mb-5 rounded-xl border border-purple-200 bg-white p-4 text-gray-800" aria-label="抽牌方式">
            <div className="flex gap-3"><button type="button" disabled={phase === 'revealing' || phase === 'closing' || numberQueue.length > 0} aria-pressed={drawMode === 'click'} onClick={() => setDrawMode('click')} className="rounded border px-4 py-2">点选抽牌</button><button type="button" disabled={phase === 'revealing' || phase === 'closing' || numberQueue.length > 0} aria-pressed={drawMode === 'numbers'} onClick={() => setDrawMode('numbers')} className="rounded border px-4 py-2">报数抽牌</button></div>
            {drawMode === 'numbers' && <form onSubmit={submitNumbers} className="mt-3 space-y-2">
              <label htmlFor="card-numbers" className="block text-sm">请输入 {recommendedSpread.cardCount - filledCount} 个不重复的数字（1～78），顺序对应剩余牌位</label>
              <input id="card-numbers" value={numberInput} onChange={e => setNumberInput(e.target.value)} placeholder="例如：8，21，56" disabled={phase !== 'idle' || numberQueue.length > 0} className="w-full rounded border p-3" />
              <p className="text-xs text-gray-500">数字对应本局洗好的牌堆位置。依次翻开并确认后自动继续下一张；与点选模式共用同一副牌。</p>
              <button disabled={phase !== 'idle' || numberQueue.length > 0} className="rounded bg-purple-700 px-4 py-2 text-white disabled:opacity-50">按报数翻牌</button>
              {numberError && <p role="alert" className="text-amber-800">{numberError}</p>}
            </form>}
          </section>}
          {drawMode === 'numbers' && <NumberSpreadBoard spread={recommendedSpread} fills={selectedSlots} numbers={reportedNumbers} reducedMotion={reducedMotion} />}
          {drawMode === 'numbers' && reveal && revealedFill && <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-center text-amber-950" aria-live="polite">
            <p>牌堆第 {reveal.position + 1} 张 → 牌阵第 {reveal.slot + 1} 位「{recommendedSpread.positions[reveal.slot]}」</p>
            <p className="mt-2 font-semibold">{revealedFill.card.name} · {revealedFill.reversed ? '逆位' : '正位'}</p>
            <button type="button" disabled={phase === 'closing'} onClick={closeReveal} className="mt-3 rounded bg-amber-700 px-5 py-2 text-white">确认</button>
          </div>}
          <div
            data-grid-columns={GRID_COLUMNS}
            className="grid gap-2"
            style={{
              gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
            }}
          >
            {deckOrder.map((cardIndex, position) => {
              const card = tarotCards[cardIndex];
              const fill = fillByCardIndex.get(cardIndex);
              const picked = fill !== undefined;
              // 揭示/缩回期间该位让位给飞行元素:格子仍占位(不能塌陷,否则飞行目标会移位),
              // 但对视觉与读屏都隐藏
              const isFlying = reveal?.position === position;
              return (
                <motion.div
                  key={position}
                  data-grid-cell={position}
                  // 洗牌进场:78 张牌由散乱状态归位。位移用与位置绑定的确定性伪随机,
                  // 避免渲染期取随机数导致 hydration 不一致
                  initial={
                    isShuffling
                      ? {
                          opacity: 0.15,
                          x: (shuffleNoise(position * 3) - 0.5) * 160,
                          y: (shuffleNoise(position * 3 + 1) - 0.5) * 160,
                          rotate: (shuffleNoise(position * 3 + 2) - 0.5) * 120,
                        }
                      : false
                  }
                  animate={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
                  transition={{
                    duration: SHUFFLE_DURATION_MS / 1000,
                    ease: "easeOut",
                  }}
                >
                  {picked && card ? (
                    <div
                      data-selected-card={position}
                      aria-hidden={isFlying || undefined}
                      className={cn(
                        "w-full aspect-[2/3] rounded-[3px] md:rounded-md overflow-hidden",
                        "ring-[1.5px] ring-yellow-300/90 shadow-[0_0_12px_rgba(212,175,55,0.45)]",
                        isFlying && "opacity-0",
                      )}
                    >
                      <CardFace card={card} reversed={fill.reversed} />
                    </div>
                  ) : (
                    <GridCard
                      index={position}
                      isHidden={false}
                      onClick={drawMode === 'click' ? handleCardSelect : () => {}}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* 选满后才出现;中途关闭走左上角,语义是「退出」而非「完成」。
              悬浮在底部:选满时按钮原本埋在 1090px 网格的最下方,要滚到底才够得着。
              金色:与牌背的深紫蓝区分开,呼应已选牌的金色描边与牌位 pill——
              紫色按钮会和同是紫色系的牌背/页面糊成一片。 */}
          {isComplete && (
            <div className="fixed bottom-6 inset-x-4 z-30">
              <motion.button
                onClick={closeSelect}
                className="block w-full max-w-md mx-auto h-[52px] rounded-2xl bg-gradient-to-r from-amber-200 to-gold-light hover:brightness-105 text-amber-950 text-lg font-bold shadow-[0_8px_28px_rgba(212,175,55,0.4)] active:scale-[0.99] transition"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                完成选牌
              </motion.button>
            </div>
          )}
        </div>
      </main>

      {/* 揭示浮层:复用 CardModal。三种退出方式——「确认」/ 点浮层外 / ESC */}
      {drawMode === 'click' && reveal && revealedFill && (
        <CardModal
          card={revealedFill.card}
          position={recommendedSpread.positions[reveal.slot]}
          subtitle={`牌堆第 ${reveal.position + 1} 张 → 牌阵第 ${reveal.slot + 1} 位`}
          isReversed={revealedFill.reversed}
          onClose={closeReveal}
          actionLabel="确认"
          reducedMotion={reducedMotion}
          reveal={{ origin: reveal.origin, exiting: phase === "closing" }}
        />
      )}
    </div>
  );
}
