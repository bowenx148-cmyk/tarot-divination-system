# G15：卡牌图片缓存命中（选牌页翻过的牌，结果页不该再加载）

> **归档日期**：2026-09-17 ｜ **条目状态**：✅ 已完成
>
> ⚠️ **本文是历史记录，不描述当前状态。** 文中"现状 / 当前"等表述均指归档当时。
> **本文只负责**：G15 这一件事——根因证据、技术方案、验收结果、实测数据、偏离与取舍。
>
> 其他文档提到 G15 时**只能链接本文**，不得复写其内容。

---

## 一、完成结果（归档时）

| 项 | 值 |
|---|---|
| 状态 | ✅ **已完成**（2026-09-17 实现并实测，验收通过） |
| 分支 | `feature/card-image-cache` |
| 规模 | 净 **−47 行**（+62 / −109）：删掉失效的 `lib/imageCache.ts`，新增两个小文件 |
| 用户可感结果 | 翻过的牌在结果页**零网络请求**；冷缓存用户同样零请求 |
| 质量门禁 | `type-check` ✅ / `lint` ✅ / `test:run` ✅（39 文件 261 用例，0 失败） |

---

## 二、问题描述

- **现状**：78 张牌面原图（`public/tarot-images/`，1086×1810 JPEG，单张 321–450KB，合计 29MB）全部经 `next/image` 运行时优化（sharp → webp）。`next.config.ts` 当时未配置 `images`，使用 Next 默认档位。
- **问题**：抽牌后进入 `/result`，**已经在 `/draw/select` 翻过、牌面已经显示过**的牌，结果页仍要重新加载一遍，肉眼可见逐张弹出。
- **影响**：结果页首屏出现明显图片加载过程；在 2 核 Lighthouse 小机器上还叠加了服务端 sharp 的 CPU 成本。

### 根因（实测证据，2026-09-16）

**同一张牌在不同页面请求的根本不是同一个 URL。** `next/image` 的输出 URL 由 `sizes` × 设备 DPR 决定的宽度档位生成；本应用有五处卡牌渲染，`sizes` 各不相同：

| 位置 | 组件 | `sizes` | DPR1 | DPR2 | DPR3 |
|---|---|---|---|---|---|
| `/draw/select` 翻牌、`/draw` 槽位 | `CardFace.tsx` | `96px` | **96** | **256** | **384** |
| `/result` 结果页 | `ResultTarotCard.tsx` | `160px` | **256** | **384** | **640** |
| 放大模态 | `CardModal.tsx` | `320px` | 384 | 640 | 1080 |

三种 DPR 下，结果页请求的宽度都与选牌页**不同** → `/_next/image?...&w=384` 与 `&w=640` 是两个缓存键 → 翻牌时缓存的变体在结果页必然不命中。

放大到实际字节（本机 `sharp` 实测，原图 321KB）：

```
w=384 →  53.1KB  26ms        结果页 DPR3 要的 w=640 → 116.8KB  48ms
```

### 连带问题

1. **`lib/imageCache.ts` 的预加载是无效的**。它预热的是**原图 URL**（`/tarot-images/major-*.jpg`），而页面渲染的是 `/_next/image?...` —— 命中率 0，还白下载 320KB/张的原图，与真正要用的图抢带宽。仅被 `app/result/page.tsx` 调用。
2. **服务端每个新宽度档位都要现算**。`w=640` 对每个新用户都是冷档位 → 结果页 3–7 张图并发触发 sharp；生产为 Lighthouse 2 核、PM2 限 500MB。
3. **`ResultTarotCard` 的 `sizes="160px"` 与实际渲染宽度不符**（`w-28` = 112px），平白多要一档，DPR3 下多下 64KB/张。

---

## 三、目标与非目标

**目标**

1. 抽牌流程中已翻过的牌，在结果页**零新增图片请求**（浏览器缓存命中）。
2. **冷缓存（首次访问）下结果页同样零新增请求**——因为翻牌时取到的就是结果页要用的那个 URL。
3. 消除"同一张牌多个 URL"的**结构性成因**，并用契约测试锁死，防止再次漂移。

**非目标**

- 不改变牌面视觉、尺寸、动效。
- 不引入静态缩略图资产与生成脚本（备选路线 A，见 §七）。
- 不改动 `lib/tarot-data.ts` 的牌面数据。
- 不预热放大模态的档位（理由见 §五.4）。

---

## 四、技术方案（最终落地形态）

### 1. `next.config.ts`：收敛宽度档位

```ts
images: {
  imageSizes: [384],        // 唯一小档
  minimumCacheTTL: 2592000, // 30 天：牌面为不可变静态资源
}
```

