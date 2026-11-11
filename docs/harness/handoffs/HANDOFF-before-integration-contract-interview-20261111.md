# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户补充要求：在接入 knob 前先评估 UVMF，并保证无 knob 也能独立使用。该要求成为第二阶段约束：基础环境独立生成、编译、运行和自动检查，knob 是可选增强，未来保留无 knob 回归。路线图保留 milestone 编号，执行顺序调整为 M0 → M2 → M1 → M3 → M4 → M5 → M6。Q1～Q8 已确认的使用者、首版目标和 DV 自由度不重问，见 docs/design/phase2-goals-interview.md 与 phase2-uvmf-roadmap.md。

knob-uv7.6 已完成并关闭：用 UVMF 2023.4_2 的 ALU YAML 经当前生成器生成，再合并包内旧版 completed_solution 的业务 custom 区块；本机 VCS W-2024.09-SP1 / UVM 1.2 三套编译和五次仿真通过预期。seed101 基线21匹配，重放轨迹一致；seed202为20匹配；独立 DUT 位翻转产生21条SCBD mismatch/UVM_ERROR，原始退出码仍0；相同 YAML 再生成保留全部60个HDL文件，重编译seed101轨迹仍一致。所有场景25个随机请求均完成，reset操作不产生算术结果。基线/重放/seed202使用同一产物，simv及共享库运行前后哈希不变。

报告 docs/design/uvmf-standalone-evaluation.md；复现入口 experiments/uvmf-standalone/README.md、experiment.mjs、compile.sh、run.sh；检查 docs/harness/uvmf-standalone-checks.json；稳定证据 docs/design/evidence/uvmf-standalone-20261111/（68个文件与manifest）。实际输出 build/uvmf-standalone/repro2；之前探测和沙箱失败输出保留在同级。Node v20.19.2，uv0.11.21，通过uv运行固定CPython3.12.13及随包依赖，未安装Python包。编译/运行脚本保留本机VCS包装入口，尚不是跨机器部署工具。

已知限制：默认官方入口面向Questa，实验使用显式VCS文件清单；旧ALU教程输入monitor缺少custom结束标记，先记录合并失败再只补齐工作副本；区块外额外test/sequence include在再生成时被覆盖，因此本轮运行当前test_top，不是旧ALU_random_test。每套编译保留2条TFIPC，每次运行保留COVERAGE_MODEL_REVIEW/PREDICTOR_REVIEW；生成器还有response_info弃用和4条Python转义SyntaxWarning。没有修改UVMF核心库或生成器。此次只验证固定版本、相同YAML再生成，不声称任意接口变化、跨版升级、完整覆盖或任意工具兼容。

原始UVMF包及实验副本中的基础库/生成器逐文件未变；原始2112文件与先前归档哈希核对通过。根目录和build/vendor/uvmf/incoming中的UVMF_2023.4_2.tar.gz均保留且一致：16247563字节，SHA256 36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0。release.INFO为2024-08-05:817b9746ddcfa2b003d5034380a9dc44a3fc14bc。来源是用户提供，无官方独立校验值或签名，勿当认证。原解包位置build/vendor/uvmf/unpacked/UVMF_2023.4_2。此前包核查见docs/design/uvmf-package-inspection.md与docs/harness/uvmf-package-checks.json。第三方源码、原包和仿真产物均保持Git忽略，不随评估入口发布。

Beads地图knob-uv7继续in_progress。已解决：.1官方资料、.5发行包输入、.6独立能力实验；.2接入合同及可选knob扩展边界、.3公共部署与版本管理重新成为可领取前沿；.4详细首版验收依赖.2/.3。地图描述已记录用户对原“仅规划”范围的限定实验授权。下一步以本轮证据讨论无knob基础工程的输入/输出、手写代码边界和部署合同，再设计可选knob。不得把本轮ALU实验视为通用公共框架或另一位DV自助验收已完成。

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
