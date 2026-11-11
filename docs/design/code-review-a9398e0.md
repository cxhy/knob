# 全量代码审查：a9398e0

日期：2026-11-11。固定快照 `a9398e094b559f14d25396526ea7eeb7c0e43715`，覆盖当前核心库、示例、编译/运行/回归脚本、公共文档与规格 v1.2。用户要求审查全部代码，因此比较空树到该快照，包含初始提交 `3fbde6a` 和后续 `a9398e0`；不是只检查最后一次提交的增量。

两名独立审查者分别执行 Standards 与 Spec 轴，主审核验可疑点。标准来源为 AGENTS.md、领域文档与公共 API 约定；仓库没有额外 CODING_STANDARDS.md 或 CONTRIBUTING.md。历史源码快照作为证据，不重复当作当前待修改代码。

确认 2 个独立 P2 缺陷，其中 1 个同时违反规范与规格。此次未修改产品代码或修复缺陷。证据入口：[summary.json](evidence/code-review-a9398e0/summary.json)、[归档校验清单](evidence/code-review-a9398e0/manifest.sha256)。

## Standards

### P2：负例回归会把运行异常误判为预期拒绝成功

位置：`scripts/test.sh:27-30`、`scripts/test-framework.sh:19-22`。任务：`knob-zkf`。

负例只要求 runner 返回 1、日志包含 `[预期ID]`、零事务和无成功标记；没有核对原始进程码，也没有要求预期 ID 出现在致命诊断中。打印同 ID 的 warning 后异常退出，仍会被记为 PASS，掩盖错误处理退化。

复现采用快照中的原样 `scripts/run.sh` 和提取出的两个 `run_case` 函数，使用 simv 脚本替身，仅输出 `UVM_WARNING ... [KNOB_STATE]` 并退出 124。两个回归函数都打印 PASS，结果均记录 runner=1、simulator=124。这是 shell 判定复现，不是真实 VCS 仿真或真实超时。

违反 AGENTS.md 的要求：“按用例预期共同核对进程结果、UVM 诊断和事务轨迹。预期失败用例必须证明指定错误被触发”。应同时核对致命诊断及原始进程状态，保留 UVM_FATAL 原始码为 0 的正常合同。

可重复执行的[脚本替身复现器](evidence/code-review-a9398e0/reproduce-negative-verdict.sh)从 Git 固定快照读取被审代码，不修改当前产品文件；[输出](evidence/code-review-a9398e0/negative-verdict-output.txt)和[结果表](evidence/code-review-a9398e0/negative-verdict/results.tsv)已归档。没有另列基于主观代码味道的发现。

## Spec

### P2：NUL 可使非法配置尾缀逃过校验

位置：`src/knob_pkg.sv:248-250`。任务：`knob-8nh`。

读取文件行后直接调用字符串解析，没有保证原始输入完整参与校验。在指定 VCS/UVM 环境使用现有宿主产物，配置原始字节为 `link0.tx.count=1`、`00`、`junk`、换行。实际接受为 count=1，宿主判 pass、原始码 0，并产生 6 条事务。证据为 [原始配置](evidence/code-review-a9398e0/runtime/nul_suffix/knob.cfg)、[日志](evidence/code-review-a9398e0/runtime/nul_suffix/simulation.log)及[事务](evidence/code-review-a9398e0/runtime/nul_suffix/transactions.log)。

违反规格 R3：“语法错误、非法值……都必须使运行失败”，以及 R4 的激励前失败要求。应保证非法原始字节不能在进入严格解析前被静默丢弃，并增加对应配置负例。此结论基于观察到的输入和行为，不推断 VCS 内部字符串实现细节。

### P2：负例回归未将原始非零退出码独立判为运行异常

位置和复现与 Standards 中的 `knob-zkf` 相同。违反规格 R8：“VCS 原始非零退出码独立归入运行异常”，以及 Testing Decisions：“运行异常也不能充当指定配置错误已被正确发现的证据”。这是同一缺陷的规格层面判断，不是第三个独立问题。修复时不能反向要求 UVM_FATAL 返回非零。

## 核验范围与未确认的疑点

- 实际使用 VCS W-2024.09-SP1、UVM 1.2 运行 5 个边界用例，没有重新编译。宿主产物哈希与已验收版本一致，运行后再次核对可执行文件及共享库哈希。
- 数值 seed 12345 与 automatic 选项同时传入，重复运行以及参数顺序交换后，事务轨迹均与数值 seed 单独传入一致。本次没有确认 seed 冲突缺陷，不据猜测列项。
- NUL 位于第一行值末尾时，第二行的重复键仍被正确拒绝为 KNOB_DUPLICATE；确认的问题是同一行非法尾缀被接受，不能扩大描述为后续整份文件被忽略。
- 脚本替身复现与真实 VCS 证据分开保存。现有 89 场景没有全量重跑，本次是代码审查及定向核验，不是新一轮完整验收。
- 没有发现其他可确认的规格遗漏或范围扩张；这不等于穷举所有输入，也不消除真实工程接入验证的需要。

Standards：1 项，最严重 P2（负例误判）；Spec：2 项，最严重 P2（非法配置接受、运行异常漏判），其中运行异常漏判与 Standards 重复。
