import { describe, expect, it } from "vitest";
import { existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tarotCards } from "@/lib/tarot-data";

const root = resolve(import.meta.dirname, "../..");
const publicDir = join(root, "public");

// 规格 Y6：图片目录整理 + 数据完整性
// 目录契约：major 卡在 /tarot-images/major/，minor 卡在 /tarot-images/minor/<suit>/
describe("Y6 tarot-data 数据完整性", () => {
  it("牌数：共 78 张", () => {
    expect(tarotCards.length).toBe(78);
  });

  it("id / name 唯一", () => {
    expect(new Set(tarotCards.map((c) => c.id)).size).toBe(78);
    expect(new Set(tarotCards.map((c) => c.name)).size).toBe(78);
  });

  it("arcana 数量：major 22 / minor 56，四花色各 14", () => {
    const major = tarotCards.filter((c) => c.arcana === "major");
    const minor = tarotCards.filter((c) => c.arcana === "minor");
    expect(major.length).toBe(22);
    expect(minor.length).toBe(56);
    for (const suit of ["wands", "cups", "swords", "pentacles"]) {
      expect(minor.filter((c) => c.suit === suit).length).toBe(14);
    }
  });

  it("目录契约：major 卡路径以 /tarot-images/major/ 开头", () => {
    for (const card of tarotCards.filter((c) => c.arcana === "major")) {
      expect(card.image, `${card.id} 路径 ${card.image}`).toMatch(
        /^\/tarot-images\/major\//,
      );
    }
  });

  it("目录契约：minor 卡路径以 /tarot-images/minor/<suit>/ 开头", () => {
    for (const card of tarotCards.filter((c) => c.arcana === "minor")) {
      expect(card.image, `${card.id} 路径 ${card.image}`).toMatch(
        new RegExp(`^/tarot-images/minor/${card.suit}/`),
      );
    }
  });

  it("图片文件存在：每张牌 public + image 均可读", () => {
    for (const card of tarotCards) {
      const p = join(publicDir, card.image.replace(/^\//, ""));
      expect(existsSync(p), `${card.id} 图片缺失: ${card.image}`).toBe(true);
    }
  });

  it("目录结构正确：major/ 仅 22 张、minor/ 下四花色目录各 14 张", () => {
    const majorFiles = readdirSync(join(publicDir, "tarot-images/major"));
    expect(majorFiles.length).toBe(22);
    for (const suit of ["wands", "cups", "swords", "pentacles"]) {
      const files = readdirSync(join(publicDir, "tarot-images/minor", suit));
      expect(files.length, `minor/${suit} 应有 14 张`).toBe(14);
    }
  });

  it("命名统一 kebab-case 全小写（major-11-justice.jpg 等）", () => {
    const all = [
      ...readdirSync(join(publicDir, "tarot-images/major")),
      ...["wands", "cups", "swords", "pentacles"].flatMap((s) =>
        readdirSync(join(publicDir, "tarot-images/minor", s)),
      ),
    ];
    for (const f of all) {
      expect(f, `命名应为 kebab-case 小写: ${f}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*\.jpg$/);
    }
  });
});
