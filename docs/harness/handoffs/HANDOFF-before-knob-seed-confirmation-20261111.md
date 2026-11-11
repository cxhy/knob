# knob 当前交接

更新日期：2026-11-11。

最新答复：Q26/Q27 均采纳，首版沿用 ALU 并通过新公共入口重新验收，覆盖一次代表性 YAML 增量再生成及重编译运行。其余目标/接入/部署/验收问题已过完，现回访 Q19：推荐将生命周期作为后续 ALU 可选 knob 接入的普通实现与验证项，不另设六类前置实验阻塞规格收敛；具体回调由实现选择，实际有问题再补定向检查。调整建议待用户回答，未自动批准旧独立实验。.2 继续 in_progress，.3 已关闭，.4 仍受 .2 依赖；未冻结规格或启动实现。记录 phase2-acceptance-interview.md 与 phase2-integration-contract-interview.md。未提交推送。

最新答复：Q23～Q25 全部采纳，Q20～Q25 公共部署原则已收敛，knob-uv7.3 已保存完整结论评论并关闭（仅设计决定完成）。统一入口、已发布版本不变及依赖准备后离线使用尚未实施验收。继续过完问题：docs/design/phase2-acceptance-interview.md 的 Q26 完整示例是否沿用 ALU、Q27 是否覆盖代表性 YAML 增量再生成待答。.4 仍受 .2 依赖，未开始实施或冻结规格；Q19 仍留后核对。无提交推送。

部署访谈最新答复：Q20 采纳公共多版本安装，公共依赖后续统一放 workspace，具体子目录待定；Q21 采纳项目固定版本、主动升级及保留回退；Q22 先用当前 VCS/UVM，用户强调高度向后兼容，不围绕假设性兼容差异展开额外设计。knob-uv7.3 保持 in_progress，下一轮 Q23～Q25 为统一入口范围、公共版本维护与离线使用要求，见 docs/design/phase2-deployment-interview.md。Q19 继续留后核对，不阻塞访谈；未移动公共依赖、运行新实验或提交推送。

最新用户指令：生命周期 Q19 先记录，所有问题过完后再核对，不见得是大问题。不把它当当前阻塞，不定性为已确认缺陷，也不要求现在批准实验。源码事实与候选方案保留在 docs/design/uvmf-knob-lifecycle-proposal.md。knob-uv7.2 保持 in_progress；已领取 knob-uv7.3，继续公共依赖部署与版本管理访谈，Q20～Q22 待答，见 docs/design/phase2-deployment-interview.md。未启动新实验、冻结规格或提交推送。两个项目 MCP 已记录，不再排查无 RTL 时缺图。

本轮按用户要求在 AGENTS.md 记录两个项目 MCP：hdl-kgraph 用于 RTL 解析查询，xverif 用于验证工具调用。已继续 knob-uv7.2 生命周期源码核对：UVMF 基类在 super.build_phase 内创建并随机化 configuration；生成模板 post_randomize 扩展点晚于求解，pre_super 时 configuration 尚未创建。约束类 knob 的候选接法及限制记录于 docs/design/phase2-integration-contract-interview.md 的生命周期核对段；下一步检查配置类扩展点与子配置随机化链，再安排受影响实验。尚未实现、冻结合同或执行新的 VCS 验证；.2 保持 in_progress。既有工作区修改保留，未提交推送。

## Codex 重启恢复入口

用户随后澄清：目前尚无 RTL，只需确认已有 hdl-kgraph MCP 服务。缺项目图数据库属于尚无输入的预期状态，不作为当前设计收敛的阻塞；现在不建图、不修服务、不要求项目查询验证。实际 RTL 到位后再准备图和验证调用。当前可继续 `.2` 的 UVMF 配置随机化与可选 knob 生命周期收敛。

2026-11-11 重启后已恢复并核验：当前客户端识别 `hdl-kgraph`，但 MCP initialize 握手连接关闭，工具未暴露。从 knob 目录直接运行 `/home/guodz/.local/bin/hdl-kgraph serve --mcp` 返回码 2，明确报当前目录及父目录没有 `.hdl-kgraph/graph.db`。服务注册与此前隔离 stdio 验证仍有效，当前项目尚不可调用。未改配置、重装、建图或访问 CHI；下一步须按批准的输入、filelist、宏及 include 路径准备项目图，再核验会话调用。`.2` 继续 in_progress，`.7` 保持 closed。已恢复 Q1～Q18，不重问；本次无编译或功能验收。

