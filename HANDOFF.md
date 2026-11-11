# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户要求面向验证开发人员编写接入说明，事项 knob-ail 已完成。新增 docs/design/integration-guide.md，覆盖接入职责、生命周期、编译输入、声明/绑定/冻结、sequence/item 随机化顺序、组件及普通类、业务校验、运行、seed 和排错。README 与 quickstart 已加入入口。文档面向现行 v1.2，不改变产品接口或行为。

本轮核对 API 与宿主源码，检查 2 个 Bash 代码块语法和 24 个文档链接。复用源码与构建输入均一致的 95744e3 产物，按指南执行 4 次实际 VCS 运行：配置 A 发出 8 条事务；配置 B 发出 10 条、均来自 link0 且长度 256；同 seed 重放四类轨迹一致；未知键在零事务时触发 KNOB_UNKNOWN，原始码仍为 0。产物哈希未变。本轮未重新编译，未重跑完整回归。

文档验证目录为 runs/integration-guide-JRKramLs；稳定证据 docs/design/evidence/integration-guide-v1.2/ 包含 60 个文件及 manifest；检查记录 docs/harness/knob-integration-guide-checks.json。本次文档更新前完整交接已归档到 docs/harness/handoffs/HANDOFF-before-integration-guide-20261111.md。

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

分支 master，无 remote、无推送。实现修复提交为 95744e3（基线 96b737e），本轮文档以 95744e3 为基线；最新本地提交与工作区状态分别以 git log -1 --oneline、git status 为准。构建、运行产物和数据库保持忽略；验收证据纳入 Git。

修复阶段更新前的完整交接保存在 docs/harness/handoffs/HANDOFF-before-review-fixes-20261111.md。历史规格、验收报告和原始证据均保留。
