# 待办：`ADMIN_TOKEN` 轮换为生产独立值

- **类别**: 运维安全（卫生项）
- **状态**: ⏸ 暂缓（2026-09-16 决定）
- **来源**: 原 `OPERATIONS.md` §三 一行 + §二 条目过程
- **优先级**: 低——判定为**卫生项，非活跃漏洞**

## 问题描述

生产服务器的 `ADMIN_TOKEN` 与本地开发 `.env.local` **完全相同**。
虽然 token 本身是 32 hex 强随机、`.env.local` 从未被 git 跟踪、其唯一副本（Vercel 环境变量）
已随 Q2 清理——但**生产与本地共用同一值**意味着：

> **开发机失窃 = 生产管理权失窃。**

## 目标

生产用一个**独立的** `ADMIN_TOKEN`，与本地、与任何其他环境都不共用。

## 验收标准

- [ ] 服务器 `.env.local` 中的 `ADMIN_TOKEN` 与本地 `.env.local` 的值**不同**
- [ ] 本地保留原值（不必改），或另生成一个新值——两端不再相同即可
- [ ] `pm2 restart indigo-tarot` 后，用**新 token** 调 `/api/admin/quota` 返回 200
- [ ] 用**旧 token** 调同一接口返回 401
- [ ] 站点首页与 `/api/health` 不受影响（该 token 只用于管理接口）

## 技术方案

无代码改动——纯配置 + 重启：

```bash
# 1. 生成新 token
openssl rand -hex 16

# 2. 写入服务器 .env.local（权限保持 600）
#    ADMIN_TOKEN=<新值>

# 3. 重启进程（环境变量为运行时读取，无需重新 build）
pm2 restart indigo-tarot

# 4. 验证
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer <新值>" localhost:3000/api/admin/quota   # 期望 200
curl -s -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer <旧值>" localhost:3000/api/admin/quota   # 期望 401
```

**注意**：`.env.local` 权限须保持 600（`ls -l` 应为 `-rw-------`）。

## TDD 测试计划

**不设自动化测试**（与 N11 同理）：这是线上配置变更，测试需真实服务器与真实 token，
在仓库里无法证伪。**验收即上面的四条 curl 断言**，由负责人执行并记录结果。

## 风险与假设

- **风险**：改错 token 会导致管理接口不可用（**但不影响站点**——`ADMIN_TOKEN` 只用于
  `/api/admin/*`）。回退：把旧值写回 + `pm2 restart`。
- **假设**：环境变量确为运行时读取（2026-09-16 已实测：改 `.env.local` 后 `pm2 restart`
  即生效，无需重新 build）。
- **触发条件**（满足任一即执行，不必等）：设备丢失 / 送修、`.env.local` 外发、
  需向他人演示服务器。

## 影响范围

- 修改：服务器 `.env.local`（不在仓库内）
- 无代码、无文档改动

## 完成时

- 在 [`../SPEC.md`](../SPEC.md) 补一行条目状态；本文移入 `../archive/`
- 从 [`../OPERATIONS.md`](../OPERATIONS.md) §三 移除对应风险条目