`deviceSizes` 保持默认，放大模态（`sizes="320px"`，DPR2/3）仍取 640/1080 档。

**不变量**：所有卡牌小图的布局宽度 ≤ 128px（选牌网格 ~91px、情况页槽位 96/64px、结果页 112px、首页 `size="sm"` 96px），DPR 上限 3 → 128×3 = 384 ≤ 384，恒落在唯一小档。

### 2. `lib/cardImage.ts`（新增，图片契约唯一出处）

- `CARD_IMAGE_WIDTH = 384` —— 与 `next.config.ts` 的 `imageSizes` 对齐
- `CARD_IMAGE_SIZES = "112px"` —— 所有卡牌小图共用的 `sizes`

### 3. `app/components/CardImage.tsx`（新增，唯一图片入口）

封装 `<Image>`（`fill` + 统一 `sizes` + `onError` 透传），模态可显式覆盖 `sizes`。四个调用点改为使用它，裸 `next/image` 调用归零。

### 4. 结果页：删除假预加载；删除 `lib/imageCache.ts`

牌在 `/draw/select` 翻牌时已按**同一个 URL**取到，进入结果页即为缓存命中，不需要额外预热。

### 5. 明确不做：预热放大模态档位

模态档位（DPR2→640、DPR3→1080）依赖设备 DPR，预热需复刻档位规则，且模态是用户**主动点击放大**才出现（本身带过渡动画），为其预热会在每次结果页加载时浪费 100KB+/张的带宽。

---

## 五、实现时对 SPEC 的偏离（3 处，均为收紧）

1. **撤销「点击瞬间预取」**。SPEC 初稿假定"图片在翻牌动画结束后才开始加载"，故计划在点击瞬间预取以争取 `FLIP_DURATION_MS`（700ms）的提前量。
   **核对代码后该假定不成立**：`handleCardSelect` 设置 `flipIndex` 后，`GridCard` 立即以 `isFlipped` 重渲染并挂载 `CardFace`（`app/components/GridCard.tsx`），图片请求在**点击当帧**就已发起。700ms 是翻牌的**视觉时长**，不是加载窗口。该预取最多只提前一帧，属无效优化，**不做**。
   冷缓存的真实开销由档位收敛一并解决——此前冷缓存用户要为结果页额外下载 N × 117KB（`w=640`）。

2. **去掉 `cardImageProps()` / `getImageProps`**。它原是为"渲染与预取共用同一份产物"而设计；预取撤销后即无调用方，留着就是本项目 `tests/no-dead-code.test.ts` 明令禁止的「有测试、没调用方」的伪活代码。

3. **假预加载的断言放进 `tests/no-dead-code.test.ts`**，不在 `card-image-variant.test.ts` 里重复——死代码契约只有一个出处。

---

## 六、验收结果与实测记录（2026-09-17）

- [x] `next.config.ts` 的 `images.imageSizes` 为 `[384]`，`minimumCacheTTL` ≥ 30 天
- [x] `lib/cardImage.ts` 作为契约唯一出处；`CardImage.tsx` 作为唯一入口，四处调用点全部改用它
- [x] 契约测试复算档位证明：所有卡牌小图在 DPR 1/2/3 下解析出的优化 URL **完全相同**（恒为 `w=384`）
- [x] 全库除 `CardImage.tsx` 外无裸 `next/image` 调用
- [x] `lib/imageCache.ts` 已删除，无残留引用
- [x] 端到端实测：结果页对已翻过的牌**无新增图片请求**
- [x] `type-check` / `lint` / `test:run` 全绿

### 6.1 契约测试的变异验证

证明契约真能抓到回归，而非空过：把 `imageSizes` 改回 `[128, 384]` → `不变量成立` 用例**立即变红**，
报 `DPR1 下…expected 128 to be 384`——正是原 bug 的同类（112px 布局宽在 DPR1 下落到 128 档而非唯一小档）。
改回后 7 用例全绿。

### 6.2 端到端实测

`npm run dev` + 真实浏览器，走完「首页 → 问问题 → 五牌阵 → 逐张翻牌 ×5 → 开始解析」：

| 检查点 | 结果 |
|---|---|
| 首页预览三张牌 `img.currentSrc` | 均为 `…&w=384&q=75` |
| 结果页五张牌 `img.currentSrc` | 均为 `…&w=384&q=75`（与翻牌时同一个 URL） |
| 结果页牌面渲染 | 79×126 可见、`opacity:1`、`complete:true`；`naturalWidth:112` = 384 档按 112px 布局宽密度归一化，**反证浏览器确取 `w=384`** |
| **CDP 网络记录（27 条，覆盖全流程）** | `/_next/image` **仅 2 条**（皇后、皇帝——首页未预热的那两张），各一次 `w=384`；**结果页未产生任何图片请求** |

