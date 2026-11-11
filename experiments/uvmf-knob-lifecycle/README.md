# UVMF/knob seed 与生命周期确认

该入口只复现固定 UVMF 2023.4_2 ALU 副本的定向检查，不是公共部署工具。原始包、无 knob 的 repro2 和 knob 库保持不变；接入逻辑写到独立副本的 custom 保留区，另在已有 post_randomize 中增加检查观测。新增配置约束的求解结果控制实际请求数。观测代码的再生成保留未验证。

准备要求：已完成 `experiments/uvmf-standalone` 的 `build/uvmf-standalone/repro2` 输入，Node.js 20+、项目约定 VCS 包装器及许可证。此入口本身不运行 Python。编译与运行均需要本机 VCS 的工作目录和许可证访问权限。

以下命令已实际执行；重放时将输出参数改为新目录，并保持仓库根目录为工作目录。prepare 和 run 拒绝覆盖已有输出。

```bash
node experiments/uvmf-knob-lifecycle/probe.mjs prepare build/uvmf-knob-lifecycle/seed-check
bash experiments/uvmf-standalone/compile.sh build/uvmf-knob-lifecycle/seed-check out
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check a a +ntb_random_seed=101
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check replay a +ntb_random_seed=101
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check b b +ntb_random_seed=101
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check seed202 a +ntb_random_seed=202
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check disabled disabled +ntb_random_seed=101
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check unknown unknown +ntb_random_seed=101
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check missing_seed a
bash experiments/uvmf-knob-lifecycle/run.sh build/uvmf-knob-lifecycle/seed-check duplicate_seed a +ntb_random_seed=101 +ntb_random_seed=202
node experiments/uvmf-knob-lifecycle/probe.mjs verify build/uvmf-knob-lifecycle/seed-check
```

run.sh 只保存原始退出码，不独自判定功能通过。verify 检查 UVM 诊断、配置值、实际事务、重放轨迹、产物哈希及原输入未变。disabled 是探索性用例：knob 成功禁止请求，但原 ALU scoreboard 会报零事务错误；结果明确保存 `functional_pass: false`，不通过压制诊断冒充正常功能通过。

日志及产物在输出目录的 `out/`、`runs/`；汇总为 `results.json`。本轮结果和范围见 [确认报告](../../docs/design/uvmf-knob-seed-confirmation.md)。未覆盖重新生成、任意结构字段或跨工具版本。
