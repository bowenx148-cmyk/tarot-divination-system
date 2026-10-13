# 🔴 红级：安全修复（R1–R4）

> ⚠️ **本文是历史记录，不描述当前状态。** 条目 R1–R4 已完成并归档，正文保留的是当时的
> 问题描述、验收标准、技术方案与 TDD 计划。

> 红级条目为**安全漏洞**，优先于一切功能开发。执行顺序：R1（API Key 安全加固，综合条目）→ R3（含 R4）→ R4。
>
> **修订记录（2026-03）：R1 扩展为「API Key 安全加固」综合条目，合并原 R2（掩码 + CSP + 文档）与原 Y5（双份存储统一），并新增 B 层加密存储。R3/R4 保留独立（服务端系统 Key 限流与实现细节）。**

## 条目状态

| 编号 | 标题 | 类别 | 状态 |
|---|---|---|---|
| R1 | API Key 安全加固（XSS 消毒 + 加密存储 + 纵深防御） | 安全 | ✅ 完成 |
| R3 | 系统 Key 保护：免费试用一次 + 限流加固 | 安全 | ✅ 完成 |
| R4 | 移除模块级 setInterval | 安全 | ✅ 完成（随 R3） |

---

## [R1] API Key 安全加固（XSS 消毒 + 加密存储 + 纵深防御）

- **优先级**: 🔴
- **类别**: 安全
- **状态**: ✅ 完成
- **关联条目**: Y5（已并入本条目）、R3（系统 Key 限流）、Y3（README 风险说明）、D8（远期：服务端托管 Key）

### 问题描述

- 现状（合并前分散三处）：
  - **攻击链**：`app/components/MarkdownRenderer.tsx` L17–45 用正则把 Markdown 转 HTML，L53 `dangerouslySetInnerHTML` 直接注入且**无任何 HTML 转义**——AI 输出（模型生成、攻击者可通过 prompt 诱导）若含 `<script>`、`<img onerror=...>` 等原始 HTML 会原样执行，属**存储型 XSS**；
  - **存储**：`lib/store.ts` L177 `partialize` 将 `apiKey` **明文**持久化到 localStorage（`tarot-store`）；`app/page.tsx` L34–40 / L79–87 另有 `deepseek_api_key` 手动读写（**双份存储**，更易漂移、暴露面更大）；
  - **展示**：`ApiKeySettings.tsx` 输入框虽为 password 类型但无掩码强调、无 CSP 限制脚本来源。
- 问题：XSS + 明文存储构成完整攻击链——任意一次 AI 响应即可窃取用户自费 API Key；无 CSP 时页面可加载/执行任意来源脚本，XSS 利用面最大化。
- 影响：用户自费 Key 泄露 → 费用被盗刷；注入钓鱼内容。

### 目标

四层加固：**A** 消除 XSS 注入点（核心，切断主路径）；**B** 加密存储（Key 明文不落盘，防静态窃取）；**C** 收窄暴露面（单一存储源）；**D** 展示与纵深防御（掩码 + CSP + 文档）。

### 验收标准

**A 层（XSS 消毒）**

- [ ] 内容含 `<script>alert(1)</script>`：不创建 script 元素，文本原样可见
- [ ] 内容含 `<img src=x onerror=...>`：不渲染 img 元素、onerror 不触发
- [ ] 内容含 `[点我](javascript:alert(1))`：链接被剥离或 `javascript:` 协议被拒绝
- [ ] 标准 Markdown 特性（h1–h3、粗体、斜体、行内代码、链接、无序/有序列表、引用、水平线、段落）渲染样式与现状一致
- [ ] 流式增量渲染不闪烁、不丢失（结果页现有用法保持）

**B 层（加密存储）**

- [ ] localStorage 中**不存在明文 apiKey**：`tarot-store` 持久化字段为 `encryptedApiKey`（密文），静态断言无明文写入
- [ ] 同一会话（sessionStorage 未清）刷新页面 → Key 自动解密恢复，无需重输
- [ ] 关闭浏览器（sessionStorage 清空）后 → 密文不可解，界面提示重新输入 Key，不崩溃
- [ ] 篡改密文 / 错误密钥解密失败 → 抛错且被 UI 捕获，不崩溃
- [ ] "记住 Key"开关关闭时：不写密文，Key 仅内存，刷新即失效

