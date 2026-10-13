# 腾讯云迁移归档（2026-09）

> **归档日期**：2026-09-10　**最后修订**：2026-09-16
>
> ⚠️ **本文是历史记录，不描述当前状态。** 文中所有"保留 / 待核实 / 进行中"等表述均为**当时**的情况，
> 已过期的部分就地标注，**当前状态一律以 [`docs/OPERATIONS.md`](../OPERATIONS.md) 为准**。
>
> 本文件收录腾讯云迁移过程中**已完成**的内容：部署执行记录、代码改动、验证结果、问题排查与运维速查。
>
> **运维现状、疑点与待办** → [OPERATIONS.md](../OPERATIONS.md)。

---

## 1. 部署结果概览（快照）

| 维度 | 实际值 |
|---|---|
| 云平台 | 腾讯云轻量应用服务器（Lighthouse） |
| 实例 ID | `<INSTANCE_ID>` |
| 公网 IP | `<SERVER_IP>` |
| 规格 | 4 核 4G 3M 带宽 / 上海 / 1 年 / 109 元（1.4 折） |
| 系统镜像 | Ubuntu 22.04 LTS |
| 访问方式 | 公网 IP + HTTP（80 端口直连，无 HTTPS） |
| 代码目录 | `/root/indigo-tarot` |
| 运行环境 | Node 20.19.0（`/opt/node`）+ Redis 6.0.16 + PM2 7.0.4 |
| 状态存储 | 服务器自建 Redis（`127.0.0.1:6379`，`requirepass` + AOF 持久化） |
| 已验证 | 抽牌流程 + AI 流式解析正常（用户实测通过） |

> 环境变量（`DEEPSEEK_API_KEY` / `ADMIN_TOKEN` / `REDIS_PASSWORD` 等）实际值见服务器 `/root/indigo-tarot/.env.local`，本文档不落明文密钥。

---

## 2. 已确认决策（2026-09-09）

| 事项 | 结论 |
|---|---|
| 部署方案 | 腾讯云轻量应用服务器（Lighthouse） |
| 云账号 | 已有腾讯云账号（已实名） |
| 状态存储 | 服务器自建 Redis（持久化，重启不清零） |
| 访问方式 | 公网 IP + HTTP 直连（接受无 HTTPS），免 ICP 备案 |
| 使用对象 | HR / 面试官试用，需防滥用（保留免费试用/限流/配额策略） |
| 代码上传 | 提交并 push 到 GitHub，服务器拉取 |
| 每日配额 | 保持 50 不变（`QUOTA_DAILY_LIMIT=50`）；口径为**每天** 50 次（非每月），2026-09-10 已再次确认 |

**迁移背景**：项目原部署在 Vercel（海外），中国大陆访问需要 VPN。目标是把 indigo-tarot 迁到中国大陆可访问的云平台，实现「无需 VPN 即可打开试用」，供 HR / 面试官打开试用，同时防止系统 Key 被滥用。

---

## 3. 迁移时现状梳理（代码事实）

| 维度 | 现状 | 迁移影响 |
|---|---|---|
| 框架 | Next.js 16 (App Router, React 19) + TypeScript | 需 Node.js 运行环境 |
| 渲染 | SSR + 流式 SSE（`/api/deepseek-stream`） | 传统服务器天然支持，无缓冲问题 |
| AI 服务 | DeepSeek API（`https://api.deepseek.com/v1`） | 国内直连，无需 VPN，无影响 |
| 状态存储 | 原 Upstash Redis REST → 改为服务器自建 Redis | ioredis 连接本机 Redis |
| 静态资源 | `public/tarot-images`（78 张 JPG，本地打包） | 无外部依赖 |
| 环境变量 | 全部服务端专用（无 `NEXT_PUBLIC_` 前缀） | 写入服务器 `.env.local` 即可 |
| CSP | 生产环境启用（`next.config.ts`） | 无需改动 |

**关键代码位置**

- 服务端共享模块：[lib/server/deepseek.ts](../../lib/server/deepseek.ts)、[lib/server/upstash.ts](../../lib/server/upstash.ts)、[lib/server/trial.ts](../../lib/server/trial.ts)、[lib/server/rate-limit.ts](../../lib/server/rate-limit.ts)、[lib/server/quota.ts](../../lib/server/quota.ts)
- 流式 SSE 路由：[app/api/deepseek-stream/route.ts](../../app/api/deepseek-stream/route.ts)
- 设备标识：[lib/deviceId.ts](../../lib/deviceId.ts)

