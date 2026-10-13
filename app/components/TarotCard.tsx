"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import { CardImage } from "@/app/components/CardImage";

interface TarotCardProps {
  card: TarotCardType;
  isRevealed?: boolean;
  isReversed?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

// 卡牌背面组件
const CardBack = ({ className }: { className?: string }) => (
  <div
    className={`${className} bg-gradient-to-br from-purple-800 via-purple-950 to-purple-900 rounded-lg border-2 border-purple-300 shadow-lg flex items-center justify-center`}
  >
    <div className="text-center text-white/80">
      <div className="text-2xl mb-2">🌟</div>
      <div className="text-xs font-medium">TAROT</div>
    </div>
  </div>
);

// 卡牌正面组件
const CardFront = ({
  className,
  card,
  isReversed,
  imageError,
  setImageError,
  isRevealed
}: {
  className?: string;
  card: TarotCardType;
  isReversed: boolean;
  imageError: boolean;
  setImageError: (error: boolean) => void;
  isRevealed: boolean;
}) => (
    <div
      className={`${className} bg-gradient-to-b from-amber-50 to-purple-50 rounded-lg border-2 border-purple-300 shadow-lg overflow-hidden relative ${
        isReversed ? "rotate-180" : ""
      }`}
    >
      {!imageError && card.image ? (
        <div className="relative w-full h-full">
          <CardImage
            card={card}
            onError={() => setImageError(true)}
            priority={isRevealed}
            loading={isRevealed ? "eager" : "lazy"}
          />

          {/* 逆位指示器 - 仅边框效果 */}
          {isReversed && isRevealed && (
            <div className="absolute inset-0 border-2 border-amber-400 rounded-lg shadow-lg opacity-90"></div>
          )}
        </div>
      ) : (
        // 占位符设计或图片加载失败
        <div className="w-full h-full p-2 flex flex-col justify-between">
          {/* 卡牌标题 */}
          <div className="text-center">
            <div className="text-xs font-bold text-purple-800 uppercase">
              {card.arcana === "major" ? "大阿尔卡纳" : "小阿尔卡纳"}
            </div>
            {card.number !== undefined && (
              <div className="text-lg font-bold text-purple-900">
                {card.number}
              </div>
            )}
          </div>

          {/* 中央图标 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center">
              <span className="text-2xl">
                {card.arcana === "major"
                  ? "✨"
                  : card.suit === "wands"
                    ? "🔥"
                    : card.suit === "cups"
                      ? "💧"
                      : card.suit === "swords"
                        ? "⚔️"
                        : card.suit === "pentacles"
                          ? "💰"
                          : "🌟"}
              </span>
            </div>
          </div>

          {/* 卡牌名称 */}
          <div className="text-center">
            <div className="text-xs font-semibold text-purple-900 leading-tight">
              {card.name}
            </div>
          </div>

          {/* 逆位指示器 - 仅边框效果 */}
          {isReversed && isRevealed && (
            <div className="absolute inset-0 border-2 border-amber-400 rounded-lg shadow-lg opacity-90"></div>
          )}
        </div>
      )}
    </div>
);

export const TarotCard = memo(function TarotCard({
  card,
  isRevealed = false,
  isReversed = false,
  onClick,
  size = "md",
}: TarotCardProps) {
  const [imageError, setImageError] = useState(false);

  // 图片宽度档位统一由 CardImage 的默认 sizes 决定（规格 G15），
  // 此处只控制布局尺寸；若将来要在 lg 下保持清晰，需同步提升
  // lib/cardImage.ts 的 CARD_IMAGE_WIDTH 并复算不变量。
  const sizeClasses = {
    sm: "w-24 h-36",
    md: "w-32 h-48",
    lg: "w-40 h-60",
  };

  return (
    <motion.div
      className={`${sizeClasses[size]} cursor-pointer perspective-1000`}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="relative w-full h-full transform-style-3d transition-transform duration-700"
        animate={{ rotateY: isRevealed ? 180 : 0 }}
      >
        {/* 背面 */}
        <div className="absolute inset-0 backface-hidden">
          <CardBack className="w-full h-full" />
        </div>

        {/* 正面 */}
        <div className="absolute inset-0 backface-hidden rotate-y-180">
          <CardFront 
            className="w-full h-full" 
            card={card}
            isReversed={isReversed}
            imageError={imageError}
            setImageError={setImageError}
            isRevealed={isRevealed}
          />
        </div>
      </motion.div>
    </motion.div>
  );
});