用户要求保存进度，准备重启 Codex 加载 hdl-kgraph MCP。本轮仅保存交接、任务和会话，不继续配置或探测服务。重启前完整交接归档：docs/harness/handoffs/HANDOFF-before-codex-restart-20261111.md。

原始会话本地快照已保存，指针为 build/session-backups/latest-restart-snapshot.json；native session ID 为 01a1c860-b60f-7ac0-b2ee-d53afab458d2。快照包含保存时的 4,905 条 JSONL 记录、21,275,715 字节，SHA-256 为 572ee3d4a5c452ac94bc570e732d14f36c5063831000811837988c72f31d5797；已验证 JSONL 与会话身份，目录/文件权限为 700/600，受 Git 忽略，不提交原始会话。完整会话导入 Nowledge 未成功：CLI 报 cold replay 所需 atomic history admission 不受支持，明确未写入回放且保留原历史。没有用摘要或伪造线程替代实际导入；项目阶段记忆另行正常保存。

恢复时先核对 Git 工作区和本项目 Beads，读取 docs/design/phase2-integration-contract-interview.md 与 docs/design/hdl-mcp-input-inspection.md。Q1～Q18 已有回答，不重新访谈。最重要的责任边界是：设计文档/RTL 不一致及设计信息缺口反馈设计人员解决；验证工程再生成合并冲突由 DV 修复。

用户恢复工作后，先确认当前会话实际暴露 hdl-kgraph 工具。该服务已在另一轮注册并完成隔离最小 stdio 验证，knob-uv7.7 已关闭；不要重复安装或重新索要已记录的服务路径。服务需要项目自己的 .hdl-kgraph/graph.db，现有记录不代表 knob 根目录已有可用图。若缺数据库，先明确隔离输入、设计 filelist、宏和 include 路径，不自动索引 CHI，不覆盖已有数据库，也不把临时测试图配置成全局默认。参数位宽仍可能是表达式文本，不能当作已展开的数值。

随后继续 knob-uv7.2 的工具事实核对与接入设计收敛，包括 UVMF 配置随机化与可选 knob 初始化顺序。该决定仍 in_progress；公共部署/版本管理 knob-uv7.3 尚未解决，首版验收 knob-uv7.4 依赖 .2/.3，第二阶段尚未进入正式实现。完整路线及已有证据见下文。

Git master / v1.2.0 基线为 8847bc7。第二阶段文档、实验入口、证据及其他既有修改均留在工作区，本轮未提交或推送。Beads 已导出到 .beads/issues.jsonl；它是任务快照，不是完整数据库备份。

## 当前阶段

2026-11-11 HDL MCP 接入更新：用户已授权接入，`hdl-kgraph` 已注册到 Codex 全局配置，command 为 `/home/guodz/.local/bin/hdl-kgraph`，args 为 `serve --mcp`。独立真实 stdio 握手、9 个工具列举及模块/层级/端口映射查询通过；knob-uv7.7 已关闭，取代下文入口未知的历史阻塞。详见 docs/design/hdl-mcp-input-inspection.md 及 docs/design/evidence/hdl-mcp-20261111/。当前会话仍需重新加载 MCP；服务要求当前项目先建立 `.hdl-kgraph/graph.db`，未固定到测试或其他工程数据库。本轮仅解析隔离最小输入，未索引 knob 或 CHI、未执行真实 DUT 连线或 VCS 验收。完整旧交接归档 docs/harness/handoffs/HANDOFF-before-hdl-mcp-registration-20261111.md。

用户正在收敛新项目接入约定。knob-uv7.2 保持 in_progress，使用 grill-with-docs；Q9～Q11 已回答：采用原生 UVMF YAML 模板加少量工程配置，并为未来常见模块/常见场景模板保留升级扩展方向；持续再生成；允许骨架编译和基础冒烟，但未完成业务激励/检查不能报告功能通过。没有批准具体场景库、格式或任意代码自动合并。GLOSSARY 已补充场景模板与骨架检查的含义。

