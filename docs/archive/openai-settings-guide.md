# 简化首页与OpenAI设置教程

用户要求删除首页“猜你想问”；当前仅提供OpenAI API Key配置，并在配置旁提供教程。

实现：移除首页示例区及仅供该区使用的事件处理；自由输入、分类、牌阵、须知保留。用户与开发者配置入口只显示OpenAI，后台旧DeepSeek配置不删除。旧浏览器选中DeepSeek时回到默认OpenAI模型，并清空旧个人Key。教程依据官方创建Key与账单说明，覆盖登录创建、API账单独立、粘贴保存和常见报错；无真实API调用。

验收：首页不含猜你想问，仍能自定义问题跳转；用户配置仅两种现有GPT选项，教程入口可展开且官方链接有效；旧DeepSeek选择不带旧Key进入OpenAI。相关组件/首页/存储测试、类型检查、lint，以及本机HTTP页面验证。

原要求已完成验证，后来用户明确恢复DeepSeek用户端及后台配置，参见 archive/deepseek-settings-guide.md 与 archive/developer-deepseek-key.md。因此当前保持OpenAI和DeepSeek，不再执行上文仅OpenAI的迁移限制。首页猜你想问仍已移除，教程随服务切换；全量394项测试通过。
