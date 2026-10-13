export const GPT_MODELS = ["gpt-5.4-mini", "gpt-5.4", "deepseek-flash", "deepseek-v4-pro"] as const;
export type GPTModel = (typeof GPT_MODELS)[number];
export const DEFAULT_GPT_MODEL: GPTModel = "gpt-5.4-mini";
export const modelProvider = (model: GPTModel): 'openai' | 'deepseek' => model.startsWith('deepseek-') ? 'deepseek' : 'openai';

export function isGPTModel(value: unknown): value is GPTModel {
  return GPT_MODELS.some((model) => model === value);
}
