# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户已提供 UVMF_2023.4_2.tar.gz，M1 的发行包输入阻塞已解除，knob-uv7.5 已关闭。根目录与 build/vendor/uvmf/incoming/ 两份归档一致：16,247,563 字节，SHA-256 36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0；包内 release.INFO 为 2024-08-05:817b9746ddcfa2b003d5034380a9dc44a3fc14bc，版本模块为 2023.4_2。来源记为用户提供，没有独立官方签名/校验值，不把本地哈希冒充官方认证。两份原始文件均保留；新增根目录 UVMF 归档 Git 忽略规则，未发布第三方包。

解包目录 build/vendor/uvmf/unpacked/UVMF_2023.4_2/；归档共 2,529 项，2,112 个普通文件和 417 个目录，无链接/特殊项，逐文件与归档核对且静态调查后哈希未变。报告 docs/design/uvmf-package-inspection.md，检查 docs/harness/uvmf-package-checks.json，完整清单在 build/vendor/uvmf/audit/。已核对 Python3.7+ release notes 与随包依赖（Jinja2 3.1.3、MarkupSafe 2.1.5、PyYAML 6.0.1、voluptuous 0.14.2）；旧 README/PDF 部分 Python 说明过时。入口主动把随包依赖放在导入路径前部，不可只看外部环境包版本。找到 custom 标记合并、模板目录替换和配置 build 阶段随机化的源码依据；默认构建入口主要面向 Questa/Veloce，需后续评估 VCS 适配。没有运行包内 Python、安装依赖、生成、编译或仿真。下一步可讨论接入合同/knob 生命周期与公共部署方式，不重问已完成的包获取。

目标访谈 Q1～Q8 已全部获用户确认，见 docs/design/phase2-goals-interview.md。首版提供环境部署入口、可调整的基础流程说明和完整可运行示例，由另一位懂 UVM 的 DV 按文档自助跑通并开始新模块接入；框架提供公共结构/工具/knob/扩展位置，DV 负责模块接口连接和业务验证逻辑。优先新模块和新环境，存量暂缓，pattern 与业务模板低优先级，保留 DV 自行增减流程的自由。

正式 wayfinder 地图已建立：原事项 knob-uv7 转为 epic「规划 UVMF 新环境部署与 knob 接入」，仅标记 wayfinder:map。子事项为官方资料核查（knob-uv7.1，已关闭）、接入合同与 knob 扩展边界（knob-uv7.2）、公共部署与版本管理（knob-uv7.3）、细化首版验收证据与规格入口（knob-uv7.4）及官方发行包设计输入准备（knob-uv7.5，已关闭）。原生依赖为公开资料核查 → 发行包输入 → 两项方案讨论 → 详细验收；两项方案讨论已可领取，查询方式见 docs/agents/issue-tracker.md 的 Wayfinding operations。用户已接受阶段路线，不重复确认相同顺序；当前地图继续承担 M1 规划和决策，后续按依赖推进。

此前公开资料研究按 wayfinder/research 委派，在独立 clone 完成并推送 research/uvmf-integration-facts-20261111，固定提交 3d6d3a8acdcc71abc4f50ecb0f18be89afeee457，仅含 docs/design/uvmf-integration-research.md；未创建 PR 或合并。该历史报告中「未取得包」已由本轮包内核查补充，原报告保留不改；运行兼容性仍未验证。父工作区仍在 master，既有修改保留；CHI 未访问或修改。

路线图位于 docs/design/phase2-uvmf-roadmap.md：M0 目标、M1 接入设计与规格、M2 工具链基线、M3 可部署可扩展工程、M4 knob 完整示例、M5 DV 自助交付、M6 后续项目试点。M0 目标访谈已完成，用户已同意按该路线推进，以 M5 为首版交付点；具体技术选型和详细验收仍待收敛。原草案归档 docs/harness/handoffs/phase2-roadmap-before-wayfinder-20261111.md。不要重新访谈已确认的目标，也不要从 CHI 项目直接开始。

此前用户纠正：先考虑 UVMF 如何接入公共验证框架，不直接从具体项目开始。决定 knob-r2g 已记录并关闭；地图 knob-uv7 继续 in_progress。当前优先形成不依赖 DUT 的接入设计，具体架构仍需技术核查及用户取舍。CHI 隔离快照保留为后续候选试点，停止推进副本基线运行、适配和迁移。

此前用户选择同级 chi_async_bridge 作为首个试点，明确要求实验不影响原项目。knob-b92 已完成隔离准备：当前工作目录的 424 个选定文件复制到 build/uvmf-pilot/chi_async_bridge-20261111/source，含未提交的 RTL 和 UVM 输入；逐文件哈希和独立 inode 核对通过，源 HEAD、Git 状态、文件列表和核对的 Git 元数据前后一致。源 HEAD e41cff47974bdd1ca66f8e9e9160e52f1d9b8c3d 仅为元数据，不能代替脏工作区快照。记录 docs/design/phase2-chi-pilot-isolation.md，检查 docs/harness/chi-pilot-isolation-checks.json，完整清单在快照同级 audit/。实验源码受 build/ 忽略，不纳入公共仓库；该目录不是持久备份。该准备事实保留，但不再作为当前执行起点。

此前没有运行原项目脚本、操作其 Beads 或复制其 Git/环境/构建产物，也没有安装或运行 UVMF。原 dvsim_entry.py 的 Git 元数据需求及 uv 缓存路径仅为未来试点依赖记录，当前不处理。不得回写原项目，原项目待确认的验证需求和任务状态保持原状。现有 UVM 不解析完整 CHI 事务字段，不能声称完整 CHI 验证通过。

早先 Nowledge Mem 同步曾返回 HTTP 530 / Cloudflare Tunnel 1033；后续目标访谈与建图记录已恢复同步。本地 Beads、设计文档和本交接保留恢复所需上下文。

第二阶段长期目标仍为部署 UVMF 增强公共验证框架，供所有设计项目使用。不得把长期覆盖目标等同于首版全量迁移、多工具兼容或完整业务模板库；后续事项按本轮地图和 milestone 草案推进。

用户要求在继续第二阶段讨论前标记稳定版本。已创建并推送附注标签 v1.2.0，指向 8847bc73dee4bced619ee1ef526150c441e37fcd；本地及远端 peeled 提交一致，事项 knob-lq0 已关闭。标签包含第一阶段实现、已修复缺陷、接入指南和经实际编译运行核对的 README；沿用已归档的 100 个 VCS 场景与 16 个脚本判定场景证据。本次只操作标签及状态记录，没有修改或重新测试产品代码。第二阶段路线图及其交接改动仍未提交，不在稳定标签内。

此前 P0～P5 草案已由本轮 M0～M6 建议替代并归档。当前没有第二阶段正式规格或实现任务，不能按历史草案中的未确认建议推进。

技术探测建议使用独立最小环境，回答接入设计中的具体问题，随后再用真实项目检验复用。具体 UVMF 版本、描述格式、扩展位置、配置加载时机及验收范围尚未确定。本轮只调整路线图、隔离记录和状态，核对官方课程公开摘要，没有执行 UVMF 安装、生成、编译或仿真；第一阶段规格 v1.2 与产品代码保持不变。

第二阶段开始前完整交接归档在 docs/harness/handoffs/HANDOFF-before-phase2-roadmap-20261111.md。本轮仅形成待评审文档，技术兼容性尚无实测结论。

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