> 愚者/魔术师/女祭司三张因首页预览已按同一 URL 预热，全程零请求。

### 6.3 生产环境缓存头

`npm run build` + `next start`，按浏览器 `Accept` 头请求：

```
w=384（新条目）→ image/webp  54,348 B  Cache-Control: public, max-age=2592000, must-revalidate
原图           → image/jpeg 328,848 B  Cache-Control: public, max-age=0
```

> ⚠️ **部署注意**：`.next/cache/images` 跨构建保留，其中按**旧** `minimumCacheTTL` 写入的条目
> 会继续按旧 TTL（4 小时）下发，直到过期后重新生成才变成 30 天。实测复现过这一点
> （清空前 `w=384` 返回 `max-age=14400`，清空后返回 `max-age=2592000`）。
> 由于旧 TTL 只有 4 小时，属**自愈**问题，不强制清缓存；若要立即生效，部署后删一次
> 服务器上的 `.next/cache/images` 即可。

### 6.4 生产部署验证（2026-09-17）

已按手工流程部署（`main` @ `0ff5d65`），并从公网侧复核：

| 检查 | 结果 |
|---|---|
| `/api/health` | `{"status":"ok","checks":{"redis":"ok"}}` |
| 首页 | HTTP 200 |
| `/_next/image?...&w=384` | `Cache-Control: public, max-age=2592000, must-revalidate` ✅ **核心目标达成**（部署前为 `max-age=14400`） |
| 线上 HTML 的 `srcSet` 阶梯 | `384w, 640w, …, 3840w`——旧小档（16–256）已消失，证明新配置生效 |
| 已删除的 `/api/deepseek` | 404（残留文件未使其复活） |

> **本次部署踩到的坑（已写入 [`DEPLOYMENT.md`](../DEPLOYMENT.md)）**：`tar` 覆盖式部署**从不删除**仓库已删的文件，
> 而本仓库历史删除项不少。首次部署因残留的 `lib/__tests__/grid.test.ts`（引用已删除的 `gridClassFor`）与
> `lib/__tests__/pick.test.ts`（引用已删除的 `lib/pick.ts`）导致 `next build` 类型检查失败。
> 另需注意 `next-env.d.ts` 被 `.gitignore` 忽略、不进 tar 包，但服务器上本该存在——对账时会作为误报出现。

---

## 七、影响范围

- **新增**：`lib/cardImage.ts`、`app/components/CardImage.tsx`、`tests/card-image-variant.test.ts`、`app/components/__tests__/CardImage.test.tsx`
- **修改**：`next.config.ts`、`app/components/CardFace.tsx`、`app/components/TarotCard.tsx`、`app/components/ResultTarotCard.tsx`、`app/components/CardModal.tsx`、`app/result/page.tsx`、`tests/no-dead-code.test.ts`
- **删除**：`lib/imageCache.ts`
- **不动**：`lib/tarot-data.ts`、`public/tarot-images/**`、`app/history/page.tsx`（历史页不渲染图片）

## 八、风险与假设

- **假设**：结果页的牌必然先经过 `/draw/select` 翻牌（抽牌流程必经子页），因此结果页天然命中缓存。若将来出现"直接进结果页且未翻牌"的入口，需重新评估。
- **取舍（已接受）**：`imageSizes: [384]` 使 DPR1/DPR2 下的小图从 5–26KB 变为 53KB/张（含首页三张预览），首次多下约 27–48KB/张，换取"翻过的牌零请求"。
- **风险**：384 为唯一小档，若将来把卡牌渲染放大到 >128 CSS px，DPR3 会跳到 `deviceSizes` 的 640 → 缓存再次分叉。由契约测试的「不变量守护」用例拦截。
- **风险**：`imageSizes` 是全局配置，将来若引入非卡牌的 `<Image>`，需重新评估档位。当前全库图片均为牌面。

---

## 九、备选与弃用方案（当时评估，未采用）

- **路线 A（备选，未实现）**：预生成一套固定尺寸静态缩略图（384w webp，~53KB/张，78 张约 4MB）提交仓库，小图改普通 `<img>` + `immutable` 长缓存，彻底移除运行时 sharp 与档位概念。若将来首次体验仍不达标，可单开条目走该路线（代价：仓库 +4MB、同一张牌两份文件）。
- **路线 C（弃用）**：`images.unoptimized: true` + 给 `/tarot-images/*` 加长缓存头。URL 恒定、零 sharp，但每张 320–450KB，首次翻牌与首次进结果页明显更慢，不采用。
