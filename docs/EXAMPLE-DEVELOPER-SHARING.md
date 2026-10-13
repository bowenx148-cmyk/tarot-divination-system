# 本机管理、连续咨询与报数示例

本文负责用户操作示例；部署命令见 [DEPLOYMENT.md](DEPLOYMENT.md)。

本机打开 `/developer`，使用已配置的开发者账号登录，在「系统 API Key」分别配置 OpenAI 和 DeepSeek，保存后退出。使用者无需登录，选择对应模型即可用系统Key（受试用额度限制），也可填写自己的Key。

选择三牌「现状 / 影响因素 / 建议」，输入问题后开始抽牌，切换「报数」，输入 `78,1,23`。第一张取本局牌堆第78张，第二张取第1张，第三张取第23张，每次翻开后确认。数字是洗牌后的位置，不是固定对应某张牌；输入 `1,1,23` 会提示重复，不能开始抽牌。

历史页找到本人记录，点击「继续咨询」，输入追问；保持原问题和原牌组。首页另开问题时，可在参考历史中主动选择本人一条记录，界面显示会带入的内容；取消后不带入该记录。

执行 `node scripts/test-public-proxy.cjs` 的实际关键输出：

```text
Public proxy: management blocked, credentials stripped, public settings and streaming passed
```

2026-10-09实际HTTP验证：公网首页、健康接口、公开配置和牌面图片均200；公网后台页面、旧管理接口及登录POST均403。本机登录、保存同值设置、退出成功；未调用真实付费模型。

## DeepSeek 配置示例

用户打开 API 设置，选择 DeepSeek · deepseek-flash，点击配置教程，填写个人 DeepSeek 密钥并保存，然后使用原牌组生成解读。切换到 OpenAI 后输入框为空，教程变为 OpenAI。

实际组件回归关键输出：Tests 24 passed (24)。该输出验证服务切换、教程链接和独立后端参数，不代表真实 DeepSeek 账户生成成功。

## API 余额不足

DeepSeek 账户余额不足时，解读接口返回 HTTP 402，页面提示 API 余额不足并建议充值后保留原牌组重试。失败不扣一次试用。真实日志确认上游 HTTP 402；路由回归实际输出：Tests 22 passed (22)。

## 后台 DeepSeek 系统密钥

发布版没有默认开发者凭据：新部署先私有配置DEVELOPER_USERNAME/DEVELOPER_PASSWORD（首次至少12字符），再打开本机后台。既有auth.json的密码哈希和加密秘密保留，修改环境密码不会自动重置。独立副本实测未配置后台登录HTTP401、未配置Key解析HTTP400且needApiKey=true；完整检查见reports/PUBLICATION-READINESS-2026-10-13.md。

本机开发者登录后填写 DeepSeek 系统 API Key，点击保存全局设置。输入框清空，状态显示已配置；再次留空保存会保留旧密钥。清除后台 DeepSeek Key 仅清除该服务密钥。用户选择 DeepSeek 并留空个人密钥时使用系统试用，费用由系统账户承担。后台仍仅限本机访问。真实回归输出：Tests 4 passed (4)。

## 用户名注册与咨询记忆

首页或历史页输入用户名，点击注册用户名。以后输入同名点击登录；英文不区分大小写，重复注册被拒绝。不存在的用户名不能直接登录。登录后保存该档案最多50条问题、牌面、解读和追问，退出后不再显示该档案；同一账号另一浏览器也可恢复。游客旧历史不会自动上传。同步失败显示提示与重试保存历史按钮。

没有密码，知道用户名即可登录查看；这是用户明确选择的访问方式，不能视为身份认证或隐私保护。账号记录保存在服务器本机 .local/user-memory.json；不进入 Git 或浏览器持久化。电脑必须在线，域名变化需使用新链接。

## 系统免费试用服务选择

未填个人 Key 时，如果默认 OpenAI 未配置而 DeepSeek 已配置，会使用 DeepSeek flash；个人 Key 请求不改变提供商。公网实际验证关键输出：HTTP 200、usingSystemKey=true、complete=true。该诊断使用系统账户余额，原每设备一次试用和每日限额仍保留。