---

## 4. 部署步骤（实际执行记录）

> 以下为真实执行的步骤，与早期草稿（2 核 2G / 3000 端口 / `git clone`）有差异，以本节为准。

### 4.1 购买服务器

- 腾讯云轻量应用服务器（Lighthouse），实例 `<INSTANCE_ID>`。
- 规格：4 核 4G 3M / 上海 / 1 年 / 109 元（1.4 折促销）。
- 系统镜像：Ubuntu 22.04 LTS（购买后可从控制台重装系统）。

### 4.2 上传代码

- 本地改动 push 到 GitHub `feat/tencent-migration` 分支。
- 服务器直接 `git clone` GitHub 超时，改用 `ghfast.top` 镜像下载 tar.gz 并解压至 `/root/indigo-tarot`：

```bash
curl -L -o /tmp/indigo-tarot.tar.gz \
  https://ghfast.top/https://github.com/HammerRoot/indigo-tarot/archive/refs/heads/feat/tencent-migration.tar.gz
tar -xzf /tmp/indigo-tarot.tar.gz --strip-components=1 -C /root/indigo-tarot
```

### 4.3 安装 Node 20 + Redis + PM2

```bash
# Node 20.19.0（npmmirror 二进制包，安装到 /opt/node）
# Redis 6.0.16（apt 源）
sudo apt-get install -y redis-server
# PM2 7.0.4，软链到 /usr/local/bin/pm2（否则 PATH 找不到）
```

### 4.4 配置 Redis（密码 + AOF 持久化）

```bash
# requirepass 设置强密码；appendonly yes；只监听 127.0.0.1
sudo systemctl restart redis-server
sudo systemctl enable redis-server
redis-cli -a <REDIS_PASSWORD> --no-auth-warning ping   # 返回 PONG
```

### 4.5 配置环境变量

服务器 `/root/indigo-tarot/.env.local`（实际值见服务器，不落明文）：

```bash
DEEPSEEK_API_KEY=sk-xxx
QUOTA_DAILY_LIMIT=50
ADMIN_TOKEN=xxx
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=xxx
```

### 4.6 安装依赖并构建

```bash
cd /root/indigo-tarot
npm config set registry https://registry.npmmirror.com
npm ci
npm run build
```

### 4.7 启动（80 端口）+ 开机自启

```bash
pm2 start npm --name indigo-tarot -- start -- -p 80
pm2 save
pm2 startup        # 生成并启用 systemd 服务 pm2-root，开机自动 resurrect
```

### 4.8 开放防火墙

- 轻量服务器控制台 → 防火墙 → 放行 TCP 80。
- 访问地址：`http://<SERVER_IP>`。

---

## 5. 状态存储（服务器自建 Redis）

- `trial` / `rate-limit` / `quota` 数据存到本机 Redis，开启 AOF 后**持久化、重启/冷启动不清零**，防滥用策略可靠。
- 只监听 `127.0.0.1`，不暴露公网端口。
- 与 Upstash 语义等价：`SET/GET/EXISTS/INCR/EXPIRE` 全部由 Redis 原生支持。

### 5.1 键结构（实际存储）

| 键 | 类型 | TTL | 含义 |
|---|---|---|---|
| `quota:enabled` | String | 永久 | 每日配额开关，`1` 开 / `0` 关 |
| `quota:count:YYYY-MM-DD` | String | 当天结束 | 当天系统 Key 调用次数（Asia/Shanghai 自然日） |
| `trial:{deviceId}` | String | 90 天 | 该设备已用过免费试用的标记 |
| `rl:system_{IP}` | String | 3 小时 | 该 IP 在 3 小时窗口内的系统 Key 调用次数 |

---

## 6. 已完成代码改动

### 6.1 存储层迁移到 ioredis（commit `01db5a6`）

改动集中在 [lib/server/upstash.ts](../../lib/server/upstash.ts)：

1. `package.json` 增加依赖 `ioredis`。
2. `redisCommand` 实现从「Upstash REST fetch」换成「ioredis 执行命令」，返回结构 `RedisCommandResult[]` 不变。
3. 环境变量从 `UPSTASH_*` / `KV_*` 换成 `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`。
4. 其余调用方（`trial.ts` / `rate-limit.ts` / `quota.ts`）接口与语义不变。

### 6.2 deviceId 兼容 HTTP 部署（commit `c09d5c1`）

