import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.TAROT_DIST_DIR || '.next',
  outputFileTracingExcludes: { '*': ['./.local/**/*', './docs/knowledge/user-materials/**/*'] },
  // 仅开发用：Next 16 默认把 dev 资源视为同源白名单（默认 localhost），
  // 用 127.0.0.1 访问会被当成跨源而拦截 dev 资源，导致页面无法 hydrate（整页停在
  // SSR 的入场动画初值上，看起来是空白）。这里把回环地址的两个写法都放行。
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // 关闭 Next 的 agent 文件自动生成（有意为之，见 AGENTS.md 开头的警告）。
  //
  // 原因：生成器 upsertAgentRulesBlock() 用 indexOf 取块标记 `<!-- BEGIN:nextjs-agent-rules -->`
  // 的「首个」出现、再整段替换到「首个」结束标记。AGENTS.md 正文当时**引用了该标记的字面原文**，
  // 于是生成器把正文当成块起点、一路删到文件末尾的真正结束标记——**每次 `next dev` 都删掉
  // 第 1–7 节**（2026-09-17 实际发生，80 行 → 21 行，已从 git 恢复）。
  // 实现在 node_modules/next/dist/server/lib/generate-agent-files.js。
  //
  // 现状：AGENTS.md 正文已不含该标记的字面原文（只提名字不会触发——indexOf 找的是完整标记），
  // 陷阱条件已解除。但**重新启用前请先重新确认这一点**，别只看这条注释。
  agentRules: false,
  images: {
    // 卡牌图片只保留唯一小档（规格 G15，契约见 lib/cardImage.ts）：
    // 所有卡牌小图的「布局宽度 × DPR」≤ 384 → 恒取同一档 → 同一张牌在
    // 首页/选牌页/情况页/结果页解析出同一个 URL，浏览器缓存可复用。
    // ⚠️ 改动此值前必须复算该不变量并跑 tests/card-image-variant.test.ts，
    //    否则同一张牌会再次分裂成两个缓存键（这正是"翻过的牌还要重新加载"的成因）。
    imageSizes: [384],
    // 牌面为不可变静态资源，优化图缓存 30 天（默认仅 4 小时）
    minimumCacheTTL: 2592000,
  },
  async headers() {
    if (process.env.NODE_ENV === "development") {
      return [];
    }
    // CSP 纵深防御（规格 R1-D / 决策 D8）：
    // - Next.js hydration 依赖内联脚本，故 script-src 需 'unsafe-inline'；
    //   default-src 'self' 仍限制外部来源，connect-src 限制 API 调用域。
    // - frame-ancestors 'none' / base-uri / form-action 为 2026-09-16 补全的纵深防御项。
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://api.openai.com; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          // 禁止浏览器按内容嗅探 MIME 类型（防把非脚本当脚本执行）
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 防点击劫持；现代替代为上方 CSP frame-ancestors，两者并存兼容旧浏览器
          { key: "X-Frame-Options", value: "DENY" },
          // 跨站跳转时不泄漏完整 URL（仅发送来源域）
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // 关闭 DNS 预取，减少不必要的第三方域名解析
          { key: "X-DNS-Prefetch-Control", value: "off" },
          // 本应用不需要这些能力，显式关闭
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