Q12～Q14 已回答：直接引用设计提供的 filelist；再生成冲突由 DV 修复，用户强调这是构建验证框架时的常见维护工作；项目与团队自行扩展场景模板是框架增长的必经之路。不要把候选目录、备份和自动诊断的全部实现细节当成逐项批准，也不要求框架自动修复所有冲突。

Q15～Q16 已回答：RTL 解析使用用户指定的 hdl-kragph MCP，依据设计交付文档连线，首版完全手写 DUT 连线的原推荐未获采纳。Q16采纳可选knob初始化模板和典型参数示例，由DV显式声明/应用，YAML批量生成留后续。具体UVMF配置随机化与knob准备顺序仍需核查。

Q17～Q18 已回答：Q17同意保存可编辑连线映射及RTL/设计文档来源，供DV修订与后续再生成；Q18更正责任人，设计文档与RTL不一致或设计交付信息缺失应直接反馈设计人员，由设计负责澄清和修正。Q13所说验证工程再生成的合并冲突仍由DV修复，两类责任不可混淆。本轮只记录反馈职责，没有对外发送消息。记录 docs/design/phase2-integration-contract-interview.md；此前Q1～Q18已确认内容不重问，规格尚未冻结。

用户明确表示MCP由其处理，完成后通知。本轮等待通知，不再探测、安装、修改配置或重复测试服务。已看到本文件开头及输入核查文档中的另一轮hdl-kgraph接入记录，保留已关闭的knob-uv7.7及其证据；独立stdio最小查询不等于当前会话已加载或真实DUT已验证。收到用户通知后继续相关事实核验与接入设计收敛，knob-uv7.2保持in_progress。

历史输入阻塞：knob-uv7.7「准备 HDL 解析 MCP 的可调用入口与接口说明」最初因当前工具列表和常用配置未发现入口而blocked，现已被开头的独立接入记录解决并关闭。历史核查与后续结果均保存在 docs/design/hdl-mcp-input-inspection.md；勿按旧记录重新索要入口或重开事项。访谈开始前交接归档 docs/harness/handoffs/HANDOFF-before-integration-contract-interview-20261111.md。

用户补充要求：在接入 knob 前先评估 UVMF，并保证无 knob 也能独立使用。该要求成为第二阶段约束：基础环境独立生成、编译、运行和自动检查，knob 是可选增强，未来保留无 knob 回归。路线图保留 milestone 编号，执行顺序调整为 M0 → M2 → M1 → M3 → M4 → M5 → M6。Q1～Q8 已确认的使用者、首版目标和 DV 自由度不重问，见 docs/design/phase2-goals-interview.md 与 phase2-uvmf-roadmap.md。

knob-uv7.6 已完成并关闭：用 UVMF 2023.4_2 的 ALU YAML 经当前生成器生成，再合并包内旧版 completed_solution 的业务 custom 区块；本机 VCS W-2024.09-SP1 / UVM 1.2 三套编译和五次仿真通过预期。seed101 基线21匹配，重放轨迹一致；seed202为20匹配；独立 DUT 位翻转产生21条SCBD mismatch/UVM_ERROR，原始退出码仍0；相同 YAML 再生成保留全部60个HDL文件，重编译seed101轨迹仍一致。所有场景25个随机请求均完成，reset操作不产生算术结果。基线/重放/seed202使用同一产物，simv及共享库运行前后哈希不变。

报告 docs/design/uvmf-standalone-evaluation.md；复现入口 experiments/uvmf-standalone/README.md、experiment.mjs、compile.sh、run.sh；检查 docs/harness/uvmf-standalone-checks.json；稳定证据 docs/design/evidence/uvmf-standalone-20261111/（68个文件与manifest）。实际输出 build/uvmf-standalone/repro2；之前探测和沙箱失败输出保留在同级。Node v20.19.2，uv0.11.21，通过uv运行固定CPython3.12.13及随包依赖，未安装Python包。编译/运行脚本保留本机VCS包装入口，尚不是跨机器部署工具。

