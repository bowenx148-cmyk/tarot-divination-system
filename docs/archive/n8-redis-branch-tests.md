# N8：Redis 分支测试补强

> **归档日期**：2026-09-16 ｜ **条目状态**：✅ 已完成
>
> ⚠️ **本文是历史记录，不描述当前状态。** 文中"当前 / 现在"等表述均指归档当时。
> **本文只负责**：N8 这一件事——背景、范围、测试内容、验证方法、验收结果。
> 其他文档提到 N8 时**只能链接本文**，不得复写其内容。

---

## 一、完成结果（归档时）

| 项 | 值 |
|---|---|
| 状态 | ✅ **已完成**（2026-09-16） |
| 测试文件 | `lib/server/__tests__/{quota,rate-limit,trial}.redis.test.ts` |
| 新增用例 | **26 例**（quota 11 / rate-limit 7 / trial 8） |
| 分支 | `feat/n8-redis-branch-tests` |
| 验证 | 三个文件单独跑 26 例全绿；已做变异验证（见 §六） |

---

## 二、背景：缺口是怎么暴露的

2026-09-16 上线 N3（来源审计统计）后，任何一次 `/api/deepseek-stream` 调用都导致
`next-server` 堆耗尽、core dump、nginx 502。

根因：`lib/server/stats.ts` 的 **Redis 版** `record()` 在 `for...of` 遍历 `commands` 数组的同时
向同一数组 `push` EXPIRE 命令 → 循环永不终止、数组无限增长 → V8 堆耗尽。

```js
const commands = [["INCR", ...]];
for (const cmd of commands) {
  commands.push(["EXPIRE", ...]);   // 边遍历边追加 → 无限循环
}
```

**关键教训**：`stats.test.ts` 当时只覆盖内存版；`quota.test.ts` / `rate-limit.test.ts` /
`trial.test.ts` 同样**只测内存版**。整个项目的 Redis 分支零测试覆盖——这不是单个 bug，
是**系统性测试盲区**。

> 事故完整经过（症状、定位过程、根因、为何测试没拦住）见
> [`migration-2026-09.md`](./migration-2026-09.md) §10.1，本文不复述。

---

## 三、为什么 `kind` 断言不算覆盖

三个模块原有的测试里都有一条 `expect(getXxxGuard(true).kind).toBe("redis")`。
它只验证工厂**选中了** Redis 版，**从不调用**方法体
（`consume` / `getStatus` / `increment` / `check` / `markUsed`），也不检查下发的任何一条 Redis 命令。

覆盖面（补测前后）：

| 模块 | 内存版 | Redis 分支（补测前） | Redis 分支（现在） |
|---|---|---|---|
| stats | ✅ `stats.test.ts` | ✅ `stats.redis.test.ts`（8 例） | — |
| quota | ✅ `quota.test.ts` | ❌ 零覆盖 | ✅ `quota.redis.test.ts`（11 例） |
| rate-limit | ✅ `rate-limit.test.ts` | ❌ 零覆盖 | ✅ `rate-limit.redis.test.ts`（7 例） |
| trial | ✅ `trial.test.ts` | ❌ 零覆盖 | ✅ `trial.redis.test.ts`（8 例） |

**这三个模块正跑在生产上**，直接决定成本熔断与防滥用是否生效。写错的后果：
配额熔断失灵（成本失控）、限流窗口算错（防滥用失效）、试用键写错（全体共用一把锁或试用可无限重复）。

---

## 四、测试方法：断言下发的命令

照搬 `stats.redis.test.ts` 的手法——**mock `@/lib/server/upstash`，断言实际下发的命令数组**。
不连真实 Redis，因此可在本地与 CI 确定性运行。

```ts
const { redisMock } = vi.hoisted(() => ({
  redisMock: { hasRedisConfig: vi.fn(() => true), redisCommand: vi.fn() },
}));
vi.mock("@/lib/server/upstash", () => redisMock);

import { getQuotaGuard } from "@/lib/server/quota";

/** 取出指定一次调用下发的命令（默认最后一次），扁平化为可读字符串 */
function sentCommands(callIndex = -1): string[] {
  const calls = redisMock.redisCommand.mock.calls;
  const call = calls.at(callIndex)?.[0] as unknown[][] | undefined;
  return (call ?? []).map((c) => c.join(" "));
}
```

**两个实测踩过的坑**：

1. **命令是批量下发的**。`quota.getStatus()` 把两条读命令放进**同一次** `redisCommand` 调用，
   不是两次。断言前先数清 `mock.calls.length`，别想当然。
2. `sentCommands()` 默认取**最后一次**调用。多次调用后要用 `sentCommands(0)` 取第一次，
   否则会断言错对象。

---

## 五、各模块锁住了什么

### quota — `quota.redis.test.ts`（11 例）

Redis 键：`quota:enabled`（开关）、`quota:count:<YYYY-MM-DD>`（当日计数，上海自然日）。

