"use client";

import { memo } from "react";
import { CardBack } from "@/app/components/CardBack";

// 平铺网格中的单个未选牌位(规格 G9/G17)
// - 根节点 w-full + 2:3 卡牌比例,自适应网格单元格
// - 牌背为共用组件 CardBack(与揭示浮层的飞行元素共用)
// - isHidden:揭示/缩回期间隐藏原位,由飞行元素接管视觉
//
// G17 起本组件不再承担 3D 翻牌:翻转搬到揭示浮层的飞行元素上
// (弹窗一旦出现就盖住网格,原地翻牌无人看得见)。
// 也刻意不收 card——未选牌位只显示牌背,点击后由页面按牌序取出对应牌,
// 保持「盲选」:未选中的格子不该在 DOM 里持有牌面信息。
interface GridCardProps {
  index: number;
  isHidden: boolean;
  onClick: (index: number) => void;
}

export const GridCard = memo(function GridCard({
  index,
  isHidden,
  onClick,
}: GridCardProps) {
  return (
    <div
      data-card-back="true"
      data-index={index}
      onClick={() => onClick(index)}
      className={`relative w-full aspect-[2/3] cursor-pointer select-none transition-opacity duration-300 ${
        isHidden ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      aria-label={`牌 ${index + 1}`}
    >
      <CardBack />
    </div>
  );
});