- **问题**：`crypto.randomUUID()` 仅在 HTTPS / localhost 安全上下文可用，公网 IP 直连（HTTP）下为 `undefined`，导致设备标识生成失败 → AI 解析报错 `TypeError: crypto.randomUUID is not a function`。
- **修复**：[lib/deviceId.ts](../../lib/deviceId.ts) 改用 `crypto.getRandomValues()`（HTTP 下同样可用）手写 UUID v4。
- **验证**：`type-check` 通过，测试全绿。

> 连带说明：`crypto.subtle`（API Key 加密，见 `lib/apiKeyCrypto.ts`）同样只在安全上下文可用。HTTP 下 `crypto.subtle` 不可用，`setApiKey` 已通过 try/catch 降级为「不持久化 API Key」（内存中仍可用，刷新后需重填）。如需完整「记住 Key」功能需上 HTTPS（见 [OPERATIONS.md](../OPERATIONS.md) 已知限制）。

---

## 7. 防滥用策略（已落地）

- **免费试用「每设备 1 次」**：保留；面试官想多试可填自己的 Key（填个人 Key 不经过限制）。
- **IP 限流「3 小时 5 次」**：保留作为辅助防线；仅对「使用系统 Key」生效。
- **每日配额**：保持 50（`QUOTA_DAILY_LIMIT`）。
- **成本兜底**：系统 Key 用 DeepSeek 固定充值余额，余额耗尽自动 401，成本硬封顶。

---

## 8. 上线验证记录

- [x] 公网 IP 可直接打开首页（关闭 VPN）
- [x] 抽牌流程（选牌 → 翻牌 → 结果页）正常
- [x] AI 深度解析流式返回成功（出现「💡 核心建议」与「🔮 深度解析」）
- [x] 历史记录正常保存/读取
- [x] 重启服务器后，免费试用/每日配额计数不重置（Redis AOF 持久化生效）
      —— **2026-09-16 实测通过**：重启前 `quota:count` = 4、`trial:*` = 10 个键，
      控制台重启服务器后原样保留（见 [OPERATIONS.md](../OPERATIONS.md) 台账 N4）

---

## 9. 成本

| 项目 | 实际 |
|---|---|
| 轻量应用服务器（4 核 4G 3M / 上海 / 1 年） | 109 元（1.4 折） |
| 自建 Redis | 0 元 |
| DeepSeek | 沿用固定充值余额，无新增 |

> 服务器约使用 2 个月（简历用途），不开启自动续费。

---

## 10. 问题与解决记录

| # | 问题 | 根因 | 解决 |
|---|---|---|---|
| 1 | 本地 SSH 连接服务器失败（`kex_exchange_identification: Connection closed`） | 本地 Mac Clash Verge TUN 模式劫持所有 SSH 流量 | 放弃本地 SSH，改用腾讯云网页「自动化助手」（TAT）以 root 身份下发命令 |
| 2 | `pm2` 命令未找到 | Node 装在 `/opt/node`，pm2 在 `/opt/node/bin` | `ln -sf /opt/node/bin/pm2 /usr/local/bin/pm2` |
| 3 | 服务器直接 `git clone` GitHub 超时 | 服务器到 GitHub 网络不通 | 用 `ghfast.top` 镜像下载 tar.gz |
| 4 | 端口 80 被遗留 sshd 占用，访问返回 `SSH-2.0-...` | 之前临时 sshd 监听 80 未清理 | 从 `ss -ltnp` 提取 pid 并 kill，再启动 PM2 |
| 5 | 浏览器端 AI 解析报错 `crypto.randomUUID is not a function` | Web Crypto API 在 HTTP 非安全上下文不可用 | deviceId 改用 `getRandomValues` 手写 UUID（commit `c09d5c1`） |
| 6 | 上线 N3 后 AI 解析 502，一次调用即打挂应用 | 见下方 §10.1 | 见下方 §10.1 |

### 10.1 事故 6 详述（2026-09-16）

**症状**：N3 部署完成后，任何一次 `/api/deepseek-stream` 调用都返回 nginx 502。首页与 `/api/health` 仍正常——因为崩溃只发生在处理具体请求时。

**定位过程**：
- 配额计数从 2 变 3，说明 DeepSeek 调用本身成功 → 崩在「记录统计」那一步之后；
- `pm2 describe` 显示 `restarts = 2`；
- `indigo-tarot-error.log` 尾部为 V8 堆分配失败栈 + `Aborted (core dumped)`。

**根因代码**：

