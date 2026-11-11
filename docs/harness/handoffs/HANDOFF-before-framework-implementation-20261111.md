# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

最小配置库和 UVM sequence 示例此前已通过真实 VCS 编译与 30 场景回归。用户随后明确：既有脚本按 UVM 日志关键字判断用例结果，VCS 非零退出码单独代表运行异常，UVM_FATAL 返回 0 不是问题。用户要求推进 to-spec，交付便于其他验证人员快速接入既有环境的框架。

正式合同入口为 `docs/design/knob-spec.md`，现为 v1.1。保留既有配置与随机化合同，新增框架接入、用户校验及宿主判定要求。访谈依据为 `docs/design/knob-requirements-notes.md`，范围理由见 `docs/adr/0001`～`0004`。本轮只更新文档与 Beads，没有修改源代码、脚本或重新运行仿真。

## 恢复入口与任务

开始时读取 `AGENTS.md`、本文件、正式规格、`GLOSSARY.md` 与相关 ADR，按 `docs/agents/issue-tracker.md` 恢复 Beads。数据库为本项目 `.beads/embeddeddolt`，前缀 `knob`。

- `knob-be2.1`：最小实现，已关闭。真实编译和最终回归通过。
- `knob-be2`：首版接入框架事项，open、ready-for-agent；正文与 v1.1 规格逐字一致，spec_id 指向正式规格。
- `knob-be2.2`：框架 to-spec 更新，已关闭；43 条用户故事、19 项验收与发布检查完成。
- `knob-y0x`：可行性评估，已关闭；报告 `docs/design/vcs-feasibility.md` 保留为实现前的只读证据。

使用方式见 `README.md`；原型结果及边界见 `docs/design/minimal-implementation-results.md`。下一步可按 v1.1 拆分框架实现；新增独立宿主验收仍沿用 Q21 的「编译后的程序＋配置/seed→日志/事务」边界，无需重复询问该边界。不能把原型已有通过项视为框架接入能力全部完成。

## 实现入口

- `src/knob_pkg.sv`：显式登记、严格 signed64/布尔解析、范围校验、require_le、冻结、取值、unused 报告与 seed 校验。
- `examples/minimal/tb.sv`：两个逻辑使用位置，各重复启动两次 sequence；apply_knobs 先于启动和原生随机化。
- `examples/minimal/knob.cfg`：配置示例。
- `scripts/compile.sh`：加载本机环境，通过规定包装入口选择 `-ntb_opts uvm-1.2` 编译。
- `scripts/run.sh`：复用已有产物，在指定独立目录运行，联合检查退出码、诊断与完成标志。
- `scripts/test.sh`：30 个外部行为场景，不调用编译器。
- `Makefile`：`make compile` 与 `make test` 分离。

配置仅来自每次运行目录的 `knob.cfg`；永久不支持运行中动态修改。每次必须提供唯一显式数值 `+ntb_random_seed`。类型、范围与 seed 复现合同保持不变。接入规范为完整登记后冻结、非 rand 配置字段、应用配置后随机化、每次检查求解返回值。

## 验证证据与实测结论

工具为 VCS W-2024.09-SP1、UVM 1.2。最终 `bash scripts/test.sh` 退出 0，30 场景包含 9 个正例与 21 个负例。最终回归目录为 `runs/regression-sMhGe8xW`，入口记录在 `build/poc/latest-regression.txt`。稳定副本在 `docs/design/evidence/minimal-poc/`，包含 summary.json、结果表、源码/产物哈希、选定配置与轨迹、编译及错误日志。

配置 A 共 12 条事务（两个使用位置分别 8、4 条），配置 B 为 14 条 agent0 事务、长度全部 256、agent1 禁用。同 seed=12345 重放轨迹和配置完全相同，选定 seed=54321 的轨迹不同。signed64 最小负十六进制、最大十进制和 signed32 seed 两端通过。所有负例均触发对应错误，无事务或成功标志。

回归前后 `simv` 及生成共享库 SHA 不变。最终 simv SHA 为 `1f4d47bbee469f7e322c89102035eddf218e67dfc215c58ac0ec74dc4fe83496`。开发过程中修复日志字符串填充问题后重编译过；最终回归本身不编译。曾有绝对/相对路径导致哈希清单比较失败，已修正并重跑完整回归。

21 个 UVM_FATAL 负例的原始 VCS 退出码均为 0，原型自测脚本汇总为结果 1。用户确认该原始退出行为符合现有流程；框架不要求改变它，也不强制宿主采用原型脚本、汇总码或 KNOB_DEMO_PASS 标志。非法 abc seed 会被 VCS warning 并回退到 1，库仍通过原始参数拒绝输入。编译临时目录写入和许可证连接受沙箱限制，已获批使用 compile/run/test 脚本在沙箱外执行；没有切换版本或绕过包装入口。

原型验证对应的 v1.0 规格快照为 `docs/design/knob-spec-v1.0.md`，SHA 仍为 `d0502ab68ed6ef2f4056c6a6cb4b6ef851af4c3ca429429ac93e9e85289c7776`。原始证据哈希不重写。v1.1 检查保存在 `docs/harness/knob-framework-spec-checks.json`：43 条故事、T1～T19、27 条本地引用、R1～R5/原故事/原验收保留、Beads 正文同步、源码与脚本未变均通过；空白检查通过。历史 `docs/harness/knob-spec-checks.json` 不用于断言现行规格或 AGENTS 的版本。

## 未完成范围

当前事务只打印日志，没有 DUT/driver/时钟/sequencer 握手。跨参数规则只支持 require_le，尚无任意用户校验回调。v1.1 的独立编译接入材料、声明组复用、自定义只读校验接口、独立宿主示例与完整快速开始验收仍待实现；既有语法和调用错误覆盖也未穷尽。不能宣称 T1～T19 全部完成。后续改变源代码或工具环境时，重新验证受影响行为与证据。

## Git 与归档

Git 根目录为本项目，分支 master，无提交、无 remote、无推送。新增源文件、脚本与文档尚未跟踪；build/ 和 runs/ 已忽略。保留全部现有用户文件与中间运行证据。

最小实现前完整交接归档于 `docs/harness/handoffs/HANDOFF-before-minimal-implementation-20261111.md`。更早阶段归档同目录；`docs/harness/setup-files.sha256` 仅为初次 setup 快照。

框架规格更新前完整交接归档于 `docs/harness/handoffs/HANDOFF-before-framework-spec-20261111.md`。本轮 Nowledge 写入先后返回 HTTP 502 和 HTTP 530/1033，未确认保存成功；框架规格与用户结果分层澄清已完整保存于本地文档和 Beads，后续需补同步。

Nowledge event `9a8748c9-a80e-4b24-acfa-bc831a3649fd` 已保存本轮实现、实测发现和未完成边界，关联此前可行性评估。本轮定向线程检索成功但无匹配结果。