**C 层（单一来源）**

- [ ] 删除 `deepseek_api_key` 手动读写，Key 仅经 store 单一来源
- [ ] grep 无 `deepseek_api_key` 残留

**D 层（展示与纵深防御）**

- [ ] ApiKeySettings 打开时输入框默认 `type="password"`（掩码），可切换显示
- [ ] `next.config.ts` 生产响应头含 CSP（`script-src 'self'` 等，按 Next 16 实际产物微调）
- [ ] README 隐私章节说明：加密可防静态窃取、**不能防恶意脚本/扩展**；Key 风险与替代方案

**全量**

- [ ] `npm run type-check`、`npm run lint`、`npm run test:run` 全绿

### 技术方案

**A 层（XSS 消毒）**

1. 新增依赖：`react-markdown`（v10+，支持 React 19）；可选 `remark-gfm`（表格/任务列表）。
2. 重写 `MarkdownRenderer.tsx`：删除全部手写正则与 `dangerouslySetInnerHTML`；用 `react-markdown` 的 `components` 属性把 h1/h2/h3/strong/em/code/a/ul/ol/li/blockquote/hr/p 映射到现有样式类（从旧正则的 class 字符串平移）；props 兼容 `{ content, className }`，空内容返回 null。
3. 安全基线（react-markdown 默认行为，测试锁定）：原始 HTML 按文本渲染；默认 `urlTransform` 放行 http/https/mailto/tel 及相对路径、剥离 `javascript:` 等危险协议。
4. 结果页用法不变（`<MarkdownRenderer content={analysisContent || streamingContent} />`），光标动画 `isStreaming` 逻辑保留。

**B 层（加密存储）**

1. 新增 `lib/apiKeyCrypto.ts`：

   ```ts
   // AES-GCM 256；会话密钥 raw 导出为 base64，由调用方写入 sessionStorage
   export class ApiKeyDecryptError extends Error {}
   export async function generateSessionKey(): Promise<string>;            // 返回 base64
   export async function importSessionKey(b64: string): Promise<CryptoKey>;
   export async function encryptApiKey(apiKey: string, key: CryptoKey): Promise<string>;  // base64(iv+ciphertext+tag)
   export async function decryptApiKey(payload: string, key: CryptoKey): Promise<string>; // 认证失败抛 ApiKeyDecryptError
   ```

   - `crypto.subtle.generateKey({ name: "AES-GCM", length: 256 })` → `exportKey("raw")` → base64；
   - 加密：随机 12 字节 iv → `encrypt` → `base64(iv + ciphertext + tag)`；
   - 解密：解析后 `decrypt`，`OperationError` 包装为 `ApiKeyDecryptError`。

2. `lib/store.ts` 改造：
   - state 增加 `encryptedApiKey: string | null`；
   - `partialize` 改为持久化 `{ readings, encryptedApiKey }`——**`apiKey` 不再持久化**，仅内存态；
   - `setApiKey(apiKey: string, remember = true)`：同步设内存 apiKey；`remember` 时异步加密写 `encryptedApiKey`；不 remember 时清 `encryptedApiKey`；
   - `initApiKeyFromStorage(): Promise<boolean>`：读 sessionStorage 会话密钥（缺失 → 清 `encryptedApiKey`，返回 false）→ `decryptApiKey(encryptedApiKey)` → 恢复内存 apiKey → true；解密失败清密文返回 false；
   - `clearStoredKey()`：清 `encryptedApiKey` 与 sessionStorage 会话密钥。

3. `app/page.tsx`：`useEffect` 调 `initApiKeyFromStorage()`，成功则回填输入框（保持掩码态）。
4. `ApiKeySettings.tsx`：掩码默认；新增"在本设备记住 Key（加密保存）"开关（默认开）；文案说明"加密可防静态窃取，无法防恶意脚本/浏览器扩展"。
5. **旧数据迁移**：历史版本 localStorage（`tarot-store`）中残留的明文 `apiKey` 字段与 `deepseek_api_key` 键在 `initApiKeyFromStorage()` 时检测并清除（persist 的 `merge` 或初始化逻辑中删除多余字段），避免明文遗留。

**C 层（单一来源）**

- `app/page.tsx`：删除 `localStorage.getItem/setItem("deepseek_api_key")`（L34–40、L79–87），全部走 store。

**D 层（展示与纵深防御）**

