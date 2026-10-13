import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("F0 冒烟测试：基础设施可用性", () => {
  it("验证 @ 别名解析与纯函数可导入（@/lib/utils）", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("cn 处理条件参数", () => {
    expect(cn("base", true && "on", false && "off")).toBe("base on");
  });
});
