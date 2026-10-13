# 本机模拟上传

2026-10-13。用户只授权模拟上传，不包含真实GitHub创建/推送或公开操作。用户不要求本轮继续补齐牌图授权证据；来源未核实仍为已知风险，互联网可下载不代表已获得转载许可。原LICENSE及署名保留。

实际执行：独立publication-review副本 → 全新本机bare Git接收仓库，先push --dry-run，再用本地文件传输推送main，比较源/接收端提交哈希、检查树中排除项并运行git fsck --full。

首轮结果：提交7202b0c4efcec8a5114850bec8bc4e0fd6ecf5f9一致，311个受跟踪文件。接收库不含.env.local、.local、node_modules、.next或用户教学原图；LICENSE和.github/workflows/ci.yml均存在。模拟使用的是此前验证过的独立副本，原仓库及原提交历史没有被上传。

接收库位于本机项目.local内，地址保存在私有upload-simulation-result.json。未配置GitHub远端、未使用账号认证、未向公网发送代码。收尾文档保存在主工作项目，不改变上述已验证快照。

本机推送不能证明GitHub账号权限、仓库容量/组织策略、远端密钥扫描或Actions运行成功。实际发布仍需明确目标账号、仓库名称与公开/私有选择，再另行执行。部署网站与上传源代码是两件事。