- `next.config.ts` 增加 `headers()`：生产环境返回 CSP 头（`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.deepseek.com; font-src 'self'`）；若 Next hydration 报 CSP 违规，降级 `script-src 'self' 'unsafe-inline'` 并在文档记录取舍。dev 模式放宽支持 HMR。
- README 隐私章节（随 Y3）：加密边界与替代方案。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `app/components/__tests__/MarkdownRenderer.test.tsx` | script 标签按文本渲染 | 传入含 `<script>alert(1)</script>` → `querySelector("script")` 为 null，文本可见 |
| | img onerror 不执行 | `<img src=x onerror=...>` → 无 img 元素 |
| | javascript: 链接被过滤 | `[点我](javascript:alert(1))` → 无 href 含 `javascript:` 的 anchor |
| | 标准 markdown 特性渲染 | h2/strong/ul/li/code/blockquote/hr/link 对应元素与样式类存在 |
| | 空内容返回 null | `content=""` → 容器为 null |
| | 流式增量拼接不丢失 | 分多次渲染累积文本，最终完整可见 |
| `lib/__tests__/apiKeyCrypto.test.ts` | 加密→解密往返 | `decrypt(encrypt("sk-x")) === "sk-x"` |
| | 错误密钥认证失败 | 不同密钥解密抛 `ApiKeyDecryptError` |
| | 随机 iv | 同明文两次加密密文不同 |
| | 密钥导出→导入恢复 | generate→import 后解密成功 |
| | 篡改/非 base64 抛错 | 截断密文、非法 base64 输入抛 `ApiKeyDecryptError` |
| `lib/__tests__/store.test.ts` | localStorage 无明文 | `setApiKey("sk-x")` 后 `localStorage["tarot-store"]` 不含明文 `sk-x`、含 `encryptedApiKey` |
| | 会话恢复 | 预置 sessionStorage 会话密钥 + 密文 → `initApiKeyFromStorage()` true 且 apiKey 恢复 |
| | 会话密钥缺失 | 无 sessionStorage → false 且 `encryptedApiKey` 被清 |
| | 关闭记住开关 | `setApiKey(k, false)` → `encryptedApiKey` 为 null |
| `app/components/__tests__/ApiKeySettings.test.tsx` | 默认掩码 | 初始 `type="password"` |
| | 切换显示 | 点"显示"→text，再点→password |
| | 保存/清除回调 | 保存 → `onApiKeyChange(newKey, remember)` 被调用；清除 → `("")` |
| 静态契约测试 | 无明文/双份存储残留 | grep `deepseek_api_key` 无匹配；grep `localStorage.setItem` 不含 apiKey 明文 |

### 影响范围

- 新增：`lib/apiKeyCrypto.ts`、依赖 `react-markdown`（dependencies）、可选 `remark-gfm`
- 修改：`app/components/MarkdownRenderer.tsx`（重写）、`lib/store.ts`（加密存储 + partialize + init 函数）、`app/page.tsx`（init + 去双份存储）、`app/components/ApiKeySettings.tsx`（掩码 + 记住开关）、`next.config.ts`（CSP）、`README.md`（随 Y3）
- 删除：`deepseek_api_key` 手动读写相关代码

### 风险与假设

- 假设：Web Crypto `crypto.subtle` 在 secure context（localhost/https）可用，现代浏览器均支持。
- 风险：**加密不防 XSS**（解密在客户端进行，恶意脚本可读结果）——A 层为真核心；会话密钥存 sessionStorage 属"真加密防静态窃取"，不防会话期内扩展读取——README 明示。
- 远期（记入 docs/README.md D8，不实现）：主密码 PBKDF2 派生密钥（UX 重、主密码丢失 = Key 丢失）；服务端托管 Key（需后端 + 用户体系，架构变更大）。
- 备选（仅 react-markdown 依赖冲突时）：DOMPurify 消毒现有正则管线——不推荐。

---

## [R3] 系统 Key 保护：免费试用一次 + 限流加固

- **优先级**: 🔴
- **类别**: 安全（成本保护 + 新功能）
- **状态**: ✅ 完成
- **关联条目**: R4（惰性清理，合并实现）、Y7（路由抽取，同批文件）、D9（无登录试用边界）

### 问题描述

