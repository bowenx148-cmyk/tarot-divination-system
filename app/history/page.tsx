"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTarotStore, readingOwner } from "@/lib/store";
import { UserProfiles } from '@/app/components/UserProfiles';
import { KnowledgeReferences } from '@/app/components/KnowledgeReferences';
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";
import { parseStreamContent, removeAdviceSection } from "@/lib/stream-parse";

export default function HistoryPage() {
  const router = useRouter();
  const allReadings = useTarotStore((s) => s.readings);
  const activeUserId = useTarotStore(s => s.activeUserId);
  const readings = allReadings.filter(reading => readingOwner(reading) === activeUserId);
  const removeReading = useTarotStore((s) => s.removeReading);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    if (window.confirm("确定要删除这条占卜记录吗？")) {
      removeReading(id);
      if (expandedId === id) setExpandedId(null);
    }
  };

  return (
    <div className="min-h-screen mystical-bg relative overflow-hidden">
      <div className="stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* 顶部导航 */}
          <div className="flex items-center gap-4 mb-8">
            <motion.button
              onClick={() => router.push("/")}
              className="mystical-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="返回首页"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
              📚 历史记录
            </h1>
          </div>

          <UserProfiles />
          {readings.length === 0 ? (
            <div className="mystical-card p-10 text-center">
              <p className="text-4xl mb-4">🔮</p>
              <p className="text-gray-500 text-lg">暂无占卜记录</p>
              <p className="text-gray-400 text-sm mt-2">
                完成一次占卜后，结果会自动保存在这里
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {readings.map((reading) => {
                const isExpanded = expandedId === reading.id;
                // Y8：展开区去重——核心建议从 interpretation 解析（G12 结论先行），
                // 旧数据回退 advice 字段；💡 节不再重复渲染
                const parsed = parseStreamContent(reading.interpretation);
                const coreAdvice = parsed.coreAdvice ?? (reading.advice || null);
                const analysisContent = removeAdviceSection(reading.interpretation);
                return (
                  <motion.div
                    key={reading.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mystical-card p-5 md:p-6"
                  >
                    {/* 列表摘要（Y9：拆分外层整行 button，消除 button 嵌套，修复 hydration 错误） */}
                    <div className="flex items-start justify-between gap-4">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                        className="flex-1 min-w-0 text-left"
                        aria-expanded={isExpanded}
                      >
                        <p className="text-lg font-semibold text-gray-800 truncate">
                          {reading.question || "（未填写问题）"}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-purple-50 border border-purple-200 rounded-full px-3 py-1 text-purple-700">
                            {reading.spread?.name ?? "牌阵"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {reading.cards.map((c) =>
                              c.name +
                                (reading.cardReversals?.[reading.cards.indexOf(c)] ? "（逆）" : ""),
                            ).join("、")}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(reading.timestamp).toLocaleString("zh-CN")}
                        </p>
                      </button>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => router.push(`/consult/${encodeURIComponent(reading.id)}`)} className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-800">继续咨询</button>
                        <button
                          onClick={() => handleDelete(reading.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="删除记录"
                          title="删除记录"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : reading.id)}
                          className="p-2 text-purple-500 hover:text-purple-700 transition-colors"
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "收起详情" : "展开详情"}
                          title={isExpanded ? "收起详情" : "展开详情"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 展开详情 */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                            <div className="bg-purple-50 rounded-lg p-3">
                              <h4 className="text-sm font-bold text-purple-800 mb-2">本次牌面</h4>
                              {reading.cards.map((card, index) => <p key={card.id} className="text-sm text-gray-700">{reading.spread.positions[index] ?? `第${index + 1}位`}：{card.name} · {reading.cardReversals[index] ? '逆位' : '正位'}</p>)}
                            </div>
                            {/* 核心建议：结论先行 + 背景高亮（唯一模块，位于深度解析过程之前） */}
                            {coreAdvice && (
                              <div
                                data-testid="history-advice"
                                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                              >
                                <h4 className="text-sm font-bold text-yellow-800 mb-1">
                                  💡 核心建议
                                </h4>
                                <MarkdownRenderer
                                  content={coreAdvice}
                                  className="text-yellow-900"
                                  hideHr
                                />
                              </div>
                            )}
                            {/* 深度解析过程：interpretation 剥离 💡 节（保留 🔮 小节标题与正文） */}
                            {reading.profile?.nickname && <p className="text-sm text-gray-500">称呼：{reading.profile.nickname}</p>}
                            <div className="prose prose-sm max-w-none text-gray-700">
                              <MarkdownRenderer
                                content={analysisContent}
                                className="text-gray-700"
                              />
                            </div>
                            <KnowledgeReferences references={reading.knowledgeReferences} />
                            {reading.followups?.map((turn, index) => <div key={index} className="border-t border-purple-100 pt-4">
                              <p className="font-semibold text-purple-800 mb-2">追问：{turn.question}</p>
                              <MarkdownRenderer content={turn.answer} className="text-gray-700" />
                              <KnowledgeReferences references={turn.knowledgeReferences} />
                            </div>)}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
