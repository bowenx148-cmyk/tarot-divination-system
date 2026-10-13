"use client";

import { MotionConfig } from "framer-motion";

// 客户端边界（规格 G17）：layout.tsx 是 Server Component，而 MotionConfig 需要 Client Context。
// 直接 import 依赖 framer-motion 的 ESM 构建带 "use client" 指令——该保证不应被当作契约，
// 故显式包一层，让边界由本仓库自己声明。
//
// reducedMotion="user"：系统开启「减弱动态效果」时，framer-motion 自动停用 transform/layout 动画
// （保留 opacity 等不引起前庭不适的部分）。CSS 动画一侧由 globals.css 的
// @media (prefers-reduced-motion: reduce) 覆盖，二者缺一即漏。
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