- 现状：`app/api/deepseek/route.ts`（L4–14 缓存+setInterval；L27–31 取 IP；L36–83 key 解析与限流）与 `app/api/deepseek-stream/route.ts`（同构）各自维护进程内 `Map`，以 `x-forwarded-for` 作为用户标识。
- 问题：
  1. `x-forwarded-for` 可伪造（自托管/非 Vercel 边缘场景）→ 换 header 即绕过限流；
  2. serverless 多实例各自持有内存 Map，计数互不共享；实例回收即清零；
  3. 现有"每 3 小时 5 次"限流无法支撑产品需求——需求是：**未填 Key 的用户可用系统 Key 免费试用 1 次**（用完引导填自己的 Key），已填 Key 的用户用自己的 Key 不限次。
- 影响：系统 key 成本失控风险；免费试用无法兑现或可被无限绕过。

### 目标

1. **免费试用**：无用户 Key + 新设备（deviceId）→ 系统 Key 放行 1 次，成功后标记；再次调用 → 429 引导填写个人 Key。
2. **用户 Key 不限**：带自己的 Key → 不检查试用、不限制。
3. **跨实例一致**：Redis（生产）统一存储；未配置回退内存（单实例，诚实降级）。
4. **失败不计数**：DeepSeek 上游非 200（如 401/429）→ 不标记，用户可重试。
5. 保留 IP 维度限流（3 小时 5 次）作为辅助防线，防"换 deviceId 批量刷"。
6. **核心建议 Markdown 渲染**（2026-03 新增）：AI 输出的 💡 节常含 `**粗体**` 标记与换行，核心建议区纯文本渲染导致 `**` 星号原样显示——改用 `MarkdownRenderer` 渲染，标点问题随 R3 一并修复。

### 验收标准

- [ ] 无用户 Key + 新 deviceId → 放行 1 次；流转发成功后标记"已试用"
- [ ] 同一 deviceId 再次调用 → 429（`error: 'trial_used'`、`needApiKey: true`、引导文案）
- [ ] 用户带自己的 API Key → 不检查试用、不受限流影响
- [ ] 缺失 `X-Device-Id` 且使用系统 Key → 400（提示客户端携带设备标识）
- [ ] DeepSeek 上游错误（非 200）→ 不标记试用，可重试
- [ ] Redis 配置时跨实例一致；未配置回退内存（单实例）
- [ ] 响应 `meta` 携带试用状态（`trialUsed`）供 UI 展示
- [ ] 客户端处理 `trial_used`：结果页显示明确引导（"免费试用已用完，请输入你的 DeepSeek API Key 继续"）
- [ ] 首页/设置面板展示试用状态（未用："免费试用 1 次"；已用："试用已用完，输入 Key 解锁"）
- [ ] `NODE_ENV=development` 时系统 Key 不限流、不限制试用次数（开发便利）
- [ ] 核心建议区以 Markdown 渲染：AI 输出的 `**粗体**` 渲染为 strong、段落换行正常，**星号/反引号等标记不原样显示**
- [ ] `lib/server/rate-limit.ts`、`lib/server/trial.ts`、`lib/server/deepseek.ts` 为唯一实现点，路由不再复制逻辑

### 技术方案

**1. 设备标识（客户端）**

- 新增 `lib/deviceId.ts`：`getOrCreateDeviceId(): string`——localStorage `tarot-device-id`，无则 `crypto.randomUUID()` 生成并存储（非敏感数据，明文存储可接受）。

**2. 试用状态（服务端）**

- 新增 `lib/server/trial.ts`：
  - `createTrialGuard(opts?: { now?: () => number; storage?: TrialStorage })` → `{ check(deviceId): TrialResult; markUsed(deviceId): Promise<void> }`；
  - `TrialResult = { allowed: boolean; trialUsed: boolean }`；
  - Redis 实现：`SETNX trial:{deviceId} 1 EX <TTL>`（默认 90 天，防无限增长）；`EXISTS` 做检查；
  - 内存实现：`Set<string>` + 惰性清理（TTL 记录，访问时清理过期——同 R4 模式）；
  - 工厂 `getTrialGuard()`：配置了 Redis 则返回 Redis 版，否则内存版（原判定 `UPSTASH_REDIS_REST_URL/TOKEN`，G14 迁移后改为 `REDIS_HOST` / `REDIS_PASSWORD`）。

**3. 路由改造（`/api/deepseek-stream`，薄 handler）**

