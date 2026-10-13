"use client";

import { useCallback, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore, recommendSpread } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import { SpreadSlots } from "@/app/components/SpreadSlots";
import {
  SelectionFill,
  buildPositionMeanings,
  createDeckOrder,
  firstEmptySlot,
} from "@/lib/drawFlow";

// 选牌情况页(规格 G10):状态机仅为两态——未完成选牌 / 完成选牌
// - 展示已选牌(填充槽位)与待选空位(虚线占位)
// - 未完成:仅高亮一个待选空位(按顺序),该空位与底部"开始选牌"可点击 → 跳转选牌子页 /draw/select
// - 完成:仅"开始解析"主按钮 → 跳转结果页
export default function DrawPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    selectedSlots,
    deckOrder,
    setRecommendedSpread,
    setSelectedSlots,
    setDeckOrder,
    setDrawnCards,
    setCardReversals,
  } = useTarotStore();

  // 牌序兜底(规格 G17):正常由首页「开始占卜」时的 resetSession 生成。
  // 但 deckOrder 是内存态——刷新后丢失,此时补一副新的,否则子页无法渲染。
  useEffect(() => {
    if (deckOrder.length !== tarotCards.length) {
      setDeckOrder(createDeckOrder(tarotCards.length));
    }
  }, [deckOrder.length, setDeckOrder]);

  // 无问题回首页;推荐牌阵
  useEffect(() => {
    if (!question) {
      router.push("/");
      return;
    }
    if (!recommendedSpread) {
      const spread = recommendSpread(question);
      setRecommendedSpread(spread);
    }
  }, [question, recommendedSpread, setRecommendedSpread, router]);

  // 槽位数量与牌阵不一致(或首次进入)时补全为空位数组
  useEffect(() => {
    if (recommendedSpread && selectedSlots.length !== recommendedSpread.cardCount) {
      setSelectedSlots(Array(recommendedSpread.cardCount).fill(null));
    }
  }, [recommendedSpread, selectedSlots.length, setSelectedSlots]);

  const cardCount = recommendedSpread?.cardCount ?? 0;
  const meanings = useMemo(
    () =>
      recommendedSpread
        ? buildPositionMeanings(question, recommendedSpread.positions)
        : [],
    [question, recommendedSpread],
  );

  // 状态机:focus 为第一个未选空位;为 null 即「完成选牌」
  const focusSlot = useMemo(() => firstEmptySlot(selectedSlots), [selectedSlots]);
  const isComplete = focusSlot === null;
  const filledCount = useMemo(
    () => selectedSlots.filter((s) => s !== null).length,
    [selectedSlots],
  );

  // 进入选牌子页(点击"开始选牌"或聚焦空位,效果一致)
  const goSelect = useCallback(() => {
    if (isComplete) return;
    router.push("/draw/select");
  }, [isComplete, router]);

  // 完成选牌 → 写入结果数据并进入解析。
  // 写入与跳转均为同步操作,不设人为等待(规格 G17):旧的 500ms 全屏遮罩底下没有任何异步任务,
  // 只是让应用平白变慢,且其文案「准备进入解析页面」与「离开本页」的实际行为不符。
  const handleAnalyze = useCallback(() => {
    const fills = selectedSlots.filter((s): s is SelectionFill => s !== null);
    if (fills.length !== cardCount) return;
    setDrawnCards(fills.map((f) => f.card));
    setCardReversals(fills.map((f) => f.reversed));
    router.push("/result");
  }, [selectedSlots, cardCount, setDrawnCards, setCardReversals, router]);

  if (!recommendedSpread) {
    return (
      <div className="min-h-screen mystical-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-300"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 返回按钮 */}
        <motion.button
          onClick={() => router.push("/")}
          className="fixed top-6 left-6 mystical-button p-3"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <ArrowLeft className="w-5 h-5" />
        </motion.button>

        <div className="max-w-4xl mx-auto pt-20">
          <div className="text-center">
            <div className="mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
                {recommendedSpread.name}
              </h1>
              <div className="mystical-card p-4 max-w-2xl mx-auto">
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  &quot;{question}&quot;
                </p>
              </div>
            </div>

            {/* 选牌进度 */}
            <p className="text-sm text-purple-600 font-semibold mb-4">
              {isComplete
                ? `已完成选牌 ${filledCount} / ${cardCount} 张`
                : `已选 ${filledCount} / ${cardCount} 张 · 请选择第 ${focusSlot! + 1} 位「${recommendedSpread.positions[focusSlot!]}」`
              }
            </p>

            {/* 牌阵槽位:聚焦空位高亮且可点击,其余不可点 */}
            <SpreadSlots
              positions={recommendedSpread.positions}
              meanings={meanings}
              fills={selectedSlots}
              focusSlot={focusSlot}
              onSlotClick={goSelect}
            />

            {/* 底部主按钮 */}
            <div className="mt-10 pb-4">
              {isComplete ? (
                <motion.button
                  onClick={handleAnalyze}
                  className="mystical-button px-12 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  🔮 开始解析
                </motion.button>
              ) : (
                <motion.button
                  onClick={goSelect}
                  className="mystical-button px-12 py-4 text-xl font-bold bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white shadow-lg"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  开始选牌
                </motion.button>
              )}
              <p className="text-xs text-gray-500 mt-3">
                {isComplete
                  ? "牌阵已就位,让塔罗为你解读"
                  : "点击高亮空位或「开始选牌」进入选牌页"
              }
            </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}