import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTarotStore } from "@/lib/store";
import { tarotCards } from "@/lib/tarot-data";
import {
  encryptApiKey,
  generateSessionKey,
  importSessionKey,
} from "@/lib/apiKeyCrypto";

const SESSION_KEY_NAME = "tarot-session-key";

describe("R1-B/C store API Key 加密存储", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useTarotStore.setState({ apiKey: "", encryptedApiKey: null });
  });

  it("setApiKey 后 localStorage 无明文、含 encryptedApiKey", async () => {
    await useTarotStore.getState().setApiKey("sk-secret");
    const raw = localStorage.getItem("tarot-store");
    expect(raw).not.toContain("sk-secret");
    expect(raw).toContain("encryptedApiKey");
  });

  it("会话恢复：sessionStorage 密钥 + 密文 → initApiKeyFromStorage true", async () => {
    const b64 = await generateSessionKey();
    const key = await importSessionKey(b64);
    const encrypted = await encryptApiKey("sk-persist", key);
    sessionStorage.setItem(SESSION_KEY_NAME, b64);
    useTarotStore.setState({ encryptedApiKey: encrypted });

    const ok = await useTarotStore.getState().initApiKeyFromStorage();
    expect(ok).toBe(true);
    expect(useTarotStore.getState().apiKey).toBe("sk-persist");
  });

  it("会话密钥缺失 → false 且清空密文", async () => {
    useTarotStore.setState({ encryptedApiKey: "some-ciphertext" });
    const ok = await useTarotStore.getState().initApiKeyFromStorage();
    expect(ok).toBe(false);
    expect(useTarotStore.getState().encryptedApiKey).toBeNull();
  });

  it("关闭记住开关 → encryptedApiKey 为 null", async () => {
    await useTarotStore.getState().setApiKey("sk-x", false);
    expect(useTarotStore.getState().encryptedApiKey).toBeNull();
  });

  // O6：生产 HTTP 下 crypto.subtle 不存在。组件此时传 remember=false，
  // 这里钉住"真的不会走到加密"——否则控制台会报 generateKey 读取失败。
  it("O6 无 crypto.subtle + remember=false：完全不触碰加密，且不产生 console.error", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window.crypto, "subtle", {
      value: undefined,
      configurable: true,
    });
    try {
      await useTarotStore.getState().setApiKey("sk-x", false);

      expect(useTarotStore.getState().encryptedApiKey).toBeNull();
      // 无异常、无报错 = 从未尝试过 crypto.subtle.generateKey
      expect(errSpy).not.toHaveBeenCalled();
      // 会话密钥也不该被写入（写入即意味着 generateSessionKey 跑过了）
      expect(sessionStorage.getItem(SESSION_KEY_NAME)).toBeNull();
    } finally {
      delete (window.crypto as { subtle?: unknown }).subtle;
      errSpy.mockRestore();
    }
  });

  it("旧版明文 apiKey 字段被 merge 丢弃（不进入内存态）", () => {
    // 模拟旧版本持久化数据：{ state: { readings: [], apiKey: "sk-legacy" } }
    localStorage.setItem(
      "tarot-store",
      JSON.stringify({ state: { readings: [], apiKey: "sk-legacy" }, version: 0 }),
    );
    // 触发重新 hydrate
    useTarotStore.persist.rehydrate();
    expect(useTarotStore.getState().apiKey).toBe("");
  });
});

describe("Y1 store readings 历史记录", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useTarotStore.setState({ readings: [] });
  });

  function makeReading(id: string) {
    return {
      id,
      question: `问题${id}`,
      spread: {
        id: "single-card",
        name: "单张牌指引",
        description: "d",
        cardCount: 1,
        positions: ["核心指引"],
        category: [],
      },
      cards: [],
      cardReversals: [],
      interpretation: "解析内容",
      advice: "建议",
      timestamp: new Date(),
    };
  }

  it("addReading 头部插入（最新在前）", () => {
    useTarotStore.getState().addReading(makeReading("r1"));
    useTarotStore.getState().addReading(makeReading("r2"));
    const readings = useTarotStore.getState().readings;
    expect(readings[0].id).toBe("r2");
    expect(readings[1].id).toBe("r1");
  });

  it("上限 50 条：添加 55 条后保留最新 50 条", () => {
    for (let i = 0; i < 55; i++) {
      useTarotStore.getState().addReading(makeReading(`r${i}`));
    }
    const readings = useTarotStore.getState().readings;
    expect(readings.length).toBe(50);
    // 最新的 50 条保留（r54 最新在头部，r4 最旧）
    expect(readings[0].id).toBe("r54");
    expect(readings[49].id).toBe("r5");
  });

  it("removeReading 按 id 删除", () => {
    useTarotStore.getState().addReading(makeReading("r1"));
    useTarotStore.getState().addReading(makeReading("r2"));
    useTarotStore.getState().removeReading("r1");
    const readings = useTarotStore.getState().readings;
    expect(readings.length).toBe(1);
    expect(readings[0].id).toBe("r2");
  });
});

// 规格 G17（bug 修复）：一局一副牌序，整局固定
describe("G17 store deckOrder 牌序", () => {
  beforeEach(() => {
    useTarotStore.setState({
      deckOrder: [],
      question: "",
      recommendedSpread: null,
      selectedSlots: [],
      drawnCards: [],
      cardReversals: [],
    });
  });

  it("resetSession 生成一副完整的牌序（0..77 的排列）", () => {
    useTarotStore.getState().resetSession();
    const order = useTarotStore.getState().deckOrder;
    expect(order).toHaveLength(tarotCards.length);
    expect(new Set(order).size).toBe(tarotCards.length);
  });

  it("牌序确实存在，但不进入持久化（partialize 只含 readings / encryptedApiKey / trialUsed）", () => {
    useTarotStore.getState().resetSession();
    // 先证明状态真的生成了——否则下面的「未持久化」是空过
    expect(useTarotStore.getState().deckOrder.length).toBe(tarotCards.length);

    const persisted = JSON.parse(localStorage.getItem("tarot-store") ?? "{}");
    expect(persisted.state?.deckOrder).toBeUndefined();
  });
});

describe("GPT 模型设置", () => {
  it("模型持久化并在清空本局后保留", () => {
    useTarotStore.getState().setModel("gpt-5.4");
    useTarotStore.getState().resetSession();
    expect(useTarotStore.getState().model).toBe("gpt-5.4");
    expect(JSON.parse(localStorage.getItem("tarot-store")!).state.model).toBe("gpt-5.4");
    useTarotStore.getState().setModel("gpt-5.4-mini");
  });
});
