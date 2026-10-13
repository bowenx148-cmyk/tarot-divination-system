// 均匀无偏洗牌（规格 O4）
// 原实现 [...arr].sort(() => Math.random() - 0.5) 基于不稳定比较器，
// 分布非均匀（部分牌被抽中的概率系统性偏高/偏低）。改用 Fisher-Yates。

/** Fisher-Yates 洗牌：返回新数组，原数组不变 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
