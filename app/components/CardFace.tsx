"use client";

import { CardImage } from "@/app/components/CardImage";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";

// 塔罗牌牌面(规格 G8):飞入克隆 / 槽位填充 / 网格已选位共用
// - 有图用图(WebT tarot 图片),无图回退为牌名占位
// - 逆位时**牌面旋转 180°** 并叠加琥珀色描边 —— 与结果页的 ResultTarotCard/TarotCard 一致。
//   此处曾只加描边而不旋转,导致选牌页与情况页的逆位牌「不倒」,已修。
//   旋转包在 w-full h-full 的包裹层上:CardImage 是 fill(绝对定位),
//   被 transform 的元素会成为其后代的包含块,故 inset-0 仍解析为同一矩形。
export function CardFace({
  card,
  reversed = false,
  className = "",
}: {
  card: TarotCardType;
  reversed?: boolean;
  className?: string;
}) {
  return (
    <div
      // data-reversed:逆位状态的可断言契约(视觉上靠琥珀描边与 rotate-180,
      // 但类名不该进测试——见 SPEC「DOM 契约」)
      data-reversed={reversed || undefined}
      className={`relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-b from-amber-50 to-purple-50 ${className}`}
    >
      <div className={reversed ? "rotate-180 w-full h-full" : "w-full h-full"}>
        {card.image ? (
          <CardImage card={card} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-purple-800 text-[10px] md:text-xs font-bold text-center p-1 leading-tight">
            {card.name}
          </div>
        )}
      </div>
      {reversed && (
        <div className="absolute inset-0 rounded-lg border-2 border-amber-400 shadow-lg" />
      )}
    </div>
  );
}