已知限制：默认官方入口面向Questa，实验使用显式VCS文件清单；旧ALU教程输入monitor缺少custom结束标记，先记录合并失败再只补齐工作副本；区块外额外test/sequence include在再生成时被覆盖，因此本轮运行当前test_top，不是旧ALU_random_test。每套编译保留2条TFIPC，每次运行保留COVERAGE_MODEL_REVIEW/PREDICTOR_REVIEW；生成器还有response_info弃用和4条Python转义SyntaxWarning。没有修改UVMF核心库或生成器。此次只验证固定版本、相同YAML再生成，不声称任意接口变化、跨版升级、完整覆盖或任意工具兼容。

原始UVMF包及实验副本中的基础库/生成器逐文件未变；原始2112文件与先前归档哈希核对通过。根目录和build/vendor/uvmf/incoming中的UVMF_2023.4_2.tar.gz均保留且一致：16247563字节，SHA256 36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0。release.INFO为2024-08-05:817b9746ddcfa2b003d5034380a9dc44a3fc14bc。来源是用户提供，无官方独立校验值或签名，勿当认证。原解包位置build/vendor/uvmf/unpacked/UVMF_2023.4_2。此前包核查见docs/design/uvmf-package-inspection.md与docs/harness/uvmf-package-checks.json。第三方源码、原包和仿真产物均保持Git忽略，不随评估入口发布。

Beads地图knob-uv7继续in_progress。已解决：.1官方资料、.5发行包输入、.6独立能力实验；.2接入合同及可选knob扩展边界已领取访谈中，.3公共部署与版本管理仍可领取；.4详细首版验收依赖.2/.3。地图描述已记录用户对原“仅规划”范围的限定实验授权。下一步以本轮证据讨论无knob基础工程的输入/输出、手写代码边界和部署合同，再设计可选knob。不得把本轮ALU实验视为通用公共框架或另一位DV自助验收已完成。

首版面向熟悉SV/UVM但不熟UVMF的DV，优先新模块/新环境；框架提供公共结构和工具入口，DV负责协议行为、业务激励、参考模型/检查和覆盖。流程可自由增减，pattern/业务模板低优先级，存量迁移暂缓。M5仍为首版自助使用交付，M6后续真实项目试点。

CHI未访问或修改。此前knob-b92隔离快照仍在build/uvmf-pilot/chi_async_bridge-20261111/source，原始源HEAD e41cff47974bdd1ca66f8e9e9160e52f1d9b8c3d，424个选定文件来自脏工作区，哈希/inode核对证据见docs/design/phase2-chi-pilot-isolation.md；它不是完整CHI验证或持久备份。按用户纠正，当前不从具体项目开始，停止副本迁移和基线运行。任何未来试点不得回写原项目。

公开资料研究仍在已推送独立分支research/uvmf-integration-facts-20261111，提交3d6d3a8acdcc71abc4f50ecb0f18be89afeee457，未合并。其历史“未取得包/未运行”由本轮包核查及实测报告补充，不改写旧证据。

master HEAD与稳定v1.2.0保持8847bc73dee4bced619ee1ef526150c441e37fcd。本轮未提交或推送；此前第二阶段未提交修改均保留，现增加experiments/uvmf-standalone和评估证据。产品src/examples/scripts/knob.f及正式knob规格与HEAD一致；没有重跑无关第一阶段回归。Beads已导出。完整旧交接归档docs/harness/handoffs/HANDOFF-before-uvmf-standalone-20261111.md。

## 上一阶段：公开 README

用户要求参考公开开源项目完善 README，事项 knob-4o1 已完成。研究 SVUnit、VUnit、CLI11 和 Standard Readme 第一方资料，参考记录在 docs/design/readme-reference-notes.md。README 现在包含用途与配置例子、兼容环境、外部用户快速体验、成熟工程接入清单、配置规则、文档导航、开发验证、反馈与 AGPL 许可证入口；没有增加未经验证的兼容性或 CI 徽章。

本轮从 README 提取独立宿主编译与运行命令，在现有 checkout 中执行（未重复 clone），通过环境变量指定本机 VCS 包装入口。新增编译 build/readme-host 无 VCS Warning-/Error-；两次实际运行目录 runs/readme-hhQmIaZJ，配置 A 为 8 条事务，配置 B 为 10 条 link0/长度256 事务，两次均 pass/raw0，运行间产物哈希不变。5 个 Bash 块语法、23 个本地链接及 8 个章节锚点通过。产品代码未变，未重跑完整回归。