```
解析 key：
├─ 用户 Key 存在 → 跳过试用与限流 → 直接调用（meta.trialUsed = false）
└─ 用系统 Key：
   ├─ 读 X-Device-Id（缺失 → 400）
   ├─ trial.check(deviceId) → 已用 → 429 { error: 'trial_used', needApiKey: true, message: '免费试用已用完，请输入你的 DeepSeek API Key 继续' }
   ├─ 未用 → 继续 IP 限流（rate-limit 3h/5 次）→ 调用
   └─ DeepSeek 返回 200（开始流式转发前）→ trial.markUsed(deviceId)【上游错误不标记】
```

**4. 客户端**

- `lib/deepseek.ts`：请求带 `X-Device-Id: getOrCreateDeviceId()`；解析 429 `trial_used` → 触发专用回调（如 `onTrialUsed`）或错误文案。
- `app/result/page.tsx`：`onError` 中识别 `trial_used`，显示引导文案 + 指向设置面板。
- `app/components/ApiKeySettings.tsx`：展示试用状态（来自 `meta.trialUsed` / store）；文案"免费试用 1 次 / 试用已用完，输入你的 Key 解锁"。
- `lib/store.ts`：扩展 `setApiUsage` 接收 `trialUsed`，或新增字段。

**5. 限流与共享模块（原 R3 内容保留）**

- 新增 `lib/server/rate-limit.ts`（`createRateLimiter`，惰性清理 + Redis/内存工厂，见原 R3 方案）；
- 新增 `lib/server/deepseek.ts`（`resolveApiKey` + `chatCompletion`）；
- 两个路由薄化；Y2 删除 `/api/deepseek` 后仅 stream 路由使用。

**6. 核心建议 Markdown 渲染（客户端配套）**

