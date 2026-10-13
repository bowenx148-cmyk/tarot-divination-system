# 归档：2026-10-08

本文是 OpenAI 接入完成记录，不描述后续部署现状。

# OpenAI API 接入

用户已于 2026-10-08 确认：使用 OpenAI Key 和可选 GPT 模型，保留抽牌与流式解读。

## 方案
默认 gpt-5.4-mini，可选 gpt-5.4；Key 经已有加密逻辑保存，模型偏好单独持久化。
服务端固定调用 OpenAI 官方 chat/completions，不接受浏览器传入任意接口地址。
保留 /api/deepseek-stream 和模块文件名，避免无关重命名；调用供应商变为 OpenAI。
系统 Key 改为 OPENAI_API_KEY。GPT-5 使用 max_completion_tokens 和 reasoning_effort=none，不传 temperature。

## 验收与测试
- 设置界面保存 OpenAI Key 和模型，结果请求携带模型；抽牌/历史不变。
- 上游请求使用 OpenAI URL、指定模型和正确参数；模型白名单拒绝异常输入。
- 缺少 Key、401、429、403/模型错误显示可操作提示；日志不打印上游原始响应和 Key。
- 类型检查、相关测试、全量回归、页面与本地接口检查；没有真实 Key 时不声称真实调用成功。
- 同步 README、DEPLOYMENT、环境示例和本地部署说明，完成后归档与 SPEC 对账。

## 完成记录

OpenAI 调用、模型设置、错误提示和文档已完成。
类型检查和 lint 通过；全量测试 304 通过、1 失败，失败为修改前已有的 Windows 路径分隔符断言。
本地首页 HTTP 200；无 Key 请求返回 400 和 OpenAI 设置提示，无效模型返回 400。
浏览器交互检查未获权限，未进行界面操作；未提供真实 API Key，未验证真实付费调用。
