import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";
import { createElement } from "react";

// next/image → 普通 img（去掉 fill/priority/sizes/loading 等非标准属性；
// 用 createElement 生成真正的 React 元素，避免 React 19 元素校验报错）
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { fill, priority, sizes, loading, ...rest } =
      props as Record<string, unknown>;
    void fill;
    void priority;
    void sizes;
    void loading;
    return createElement("img", rest as Record<string, unknown>);
  },
}));
