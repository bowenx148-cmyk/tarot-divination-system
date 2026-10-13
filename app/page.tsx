"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Stars, Moon } from "lucide-react";
import { useTarotStore, tarotSpreads, recommendSpread, readingOwner } from "@/lib/store";
import { useRouter } from "next/navigation";
import { fetchTrialStatus } from "@/lib/deepseek";
import {
  MysticalBg,
  MysticalCard,
  MysticalButton,
  MysticalInput,
} from "@/app/components/ui";
import { ApiKeySettings } from "@/app/components/ApiKeySettings";
import { TarotCard } from "@/app/components/TarotCard";
import { tarotCards } from "@/lib/tarot-data";
import { SpreadGallery } from '@/app/components/SpreadGallery';
import { UserProfiles } from '@/app/components/UserProfiles';
import { assessQuestion } from '@/lib/question-guide';
import { DIVINATION_NOTICES } from '@/lib/tarot-reference';
import { detectQuestionTopics, QUESTION_TOPICS, TopicChoice } from '@/lib/tarot-knowledge';

export default function Home() {
  const activeUserId = useTarotStore(s => s.activeUserId);
  return <HomeSession key={activeUserId} />;
}

function HomeSession() {
  // 从 store 回填已有问题（规格 G17）：从 /draw 返回首页时输入框不再清空，
  // 用户想改措辞不必从头重打。注意这只是「初值」——后续编辑由 localQuestion 承载。
  const storedQuestion = useTarotStore((s) => s.question);
  const [localQuestion, setLocalQuestion] = useState(storedQuestion);
  const [spreadId, setSpreadId] = useState('situation-guidance');
  const [profile, setProfile] = useState(useTarotStore.getState().profile);
  const [topic, setTopic] = useState<TopicChoice>('auto');
  const [siteTitle, setSiteTitle] = useState('塔罗指引');
  const [publicAccess, setPublicAccess] = useState(false);
  const [referenceId, setReferenceId] = useState<string | null>(useTarotStore.getState().referenceReadingId);
  const histories = useTarotStore(s => s.readings);
  const userId = useTarotStore(s => s.activeUserId);
  const ownHistories = histories.filter(r => readingOwner(r) === userId);
  const reference = ownHistories.find(r => r.id === referenceId);
  useEffect(() => { let cancelled = false; fetch('/api/developer').then(r => r.ok ? r.json() : null).then(data => { if (!cancelled) { if (typeof data?.siteTitle === 'string') setSiteTitle(data.siteTitle); setPublicAccess(data?.publicAccess === true); const state = useTarotStore.getState(); if (!state.apiKey && !state.encryptedApiKey && data?.deepseekConfigured && !data?.openaiConfigured) state.setModel('deepseek-flash'); } }).catch(() => {}); return () => { cancelled = true; }; }, []);
  const selectedSpread = spreadId === 'auto' ? recommendSpread(localQuestion) : tarotSpreads.find(s => s.id === spreadId)!;
  const [localApiKey, setLocalApiKey] = useState("");
  const assessment = assessQuestion(localQuestion);
  const currentTopics = detectQuestionTopics(localQuestion, topic);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const { setQuestion, resetSession, trialUsed, setApiKey, model, setModel } = useTarotStore();
  const router = useRouter();

  // 从加密存储恢复 API Key（同一会话刷新自动恢复；失败则提示重输）
  useEffect(() => {
    const restoreApiKey = async () => {
      const ok = await useTarotStore.getState().initApiKeyFromStorage();
      if (ok) {
        setLocalApiKey(useTarotStore.getState().apiKey);
      }
      // 旧数据迁移：清理历史版本手动存储的明文 deepseek_api_key
      localStorage.removeItem("deepseek_api_key");
    };
    restoreApiKey();
  }, []);

  // 同步服务端免费试用状态：刷新/重开页面后显示真实余量（服务端为权威，本地 trialUsed 仅缓存）
  useEffect(() => {
    let cancelled = false;
    fetchTrialStatus().then((status) => {
      if (!cancelled && status && typeof status.trialUsed === "boolean") {
        useTarotStore.getState().setTrialStatus(status.trialUsed);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // 保存 API Key（加密存储由 store 内部处理，仅经单一来源）
  const handleApiKeyChange = (newApiKey: string, remember?: boolean) => {
    setLocalApiKey(newApiKey);
    setApiKey(newApiKey, remember); // store 内部加密持久化
    if (newApiKey) {
      setSettingsNotice(null); // 已填入 Key，清除试用提示
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localQuestion.trim() || !assessment.supported) return;

    // 试用已用完且未填个人 Key → 弹出 API 设置并提示
    if (trialUsed && !localApiKey) {
      setSettingsNotice(
        "免费试用次数已用完，请填入对应提供商的个人 API Key 后继续占卜。",
      );
      setSettingsOpen(true);
      return;
    }

    // 重置之前的会话状态
    resetSession();

    // 设置新的问题
    setQuestion(localQuestion.trim());
    useTarotStore.getState().setRecommendedSpread(selectedSpread);
    useTarotStore.getState().setSelectedSlots(Array(selectedSpread.cardCount).fill(null));
    useTarotStore.getState().setProfile(profile);
    useTarotStore.getState().setTopic(topic);
    useTarotStore.getState().setReferenceReadingId(referenceId);

    // 跳转到抽牌页面。
    // 同步跳转,不设人为等待(规格 G17):resetSession/setQuestion 都是同步的 zustand 写入,
    // 旧的 666ms 底下没有任何异步任务,只是让应用平白变慢。
    router.push("/draw/select");
  };

  return (
    <MysticalBg className="min-h-screen relative overflow-hidden">
      {/* API 设置 */}
      <ApiKeySettings
        currentModel={model}
        onModelChange={setModel}
        currentApiKey={localApiKey}
        onApiKeyChange={handleApiKeyChange}
        trialUsed={trialUsed}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        notice={settingsNotice}
      />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-5xl w-full">
          {/* 标题区域 */}
          <motion.div
            className="text-center mb-12 pt-12 md:pt-0"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="mb-4 text-xs tracking-[.3em] text-purple-700">牌面 · 对话 · 复盘</p>
            <div className="flex items-center justify-center mb-6">
              <Moon className="w-10 h-10 text-purple-500 mr-4" />
              <h1 className="brand-heading text-5xl md:text-7xl font-bold text-purple-800">
                {siteTitle}
              </h1>
              <Stars className="w-10 h-10 text-purple-500 ml-4" />
            </div>
            <p className="text-xl md:text-2xl text-gray-600 mb-6 font-medium">
              从牌面梳理当下，为下一步留一点思考
            </p>
          </motion.div>

          {/* 问题输入卡片 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <MysticalCard className="p-8 md:p-10">
              <section aria-labelledby="divination-notices" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <h2 id="divination-notices" className="mb-2 text-lg font-semibold">占卜须知</h2>
                <ul className="list-disc space-y-1 pl-5 text-sm leading-6">{DIVINATION_NOTICES.map(notice => <li key={notice}>{notice}</li>)}</ul>
              </section>
              <UserProfiles />
              <div className="mb-4 flex flex-wrap gap-4 text-sm"><span className="text-gray-600">使用者：注册用户名可保存咨询记忆</span>{!publicAccess && <a href="/developer" className="text-purple-700 underline">开发者登录 / 修改设置</a>}</div>
              <form onSubmit={handleSubmit}>
                {ownHistories.length > 0 && <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-3 text-sm text-purple-950">
                  <label htmlFor="reference-reading">这次要参考哪段过去的咨询？（自愿）</label>
                  <select id="reference-reading" value={reference?.id ?? ''} onChange={e => setReferenceId(e.target.value || null)} className="mt-2 block w-full rounded border p-2"><option value="">不带入历史，开始新问题</option>{ownHistories.map(r => <option key={r.id} value={r.id}>{r.question.slice(0, 60)}</option>)}</select>
                  {reference && <div className="mt-2"><p>会带入这条记录的原问题、牌位与正逆位、部分解读及最近追问；本次仍按新牌组解读。</p><details><summary className="cursor-pointer">查看本次带入的历史资料</summary><p className="mt-2">原问题：{reference.question}</p><p>{reference.cards.map((card, i) => `${reference.spread.positions[i]}：${card.name}${reference.cardReversals?.[i] ? '逆位' : '正位'}`).join('；')}</p><p className="mt-2 whitespace-pre-wrap">{reference.interpretation.slice(0, 2500)}</p>{(reference.followups ?? []).slice(-4).map((turn, i) => <p key={i} className="mt-2">{turn.question.slice(0, 300)}：{turn.answer.slice(0, 500)}</p>)}</details><button type="button" onClick={() => setReferenceId(null)} className="mt-2 underline">取消带入</button></div>}
                </div>}
                <div>
                  <label
                    htmlFor="question"
                    className="block text-2xl font-bold text-center mb-6 text-gray-800"
                  >
                    你的问题
                  </label>
                  <MysticalInput
                    id="question"
                    value={localQuestion}
                    onChange={(e) => setLocalQuestion(e.target.value)}
                    placeholder="请输入你想要咨询的问题，比如：关于爱情、事业、人际关系等..."
                    className="resize-none h-40 leading-relaxed border-2 shadow-lg"
                    rows={8}
                    required
                  />
                </div>

                <label className="block mt-5 text-gray-800 font-semibold" htmlFor="question-topic">问题类型</label>
                <select id="question-topic" value={topic} onChange={event => setTopic(event.target.value as TopicChoice)} className="border rounded-lg p-3 w-full mt-2 text-gray-700">
                  <option value="auto">自动识别（支持多个领域）</option>
                  {Object.entries(QUESTION_TOPICS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {localQuestion.trim() && <div className={`mt-3 rounded-lg p-3 text-sm leading-6 ${assessment.supported ? 'bg-purple-50 text-purple-900' : 'bg-amber-50 text-amber-950'}`} role="status">
                  <p>初步识别：{currentTopics.map(key => QUESTION_TOPICS[key]).join('、')}（可手动调整）</p>
                  <p>{assessment.message}</p>
                </div>}
                <SpreadGallery selectedId={spreadId} onSelect={setSpreadId} selectedSpread={selectedSpread} topics={currentTopics} />
                <details className="mt-5 text-gray-700">
                  <summary className="cursor-pointer font-medium">补充背景（选填）</summary>
                  <div className="mt-3 space-y-3">
                    <label className="block text-sm">怎么称呼你<input aria-label="昵称" maxLength={30} value={profile.nickname} onChange={e => setProfile({ ...profile, nickname: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
                    <label className="block text-sm">生日<input aria-label="生日" type="date" value={profile.birthday} onChange={e => setProfile({ ...profile, birthday: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" /></label>
                    <label className="block text-sm">最近发生了什么<textarea aria-label="背景" maxLength={1000} value={profile.background} onChange={e => setProfile({ ...profile, background: e.target.value })} className="block w-full border rounded-lg p-2 mt-1" rows={3} /></label>
                    <p className="text-xs text-gray-500">填写的资料会随解读发送给 OpenAI，并随成功的解读保存在本机历史中。生日仅作为背景，不用于推算命运。</p>
                  </div>
                </details>
                <div className="mt-4">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* 提交是同步的（规格 G17 去掉了 666ms 假等待），因此不存在加载态 */}
                    <MysticalButton
                      type="submit"
                      disabled={!localQuestion.trim() || !assessment.supported}
                      className="w-full py-4 text-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ borderRadius: "8px" }}
                    >
                      开始占卜
                    </MysticalButton>
                  </motion.div>
                </div>
              </form>
            </MysticalCard>
          </motion.div>

          {/* 塔罗牌预览 */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <h3 className="text-center text-lg font-semibold text-gray-700 mb-8">
              塔罗牌预览
            </h3>
            <div className="text-center mb-5"><a href="/cards" className="text-purple-700 underline">查阅全部 78 张牌的正逆位牌义</a></div>
            <div className="flex justify-center gap-4 flex-wrap">
              {/* 展示3张示例卡牌 */}
              {tarotCards.slice(0, 3).map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                >
                  <TarotCard
                    card={card}
                    size="sm"
                    isRevealed={true}
                    isReversed={index === 1} // 中间的卡牌显示为逆位
                  />
                </motion.div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-4 max-w-sm mx-auto">
              韦特塔罗牌，包含22张大阿尔卡纳和56张小阿尔卡纳
              <br />
              每张牌都有独特的含义和象征
            </p>
          </motion.div>

          {/* 特色功能 - 简化版 */}
          <motion.div
            className="mt-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <span>🎴</span>
                <span>智能牌阵</span>
              </div>
              <div className="flex items-center gap-1">
                <span>✨</span>
                <span>AI解析</span>
              </div>
              {/* 历史记录入口（规格 Y1） */}
              <button
                onClick={() => router.push("/history")}
                className="flex items-center gap-1 hover:text-purple-600 transition-colors cursor-pointer"
                aria-label="历史记录"
              >
                <span>📚</span>
                <span>历史记录</span>
              </button>
            </div>
          </motion.div>

          {/* 声明 */}
          <motion.div
            className="mt-8 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <p className="text-center text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">
              内容由AI生成，请仔细甄别，禁止非法行为
            </p>
            <p className="mt-3 text-center text-xs text-purple-700">
              基于 <a href="https://github.com/HammerRoot/indigo-tarot" target="_blank" rel="noreferrer" className="underline underline-offset-4">indigo-tarot</a> 二次开发 · 保留原项目署名与许可证
            </p>
          </motion.div>
        </div>
      </main>
    </MysticalBg>
  );
}
