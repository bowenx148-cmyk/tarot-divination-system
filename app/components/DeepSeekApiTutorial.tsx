export function DeepSeekApiTutorial() {
  return <section aria-label="DeepSeek API Key 配置教程" className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-gray-700">
    <h4 className="mb-2 font-semibold text-purple-900">如何配置 DeepSeek API Key</h4>
    <ol className="list-decimal space-y-2 pl-5">
      <li>登录 <a href="https://platform.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">DeepSeek 开放平台</a>，进入 API keys 页面创建密钥，复制完整内容。</li>
      <li>在平台检查 API 可用余额，按需要充值；网页版聊天和 API 调用是不同的入口，API 按使用量计费。</li>
      <li>回到本程序，在「AI 服务与模型」选择 DeepSeek · deepseek-flash 或 DeepSeek · deepseek-v4-pro，再把密钥粘贴到「DeepSeek API Key」并保存。</li>
      <li>选好牌后开始 AI 解读。保存密钥不会自动发起收费调用；开始解读会使用你的 API 余额。</li>
    </ol>
    <p className="mt-3">密钥无效：检查是否完整复制、是否已撤销，以及是否选对服务。余额不足：到开放平台检查余额。网络失败：稍后重试。不要填写 ngrok Authtoken，也不要分享密钥或截图。</p>
    <p className="mt-2 text-xs">关闭浏览器后，个人密钥可能需要重新填写。<a href="https://api-docs.deepseek.com/" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">官方调用教程</a> · <a href="https://api-docs.deepseek.com/quick_start/pricing" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">模型与计费说明</a></p>
  </section>;
}
