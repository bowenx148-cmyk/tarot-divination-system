"use client";

import Image from "next/image";
import { CARD_IMAGE_SIZES } from "@/lib/cardImage";
import { TarotCard as TarotCardType } from "@/lib/tarot-data";

// 卡牌图片唯一入口（规格 G15）
// - 全库只有这里直接使用 next/image；sizes 统一取 CARD_IMAGE_SIZES，
//   保证同一张牌在任何页面解析出同一个优化 URL（浏览器缓存可复用）
// - 父容器需为定位元素（fill 布局）
// - 唯一例外：放大模态显式传入 sizes 覆盖（它需要更高的分辨率）
interface CardImageProps {
  card: TarotCardType;
  /** 覆盖 sizes——只有放大模态该用（见 lib/cardImage.ts 的不变量说明） */
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
  className?: string;
  onError?: () => void;
}

export function CardImage({
  card,
  sizes = CARD_IMAGE_SIZES,
  priority = false,
  loading,
  className = "object-cover",
  onError,
}: CardImageProps) {
  return (
    <Image
      src={card.image}
      alt={card.name}
      fill
      sizes={sizes}
      priority={priority}
      loading={loading}
      draggable={false}
      className={className}
      onError={onError}
    />
  );
}
