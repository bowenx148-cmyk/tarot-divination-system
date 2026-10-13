import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");

function readSource(relPath: string): string {
  return readFileSync(resolve(root, relPath), "utf8");
}

function walkSources(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(resolve(root, dir), { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkSources(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.")) {
      out.push(full);
    }
  }
  return out;
}

// 全库静态契约。**只收录"类别规则"**——即"任何出现都错"的模式。
//
// 刻意不收「某个已删除的符号不得再现」这类**墓碑断言**（历史上这里曾有 8 个符号
// 模式 + 4 个"文件必须不存在"，2026-09-17 清理）。原因：
//   1. 它们用裸子串匹配，会误伤将来恰好同名的新代码——实测新模块里一个叫
//      `preloadBatch` 的合法函数、甚至注释里提到 `imageCache`，都会判失败；
//      而失败信息「不应包含 X」会诱导读者去删掉那段**新写的**代码。
//   2. 它们抓不到真正的事故：2026-09-17 的部署构建失败发生在**服务器**工作树上
//      （tar 覆盖不删文件留下的残留），而本文件跑在**仓库**里——当时它是绿的。
// 删除项及其理由记在 docs/archive/ 的对应条目里，不在这里。要防"伪活代码"
// （有测试、没调用方），正确做法是通用的"每个模块必须有生产调用方"检查，
// 而不是枚举历史。
describe("仓库卫生契约：禁止有偏洗牌", () => {
  it("全库不再使用 sort(() => Math.random() - 0.5)", () => {
    const biased = /\.sort\(\s*\(\s*\)\s*=>\s*Math\.random\(\)\s*-\s*0\.5\s*\)/;
    for (const file of [...walkSources("app"), ...walkSources("lib")]) {
      // 去掉注释后再匹配：shuffle.ts 的说明性注释里正当地引用了这个反例
      const code = readSource(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(
        code,
        `${file} 应改用 lib/shuffle.ts，而非比较器不稳定的 sort 洗牌`,
      ).not.toMatch(biased);
    }
  });
});

describe("仓库卫生契约：临时脚手架不得残留", () => {
  it("变异测试的临时目录 __mutation__ 不得残留", () => {
    // 验证「测试能否抓到 bug」时会在 lib/server/__mutation__/ 放刻意写坏的副本。
    // 那是临时脚手架，绝不能提交——本项目曾因线上 OOM 事故付出过代价，
    // 一个残留的坏 stats.ts 副本会是最恶劣的那种「看起来像正式代码」的陷阱。
    for (const dir of ["lib/server/__mutation__", "lib/__mutation__"]) {
      expect(existsSync(resolve(root, dir)), `${dir} 不应存在`).toBe(false);
    }
  });
});
