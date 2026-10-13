"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { CardImage } from "@/app/components/CardImage";
import { CardBack } from "@/app/components/CardBack";
import { REVEAL_FLY_IN_MS, REVEAL_FLY_BACK_MS } from "@/lib/drawFlow";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";

/** 源格在视口中的矩形——揭示浮层飞入的起点、缩回的终点 */
export interface CardOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CardModalProps {
  reducedMotion?: boolean;
  card: TarotCardType;
  position: string;
  subtitle?: string;
  isReversed?: boolean;
  onClose: () => void;
  /**
   * 可选主按钮文案。传入时在牌面下方渲染一个主按钮,点击等价于 onClose。
   * 结果页不传。
   */
  actionLabel?: string;
  /**
   * 揭示形态(规格 G17)。传入时:
   * - 牌从源格 `origin` 处**旋转翻面 + 放大 + 移到屏幕中央**(一次连续运动);
   * - `exiting` 为真时反向缩回源格(保持正面);
   * - 蒙层改用与页底同色系的淡紫(黑蒙层在浅紫页底上就是一面黑墙);
   * - 隐藏右上角关闭按钮,退出由主按钮与点击蒙层承担。
   *
   * 不传则行为与 G7 完全一致(结果页走这条路径)。
   */
  reveal?: { origin: CardOrigin; exiting: boolean };
}

