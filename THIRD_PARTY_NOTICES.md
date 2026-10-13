# 来源与授权清单

截至2026-10-13，本文件列出证据和未解决项，不是完整权属保证或法律意见。发布检查结果见docs/reports/publication/PUBLICATION-READINESS-2026-10-13.md。

| 内容 | 来源/证据 | 当前状态 |
|---|---|---|
| 基础代码、组件、原牌义与项目结构 | Indigo Qiu，https://github.com/HammerRoot/indigo-tarot；根目录LICENSE与package.json保留署名 | CC BY-NC 4.0；保持署名、说明修改及非商业限制，未取得商业许可 |
| 78张结构化参考 | Tarotoo，https://github.com/Tarotoo-com/tarotoo-tarot-dataset | MIT副本保留在lib/knowledge/TAROTOO-LICENSE.txt；快照及SHA256见source.json |
| 624条领域笔记、24条教学摘要 | 本地AI辅助编辑；LearnTarot、CNVC等出处在条目source和docs/knowledge中 | 原创短摘要/应用，未复制完整教材；来源标记不等于第三方背书或准确性保证 |
| 78张牌图 | 继承自上游public/tarot-images | 本地未找到逐图下载来源及独立授权证据；不能仅因韦特原画年代久远就保证这些具体数字文件的全部权利，公开素材核验尚未通过 |
| 用户提供的3张教学截图 | 用户私下提供 | 本机保留，但不再跟踪、发布；不能把提供材料视为拥有公开转载授权 |
| 抽牌声音 | lib/draw-effects.ts自行合成 | 未下载第三方音乐/录音 |
| 动画与UI依赖 | Framer Motion、Tailwind、Lucide等，package-lock.json锁定版本 | 使用包随附许可；可查看node_modules中对应LICENSE，未另行授权第三方牌图 |
| 项目页面截图 | 本地测试浏览器产生，docs/reports/assets | 未包含真实账号历史或Key；仍显示上游牌图，不能据此解除牌图许可缺口 |

本版本新增知识检索、参考快照、用户名记忆、持久试用、牌阵教学、报数与音效偏好、墨绿主题等，保留上游基础功能。不要把全部实现、78张牌图或全部原牌义宣称为本人独立原创；不擅自把继承作品换成MIT。

完整Git历史含本机参考截图，当前忽略文件不清除历史。上传应使用经过检查的独立副本，不能直接把当前仓库所有旧提交推到公开远端。后续授权事项见docs/plan/publication-readiness.md。