| 断言点 | 为什么重要 |
|---|---|
| `count` 取自 `INCR` 的结果，而非 `INCR` 前的读值 | 取错会少算一次，阈值偏移 |
| `INCR` 与 `EXPIRE` **必须同批下发** | 缺 `EXPIRE` 则计数键永不过期 |
| `EXPIRE` 为**距当日 24:00 的剩余秒数**（上海 10:00 → **50400s**），非固定 86400 | 写死 24h 会让计数跨日残留 |
| 熔断路径（`count >= limit`）**不得下发 `INCR`** | 熔断后仍写入会污染审计数据 |
| 开关关闭时放行且**不计数** | 否则关闭期间仍在烧额度 |
| 开关键缺失（`null`）视为**开启** | 默认必须安全 |
| `increment()` 超阈值时仍写入计数，但 `allowed=false` | 审计需要真实总量 |
| `setEnabled` 写入 `1` / `0` | 约定值写错则开关失效 |
| `getStatus` 以**单次批量调用**读取开关与计数 | 断言调用次数，防止实现漂移 |

### rate-limit — `rate-limit.redis.test.ts`（7 例）

Redis 键：`rl:<key>`（生产为 `rl:system_<IP>`）。

| 断言点 | 为什么重要 |
|---|---|
| 键名带 `rl:` 前缀 | 与运维速查（归档 §14.3）的 `rl:system_*` 一致，改名会让运维查询失效 |
| `INCR` 与 `EXPIRE` 同批下发，窗口 **10800s**（3 小时） | 缺 `EXPIRE` 则窗口永不过期，限流变永久封禁 |
| 第 5 次放行、第 6 次拒绝 | 阈值边界 |
| `remaining` **不为负**（第 100 次得 0 而非 -95） | 展示值正确性 |
| 不同 IP 使用不同键 | 否则全体共享限额 |
| `null` 结果按 `1` 计 | 首次调用不得被误判为超限 |
| `resetTime` = 当前时间 + 窗口长度 | 前端展示的正确性 |

### trial — `trial.redis.test.ts`（8 例）

Redis 键：`trial:<deviceId>`。

| 断言点 | 为什么重要 |
|---|---|
| 用 `EXISTS` 探测，键存在即拒绝 | 反了则试用完全失效 |
| `markUsed` 用 `SET ... EX <TTL>`，TTL 为 **90 天** | 缺 `EX` 则键无限增长 |
| `deviceId` **只作键名**，不进值（值恒为 `"1"`） | 避免把标识写进可读值 |
| 不同设备使用不同键 | 漏掉 `deviceId` 会让全体共用一把锁——**最危险的退化** |
| `check → markUsed → check` 全链路第二次被拒 | 覆盖真实调用序列 |
| `null` 结果视为**未试用** | 反向会让正常用户被误拒 |

---

## 六、反向验证：证明测试真的能失败

**通过的测试不能证明任何事，除非你见过它失败。** 已做一次变异验证——把代码刻意写坏，
确认测试确实报错：

| 变异 | 结果 | 失败形态 |
|---|---|---|
| 复刻 `stats.ts` 的「边遍历边 push」无限循环 + 去掉熔断保护 | ✅ 抓到 | 不是断言失败，而是 **V8 堆耗尽 crash**：`FATAL ERROR: Ineffective mark-compacts near heap limit. Allocation failed - JavaScript heap out of memory` —— **与线上事故完全同一机理** |
| `EXPIRE` 窗口写成 `60`（应为 `10800`） | ✅ 抓到 | `INCR 与 EXPIRE 同批下发，且窗口为 3 小时（10800s）` 断言失败 |
| trial 键漏掉 `deviceId`（写成 `trial:global`） | ✅ 抓到 | 3 条断言同时失败：`check 用 EXISTS 探测 trial:{deviceId}`、`markUsed 用 SET + EX 写入`、`不同设备使用不同键` |

> 实测于 2026-09-16（本次提交前重跑）。基线对照：同一批断言跑真实源码 **26 例全绿**，
> 跑变异副本全部失败——证明这些测试确实有鉴别力，不是"写了就绿"的摆设。

做法：把写坏的副本放进 `lib/server/__mutation__/`（须在项目内，相对 `import "./upstash"` 才可解析），
用同样断言跑断点测试。

> ⚠️ **验证脚手架已删除**，并由 `tests/no-dead-code.test.ts` 契约锁定不得残留——
> 一个遗留的坏 `stats.ts` 副本是本项目里最危险的那种「看起来像正式代码」的陷阱。

---

## 七、验收标准

- [x] 三个文件存在且被 `npm run test:run` 收集
- [x] 每个模块的 Redis 分支方法体均被调用并断言
- [x] §五 表中的断言点均有对应用例
- [x] `type-check` / `lint` / `test:run` 三绿
- [x] 变异验证通过（§六）
- [x] 全量 `npm run test:run` 三绿（新增用例已被收集并全部通过）
