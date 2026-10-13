import type { Metadata } from "next";
import { MotionProvider } from "./components/MotionProvider";
import { UserMemoryProvider } from './components/UserMemoryProvider';
import "./globals.css";

export const metadata: Metadata = {
  title: "塔罗指引 · 牌面与对话",
  description:
    "基于 indigo-tarot 二次开发的 AI 塔罗咨询应用，结合参考资料、牌阵教学和咨询记录，帮助梳理当下与行动选择。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <MotionProvider><UserMemoryProvider />{children}</MotionProvider>
      </body>
    </html>
  );
}
