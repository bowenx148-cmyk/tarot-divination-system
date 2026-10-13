// 卡牌图片契约（规格 G15）——宽度档位与 sizes 的唯一出处。
//
// 背景：图片加载慢的根因不是"没缓存"，而是各处 sizes 不同导致同一张牌
// 请求了不同宽度的优化变体（w=384 vs w=640），缓存键不同必然不命中。
//
// 不变量：所有卡牌小图的「布局宽度 × 设备 DPR」≤ CARD_IMAGE_WIDTH。
//   next.config.ts 的 images.imageSizes 只保留 CARD_IMAGE_WIDTH 这一个档位，
//   于是它们全部落到同一档 → 同一张牌在首页/选牌页/情况页/结果页解析出
//   同一个 /_next/image?...&w=384 URL → 翻过的牌在结果页零请求。
//
// 改动这里任何一项前，先复算该不变量，并跑 tests/card-image-variant.test.ts。
// 放大模态（CardModal）是唯一例外：它要更高分辨率，显式传自己的 sizes。

/** 唯一小档的宽度（与 next.config.ts 的 images.imageSizes 一致） */
export const CARD_IMAGE_WIDTH = 384;

/** 所有卡牌小图共用的 sizes（布局宽度上限：结果页 w-28 = 112px 为最大） */
export const CARD_IMAGE_SIZES = "112px";
