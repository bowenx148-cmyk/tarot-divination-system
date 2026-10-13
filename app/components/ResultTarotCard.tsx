"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";
import { CardImage } from "@/app/components/CardImage";

interface ResultTarotCardProps {
  card: TarotCardType;
  index: number;
  isReversed?: boolean;
}

export const ResultTarotCard = memo(function ResultTarotCard({
  card,
  index,
  isReversed = false,
}: ResultTarotCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + index * 0.1 }}
    >
      {/* 塔罗牌显示 */}
      <div
        className={`w-28 h-44 bg-gradient-to-b from-amber-50 to-purple-50 rounded-lg border-2 border-purple-300 shadow-lg overflow-hidden relative group hover:scale-105 transition-transform ${
          isReversed ? "rotate-180" : ""
        }`}
      >
        {!imageError && card.image ? (
          <div className="relative w-full h-full">
            {/* sizes 用 CardImage 的默认值：与选牌页翻牌同一个 URL，
                已翻过的牌在此为纯缓存命中（规格 G15） */}
            <CardImage
              card={card}
              onError={() => setImageError(true)}
              loading="eager"
              priority={index === 0}
            />

            {/* 逆位指示器 - 仅边框效果 */}
            {isReversed && (
              <div className="absolute inset-0 border-2 border-amber-400 rounded-lg shadow-lg opacity-90 z-10"></div>
            )}

            {/* 悬停时显示卡片名称 */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              isReversed ? "rotate-180" : ""
            }`}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                <div className="absolute bottom-2 left-2 right-2 text-center">
                  <h3 className="text-white font-bold text-sm leading-tight">
                    {card.name}
                  </h3>
                  <p className="text-white/80 text-xs mt-1">
                    {(isReversed ? card.keywordsReversed : card.keywordsUpright)
                      .slice(0, 2)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // 占位符设计
          <div className="w-full h-full p-4 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
              <span className="text-white text-2xl">
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
            <h3 className="text-gray-800 font-bold text-sm mb-3 text-center leading-tight">
              {card.name}
            </h3>
            <p className="text-gray-600 text-xs text-center leading-relaxed">
              {(isReversed ? card.keywordsReversed : card.keywordsUpright)
                .slice(0, 2)
                .join(" · ")}
            </p>

            {/* 逆位指示器 - 仅边框效果 */}
            {isReversed && (
              <div className="absolute inset-0 border-2 border-amber-400 rounded-lg shadow-lg opacity-90"></div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
});