检查记录 docs/harness/knob-readme-checks.json；证据 docs/design/evidence/readme-quickstart-v1.2/ 包含 32 个文件及 manifest。本轮更新前的交接保存在 docs/harness/handoffs/HANDOFF-before-readme-refresh-20261111.md。本轮基线 a11c359，完成后按已授权远端 master 流程提交同步。

## 上一阶段：远端与接入指南

用户已明确授权将项目推送到 https://github.com/cxhy/knob，并要求统一使用 master。事项 knob-3bj 已完成：远端原 main 已重命名为 master，GitHub 默认分支为 master；本地 master 跟踪 origin/master。远端原初始化提交 0f7f7b1 只有 LICENSE，已通过合并提交 03d4c2d 保留双方历史与原 LICENSE，随后普通推送成功，未强制推送。交接和事项导出更新后继续同步到同一远端。

本轮只变更 Git 远端、分支和交接状态，未修改产品代码，未重新执行仿真。Beads 数据库仍为本地管理；Git 中的 issues.jsonl 是导出快照，本次未配置或推送 Dolt 数据库远端。推送前交接已归档到 docs/harness/handoffs/HANDOFF-before-github-push-20261111.md。

用户要求面向验证开发人员编写接入说明，事项 knob-ail 已完成。新增 docs/design/integration-guide.md，覆盖接入职责、生命周期、编译输入、声明/绑定/冻结、sequence/item 随机化顺序、组件及普通类、业务校验、运行、seed 和排错。README 与 quickstart 已加入入口。文档面向现行 v1.2，不改变产品接口或行为。

本轮核对 API 与宿主源码，检查 2 个 Bash 代码块语法和 24 个文档链接。复用源码与构建输入均一致的 95744e3 产物，按指南执行 4 次实际 VCS 运行：配置 A 发出 8 条事务；配置 B 发出 10 条、均来自 link0 且长度 256；同 seed 重放四类轨迹一致；未知键在零事务时触发 KNOB_UNKNOWN，原始码仍为 0。产物哈希未变。本轮未重新编译，未重跑完整回归。

文档验证目录为 runs/integration-guide-JRKramLs；稳定证据 docs/design/evidence/integration-guide-v1.2/ 包含 56 个文件及 manifest；检查记录 docs/harness/knob-integration-guide-checks.json。本次文档更新前完整交接已归档到 docs/harness/handoffs/HANDOFF-before-integration-guide-20261111.md。

## 已完成的实现修复

用户要求修复全量审查确认的两项 P2 问题。knob-8nh（NUL 导致非法尾缀丢失）与 knob-zkf（负例回归误判）均已修复并关闭。先失败再通过的验证、完整 VCS 回归与独立 Standards/Spec 复核均已完成；双轴复核没有新增发现。

正式规格仍为 docs/design/knob-spec.md v1.2，本次未修改公共接口或需求。已完成事项 knob-l8r 的正文与现行规格逐字一致；历史 v1.1 母事项 knob-be2 对应 docs/design/knob-spec-v1.1.md。

## 本次修复

- src/knob_pkg.sv：load_and_freeze 通过 $fgetc 读取原始字节，在转成 SV string 前拒绝 NUL，输出 KNOB_SYNTAX 与文件行号。注释中的 NUL 同样拒绝；保留 LF、CRLF、EOF 无换行和读取错误处理。
- scripts/test.sh、scripts/test-framework.sh：预期失败时独立检查原始进程码为 0。核心、接口及宿主回归均要求预期 ID 出现在 UVM_FATAL 诊断头部，排除 warning/info 和消息正文里的伪 ID。
- scripts/test-host.sh：新增 8 个 NUL 边界负例和 3 个合法文本边界正例，宿主场景由 18 增至 29。
- scripts/test-verdict.sh：16 个完整回归 CLI 判定场景，可用 make test-verdict 单独执行。复制真实运行及回归脚本，只替换 simv；使用录制日志推进到目标负例。它仍沿用本机环境脚本，但不启动 VCS 或占用许可证。

