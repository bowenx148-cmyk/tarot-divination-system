"use client";

import { memo } from "react";
import ReactMarkdown, { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  /** 夜空风深色模式（规格 G7）：文字/边框转浅色；默认 light 兼容历史页 */
  variant?: "light" | "dark";
  /** 不渲染分隔线（规格 Y9）：AI 输出小节内的 `---` 不再显示为 <hr>（如核心建议卡内） */
  hideHr?: boolean;
}

// 样式类从旧版正则实现平移，保持视觉一致；variant="dark" 时适配夜空深色背景
const lightComponents: Components = {
  h1: (props) => (
    <h1 className="text-2xl font-bold text-gray-800 mt-8 mb-6" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4 border-b-2 border-purple-300 pb-2" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg font-bold text-gray-800 mt-6 mb-3 border-b border-purple-200 pb-2" {...props} />
  ),
  p: (props) => <p className="mb-4" {...props} />,
  strong: (props) => (
    <strong className="font-bold text-gray-900" {...props} />
  ),
  em: (props) => <em className="italic text-gray-700" {...props} />,
  code: (props) => {
    const { className, children, ...rest } = props;
    const isBlock =
      typeof className === "string" && className.includes("language-");
    return isBlock ? (
      <code
        className={`block bg-purple-100 text-purple-800 p-4 rounded-lg text-sm font-mono overflow-x-auto ${className ?? ""}`}
        {...rest}
      >
        {children}
      </code>
    ) : (
      <code
        className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },
  a: (props) => (
    <a
      className="text-purple-600 hover:text-purple-800 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props) => <ul className="mb-4 list-disc pl-5" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-5" {...props} />,
  li: (props) => <li className="mb-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-purple-300 pl-4 py-2 my-4 bg-purple-50 italic text-gray-700" {...props} />
  ),
  hr: (props) => <hr className="border-t-2 border-purple-200 my-6" {...props} />,
};

const darkComponents: Components = {
  h1: (props) => (
    <h1 className="text-2xl font-bold text-white mt-8 mb-6" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-xl font-bold text-white mt-8 mb-4 border-b-2 border-gold/40 pb-2" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg font-bold text-white mt-6 mb-3 border-b border-gold/20 pb-2" {...props} />
  ),
  p: (props) => <p className="mb-4 text-white/85" {...props} />,
  strong: (props) => (
    <strong className="font-bold text-gold-light" {...props} />
  ),
  em: (props) => <em className="italic text-white/75" {...props} />,
  code: (props) => {
    const { className, children, ...rest } = props;
    const isBlock =
      typeof className === "string" && className.includes("language-");
    return isBlock ? (
      <code
        className={`block bg-white/10 text-gold-light p-4 rounded-lg text-sm font-mono overflow-x-auto ${className ?? ""}`}
        {...rest}
      >
        {children}
      </code>
    ) : (
      <code
        className="bg-white/10 text-gold-light px-2 py-1 rounded text-sm font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  },
  a: (props) => (
    <a
      className="text-gold hover:text-gold-light underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),
  ul: (props) => <ul className="mb-4 list-disc pl-5 text-white/85" {...props} />,
  ol: (props) => <ol className="mb-4 list-decimal pl-5 text-white/85" {...props} />,
  li: (props) => <li className="mb-2" {...props} />,
  blockquote: (props) => (
    <blockquote className="border-l-4 border-gold/50 pl-4 py-2 my-4 bg-white/5 italic text-white/75" {...props} />
  ),
  hr: (props) => <hr className="border-t-2 border-gold/20 my-6" {...props} />,
};

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
  variant = "light",
  hideHr = false,
}: MarkdownRendererProps) {
  if (!content) return null;

  const base = variant === "dark" ? darkComponents : lightComponents;
  const components: Components = hideHr
    ? { ...base, hr: () => null }
    : base;

  return (
    <div className={`prose max-w-none ${className}`}>
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
});