```js
const commands = [["INCR", ...]];
for (const cmd of commands) {
  commands.push(["EXPIRE", ...]);   // 边遍历边追加 → 无限循环
}
```

**为什么测试没拦住**：`stats.test.ts` 只覆盖了内存实现；`quota.test.ts` / `rate-limit.test.ts` 同样**只测内存版**。Redis 分支在整个项目里此前没有任何测试覆盖——这是系统性的测试盲区，不只是这一个 bug。

**回归防护**：新增 `lib/server/__tests__/stats.redis.test.ts`（8 例，mock `redisCommand` 后断言下发的命令数组）。已用「恢复旧代码」的方式验证该测试确实能抓到本 bug（旧代码下直接 OOM 崩溃）。

> **同类型盲区**：`quota.ts` / `rate-limit.ts` / `trial.ts` 当时处于同样的 Redis 分支零覆盖状态
> （这三个模块正跑在生产上，直接管成本熔断与防滥用）。是否补测未在本归档结论内。
>
> **【2026-09-17 补注】该盲区已由台账 N8 补齐**：新增 26 例 Redis 分支测试（quota 11 / rate-limit 7 / trial 8），
> 并做变异验证证明测试确能抓到对应缺陷。详见 [`n8-redis-branch-tests.md`](./n8-redis-branch-tests.md)。

---

## 11. 分支与发布说明

- **迁移分支**：`feat/tencent-migration`，迁移相关 3 个提交并已合并回 `main`：
  - `01db5a6` 存储层迁移到 ioredis
  - `c09d5c1` deviceId 改用 getRandomValues 兼容 HTTP
  - `1cd66fe` 部署文档与 spec 补充
- **发布分支**：`main`（已与迁移分支同步）。
- **已删除分支**（2026-09-16）：`feature/less-modules`——Less/CSS Modules 重构方向，被决策 D4（样式统一到 `globals.css`）与 O2 取代，存在误合并风险，已删除远端分支（最后提交 `3e40e49`，如需回溯可从此 SHA 找回）。
- **服务器代码来源**：部署时取自 `feat/tencent-migration`；两分支合并后代码内容一致，后续更新以 `main` 为准。
- **发布方式**：手工部署（未配置 CI/CD）。更新命令：

```bash
cd /root/indigo-tarot
curl -L -o /tmp/code.tar.gz https://ghfast.top/https://github.com/HammerRoot/indigo-tarot/archive/refs/heads/main.tar.gz
tar -xzf /tmp/code.tar.gz --strip-components=1 -C /root/indigo-tarot
npm ci && npm run build && pm2 restart indigo-tarot
```

---

## 12. Vercel 处理（已关闭自动发布）

> 本节记录 **2026-09-10 当时**的处置情况，属历史记录。
> 该平台现已停用，**当前状态以 [`docs/OPERATIONS.md`](../OPERATIONS.md) 为准**。

- **当时的处置**：Vercel 项目与生产地址 `https://<VERCEL_DOMAIN>/` 未删除，作对照保留。
- **已关闭自动发布**（2026-09-10 完成）：当前仓库**没有** `.github/workflows/` 文件，Vercel 自动部署来自 **Vercel for GitHub 的 Git 集成**（Vercel 控制台侧配置），已在 Vercel 控制台关闭：
  1. 登录 vercel.com → 打开项目 `indigo-tarot`。
  2. **Settings → Git → Connected Git Repository**。
  3. 点击 **Disconnect**（断开 Git 连接）。
  4. 断开后 push 到 GitHub 不再自动触发 Vercel 部署，Vercel 项目与已有部署保留。
     （**已于 2026-09-16 删除**，此处描述的是当时的状态。当前状态见 [`OPERATIONS.md`](../OPERATIONS.md)。）

---

## 13. CI/CD 评估结论（未加）

**结论：暂不加，维持手工部署。** 理由：

1. **使用周期短**：约 2 个月（简历用途），改动频率低，一次性部署已够用，投入产出比低。
2. **网络不稳定**：GitHub Actions runner 在海外，SSH 到国内腾讯云服务器延迟高、易失败（本次部署中服务器直连 GitHub 就超时，反向亦然）。
3. **安全成本**：需要把服务器 SSH 私钥放入 GitHub Secrets，增加密钥泄露面；本机 SSH 已被 Clash TUN 劫持，自动化 SSH 链路本身也不可靠。
4. **手工部署成本低**：更新只需在 OrcaTerm 里执行一条命令（curl 下载 + build + pm2 restart）。