最终验证关键输出：Tests 387 passed (387)；公网 register / case-insensitive login / history restored / cross-account write rejected / logout / admin isolation passed。两个 Verify 前缀的测试用户名留作空档案，其诊断历史已清空。

## 知识管理与可追踪解读

本机开发者后台的知识库管理支持编辑、启停、删除、JSON导入和复制JSON格式。领域general为通用，cardIds为空为不限牌；orientation取any/upright/reversed，position留空为不限牌位。导入完成还需保存。服务端按结构化问题和牌面检索最多8条自编/摘要资料，并附上对应内置牌义；整体参考内容上限14000字符。初次解读、追问及历史的“查看本次参考依据”显示发送给模型的快照，不能证明模型逐字引用或预测准确。原须知和基本边界仍是系统规则，停用参考条目不移除安全边界。

真实DeepSeek验证输出：HTTP 200，referenceIncluded=true，completed=true，mentionsAgreement=true。暂存工程笔记提到兑现约定，生成内容为：“半年内更像有来有往、可以培养的趋势，但别把一时热情当承诺……接下来一个月观察对方是否按时兑现具体约定，再决定投入程度。”测试笔记已移除，不当作真实咨询案例或风格样本。

## 注册与系统试用限制

浏览器设备标识只能注册一个用户名，旧账号首次登录会绑定未登记浏览器。已有账号仍可登录，知道用户名即可查看的限制保持。系统试用按设备和账号共同检查，任一已用则拒绝；个人Key不扣试用。占用试用后其他并发请求被拒绝；上游请求失败释放占用，成功开始生成后记为已用并计入持久化每日硬上限（默认50，QUOTA_DAILY_LIMIT可配置）。原流式中途断开仍可能已计费，不能承诺返还试用。

实际不是硬件认证：清除网站数据、换浏览器或伪造设备标识仍可绕过浏览器注册限制。持久化账本防重启重置，但不应宣传为绝对防刷。

最新验收关键输出：Tests 394 passed (394)。真实公网验证 sameBrowserSecondRegistrationRejected=true、systemTrialGenerated=true、referenceSnapshots=3、historyReferencesRestored=true、sameAccountOtherBrowserTrialRejected=true、publicKnowledgeManagementBlocked=true。重启输出 trialUsed=true、remaining=0，重复试用HTTP429。测试用户UpgradeVerify前缀档案保留为空，诊断历史清空、会话已退出。

## 教学资料与抽牌声音（2026-10-10）

视觉主题现为墨绿、暖金与米白，首页底部保留 indigo-tarot 上游链接，README说明二次开发贡献。截图见 [视觉验收](reports/FOREST-THEME-2026-10-13.md)。浏览器实测关键输出：greenHeading=true、attribution=true、deck=78、flip=true、overflow=false、errors=0（1280px与390px视口）。主题不改变牌序、模型与用户历史。

在本机开发者后台查看知识库，可看到原两条资料与追加的24条教学摘要。选择感情、学业或收入问题并完成抽牌，结果显示本次参考标题，展开后能核对实际发送给模型的资料快照。真实生成原文见 [模型样本](reports/REAL-MODEL-SAMPLES-2026-10-10.md)；它们是开发验证场景，不是真实客户咨询或准确率统计。

抽牌页默认静音；点击音效开关后，可调整音量，再点选牌或提交报数。关闭声音会释放音频上下文，勾选简化动画后省去飞行效果；系统减少动画设置优先。实际Edge验证覆盖78张牌、点选与报数混合完成、静音不创建音频、开关释放资源、偏好恢复、桌面及390px视口无横向溢出。实体手机音色和Safari未验收。

真实回归关键输出：Test Files 61 passed (61)，Tests 399 passed (399)。生产版公网健康检查HTTP200，知识管理HTTP403。正常关机后公网暂停，下次开机见 [启动说明](reports/START-AFTER-SHUTDOWN.md)。
