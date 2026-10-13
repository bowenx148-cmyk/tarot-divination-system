// OpenAI 服务端调用；保留文件名以兼容现有路由和导入。
import { DEFAULT_GPT_MODEL, GPTModel, modelProvider } from "@/lib/models";
import { TAROT_GUIDANCE } from "@/lib/tarot-context";
import { getDeveloperSettings, getSystemKey } from './developer';

export class NeedApiKeyError extends Error {
  constructor(message = "API密钥未配置，请返回首页，在右上角设置中填写 OpenAI API Key。") {
    super(message);
    this.name = "NeedApiKeyError";
  }
}

export interface ResolvedKey {
  apiKey: string;
  usingSystemKey: boolean;
}

export function resolveApiKey(userApiKey?: string, model: GPTModel = DEFAULT_GPT_MODEL): ResolvedKey {
  const personalKey = userApiKey?.trim();
  if (personalKey) return { apiKey: personalKey, usingSystemKey: false };
  const provider = modelProvider(model);
  const systemKey = getSystemKey(provider) || (provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.DEEPSEEK_API_KEY)?.trim();
  if (!systemKey) throw new NeedApiKeyError(`未配置${provider === 'openai' ? 'OpenAI' : 'DeepSeek'}密钥，请在统一API设置中填写对应的Key。`);
  return { apiKey: systemKey, usingSystemKey: true };
}

export interface ChatCompletionOptions {
  prompt: string;
  apiKey: string;
  stream?: boolean;
  model?: GPTModel;
}

export function chatCompletion(opts: ChatCompletionOptions): Promise<Response> {
  const provider = modelProvider(opts.model ?? DEFAULT_GPT_MODEL);
  return fetch(provider === 'openai' ? "https://api.openai.com/v1/chat/completions" : "https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: opts.model ?? DEFAULT_GPT_MODEL,
      messages: [{ role: "system", content: TAROT_GUIDANCE + '\n附加表达偏好（保持上述事实与边界）：' + getDeveloperSettings().style }, { role: "user", content: opts.prompt }],
      ...(provider === 'openai' ? { reasoning_effort: "none", max_completion_tokens: 2500 } : { max_tokens: 2500, thinking: { type: 'disabled' } }),
      stream: opts.stream ?? false,
    }),
  });
}