// 牌放大模态(规格 G7):点击结果页牌面 → 居中放大展示,标注牌位/牌名/正逆位/关键词
// G17 起兼作选牌子页的揭示浮层(复用而非新建:它已是 G15 唯一被许可传 sizes 的组件)
export function CardModal({
  card,
  position,
  subtitle,
  isReversed = false,
  onClose,
  actionLabel,
  reveal,
  reducedMotion = false,
}: CardModalProps) {
  const systemReduced = useReducedMotion();
  const simple = reducedMotion || !!systemReduced;
  // ESC 关闭
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // 视口尺寸在浮层出现时冻结一次:飞行是相对"屏幕中央"计算的,resize 不应改变进行中的动画
  const [viewport] = useState(() =>
    typeof window === "undefined"
      ? { w: 375, h: 667 }
      : { w: window.innerWidth, h: window.innerHeight },
  );

  const keywords = (isReversed ? card.keywordsReversed : card.keywordsUpright)
    .slice(0, 3)
    .join(" · ");

  // 详情文字两种形态:
  // - 结果页(默认):深色夜空底,白字 + 金色关键词,含「牌位」pill;
  // - 揭示浮层:淡紫面,白字 + 亮金关键词,**去掉牌位 pill**(用户明确不要)。
  const light = reveal !== undefined;
  const details = (
    <>
      {!light && (
        <span className="inline-block px-4 py-1.5 rounded-full bg-gold/20 border border-gold/40 text-gold text-xs tracking-widest uppercase mb-3">
          {position}
          {subtitle && <span className="block mt-1 text-xs font-normal">{subtitle}</span>}
        </span>
      )}
      {/* 牌名与正/逆位并一行:字号各自不变 */}
      <h3 className="text-white text-2xl font-bold mb-1">
        {card.name}
        <span className="text-white/60 text-sm font-normal ml-2">
          {isReversed ? "逆位" : "正位"}
        </span>
      </h3>
      <p
        className={`text-sm tracking-wide ${
          light ? "text-gold-light" : "text-gold/90"
        }`}
      >
        {keywords}
      </p>
      {!light && <p className="text-white/80 text-sm leading-6 mt-3 max-w-sm">{isReversed ? card.meaningReversed : card.meaningUpright}</p>}
    </>
  );

  // === 揭示形态:牌本身即飞行元素 ===
  if (reveal) {
    const cardW = Math.min(viewport.w >= 768 ? 320 : 256, viewport.w - 48);
    const cardH = cardW * 1.5;
    // jsdom 无布局(getBoundingClientRect 恒为 0)→ 给一个有意义的兜底缩放,
    // 否则 scale 会是 0 而让元素不可见
    const fromScale =
      reveal.origin.width > 0 ? reveal.origin.width / cardW : 0.2;
    const fromX =
      reveal.origin.x + reveal.origin.width / 2 - viewport.w / 2;
    const fromY =
      reveal.origin.y + reveal.origin.height / 2 - viewport.h / 2;

    return (
      <motion.div
        data-testid="card-modal-overlay"
        className="fixed inset-0 z-50 bg-purple-100/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      >
        {/* 底部不再需要给悬浮按钮让位——确认按钮回到详情流内 */}
        <div
          data-testid="card-modal-content"
          className="relative flex flex-col items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 飞行元素:rotateY 0 → 180,背→正。容器与详情的时序见下 */}
          <motion.div
            data-testid="reveal-flying-card"
            className={`relative transform-style-3d ${!simple && !reveal.exiting ? 'draw-reveal-glow' : ''}`}
            style={{ width: cardW, height: cardH }}
            initial={simple ? false : { x: fromX, y: fromY, scale: fromScale, rotateY: 0 }}
            animate={
              reveal.exiting && !simple
                ? { x: fromX, y: fromY, scale: fromScale, rotateY: 180 }
                : { x: 0, y: 0, scale: 1, rotateY: 180 }
            }
            transition={{
              duration:
                simple ? 0 : (reveal.exiting ? REVEAL_FLY_BACK_MS : REVEAL_FLY_IN_MS) / 1000,
              ease: "easeInOut",
            }}
          >
            {/* 牌背(飞行起点时的可见面) */}
            <div className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden">
              <CardBack />
            </div>
            {/* 牌面(翻转后可见) */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl overflow-hidden border-2 shadow-2xl shadow-purple-900/50">
              <div className={isReversed ? "rotate-180 w-full h-full" : "w-full h-full"}>
                <CardImage card={card} sizes="320px" priority />
              </div>
              {isReversed && (
                <div className="absolute inset-0 border-4 border-amber-400/70 rounded-2xl z-10" />
              )}
            </div>
          </motion.div>

          {/* 详情面:负责人指定的紫(oklab lab(37 51.4 -62.65) = 鲜明的蓝紫),
              60% 不透明叠在蒙层上,顶部一条金色高光线。只装文字,不含按钮。 */}
          <motion.div
            className="relative mt-7 w-full max-w-xs rounded-2xl px-6 pt-5 pb-4 text-center
                       border border-white/20
                       shadow-[0_16px_40px_rgba(124,58,237,0.35)]"
            style={{
              backgroundColor:
                "color-mix(in oklab, lab(37 51.4 -62.65 / 0.93) 60%, transparent)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: reveal.exiting ? 0 : 1 }}
            transition={{
              duration: reveal.exiting ? 0.12 : 0.25,
              delay: simple || reveal.exiting ? 0 : (REVEAL_FLY_IN_MS / 1000) * 0.6,
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-px bg-gradient-to-r from-transparent via-gold to-transparent" />
            {details}
          </motion.div>

          {/* 确认按钮:独立于详情面,在面下方居中。点在 content 内已 stopPropagation,
              故 onClick 直连 onClose 即可。拉长以更好点按。 */}
          {actionLabel && (
            <motion.button
              onClick={onClose}
              className="mt-5 px-14 h-12 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold shadow-lg shadow-purple-900/30 transition-colors cursor-pointer"
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: reveal.exiting ? 0 : 1,
                y: reveal.exiting ? 8 : 0,
              }}
              transition={{
                duration: reveal.exiting ? 0.12 : 0.25,
                delay: simple || reveal.exiting ? 0 : (REVEAL_FLY_IN_MS / 1000) * 0.7,
              }}
            >
              {actionLabel}
            </motion.button>
          )}
        </div>
      </motion.div>
    );
  }

  // 默认形态：结果页放大查看，详情包含中文牌义并支持小屏滚动。
  return (
    <motion.div
      data-testid="card-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start justify-center p-4 overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        data-testid="card-modal-content"
        className="relative flex flex-col items-center"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          aria-label="关闭"
          className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 牌图(放大) */}
        <div
          className={`relative w-64 h-96 md:w-80 md:h-[30rem] rounded-2xl overflow-hidden border-2 shadow-2xl shadow-purple-900/50 ${
            isReversed ? "rotate-180" : ""
          }`}
        >
          {/* 唯一显式传 sizes 的位置：放大需要比缩略图更高的分辨率 */}
          <CardImage card={card} sizes="320px" priority />
          {isReversed && (
            <div className="absolute inset-0 border-4 border-amber-400/70 rounded-2xl z-10" />
          )}
        </div>

        {/* 牌位标注 */}
        <div className="mt-6 text-center flex flex-col items-center">
          {details}
          {actionLabel && (
            <button
              onClick={onClose}
              className="mt-6 px-10 py-3 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold shadow-lg transition-colors cursor-pointer"
            >
              {actionLabel}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