**若将来要加**，推荐方案（供参考，未实施）：

- 用 `appleboy/ssh-action`（GitHub Actions）SSH 到服务器执行 `git pull` + `npm ci` + `npm run build` + `pm2 restart`。
- 前置条件：服务器 22 端口对公网开放、配置 SSH 密钥登录、GitHub Secrets 存 `HOST` / `USERNAME` / `SSH_KEY`。
- 更稳妥的替代：用腾讯云 CODING DevOps / 自建 webhook（国内链路，网络更稳）。

---

## 14. 运维速查：用量与来源查询（已可用）

### 14.1 能查到什么、查不到什么

| 问题 | 能否回答 | 依据 |
|---|---|---|
| 今天总共被请求了多少次 | ✅ 能 | `quota:count:当天日期` |
| 今天还剩多少次 | ✅ 能 | `limit - count` |
| 配额开关当前状态 | ✅ 能 | `quota:enabled` |
| 有多少设备用过免费试用 | ✅ 能（数量） | `trial:*` 键数量 |
| 具体哪些设备用过 | ⚠️ 仅 deviceId | `trial:*` 键名；**不含 IP、不含时间** |
| 哪些 IP 调用过系统 Key | ⚠️ 仅最近 3 小时 | `rl:system_*`；**超过 3 小时自动过期，无历史** |
| 每次调用的时间/来源/问题内容 | ❌ 不能 | 系统未记录调用日志 |

**结论**：当前实现只服务于「防滥用计数」，不服务于「审计与统计」。历史来源明细需要新增代码。

> **【2026-09-17 补注】已由台账 N3 落地并上线**（2026-09-16）：`lib/server/stats.ts` + `GET /api/admin/stats`，
> 仅聚合计数（不记 IP、不记问题内容、不记单次明细）。

### 14.2 查询方法一：管理员 API（查配额）

需管理员令牌（值见服务器 `.env.local` 的 `ADMIN_TOKEN`）：

```bash
# 查询开关与当天计数
curl -s -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost/api/admin/quota

# 返回示例
# {"enabled":true,"count":7,"limit":50}
```

也可通过公网访问：`http://<SERVER_IP>/api/admin/quota`

### 14.3 查询方法二：redis-cli（查来源明细）

在服务器（OrcaTerm，root 身份）执行：

```bash
# 读取密码
source /root/indigo-tarot/.env.local

# 今天用了多少次 + 还剩多少
NOW=$(TZ=Asia/Shanghai date +%F)
USED=$(redis-cli -a "$REDIS_PASSWORD" --no-auth-warning GET "quota:count:$NOW")
echo "今日已用: ${USED:-0} / 50，剩余: $((50 - ${USED:-0}))"

# 配额开关
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning GET quota:enabled

# 用过免费试用的设备列表（deviceId）
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'trial:*'

# 最近 3 小时有调用的 IP
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'rl:system_*'
```

---

## 15. 已澄清疑点：IP 限流地址来源

