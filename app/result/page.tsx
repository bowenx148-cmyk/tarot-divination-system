"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Share2, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemoizedFn } from "ahooks";
import { useTarotStore } from "@/lib/store";
import { generateTarotReadingStream } from "@/lib/deepseek";
import { KnowledgeReference } from '@/lib/knowledge-types';
import { KnowledgeReferences } from '@/app/components/KnowledgeReferences';
import { ResultTarotCard } from "@/app/components/ResultTarotCard";
import { MarkdownRenderer } from "@/app/components/MarkdownRenderer";
import { CardModal } from "@/app/components/CardModal";
import { parseStreamContent, stripAdviceSection } from "@/lib/stream-parse";
import { TarotDialogue } from "@/app/components/TarotDialogue";
import { ApiKeySettings } from "@/app/components/ApiKeySettings";
import { previousConsultation } from '@/lib/reading-memory';

export default function ResultPage() {
  const router = useRouter();
  const {
    question,
    recommendedSpread,
    drawnCards,
    cardReversals,
    apiKey,
    model,
    profile,
    topic,
    activeUserId,
    referenceReadingId,
    readings,
    setModel,
    setApiKey,
    resetSession,
    setApiUsage,
    addReading,
  } = useTarotStore();

  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamComplete, setStreamComplete] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState(false);
  // G7:当前放大的牌索引(点击牌面 → 模态)
  const [modalCardIndex, setModalCardIndex] = useState<number | null>(null);

  // 使用 useRef 防止重复调用
  const hasStartedAnalysis = useRef(false);
  // 记录已滚动到的牌面索引，防止重复触发滚动
  const lastScrolledCardIndex = useRef<number | null>(null);
  // 完整流式内容（供 onComplete 保存历史记录；streamingContent 状态为异步更新）
  const contentRef = useRef("");
  const referencesRef = useRef<KnowledgeReference[]>([]);
  const [knowledgeReferences, setKnowledgeReferences] = useState<KnowledgeReference[]>([]);

  // 派生解析结果：流式内容为唯一状态源，解析为纯函数（规格 O3）
  const parsed = useMemo(
    () => parseStreamContent(streamingContent),
    [streamingContent],
  );
  // 解析区正文(结论先行时 💡 先流式,此时 analysis 为空 → 显示占位,规格 G12)
  const analysisText = parsed.analysis ?? stripAdviceSection(streamingContent);

  const startAnalysis = useMemoizedFn(() => {
    // 防止重复调用
    if (hasStartedAnalysis.current) return;
    hasStartedAnalysis.current = true;

    setShowAnalysis(true);
    setIsStreaming(true);

    generateTarotReadingStream(
      question!,
      drawnCards,
      {
        onContent: (content) => {
          // updater 内零副作用，仅拼接累积内容（解析由 useMemo 派生）
          setStreamingContent((prev) => prev + content);
          contentRef.current += content;
        },
        onComplete: () => {
          setIsStreaming(false);
          setStreamComplete(true);
          // 流式完成后自动保存历史记录（规格 Y1）；空内容不保存
          const fullContent = contentRef.current;
          if (!fullContent.trim()) {
            setStreamComplete(false);
            setAnalysisError(true);
            setStreamingContent('回答内容为空，请保留原牌组重试。');
            return;
          }
          if (fullContent && recommendedSpread && drawnCards.length) {
            // 直接同步解析完整内容取核心建议（不依赖 useMemo 的异步状态时序）
            const finalParsed = parseStreamContent(fullContent);
            const id =
                typeof crypto !== "undefined" && crypto.randomUUID
                  ? crypto.randomUUID()
                  : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setReadingId(id);
            addReading({
              id,
              profile,
              topic,
              userId: activeUserId,
              previousReadingId: referenceReadingId ?? undefined,
              question: question ?? "",
              spread: recommendedSpread,
              cards: drawnCards,
              cardReversals,
              interpretation: fullContent,
              advice: finalParsed.coreAdvice ?? "正在生成核心建议...",
              timestamp: new Date(),
              knowledgeReferences: referencesRef.current,
            });
          }
        },
        onError: (error) => {
          setAnalysisError(true);
          setIsStreaming(false);
          setStreamingContent(
            error === "trial_used"
              ? "免费试用已用完。请返回首页，点击右上角 ⚙️ 设置对应提供商的个人 API Key 后继续占卜。"
              : error === "quota_exhausted"
                ? "系统免费额度已达每日上限。请返回首页，点击右上角 ⚙️ 设置对应提供商的个人 API Key 后继续占卜。"
                : error.replace(/^API_KEY_NEEDED:/, ""),
          );
        },
        onMeta: (meta) => {
          referencesRef.current = meta.knowledgeReferences ?? [];
          setKnowledgeReferences(referencesRef.current);
          setApiUsage(meta.remainingCalls, meta.usingSystemKey, meta.trialUsed);
        },
      },
      apiKey || undefined,
      cardReversals,
      model,
      { spread: recommendedSpread ?? undefined, profile, topic, previousConsultation: previousConsultation(readings, activeUserId, referenceReadingId) },
    );
  });

  // 解析到新牌面时自动滚动到对应位置（防重复，保留 500ms 延迟）
  useEffect(() => {
    const index = parsed.currentCardIndex;
    if (
      index === null ||
      index === lastScrolledCardIndex.current ||
      index >= drawnCards.length
    ) {
      return;
    }
    lastScrolledCardIndex.current = index;
    const timer = setTimeout(() => {
      const cardElement = document.getElementById(`card-${index}`);
      cardElement?.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "center",
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [parsed.currentCardIndex, drawnCards.length]);

  const handleStartNew = () => {
    resetSession();
    router.push("/");
  };

  const handleShare = async () => {
    const shareText = `我的塔罗占卜结果\n\n问题：${question}\n\n${parsed.coreAdvice || "正在解析中..."}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "我的塔罗占卜结果",
          text: shareText,
          url: window.location.origin,
        });
      } catch (error) {
        console.log("分享失败:", error);
      }
    } else {
      navigator.clipboard.writeText(shareText).then(() => {
        alert("结果已复制到剪贴板");
      });
    }
  };

  // 检查必要数据并开始解析
  useEffect(() => {
    if (
      !question ||
      !recommendedSpread ||
      !drawnCards.length ||
      !cardReversals.length
    ) {
      router.push("/");
      return;
    }

    // 不在此预加载图片：牌面在 /draw/select 翻牌时就已按同一个 URL 取到
    // （规格 G15），结果页对已翻过的牌是纯缓存命中。
    // 旧实现在这里预热的是原图 URL，而页面渲染的是 /_next/image 优化 URL，
    // 命中率 0，纯属白下载 ~320KB/张的原图与真正要用的图抢带宽。

    // 立即显示卡牌，并立即分析
    setShowCards(true);
    if (!hasStartedAnalysis.current) {
      startAnalysis();
    }
  }, [
    question,
    recommendedSpread,
    drawnCards,
    cardReversals,
    router,
    startAnalysis,
  ]);

  if (!question || !recommendedSpread || !drawnCards.length) {
    return (
      <div className="min-h-screen astro-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-white/70">正在加载结果...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen astro-bg relative overflow-hidden">
      <ApiKeySettings currentApiKey={apiKey} onApiKeyChange={setApiKey} currentModel={model} onModelChange={setModel} />
      <div className="astro-stars"></div>

      <main className="relative z-10 min-h-screen px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex justify-between items-center mb-10">
          <motion.button
            onClick={() => router.push("/")}
            className="astro-button p-3"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="返回首页"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex gap-3">
            <motion.button
              onClick={handleShare}
              className="astro-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="分享结果"
            >
              <Share2 className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={handleStartNew}
              className="astro-button p-3"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="重新占卜"
            >
              <RotateCcw className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* 1. 你的问题 */}
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="astro-card p-6 md:p-8"
          >
            <div className="astro-card-title mb-5">
              <span className="text-gold">✦</span>
              <span>你的问题</span>
            </div>
            <p className="text-white/90 text-xl md:text-2xl leading-relaxed font-serif">
              &quot;{question}&quot;
            </p>
          </motion.section>

          {/* 2. 抽牌结果(轻量呈现 + 点击放大) */}
          <AnimatePresence>
            {showCards && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="astro-card p-6 md:p-8"
              >
                <div className="astro-card-title mb-2">
                  <span className="text-gold">🃏</span>
                  <span>抽牌结果</span>
                </div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-xs bg-white/10 border border-gold/30 rounded-full px-3 py-1 text-gold-light">
                    {recommendedSpread.name}
                  </span>
                  <span className="text-xs text-white/50">
                    {recommendedSpread.description}
                  </span>
                </div>

                {/* 牌阵布局(轻量:小图 + 点击放大) */}
                <div className="max-w-5xl mx-auto">
                  <div
                    data-testid="result-grid"
                    className="flex flex-wrap justify-center gap-5 md:gap-6"
                  >
                    {drawnCards.map((card, index) => (
                      <motion.div
                        key={card.id}
                        className={`flex flex-col items-center transition-all duration-500 cursor-pointer ${
                          parsed.currentCardIndex === index
                            ? "rounded-xl p-3 bg-white/5 ring-1 ring-gold/40"
                            : ""
                        }`}
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{
                          opacity: 1,
                          scale: parsed.currentCardIndex === index ? 1.05 : 1,
                          y: 0,
                        }}
                        transition={{ delay: index * 0.2 }}
                        id={`card-${index}`}
                        onClick={() => setModalCardIndex(index)}
                      >
                        {/* 牌位标注 */}
                        <p className="text-gold/80 text-[11px] font-semibold mb-2 tracking-wide text-center">
                          {recommendedSpread.positions[index] ??
                            `第 ${index + 1} 位`}
                        </p>
                        {/* 牌面小图(轻量呈现) */}
                        <div className="pointer-events-none">
                          <ResultTarotCard
                            card={card}
                            index={index}
                            isReversed={cardReversals[index] || false}
                          />
                        </div>
                        {/* 极简标注 */}
                        <div className="mt-2 text-center max-w-[110px]">
                          <p className="text-xs text-white/80 font-medium">
                            {cardReversals[index] && (
                              <span className="text-gold/80 mr-1">逆</span>
                            )}
                            {card.name}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-center text-xs text-white/40 mt-4">
                    点击任意牌可放大查看牌位含义
                  </p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 4. 核心建议 */}
          <AnimatePresence>
            {(parsed.coreAdvice || streamComplete) && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="astro-card p-6 md:p-8 border-gold/30 shadow-[0_0_40px_rgba(212,175,55,0.1)]"
              >
                <div className="astro-card-title mb-5">
                  <span className="text-gold">💡</span>
                  <span>核心建议</span>
                </div>
                <div className="text-center">
                  {parsed.coreAdvice ? (
                    <div className="max-w-2xl mx-auto text-gold-light">
                      <MarkdownRenderer
                        content={parsed.coreAdvice}
                        variant="dark"
                        className="text-gold-light font-serif text-lg"
                      />
                    </div>
                  ) : streamComplete ? (
                    <p className="text-gold-light text-xl font-serif leading-relaxed">
                      请结合以上解析，听从内心的声音
                    </p>
                  ) : (
                    <p className="text-white/60 text-lg font-semibold leading-relaxed">
                      正在生成核心建议...
                    </p>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* 3. AI深度解析 */}
          <AnimatePresence>
            {showAnalysis && (
              <motion.section
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.6 }}
                className="astro-card p-6 md:p-8"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="astro-card-title">
                    <span className="text-gold">🔮</span>
                    <span>AI 深度解析</span>
                  </div>
                  {isStreaming && (
                    <p className="text-gold/80 text-sm font-medium">
                      ✨ 正在思考分析中...
                    </p>
                  )}
                </div>

                <div className="max-w-2xl mx-auto text-white/85 leading-8">
                  {analysisText ? (
                    <MarkdownRenderer
                      content={analysisText}
                      variant="dark"
                      className="text-white/85"
                    />
                  ) : (
                    <p className="text-white/50 text-center">
                      深度解析正在生成中…
                    </p>
                  )}
                  {isStreaming && (
                    <motion.span
                      className="inline-block w-2 h-5 bg-gold ml-1"
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {analysisError && <div className="text-center"><button className="astro-button px-5 py-3" onClick={() => {
            hasStartedAnalysis.current = false; contentRef.current = ''; setStreamingContent(''); setStreamComplete(false); setAnalysisError(false); startAnalysis();
          }}>保留原牌组，重试解读</button></div>}
          {streamComplete && <KnowledgeReferences references={knowledgeReferences} />}
          {streamComplete && <TarotDialogue interpretation={streamingContent} readingId={readingId} />}
          {/* AI 免责声明 + 底部操作 */}
          {streamComplete && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center text-white/40 text-xs leading-relaxed mb-6"
              >
                以上内容皆由AI生成，仅供娱乐，请勿尽信
              </motion.p>

              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <motion.button
                  onClick={() => router.push("/history")}
                  className="astro-button px-8 py-4 text-lg font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  📚 历史记录
                </motion.button>

                <motion.button
                  onClick={() => router.push("/")}
                  className="astro-button px-8 py-4 text-lg font-bold"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  返回首页
                </motion.button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      {/* G7:牌放大模态 */}
      <AnimatePresence>
        {modalCardIndex !== null && drawnCards[modalCardIndex] && (
          <CardModal
            card={drawnCards[modalCardIndex]}
            position={recommendedSpread.positions[modalCardIndex] ?? "未知牌位"}
            isReversed={cardReversals[modalCardIndex] || false}
            onClose={() => setModalCardIndex(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
