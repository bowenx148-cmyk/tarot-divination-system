"use client";

import { motion } from "framer-motion";
import { CardFace } from "@/app/components/CardFace";
import { SelectionFill } from "@/lib/drawFlow";
import { cn } from "@/lib/utils";

// 牌阵槽位条(规格 G8/G10):选牌情况页使用
// - 未选中:虚线/半透明占位符;聚焦中的空位高亮放大,仅聚焦空位可点击(按顺序依次高亮一个)
// - 选中填充:完整牌面(逆位时旋转 180°) + 金色发光以区分已选与未选
// - 每个槽位下方:位置名(小字) + 结合问题动态生成的牌位含义
//
// 注:G17 首轮曾为「选牌子页顶部的常驻紧凑进度条」加过 compact 模式,
// 该槽位条在第二轮被负责人移除,compact 遂无调用方——于收尾时删除(Y2 死代码清理惯例)。
interface SpreadSlotsProps {
  positions: readonly string[];
  meanings: readonly string[];
  fills: readonly (SelectionFill | null)[];
  focusSlot?: number | null;
  onSlotClick?: (index: number) => void;
}

export function SpreadSlots({
  positions,
  meanings,
  fills,
  focusSlot = null,
  onSlotClick,
}: SpreadSlotsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-6">
      {positions.map((position, index) => {
        const fill = fills[index] ?? null;
        const isFocused = focusSlot === index && !fill;
        // 仅聚焦的空位可点击(按顺序依次高亮一个空位)
        const clickable = isFocused && !!onSlotClick;
        return (
          <div
            key={index}
            data-slot={index}
            className={cn(
              "flex flex-col items-center transition-all duration-300",
              isFocused ? "scale-110" : "",
            )}
          >
            {/* 槽位区域 */}
            <div className="relative rounded-xl flex items-center justify-center transition-all duration-300 w-24 h-36">
              {fill ? (
                <motion.div
                  data-filled-card={index}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="relative w-full h-full rounded-xl shadow-[0_0_18px_rgba(212,175,55,0.5)] ring-1 ring-yellow-300/80"
                >
                  <CardFace card={fill.card} reversed={fill.reversed} />
                </motion.div>
              ) : (
                <div
                  data-empty-slot={index}
                  role={clickable ? "button" : undefined}
                  onClick={clickable ? () => onSlotClick?.(index) : undefined}
                  className={cn(
                    "w-full h-full rounded-xl border-2 border-dashed flex items-center justify-center bg-white/30",
                    clickable ? "cursor-pointer" : "cursor-default",
                    isFocused
                      ? "border-yellow-400 shadow-[0_0_16px_rgba(250,204,21,0.35)] animate-pulse"
                      : "border-purple-300",
                  )}
                >
                  <span className="text-purple-300 text-2xl">✦</span>
                </div>
              )}
            </div>
            {/* 位置名 */}
            <div className="mt-2 font-semibold text-purple-600 text-xs">
              {position}
            </div>
            {/* 动态牌位含义 */}
            <div className="text-gray-500 text-center leading-snug text-xs max-w-28">
              {meanings[index]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