- `app/result/page.tsx`：核心建议区由 `<p>{parsed.coreAdvice}</p>` 纯文本改为 `<MarkdownRenderer content={parsed.coreAdvice} />`（与解析区一致），修复 `**` 星号原样显示与换行丢失。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/server/__tests__/trial.test.ts` | 未试用放行并标记 | `check(devA)` allowed → `markUsed(devA)` → `check(devA)` 拒绝 |
| | 已试用拒绝 | markUsed 后 check → `allowed: false, trialUsed: true` |
| | markUsed 幂等 | 重复 markUsed 不抛错 |
| | 不同设备独立 | devA 用完不影响 devB |
| | TTL 过期后可再试用（内存版） | 注入假时钟推进 TTL → check 恢复 allowed |
| | 工厂回退 | 无 `REDIS_*` 配置 → 内存版；有 → Redis 版（mock） |
| `lib/__tests__/deviceId.test.ts` | 首次生成并持久化 | 无 localStorage → 生成 UUID 并写入；再次调用返回同一值 |
| `lib/server/__tests__/deepseek.test.ts` | resolveApiKey 优先用户 key | 传 userApiKey → `usingSystemKey: false` |
| | 无 key 且无系统 key 抛错 | 清空环境变量 → 抛 `needApiKey` 错误 |
| | 无用户 key 用系统 key | 设置系统 key → `usingSystemKey: true` |
| | chatCompletion 转发参数 | mock fetch 断言 URL/method/headers/body（含 stream） |
| `lib/server/__tests__/rate-limit.test.ts` | 窗口内第 5 次放行第 6 次拒绝 | `consume` 前 5 次 allowed，第 6 次 false |
| | 窗口重置后恢复 | 推进 `windowMs+1` → 恢复 allowed |
| | 不同 key 独立 / 惰性清理 / 有界 | 同原 R3 |
| `app/api/__tests__/deepseek-stream.route.test.ts` | 未配置 key 返回 needApiKey | mock resolveApiKey 抛错 → 400 + needApiKey |
| | 试用已用完返回 429 | mock trial.check → 拒绝 → 429 + `trial_used` |
| | 缺 X-Device-Id 返回 400 | 系统 key 请求无 header → 400 |
| | 用户 key 跳过试用 | 带 userApiKey + 已试用 → 放行 |
| | 上游错误不标记 | mock fetch 返回 500 → markUsed 未被调用 |
| | 流式事件转发 | mock fetch 返回 SSE → `data: {...}\n\n` 帧正确 |
| | meta 含 trialUsed | 系统 key 放行 → meta.trialUsed 正确 |
| `app/result/__tests__/page.test.tsx` | trial_used 显示引导 | mock onError('trial_used') → 引导文案可见 |
| | 核心建议 Markdown 渲染 | 建议含 `**粗体**` → 渲染为 strong 元素，页面无原样星号（标点问题回归用例） |
| `app/components/__tests__/ApiKeySettings.test.tsx` | 展示试用状态 | 传入 trialUsed 状态 → 对应文案可见 |

### 影响范围

- 新增：`lib/server/rate-limit.ts`、`lib/server/trial.ts`、`lib/server/deepseek.ts`、`lib/deviceId.ts`、依赖 `@upstash/redis`（可选）
- 修改：`app/api/deepseek/route.ts`、`app/api/deepseek-stream/route.ts`（薄化 + 试用逻辑）、`lib/deepseek.ts`（X-Device-Id + trial_used 处理）、`app/result/page.tsx`（引导文案）、`app/components/ApiKeySettings.tsx`（试用状态）、`lib/store.ts`（trialUsed 状态）、`package.json`、`.env.example`（随 G3，加 Redis 环境变量与 TRIAL_TTL 可配；`UPSTASH_*` 已于 G14 改为 `REDIS_*`）

### 风险与假设

- 假设：Redis 依赖外部服务（当时为 Vercel 集成 Upstash，有免费额度）；未配置时回退内存实现（单实例，跨实例不共享——诚实降级）。**G14 迁移后改为服务器自建 Redis**（`REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`）。
- 边界（D9）：无登录系统，"同一用户一次"为**尽力而为**——清除 localStorage / 换浏览器 / 无痕模式可生成新 deviceId 再次试用；IP 辅助限制降低批量绕过成本；要做到"一人一次"需登录系统（远期）。
- 风险：Redis 不可用时试用状态单实例失效（可接受降级）；`x-forwarded-for` 在 Vercel 平台由边缘设置（G14 后为无前置代理的自建部署，该头可被客户端伪造，见 `docs/OPERATIONS.md` 疑点 Q1）。
- 备选方案：不做 deviceId，仅 IP 维度试用（同 IP 一次）——IP 共享场景（公司/NAT）会误伤，不采用。

---

## [R4] 移除模块级 setInterval

- **优先级**: 🔴
- **类别**: 安全（运维/稳定性）
- **状态**: ✅ 完成（随 R3 在 rate-limit 模块内实现惰性清理）
- **关联条目**: R3（合并实现于 rate-limit 模块）

### 问题描述

- 现状：`app/api/deepseek/route.ts` L7–14 与 `app/api/deepseek-stream/route.ts` L7–14 在模块顶层 `setInterval(..., 60000)` 定期清理限流 Map。
- 问题：serverless 环境下模块级定时器阻止函数实例回收（费用、冷启动问题）；dev 模式 HMR 每次重载注册新定时器，累积泄漏。
- 影响：部署稳定性与开发体验。

### 目标

取消定时器，改为惰性清理（访问时判断过期），对外行为无感知。

### 验收标准

- [ ] 代码中无模块级 `setInterval`
- [ ] 过期条目在后续访问时被清除，缓存大小不无限增长
- [ ] 限流窗口与次数行为与现状一致

### 技术方案

与 R3 合并实现：`rate-limit.ts` 的 `consume`/`get` 路径内判断 `now >= resetTime` 即删除重建；内存 storage 在读写时顺带 `prune(now)`。若 R3 延后，先在路由内做最小修复（把清理逻辑移入取数函数），但推荐随 R3 一起完成（同一批文件）。

### TDD 测试计划

| 测试文件 | 测试名 | 断言要点 |
|---|---|---|
| `lib/server/__tests__/rate-limit.test.ts` | 惰性清理生效 | 写入过期条目后 `consume` → 旧条目被清除且按新窗口重新计数 |
| 静态检查（lint 或人工） | 无 setInterval 残留 | grep 断言两个 API 路由文件无 `setInterval` |

### 影响范围

- 修改：`app/api/deepseek/route.ts`、`app/api/deepseek-stream/route.ts`（随 R3 重写，删除 setInterval 块）

### 风险与假设

- 假设：无功能风险；惰性清理在大流量下同样有界（每次访问最多清理该 key）。
- 风险：极低。
