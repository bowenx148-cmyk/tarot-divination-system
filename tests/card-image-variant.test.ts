import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { imageConfigDefault } from "next/dist/shared/lib/image-config";
import nextConfig from "../next.config";
import { CARD_IMAGE_SIZES, CARD_IMAGE_WIDTH } from "@/lib/cardImage";

const root = resolve(import.meta.dirname, "..");

function readSource(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkSources(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      out.push(full.replaceAll('\\', '/'));
    }
  }
  return out;
}

const DPRS = [1, 2, 3] as const;

/** next/image 的候选宽度档位表（deviceSizes + imageSizes，升序） */
function widthCandidates(imageSizes: number[]): number[] {
  return [...imageConfigDefault.deviceSizes, ...imageSizes].sort((a, b) => a - b);
}

/**
 * 复刻浏览器按 srcset/sizes 选档的规则：取「≥ 布局宽 × DPR」的最小候选档位。
 * 这里刻意把规则写死在测试里而不是复用实现——契约测试要能独立证伪实现。
 */
function resolveWidth(sizesPx: number, dpr: number, candidates: number[]): number {
  const needed = sizesPx * dpr;
  return candidates.find((w) => w >= needed) ?? candidates[candidates.length - 1];
}

// 规格 G15：卡牌图片缓存命中
// 根因不是"没缓存"，而是同一张牌在各页面因 sizes 不同请求了不同宽度的变体
// （w=384 vs w=640），缓存键不同必然不命中。本契约锁定"单一小档"这一修复。
describe("G15 卡牌图片档位契约", () => {
  it("next.config.ts 只保留唯一小档，且与 lib/cardImage.ts 的常量一致", () => {
    expect(nextConfig.images?.imageSizes).toEqual([CARD_IMAGE_WIDTH]);
  });

  it("优化图浏览器缓存 ≥ 30 天（牌面为不可变静态资源）", () => {
    expect(nextConfig.images?.minimumCacheTTL).toBeGreaterThanOrEqual(2592000);
  });

  it("不变量成立：所有卡牌小图在 DPR 1/2/3 下解析出同一宽度", () => {
    const candidates = widthCandidates(nextConfig.images!.imageSizes as number[]);
    const sizesPx = parseInt(CARD_IMAGE_SIZES, 10);
    expect(Number.isFinite(sizesPx)).toBe(true);

    for (const dpr of DPRS) {
      expect(
        resolveWidth(sizesPx, dpr, candidates),
        `DPR${dpr} 下若跳出唯一小档，同一张牌会再次分裂成两个 URL`,
      ).toBe(CARD_IMAGE_WIDTH);
    }
  });

  it("不变量守护：小图 sizes 不得超过 CARD_IMAGE_WIDTH / 3（跳出唯一小档即缓存再次分叉）", () => {
    const sizesPx = parseInt(CARD_IMAGE_SIZES, 10);
    expect(sizesPx * Math.max(...DPRS)).toBeLessThanOrEqual(CARD_IMAGE_WIDTH);
  });

  it("唯一入口：除 CardImage.tsx 外，app/ 与 lib/ 下无裸 next/image 调用", () => {
    const offenders = [...walkSources("app"), ...walkSources("lib")].filter((f) =>
      /from\s+['"]next\/image['"]/.test(readSource(f)),
    );
    expect(offenders).toEqual(["app/components/CardImage.tsx"]);
  });

  it("唯一档位：除放大模态外，没有组件自行传 sizes（否则档位会重新分叉）", () => {
    const cardImageConsumers = [
      "app/components/CardFace.tsx",
      "app/components/ResultTarotCard.tsx",
      "app/components/TarotCard.tsx",
    ];
    for (const file of cardImageConsumers) {
      expect(readSource(file), `${file} 应使用 CardImage 的默认 sizes`).not.toMatch(
        /sizes=\{/,
      );
    }
    // 放大模态是唯一例外：它要更高的分辨率，显式传 sizes
    expect(readSource("app/components/CardModal.tsx")).toMatch(/sizes=/);
  });

  it("结果页不再使用与实际渲染宽度不符的 sizes=160px（w-28 = 112px）", () => {
    expect(readSource("app/components/ResultTarotCard.tsx")).not.toContain("160px");
  });
});
