"use client";

import { useEffect, useState } from "react";
import { Settings, Key, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { DEFAULT_GPT_MODEL, GPTModel, GPT_MODELS, modelProvider } from "@/lib/models";
import { OpenAIApiTutorial } from './OpenAIApiTutorial';
import { DeepSeekApiTutorial } from './DeepSeekApiTutorial';

interface ApiKeySettingsProps {
  currentModel?: GPTModel;
  onModelChange?: (model: GPTModel) => void;
  onApiKeyChange: (apiKey: string, remember?: boolean) => void;
  currentApiKey: string;
  trialUsed?: boolean;
  /** 受控打开（首页在试用用完时自动弹出） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** 弹窗顶部提示文案 */
  notice?: string | null;
}

export function ApiKeySettings({
  currentModel = DEFAULT_GPT_MODEL,
  onModelChange,
  onApiKeyChange,
  currentApiKey,
  trialUsed,
  open,
  onOpenChange,
  notice,
}: ApiKeySettingsProps) {
  const [model, setModel] = useState(currentModel);
  const [internalOpen, setInternalOpen] = useState(false);
  const [apiKey, setApiKey] = useState(currentApiKey);
  const providerName = modelProvider(model) === 'openai' ? 'OpenAI' : 'DeepSeek';
  const [showTutorial, setShowTutorial] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(true);

  // 「记住 Key」依赖 crypto.subtle 做 AES-GCM 加密（lib/apiKeyCrypto.ts），而 crypto.subtle
  // 只在安全上下文（HTTPS / localhost）存在。生产是 HTTP 公网直连，它是 undefined，
  // 加密必然抛 `Cannot read properties of undefined (reading 'generateKey')`（决策 D10）。
  // 检测到不可用就隐藏整行——否则用户勾了、刷新后 Key 没了，看起来像 bug。
  //
  // 初值 true 与 SSR 输出一致，避免 hydration 不匹配；弹窗默认关闭，用户看到时已校正完毕。
  const [canRememberKey, setCanRememberKey] = useState(true);
  useEffect(() => {
    setCanRememberKey(typeof window.crypto?.subtle !== "undefined");
  }, []);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = (v: boolean) => {
    if (v) {
      setApiKey(currentApiKey);
      setModel(currentModel);
    }
    if (isControlled) onOpenChange?.(v);
    else setInternalOpen(v);
  };

  const handleSave = () => {
    // 不能记住时显式传 false：跳过注定失败的加密分支（store 里会 catch 并打 console.error）
    onModelChange?.(model);
    onApiKeyChange(apiKey.trim(), canRememberKey && remember);
    setOpen(false);
  };

  const handleClear = () => {
    setApiKey("");
    onApiKeyChange("");
  };

  return (
    <>
      <button type="button" onClick={() => { setShowTutorial(true); setOpen(true); }} className="fixed top-4 right-20 z-50 rounded-full border border-purple-200 bg-white px-4 py-3 text-sm text-purple-700 shadow-lg hover:bg-purple-50">API Key 教程</button>
      {/* 设置按钮 */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-50 p-3 bg-white border border-purple-200 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:bg-purple-50"
        title="API设置"
      >
        <Settings className="w-5 h-5 text-purple-600" />
      </button>

      {/* 设置弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
              onClick={() => setOpen(false)}
            >
              {/* 弹窗内容 */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      API 设置
                    </h3>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* 提示条（如试用用完） */}
                {notice && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 leading-relaxed">
                    {notice}
                  </div>
                )}

                {/* 说明 */}
                <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 mb-2">
                    💡 API密钥说明
                  </h4>
                  <ul className="text-xs text-purple-700 space-y-1">
                    <li>• 管理员配置系统密钥后，可免费试用 1 次（每个设备仅一次）</li>
                    <li>• 按所选服务填写对应的 OpenAI 或 DeepSeek API Key</li>
                    <li>
                      • 获取密钥：访问{" "}
                      <a
                        href={modelProvider(model) === 'openai' ? 'https://platform.openai.com/api-keys' : 'https://platform.deepseek.com/'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {providerName} 开放平台
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="mb-6">
                  <label htmlFor="gpt-model" className="block text-sm font-medium text-gray-700 mb-2">
                    AI 服务与模型
                  </label>
                  <select id="gpt-model" value={model} onChange={(e) => { const next = e.target.value as GPTModel; if (modelProvider(next) !== modelProvider(model)) setApiKey(''); setModel(next); }}
                    className="w-full px-4 py-3 border border-purple-200 rounded-lg">
                    {GPT_MODELS.map((name) => <option key={name} value={name}>{modelProvider(name) === 'openai' ? 'OpenAI' : 'DeepSeek'} · {name}</option>)}
                  </select>
                </div>

                {/* API Key 输入 */}
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="openai-api-key" className="text-sm font-medium text-gray-700">{providerName} API Key</label><button type="button" aria-expanded={showTutorial} onClick={() => setShowTutorial(!showTutorial)} className="text-sm text-purple-700 underline">{showTutorial ? '收起教程' : '配置教程'}</button></div>
                  {showTutorial && <div className="mb-4">{modelProvider(model) === 'openai' ? <OpenAIApiTutorial /> : <DeepSeekApiTutorial />}</div>}
                  <div className="relative">
                    <input
                      id="openai-api-key"
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="sk-..."
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKey ? "隐藏" : "显示"}
                    </button>
                  </div>
                </div>

                {/* 记住 Key（加密保存）——仅在加密可用的安全上下文下渲染（O6） */}
                {canRememberKey && (
                  <div className="mb-6">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        className="mt-1 accent-purple-600"
                      />
                      <span className="text-sm text-gray-700">
                        在本设备记住 Key（加密保存）
                      </span>
                    </label>
                    <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                      加密保存可防止静态窃取（如浏览器扩展扫描、磁盘取证），
                      但无法防恶意脚本/浏览器扩展在会话期间的读取。
                      关闭后 Key 仅保存在当前会话，刷新页面需重新输入。
                    </p>
                  </div>
                )}

                {/* 保存按钮（当前状态上方，全宽） */}
                <button
                  onClick={handleSave}
                  className="w-full mb-4 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  保存
                </button>

                {/* 当前状态 */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>当前状态：</strong>
                      {currentApiKey ? (
                        <span className="text-green-600">使用个人密钥</span>
                      ) : (
                        <span className="text-orange-600">
                          使用系统密钥（免费试用 1 次）
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>免费试用：</strong>
                      {trialUsed ? (
                        <span className="text-orange-600">
                          已用完（请输入个人密钥继续）
                        </span>
                      ) : (
                        <span className="text-green-600">可用 1 次</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 清除按钮（当前状态下方，全宽） */}
                <button
                  onClick={handleClear}
                  className="w-full px-4 py-3 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  清除已保存的api key
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
