# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

用户在可行性评估后授权先做最小实现，遇到真实困难时可讨论规范用户行为。本轮已完成最小配置库和 UVM sequence 示例，并通过真实 VCS 编译与 30 场景回归。没有放宽正式规格，也没有将原型结果等同于完整产品验收。

正式合同入口为 `docs/design/knob-spec.md`，仍是已确认的 v1.0。访谈依据为 `docs/design/knob-requirements-notes.md`，范围理由见 `docs/adr/0001`～`0004`。Python/VCS/构建/验证的通用约定在 `AGENTS.md`；本次只使用 SystemVerilog 和 Bash，没有新增 Python 环境。

## 恢复入口与任务

开始时读取 `AGENTS.md`、本文件、正式规格、`GLOSSARY.md` 与相关 ADR，按 `docs/agents/issue-tracker.md` 恢复 Beads。数据库为本项目 `.beads/embeddeddolt`，前缀 `knob`。

- `knob-be2.1`：最小实现，已关闭。真实编译和最终回归通过。
- `knob-be2`：首版整体事项，保持 open；正文与正式规格一致。本轮没有继续扩展到全量验收。
- `knob-y0x`：可行性评估，已关闭；报告 `docs/design/vcs-feasibility.md` 保留为实现前的只读证据。

使用方式见 `README.md`；结果及边界见 `docs/design/minimal-implementation-results.md`。下一轮根据用户要求继续真实环境集成或补齐规格覆盖；不把当前最小原型描述为完整首版交付。

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

21 个 UVM_FATAL 负例的原始 VCS 退出码均为 0，运行脚本正确转成失败结果 1。非法 abc seed 会被 VCS warning 并回退到 1，库仍通过原始参数拒绝输入。不要删除这两层校验。编译临时目录写入和许可证连接受沙箱限制，已获批使用 compile/run/test 脚本在沙箱外执行；没有切换版本或绕过包装入口。

文档 8 条引用、源码证据哈希、空白与 shell 语法检查通过；正式规格 SHA 仍为 `d0502ab68ed6ef2f4056c6a6cb4b6ef851af4c3ca429429ac93e9e85289c7776`。`docs/harness/knob-spec-checks.json` 属于历史规格发布快照，其中 AGENTS 哈希不对应后续规则版本。

## 未完成范围

当前事务只打印日志，没有 DUT/driver/时钟/sequencer 握手。跨参数规则只支持 require_le，尚无任意用户校验回调。测试尚未穷尽所有语法、非法登记默认值和调用顺序，不能宣称正式规格 T1～T14 全部完成。后续改变源代码或工具环境时，重新验证受影响行为与证据。

## Git 与归档

Git 根目录为本项目，分支 master，无提交、无 remote、无推送。新增源文件、脚本与文档尚未跟踪；build/ 和 runs/ 已忽略。保留全部现有用户文件与中间运行证据。

最小实现前完整交接归档于 `docs/harness/handoffs/HANDOFF-before-minimal-implementation-20261111.md`。更早阶段归档同目录；`docs/harness/setup-files.sha256` 仅为初次 setup 快照。

Nowledge event `9a8748c9-a80e-4b24-acfa-bc831a3649fd` 已保存本轮实现、实测发现和未完成边界，关联此前可行性评估。本轮定向线程检索成功但无匹配结果。
