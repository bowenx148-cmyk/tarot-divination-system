# 配置与部署

本文负责可重复的启动、变量和部署边界；实际实例现状见OPERATIONS.md。旧腾讯云迁移记录属于archive历史，不代表本次已部署云服务器。

## 最小本地配置

复制根目录.env.example为.env.local，npm ci，然后npm run dev。Redis、系统Key和开发者配置均可留空；界面/抽牌可用，AI解析须另填个人Key或配置系统Key。环境变量专供服务端，不要改成NEXT_PUBLIC_。

| 变量 | 用途与限制 |
|---|---|
| OPENAI_API_KEY / DEEPSEEK_API_KEY | 可选系统Key；也可登录本机后台配置。个人Key请求不使用系统试用 |
| DEVELOPER_USERNAME | 可选部署者指定的后台用户名，没有固定默认用户名 |
| DEVELOPER_PASSWORD | 首次创建auth.json使用，12至256字符；已有密码哈希不被覆盖 |
| TAROT_DATA_DIR | 私有持久化目录，未指定使用项目根目录.local；不是公共静态目录 |
| ADMIN_TOKEN | 使用旧管理统计/配额接口时设置独立随机值；与开发者cookie不同 |
| QUOTA_DAILY_LIMIT | 每日系统调用硬上限，默认50；持久账本按上海日期计数 |
| REDIS_HOST / REDIS_PORT / REDIS_PASSWORD | 可选原缓存/计数/限流/统计；host和password都存在才启用，端口默认6379 |
| TAROT_DIST_DIR | 可选Next构建目录，默认.next；构建和启动须一致 |

首次配置后台后，保存的密码哈希、加密秘密与会话在auth.json。后来修改DEVELOPER_PASSWORD不会重置既有密码。已有实例迁移时私有配置用户名并保留auth.json/settings.json配对，不删除auth.json试图改密码，否则旧加密Key可能无法恢复。此版本不提供密码重置功能。

## 生产运行

```bash
npm ci
npm run type-check
npm run test:run -- --maxWorkers=2
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

使用持久可写的数据目录并私有备份账号、知识、配置和账本。不使用短生命周期/多实例环境直接共享这些JSON文件。Redis不会解决user-memory/config的并发写覆盖；多实例需要另行设计数据库和会话存储。

## 本机公网分享

原本机Windows分享使用Next生产3001、白名单代理3002、ngrok。启动脚本需要本机私有.local/ngrok-bin/ngrok.exe和ngrok-token.txt，不能从公开仓库获得。首次部署者需自行安装/configure ngrok；未配置时先使用本地启动，不应复制他人的token。

生产构建须与TAROT_DIST_DIR=.next-share一致，根目录启动公网分享.cmd/停止公网分享.cmd仅适用于配置完的本机。公网管理隔离由scripts/public-proxy.cjs实现；Next.js本身的登录不等于只允许本机管理。网络、电脑或进程离线时网址失效。不要把生产Key发送给演示用户。

独立服务器部署需HTTPS及等效反向代理白名单，拒绝管理页面/写接口，剥离不必要的管理凭据，保留使用者会话；可用node scripts/test-public-proxy.cjs检验代理逻辑。现有脚本没有跨平台进程托管、崩溃自动重启或云部署承诺。

## 成本与数据

系统Key费用由部署者承担；免费试用每设备/账号一次且有每日硬限额，清除浏览器标识仍可能绕过注册限制。原配额管理开关不绕过新增持久账本硬上限。成功开始生成即可能计费，断线不保证退还；上游失败释放未完成的预占。

trial-ledger.lock异常遗留时，先确认所有相关进程停止，再处理锁文件，不能删除账本重置次数。账号历史包含问题和回答，用户名无密码不适合敏感数据。安全边界和报告渠道见../SECURITY.md。

Redis未配置时原缓存/统计回退内存，但当前trial-ledger.json正常重启仍保留已用试用及每日限额。聚合统计与账号历史不同；不要将匿名统计说明写成服务器不保存任何咨询。

Windows Git Bash的npm路径若使提交钩子报127，可先在PowerShell执行npm.cmd run pre-commit。只有检查确实通过时才考虑该次提交使用git -c core.hooksPath= commit；不应永久关闭钩子或把检查失败当作路径错误。本轮记录见reports/PUBLICATION-READINESS-2026-10-13.md。