代码取客户端 IP 的顺序是 `x-forwarded-for` → `x-real-ip` → 字面量 `"unknown"`（见 [route.ts](../../app/api/deepseek-stream/route.ts#L85-L88)）。

曾一度怀疑：`next start` 直接监听 80 端口、前面无反向代理，两个请求头可能均缺失，导致所有用户限流键退化为 `rl:system_unknown`，使「每 IP 每 3 小时 5 次」变成全体共享 5 次。

**实测结论：该怀疑不成立。** 服务器上执行

```bash
source /root/indigo-tarot/.env.local
redis-cli -a "$REDIS_PASSWORD" --no-auth-warning --scan --pattern 'rl:*'
```

实际输出：

```
rl:system_::ffff:203.0.113.9
rl:system_::ffff:127.0.0.1
```

说明：

- Next.js 会基于 TCP 连接的远端地址写入 `x-forwarded-for`，因此无需 Nginx 也能取到真实 IP；
- `::ffff:` 前缀是 IPv4-mapped IPv6 表示法，`::ffff:203.0.113.9` 等价于 `203.0.113.9`，键值语义正确；
- `::ffff:127.0.0.1` 来自服务器本机 curl 诊断请求，属预期；
- 对**未自带请求头**的正常客户端，IP 限流按真实 IP 生效。

> 附注 1：早期「浏览器端 AI 解析失败」的真实原因是 `crypto.randomUUID` 在 HTTP 非安全上下文不可用（见「10. 问题与解决记录」第 5 项），与 IP 限流无关，已修复。
>
> 附注 2：本结论**不覆盖客户端自带 `X-Forwarded-For` 的情形**——Next 仅在请求头缺失时才用 socket 地址填充，客户端伪造的头会被保留。该疑点见 [OPERATIONS.md](../OPERATIONS.md) 疑点 Q1。

---

## 16. Nginx 反向代理接入（2026-09-16，修复 Q1）

> **本节是历史记录。** Nginx 的**当前配置全文与安装/启用步骤**已移入
> [`DEPLOYMENT.md`](../DEPLOYMENT.md) §三 第 6 条（2026-09-17 迁出，避免"当前配置只存在于归档里"）；
> 本节保留的是"为什么这么改"、当时的切换过程与实测结果。

### 16.1 背景

疑点 Q1 经实测确认：客户端自带的 `X-Forwarded-For` 被完全信任，换头即换限流桶（实测伪造 `203.0.113.77` → Redis 键 `rl:system_203.0.113.77`）。由于 Next.js App Router 无法直接读取 socket 远端地址，采用**前置 Nginx 覆写请求头**的方案（Q1 方案 A）。

**当时的影响评估**（这是"必须修"而非"最好修"的理由；原文在 `OPERATIONS.md` 疑点 Q1，随该表关闭整理于 2026-09-17 归档至此）：

- 客户端可控的 `X-Forwarded-For` 叠加同样客户端可控的 `x-device-id`，可使**免费试用与 IP 限流同时失效**；
- 每日 50 次配额是**全局计数器**，可被一次烧光——正常访客（含 HR/面试官）会看到"额度已达上限"，**不只是成本问题**。

### 16.2 架构变化

| | 修复前 | 修复后 |
|---|---|---|
| 对外监听 | PM2 `indigo-tarot` 直接监听 **80** | **Nginx 监听 80** |
| 应用监听 | — | PM2 `indigo-tarot` 监听 **127.0.0.1:3000** |
| 客户端 IP 来源 | 客户端可伪造的 `X-Forwarded-For` | Nginx 以 `$remote_addr` **覆写**该头 |
| 应用代码 | — | **零改动**（仍读 `x-forwarded-for`，但值已可信） |

### 16.3 切换步骤（含应用端口迁移）

```bash
# 1. 启用配置并校验
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/indigo-tarot /etc/nginx/sites-enabled/indigo-tarot
nginx -t

# 2. 迁移应用端口 + 启动 nginx（此段为中断窗口，实测约 10-20 秒）
pm2 delete indigo-tarot
pm2 start npm --name indigo-tarot --max-memory-restart 500M -- start -- -p 3000
systemctl start nginx

# 3. 持久化（务必：否则重启后 PM2 会把应用恢复回 80 端口，与 nginx 冲突）
pm2 save
systemctl enable nginx
```

> ⚠️ `pm2 delete` 会连带清掉此前设置的 `max_memory_restart`，重建时必须重新带上该参数。

### 16.4 验证结果（实测）

| 项 | 结果 |
|---|---|
| 站点可访问 | HTTP 200，~42ms |
| `/api/health` | `{"status":"ok","checks":{"redis":"ok"}}` |
| 安全响应头透传 | 5 条 + CSP 扩展全部保留 |
| **SSE 流式** | 首字节 0.22s / 总时长 1.94s，145 个 content 帧逐字到达 → **未被缓冲** |
| **伪造 XFF（修复后）** | 发送 `203.0.113.88` → Redis 中**无此键**，记录为真实来源 IP ✅ |
| `max_memory_restart` | 重建后确认仍为 `524288000`（500MB） |
| 开机自启 | nginx `enabled`；PM2 `dump.pm2` 已更新为 3000 端口 |

> 修复前遗留的 `rl:system_203.0.113.77` 键有 3 小时 TTL，会自行过期，无需手工清理。

### 16.5 对部署流程的影响

- **日常更新命令不变**：`pm2 restart indigo-tarot` 会保留 `-p 3000` 参数，归档 §11 的流程照旧可用。
- **若需重建 PM2 进程**：必须带上 `-p 3000 --max-memory-restart 500M`，并按 16.3 执行 `pm2 save`。
- **Nginx 配置变更后**：`nginx -t && systemctl reload nginx`（不断连接）。
- **附带收益**：将来上 HTTPS 只需在本配置中加证书与 443 server 块，应用侧无需改动。
