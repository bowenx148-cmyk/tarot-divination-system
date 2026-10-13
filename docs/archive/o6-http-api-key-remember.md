# O6 — HTTP 下「记住 Key」静默失效（隐藏勾选框）

> **归档日期**：2026-09-17 ｜ **条目状态**：✅ 已完成（已合并 `main` @ `06f3a4d`）
>
> ⚠️ **本文是历史记录，不描述当前状态。** 文中"待确认 / 在飞"等表述均为**当时**的情况。
> 当前行为以代码为准：`app/components/ApiKeySettings.tsx`。
>
> **优先级**：🟠 橙级（可复现功能缺陷）

## 背景与根因

- 生产为 HTTP 明文直连，`crypto.subtle` 在非安全上下文不存在（决策 D10）。
- [`lib/apiKeyCrypto.ts`](../../lib/apiKeyCrypto.ts) 的 `generateSessionKey()` 读 `crypto.subtle.generateKey`，
  HTTP 下抛 `TypeError: Cannot read properties of undefined (reading 'generateKey')`，
  被 [`lib/store.ts`](../../lib/store.ts) `setApiKey` 的 `catch` 吞掉、`encryptedApiKey` 置 `null`。
- 后果：localStorage 从不存密文，Key 只活在内存里，**同一会话内刷新即丢**（比"关浏览器丢"更早）。
- **生产实测证据（2026-09-17）**：点击保存时控制台报上述 TypeError，栈为
  `setApiKey → generateSessionKey → crypto.subtle.generateKey`。
- **缺陷**：勾选框「在本设备记住 Key（加密保存）」照常显示且默认勾选，用户勾了却不生效，看起来像 bug。

## 实现决策（2026-09-17）

| 决策 | 取值 | 理由 |
|---|---|---|
| 隐藏方式 | **隐藏整行**（勾选框 + 边界说明段落） | 只藏勾选框会留下描述不存在控件的孤立文案 |
| 检测依据 | **`typeof window.crypto?.subtle !== "undefined"`** | 它才是加密链路的真实依赖，比 `window.isSecureContext` 更准；且 jsdom 不实现 `isSecureContext`（实测恒为 `undefined`），用它会让所有测试默认落到"隐藏"态 |
| 判定时机 | `useEffect`（初值 `true`） | 初值与 SSR 输出一致，避免 hydration 不匹配；弹窗默认关闭，用户看不到闪烁 |
| 不可记住时的 `remember` | **显式传 `false`** | 跳过注定失败的加密分支，顺带消除 `console.error('API Key 加密保存失败')` |
| 安全上下文（HTTPS / localhost） | **行为完全不变** | 那里加密真的可用，不该连功能一起砍掉 |

> **"暂时"的边界**：这是直到上 HTTPS 为止的权宜。上 HTTPS 后该行会**自动重新出现**，
> 无需再改代码——判定依据是能力，不是环境常量。

## 验收标准

- [x] 无 `crypto.subtle`（HTTP 非安全上下文）时，勾选框与边界说明**都不渲染**。
- [x] 无 `crypto.subtle` 时保存回调收到 `remember=false`（不再触发加密与 console.error）。
- [x] 有 `crypto.subtle` 时行为不变：该行可见、默认勾选、可取消。
- [x] 隐藏只影响「记住 Key」——输入框、显示/隐藏、保存、清除照常可用。

## 测试计划与结果

[`app/components/__tests__/ApiKeySettings.test.tsx`](../../app/components/__tests__/ApiKeySettings.test.tsx)
新增 `O6` describe 共 4 例（非安全上下文用 `withoutSubtle()` 遮蔽 `crypto.subtle` 模拟）：

**红 → 绿**：实现前 2 例失败（勾选框仍在、`remember` 仍为 `true`）→ 实现后 **13/13 通过**。

**变异验证**：把判定条件反转（`!==` → `===`）→ **6 例失败**（含 3 例既有的记住开关测试），
还原后 13/13 通过——证明测试对这条行为敏感，不是恒真断言。

### 调用链末端：确认真的没走到加密

[`lib/__tests__/store.test.ts`](../../lib/__tests__/store.test.ts) 新增 1 例。

**"UI 不显示" ≠ "不会调用加密"**——组件传 `remember=false` 只是必要条件，还得确认 store
那侧真的没走到加密。该用例在 `crypto.subtle` 缺席下调用 `setApiKey("sk-x", false)`，断言三件事：

- `encryptedApiKey` 为 `null`；
- **`console.error` 未被调用**（无异常 = 从未尝试 `crypto.subtle.generateKey`）；
- sessionStorage 中没有会话密钥（若有，说明 `generateSessionKey` 已经跑过）。

**变异验证（本次最强证据）**：把该用例的 `remember` 换回改动前的 `true` → 用例失败，
且报错正是生产上那条 `TypeError: Cannot read properties of undefined (reading 'generateKey')`。
即**这条测试能复现用户实际遇到的线上故障**，改动后才转为通过。

> 结论：`generateSessionKey()` 在整个仓库里唯一的可达路径是 `store.ts` 中
> `if (remember && apiKey)` 分支内的 `ensureSessionKey()`。`remember=false` 时该分支整体跳过，
> 因此 `crypto.subtle` 一次都不会被触碰。

### 真实浏览器验证（2026-09-17，用户执行）

本地起 dev server，用两个源对照（两者都是 `http://`，区别只在"是不是环回地址"）：

| 源 | `isSecureContext` | `crypto.subtle` | 「记住 Key」那一行 |
|---|---|---|---|
| `http://127.0.0.1:3000`（环回 = 安全上下文） | `true` | `object` | 显示，默认勾选 |
| `http://192.168.0.104:3000`（私网 IP = **非安全上下文**，等价于生产） | `false` | `undefined` | **不显示** |

**这组对照同时验证了两件事**：① O6 的隐藏逻辑按"能力"而非"环境"判定，在真正的非安全上下文下生效；
② 生产的那条控制台报错（`Cannot read properties of undefined (reading 'generateKey')`）不会再现。

> 排查过程中踩到的两个 Next 16 dev 坑（与 O6 无关，但会伪装成"O6 把页面改坏了"）：
> `allowedDevOrigins` 默认只认 `localhost`，用 `127.0.0.1` 或局域网 IP 访问会被当跨源拦掉 dev 资源，
> 页面停在 SSR 的 framer-motion 入场初值（`opacity: 0`）上表现为整页空白，且**没有任何 JS 报错**；
> 详见 `next.config.ts` 与仓库根 `AGENTS.md`。

## 影响范围

- **修改**：[`app/components/ApiKeySettings.tsx`](../../app/components/ApiKeySettings.tsx) + 测试文件
- **不动**：`lib/apiKeyCrypto.ts`、`lib/store.ts`、`app/page.tsx`（接线不变，只改传入的 `remember` 值）
- **文档同步**：[`OPERATIONS.md`](../OPERATIONS.md) 三、已知限制、[`DEPLOYMENT.md`](../DEPLOYMENT.md) 的 HTTP 提示

## 不在范围

- 上 HTTPS 恢复完整功能——已决策接受现状（决策 D10 / OPERATIONS.md 三）。
