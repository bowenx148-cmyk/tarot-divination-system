#!/usr/bin/env bash
# 生产部署脚本（git 版，规格 N11）
#
# 用法：在 /root/indigo-tarot 下执行 `./deploy.sh`
# 前置：该目录已是 git 仓库（首次从 tar 迁移的一次性步骤见 docs/DEPLOYMENT.md §3.3）
#
# 流程：记回退锚点 → 拉取并硬重置 main → 构建重启 → 等待就绪 → 验证 → 打印回退提示
# 不追求 CI/CD 自动部署——发布终点是人确认（见 docs/SPEC.md 决策 D16）。
set -euo pipefail

# 回退锚点 = 当前线上版本（部署坏了用 git reset --hard <锚点> 回退）
PREV="$(git rev-parse --short HEAD)"
echo "回退锚点：${PREV}"

# 拉取并硬重置到 origin/main（自动删除仓库已删的文件）
git fetch origin main
git reset --hard origin/main

# 构建与重启。**这一段依赖 set -e**：构建失败就绝不重启，线上保持旧版本（被动保护）。
npm ci
npm run build
pm2 restart indigo-tarot

# === 以下为验证段 ===
#
# 与上面相反，本段用 `|| …` 逐个兜住失败，**不让 set -e 中断**：
# 部署已经发生，验证的瞬时失败不该打断脚本、让人误以为部署失败。
# 全部结果照常打印，最后由退出码表态。
#
# 2026-09-18 真实踩过：`pm2 restart` 返回时端口尚未监听，紧接着的 curl 扑空返回非零，
# set -e 当场杀掉脚本——输出停在「健康检查」表头，一次成功的部署看起来像失败了。

# 等待就绪：pm2 restart 返回 ≠ 应用已监听端口
echo "--- 等待应用就绪（最多 30s）---"
ready=0
for i in $(seq 1 30); do
  # 任何 HTTP 响应都算就绪——含 503（那是应用正常、Redis 挂了，属另一类问题，
  # 会在下面如实打印出来，不该在这里被当成"没起来"而一直等）
  if curl -s -o /dev/null localhost:3000/api/health; then
    echo "就绪（第 ${i} 秒）"
    ready=1
    break
  fi
  sleep 1
done
[ "${ready}" = "1" ] || echo "⚠️ 30 秒内未就绪"

echo "--- 进程 ---"
pm2 status indigo-tarot || echo "（pm2 status 失败）"

echo "--- 健康检查（应用 + Redis；503 = Redis 连不上）---"
curl -s localhost:3000/api/health || echo "（无响应）"
echo

echo "--- Nginx 链路（80 → 3000）---"
curl -s -o /dev/null -w 'HTTP %{http_code}\n' localhost || echo "（无响应）"

echo
echo "部署完成。当前版本：$(git rev-parse --short HEAD)"
echo "若需回退：git reset --hard ${PREV} && npm run build && pm2 restart indigo-tarot"

# 退出码表态：未就绪即失败
if [ "${ready}" != "1" ]; then
  echo "⚠️ 应用未就绪——请查：pm2 logs indigo-tarot --lines 50"
  exit 1
fi
