import { DEFAULT_GPT_MODEL, GPTModel, isGPTModel, modelProvider } from "./models";
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TarotCard, tarotCards } from './tarot-data';
import { SelectionFill, createDeckOrder } from './drawFlow';
import { recommendSpreadId } from './spread';
import { DialogueTurn, ReadingContext } from './tarot-context';
import type { KnowledgeReference } from './knowledge-types';
import { isTopicChoice, TopicChoice } from './tarot-knowledge';
import {
  decryptApiKey,
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from './apiKeyCrypto';

// 会话密钥在 sessionStorage 中的键名（会话级，关闭浏览器即失效）
const SESSION_KEY_NAME = 'tarot-session-key';

async function ensureSessionKey(): Promise<CryptoKey> {
  let b64 = sessionStorage.getItem(SESSION_KEY_NAME);
  if (!b64) {
    b64 = await generateSessionKey();
    sessionStorage.setItem(SESSION_KEY_NAME, b64);
  }
  return importSessionKey(b64);
}

// 牌阵类型定义
export const DEFAULT_USER_ID = 'local-default';
export interface LocalUser { id: string; name: string; }
export function readingOwner(reading: { userId?: string }): string { return reading.userId ?? DEFAULT_USER_ID; }

export interface TarotSpread {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  positions: string[];
  category: string[];
}

// 占卜记录类型
export interface TarotReading {
  knowledgeReferences?: KnowledgeReference[];
  id: string;
  question: string;
  spread: TarotSpread;
  cards: TarotCard[];
  cardReversals: boolean[];
  interpretation: string;
  advice: string;
  timestamp: Date;
  profile?: ReadingContext['profile'];
  followups?: DialogueTurn[];
  userId?: string;
  topic?: TopicChoice;
  previousReadingId?: string;
}

// 应用状态接口
interface TarotStore {
  referenceReadingId: string | null;
  setReferenceReadingId: (id: string | null) => void;
  users: LocalUser[];
  activeUserId: string;
  createUser: (name: string) => string | null;
  switchUser: (id: string) => void;
  topic: TopicChoice;
  setTopic: (topic: TopicChoice) => void;
  // 当前问题
  question: string;
  setQuestion: (question: string) => void;
  profile: NonNullable<ReadingContext['profile']>;
  setProfile: (profile: NonNullable<ReadingContext['profile']>) => void;
  
  model: GPTModel;
  setModel: (model: GPTModel) => void;

  // API Key
  apiKey: string;
  // 加密后的 API Key（localStorage 持久化；明文 apiKey 仅存内存）
  encryptedApiKey: string | null;
  setApiKey: (apiKey: string, remember?: boolean) => Promise<void>;
  // 从存储恢复：同一会话（sessionStorage 密钥在）→ 解密恢复；否则清空并返回 false
  initApiKeyFromStorage: () => Promise<boolean>;
  clearStoredKey: () => Promise<void>;
  
  // 推荐的牌阵
  recommendedSpread: TarotSpread | null;
  setRecommendedSpread: (spread: TarotSpread | null) => void;
  
  // 选牌进行中的槽位填充(长度为 cardCount,null 表示未选)——情况页与选牌子页共享,内存态不持久化
  selectedSlots: (SelectionFill | null)[];
  setSelectedSlots: (slots: (SelectionFill | null)[]) => void;

  // 本局的牌序(0..77 的排列,值即 tarotCards 下标)——每局洗一次,整局固定,内存态不持久化
  deckOrder: number[];
  setDeckOrder: (order: number[]) => void;
  
  // 抽取的卡牌
  drawnCards: TarotCard[];
  setDrawnCards: (cards: TarotCard[]) => void;
  
  // 卡牌逆位状态
  cardReversals: boolean[];
  setCardReversals: (reversals: boolean[]) => void;
  
  // 历史记录
  readings: TarotReading[];
  addReading: (reading: TarotReading) => void;
  removeReading: (id: string) => void;
  setReadingFollowups: (id: string, followups: DialogueTurn[]) => void;
  
  // 加载状态
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  
  // 剩余次数状态
  remainingCalls: number | null;
  usingSystemKey: boolean;
  trialUsed: boolean;
  setApiUsage: (remainingCalls: number | null, usingSystemKey: boolean, trialUsed?: boolean) => void;
  // 仅更新免费试用状态（页面加载时由服务端查询校正；不触碰 usingSystemKey/remainingCalls）
  setTrialStatus: (trialUsed: boolean) => void;
  
  // 重置状态
  resetSession: () => void;
}

// 预定义的牌阵
export const tarotSpreads: TarotSpread[] = [
  {
    id: 'single-card',
    name: '单张牌指引',
    description: '最简单直接的指引，适合日常决策和即时答案',
    cardCount: 1,
    positions: ['核心指引'],
    category: ['日常', '简单问题', '快速答案']
  },
  {
    id: 'situation-guidance',
    name: '现状与建议',
    description: '看清现状、影响因素和下一步行动，适合大多数具体问题',
    cardCount: 3,
    positions: ['现状', '影响因素', '建议'],
    category: ['通用', '行动', '反思']
  },
  {
    id: 'past-present-future',
    name: '时间之流',
    description: '经典三牌阵，揭示过去、现在、未来的脉络',
    cardCount: 3,
    positions: ['过去', '现在', '未来'],
    category: ['时间', '发展', '趋势']
  },
  {
    id: 'relationship-cross',
    name: '情感十字',
    description: '专门解读爱情与人际关系的四牌阵',
    cardCount: 4,
    positions: ['你的感受', '对方的感受', '关系现状', '未来发展'],
    category: ['爱情', '关系', '情感']
  },
  {
    id: 'decision-making',
    name: '选择之路',
    description: '帮助做出重要决定的五牌阵',
    cardCount: 5,
    positions: ['现状', '选项A', '选项B', '影响因素', '建议'],
    category: ['决策', '选择', '事业']
  },
  {
    id: 'life-guidance',
    name: '生命指引',
    description: '全面的人生指导，探索各个生活层面',
    cardCount: 7,
    positions: ['现状', '挑战', '过去影响', '可能未来', '内在力量', '外在影响', '最终建议'],
    category: ['人生', '全面', '深度']
  },
  {"id":"gain-loss","name":"得与失","description":"权衡一件事的代价与收获","cardCount":2,"positions":["我将失去什么","我将得到什么"],"category":["取舍","工作","收入"]},
  {"id":"holy-triangle","name":"圣三角牌阵","description":"从现状回看原因，再看发展趋势","cardCount":3,"positions":["当前状态","过去的影响","未来趋势"],"category":["感情","学业","事件发展"]},
  {"id":"self-exploration","name":"自我探索","description":"看见外在表现与内在需要之间的联系","cardCount":4,"positions":["我当前的状态","我的外在表现","我内在的渴望","我的潜意识"],"category":["自我认识","情绪","成长"]},
  {"id":"body-mind-spirit","name":"身心灵牌阵","description":"观察身体感受、心理状态与内在方向","cardCount":3,"positions":["身体与生活习惯","情绪与心理状态","内在方向"],"category":["自我关照","生活平衡"]},
  {"id":"jung-archetypes","name":"荣格原型","description":"借原型意象探索自我，不作为心理诊断","cardCount":5,"positions":["自我与人格面具","阴影自我","内在关系意象","智慧与经验","自性与整合"],"category":["自我探索","成长"]},
  {"id":"inner-talents","name":"内在天赋","description":"探索优势、使用方式和发展方向","cardCount":6,"positions":["我的潜在天赋","如何使用天赋","什么环境激发天赋","如何发挥长处","如何应对短板","发展的综合建议"],"category":["学业","事业","成长"]},
  {"id":"core-insight","name":"直指核心牌阵","description":"拆解卡点，寻找可以采取的行动","cardCount":4,"positions":["问题核心","主要障碍","应对策略","优势资源"],"category":["寻找卡点","学业","工作"]},
  {"id":"diamond","name":"钻石牌阵","description":"从两个侧面看清现状与发展","cardCount":4,"positions":["过去","现在的主要状态","现在的另一影响","未来趋势"],"category":["细看现状","感情","发展"]},
  {"id":"two-choice","name":"二选一牌阵","description":"把两个方案放在同一问题下比较","cardCount":5,"positions":["目前问题","选择A的现状","选择B的现状","选择A的发展趋势","选择B的发展趋势"],"category":["工作","方案","去留"]},
  {"id":"love-tree","name":"爱情之树牌阵","description":"梳理关系停滞的原因与可能行动","cardCount":5,"positions":["自己的状态","过去与原因","现在与解决方式","未来与可能性","外在环境与潜意识"],"category":["感情","关系停滞","关系发展"]},
  {"id":"hexagram","name":"六芒星牌阵","description":"结合时间线、外部影响与心态综合观察","cardCount":7,"positions":["过去","现在","未来","解决方法","外部因素","自己的心态","结果趋势"],"category":["关系","事业","多因素问题"]},
  {"id":"venus","name":"维纳斯牌阵","description":"从双方视角观察关系；他人内心仍需沟通核实","cardCount":8,"positions":["自己的想法","对方的想法（待核实）","关系对自己的影响","关系对对方的影响","可能遇到的障碍","目前趋势下的结果","未来自己的心情","未来对方的心情（待核实）"],"category":["恋爱","婚姻","复杂关系"]}
];

// 创建状态管理器
export const useTarotStore = create<TarotStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      question: '',
      referenceReadingId: null,
      setReferenceReadingId: (id) => set(state => ({ referenceReadingId: state.readings.some(r => r.id === id && readingOwner(r) === state.activeUserId) ? id : null })),
      users: [{ id: DEFAULT_USER_ID, name: '默认用户（旧历史）' }],
      activeUserId: DEFAULT_USER_ID,
      topic: 'auto',
      setTopic: (topic) => set({ topic }),
      createUser: (name) => {
        const clean = name.trim().slice(0, 40);
        if (!clean) return null;
        const existing = get().users.find(user => user.name === clean);
        if (existing) return existing.id;
        const id = crypto.randomUUID();
        set(state => ({ users: [...state.users, { id, name: clean }] }));
        return id;
      },
      switchUser: (id) => {
        if (id === get().activeUserId || !get().users.some(user => user.id === id)) return;
        get().resetSession();
        set({ activeUserId: id, apiKey: '', encryptedApiKey: null });
      },
      profile: { nickname: '', birthday: '', background: '' },
      setProfile: (profile) => set({ profile }),
      model: DEFAULT_GPT_MODEL,
      setModel: (model) => set(state => ({ model, ...(modelProvider(model) !== modelProvider(state.model) ? { apiKey: '', encryptedApiKey: null } : {}) })),
      apiKey: '',
      encryptedApiKey: null,
      recommendedSpread: null,
      selectedSlots: [],
      deckOrder: [],
      drawnCards: [],
      cardReversals: [],
      readings: [],
      isLoading: false,
      remainingCalls: null,
      usingSystemKey: false,
      trialUsed: false,

      // 状态更新函数
      setQuestion: (question) => set({ question }),
      
      setApiKey: async (apiKey, remember = true) => {
        const owner = get().activeUserId;
        set({ apiKey, encryptedApiKey: null });
        if (remember && apiKey) {
          try {
            const key = await ensureSessionKey();
            const encrypted = await encryptApiKey(apiKey, key);
            if (get().activeUserId === owner && get().apiKey === apiKey) set({ encryptedApiKey: encrypted });
          } catch (error) {
            console.error('API Key 加密保存失败:', error);
            if (get().activeUserId === owner && get().apiKey === apiKey) set({ encryptedApiKey: null });
          }
        } else {
          set({ encryptedApiKey: null });
        }
      },

      initApiKeyFromStorage: async () => {
        const owner = get().activeUserId;
        const sessionKeyB64 = sessionStorage.getItem(SESSION_KEY_NAME);
        const stored = get().encryptedApiKey;
        if (!sessionKeyB64 || !stored) {
          // 会话密钥缺失（如关闭浏览器后）→ 密文不可解，清空并提示重输
          set({ encryptedApiKey: null, apiKey: '' });
          return false;
        }
        try {
          const key = await importSessionKey(sessionKeyB64);
          const plain = await decryptApiKey(stored, key);
          if (get().activeUserId !== owner || get().encryptedApiKey !== stored) return false;
          set({ apiKey: plain });
          return true;
        } catch (error) {
          console.error('API Key 解密失败，已清除存储:', error);
          if (get().activeUserId === owner && get().encryptedApiKey === stored) set({ encryptedApiKey: null, apiKey: '' });
          return false;
        }
      },

      clearStoredKey: async () => {
        sessionStorage.removeItem(SESSION_KEY_NAME);
        set({ encryptedApiKey: null });
      },
      
      setRecommendedSpread: (spread) => set({ recommendedSpread: spread }),
      setSelectedSlots: (slots) => set({ selectedSlots: slots }),

      setDeckOrder: (order) => set({ deckOrder: order }),
      
      setDrawnCards: (cards) => set({ drawnCards: cards }),
      
      setCardReversals: (reversals) => set({ cardReversals: reversals }),
      
      addReading: (reading) => set((state) => {
        const owner = reading.userId ?? state.activeUserId;
        if (!state.users.some(user => user.id === owner)) return state;
        let ownCount = 0;
        return { readings: [{ ...reading, userId: owner, topic: reading.topic ?? state.topic }, ...state.readings].filter(record => readingOwner(record) !== owner || ++ownCount <= 50) };
      }),
      
      removeReading: (id) => set((state) => ({
        readings: state.readings.filter(r => r.id !== id || readingOwner(r) !== state.activeUserId)
      })),
      setReadingFollowups: (id, followups) => set((state) => ({
        readings: state.readings.map(r => r.id === id && readingOwner(r) === state.activeUserId ? { ...r, followups } : r)
      })),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setApiUsage: (remainingCalls, usingSystemKey, trialUsed) => set({
        remainingCalls,
        usingSystemKey,
        trialUsed: trialUsed ?? false,
      }),

      setTrialStatus: (trialUsed) => set({ trialUsed }),
      
      resetSession: () => set({
        referenceReadingId: null,
        question: '',
        topic: 'auto',
        profile: { nickname: '', birthday: '', background: '' },
        recommendedSpread: null,
        selectedSlots: [],
        // 新的一局 → 重新洗牌。整局只洗这一次(规格 G17):
        // 局中重洗会让"关掉浮层再点同一格"得到不同的牌
        deckOrder: createDeckOrder(tarotCards.length),
        drawnCards: [],
        cardReversals: [],
        isLoading: false
      }),
    }),
    {
      name: 'tarot-store',
      // 持久化历史记录与加密后的 API Key（明文 apiKey 不落盘）
      partialize: (state) => ({
        users: state.users.filter(user => !user.id.startsWith('account-')),
        activeUserId: state.activeUserId.startsWith('account-') ? DEFAULT_USER_ID : state.activeUserId,
        model: state.model,
        readings: state.readings.filter(record => !readingOwner(record).startsWith('account-')),
        encryptedApiKey: state.encryptedApiKey,
        // 免费试用状态持久化为缓存：刷新瞬间先显示上次状态，页面加载时再由服务端查询校正
        trialUsed: state.trialUsed,
      }),
      // 丢弃旧版本持久化中的明文 apiKey 字段，防止明文进入内存态
      merge: (persisted, current) => {
        const persistedState = (persisted ?? {}) as Partial<TarotStore>;
        const { apiKey: _legacyPlainApiKey, ...rest } = persistedState;
        void _legacyPlainApiKey;
        const users = Array.isArray(rest.users) ? rest.users.filter(user => typeof user.id === 'string' && typeof user.name === 'string') : current.users;
        if (!users.some(user => user.id === DEFAULT_USER_ID)) users.unshift({ id: DEFAULT_USER_ID, name: '默认用户（旧历史）' });
        const activeUserId = users.some(user => user.id === rest.activeUserId) ? rest.activeUserId! : DEFAULT_USER_ID;
        const validModel = isGPTModel(rest.model);
        return { ...current, ...rest, users, activeUserId, topic: isTopicChoice(rest.topic) ? rest.topic : 'auto', model: validModel ? rest.model! : DEFAULT_GPT_MODEL, encryptedApiKey: rest.encryptedApiKey ?? null };
      },
    }
  )
);

// 牌阵推荐逻辑（评分制，规格 G1：委托 lib/spread.ts 纯函数）
export function recommendSpread(question: string): TarotSpread {
  const spreadId = recommendSpreadId(question);
  return tarotSpreads.find((s) => s.id === spreadId) ?? tarotSpreads[0];
}
