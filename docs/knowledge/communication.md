# 表达风格依据（2026-10-09）

本次使用humanizer技能，采用删机械开场、空泛安慰、强制排比与重复结尾等编辑规则。将规则用于初次解读和追问的表达自检，保留牌位、事实和不确定性，不通过正则删减已生成回答，也不额外消耗第二次模型调用。

公开资料：
- [非暴力沟通中心：Purpose of NVC](https://www.cnvc.org/about/purpose-of-nvc)：理解表达的感受和需要，避免评判与强迫，尊重对方选择。
- [Miller与Rollnick：Motivational Interviewing，第4版，出版社书籍介绍](https://www.guilford.com/books/Motivational-Interviewing/Miller-Rollnick/9781462552795)：以合作、倾听与个人自主选择作为沟通背景。本次仅查阅公开介绍，未下载或声称阅读完整版权书籍。

用户举例「说话心理学」未限定作者或版本，本次选用可核实的一手沟通资料。书籍和资料不是塔罗预测准确性的证明，也不把应用包装为心理治疗。无需用户补充大量资料；直接基于问题、牌位、正逆位与自愿提供的背景解读。

测试数据仅是合成场景，用于核验牌位、上下文和接口行为，不是真实咨询案例，也不能证明真实回答的人性化质量；尚未进行真实模型输出人工验收。

接口核对：[OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)、[DeepSeek首次调用](https://api-docs.deepseek.com/)。保留现有GPT模型，DeepSeek使用官方当前示例模型deepseek-flash及deepseek-v4-pro。固定官方域名，按模型分别传递参数与Key。