用户的结果判定约定不变：UVM_FATAL 的原始退出码允许为 0；VCS 非零退出码独立属于运行异常。宿主无需使用 KNOB_DEMO_PASS 或项目示例的汇总状态码。脚本替身产生的 124/139 不是实际 VCS 超时或崩溃。

## 验证与证据

固定 VCS W-2024.09-SP1、UVM 1.2。重新编译核心和独立宿主后，修复阶段实际执行并通过全部 100 个 VCS 场景：核心 58、接口 13、宿主 29；另有 16 个脚本判定场景通过。该次修复未复用历史仿真结果替代新代码验证。两套编译日志均无 VCS warning/error；回归期间 simv 及共享库保持不变。

最终运行目录：

- 核心：runs/regression-uK7Mlvbb；指针 build/poc/latest-regression.txt。
- 接口：runs/framework-3MK5QqDX；指针 build/poc/latest-framework.txt。
- 宿主：runs/host-nLSxIow4；指针 build/host-isolated/out/latest-host.txt。
- 脚本判定：runs/verdict-zKNgTuvl；指针 build/review-fixes/latest-verdict.txt。

当前核心库 SHA-256：03fb4758719501d9f8642dbf901813eb74420ce87502ed84b96d706c6dcc95ed。
核心/接口 simv：7af8675aee8fb4bd8940a9f5095c10470ef59c99fd06f97e6730a5a61abffa80。
宿主 simv：29e83b46ec7c74d13d450608e1e49aa4e639c29f67877ffd4d49797bdb277464。

验收报告：docs/design/review-fixes-results.md。完整证据：docs/design/evidence/review-fixes-v1.2/，含修复前反例、最终三组仿真、脚本判定、源码快照、编译记录及共享库标识。检查记录：docs/harness/knob-review-fixes-checks.json，已核对 1540 个归档文件哈希、20 个当前源码/文档哈希和 29 个文档链接。Shell 语法、空白检查及 Beads/规格一致性均通过。

复现顺序：make compile、make compile-host、make test-all。test-all 先执行脚本判定，再执行核心、接口和宿主回归；回归内部不编译。原始审查报告 docs/design/code-review-a9398e0.md 与旧证据保持原样，末尾增加修复报告链接。

## 范围与接入约定

配置使用方可以是 sequence/item、UVM 组件、普通 SV 类，以及能取得句柄的 task/function。每个可调值显式接入，全部声明和使用位置先登记，再统一加载、校验和冻结。普通使用方在冻结后读取；对象可在冻结后创建。相关行为及随机化必须在应用配置后执行。

每次运行从专用 knob.cfg 加载，永久不支持运行中修改，暂不支持命令行覆盖。类型仍为 signed64 整数与布尔；每次仿真显式提供唯一的原生 seed。仍依赖 UVM，不修改编译期 parameter、位宽或 generate。需要在更早阶段读取时，宿主必须提前完成全部登记和冻结。依据为 ADR-0001、0002、0004、0005。

接入入口为 README.md、docs/design/quickstart.md、docs/design/knob-api.md、knob.f 与 examples/host/。示例包含 sequence/item、driver 延时和普通 SV 类帧头策略；实际验证了其中的 task/function，尚未逐个实现 monitor、scoreboard 或真实 DUT 协议。宿主负责句柄传递、阶段顺序、字段宽度和算术安全。

## 后续与项目状态

两项已确认审查缺陷均已处理。下一步可在真实验证工程开展接入试点，无需重做需求访谈。复现只承诺固定产物、环境、配置、seed、外部输入与随机化过程。

继续工作时读取 AGENTS.md、正式规格、GLOSSARY 和相关 ADR，恢复本项目 Beads（.beads/embeddeddolt，前缀 knob）。.beads/issues.jsonl 已导出本轮事项状态；它不是完整数据库备份或自动同步源。

分支 master，origin 为 https://github.com/cxhy/knob.git，已按用户授权推送并跟踪 origin/master。实现修复提交为 95744e3（基线 96b737e），本轮文档以 95744e3 为基线；最新本地提交与工作区状态分别以 git log -1 --oneline、git status 为准。构建、运行产物和数据库保持忽略；验收证据纳入 Git。

修复阶段更新前的完整交接保存在 docs/harness/handoffs/HANDOFF-before-review-fixes-20261111.md。历史规格、验收报告和原始证据均保留。
