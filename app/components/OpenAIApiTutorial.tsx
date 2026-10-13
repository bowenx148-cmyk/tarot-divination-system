export function OpenAIApiTutorial() {
  return <section aria-label="OpenAI API Key 配置教程" className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-gray-700">
    <h4 className="mb-2 font-semibold text-purple-900">如何配置 OpenAI API Key</h4>
    <ol className="list-decimal space-y-2 pl-5">
      <li>登录 <a href="https://platform.openai.com/" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">OpenAI API 平台</a>，选择自己的项目。</li>
      <li>在 <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">API 账单页面</a>确认可用余额或付款设置。ChatGPT Plus / Pro 订阅与 API 费用分开，订阅额度不能直接用于这里。</li>
      <li>打开 <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">API Keys 页面</a>，点击「Create new secret key」创建密钥并复制完整内容。不要分享密钥或截图。</li>
      <li>回到本程序，粘贴到「OpenAI API Key」，选择 GPT 模型并点击「保存」。开发者则粘贴到系统Key栏并保存全局设置。</li>
    </ol>
    <p className="mt-3">提示密钥无效：检查是否完整复制、是否已撤销。提示余额或额度不足：检查 API 账单和使用限制。连接失败：检查当前网络能否连接 OpenAI API；保存密钥不会自动发起收费测试。</p>
    <p className="mt-2 text-xs">关闭浏览器后，个人Key可能需要重新填写；历史记录仍保存在本机。<a href="https://developers.openai.com/api/docs/quickstart" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">官方入门说明</a> · <a href="https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform" target="_blank" rel="noopener noreferrer" className="text-purple-700 underline">官方账单说明</a></p>
  </section>;
}
