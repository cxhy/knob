# UVMF 独立能力评估

本目录复现 UVMF 2023.4_2 的 ALU 教程评估。工程从 YAML 生成，再合并包内已完成教程的业务代码。编译和运行不需要 knob 库、`knob.f` 或 `knob.cfg`。这是固定版本的评估入口，尚不是新项目部署工具。

完整结果、适配和限制见 [评估报告](../../docs/design/uvmf-standalone-evaluation.md)。第三方发行包和生成代码不随本目录分发。

## 前置条件

- 已核查的 UVMF 2023.4_2 解包目录，包含官方 ALU 教程及 completed_solution。输入标识见 [包核查](../../docs/design/uvmf-package-inspection.md)。
- `uv` 与已安装的 CPython 3.12.13；生成器使用随包 Python 依赖，不联网安装。实验使用自己的 uv 缓存。
- Node.js 20 或以上；本次实测 v20.19.2，无额外 Node 依赖。
- 本机 VCS W-2024.09-SP1 及可用许可证。`compile.sh`、`run.sh` 使用项目约定的 `/home/guodz/install_vcs/` 环境入口；其他机器须先适配入口并重新验证。
- 新建、不含空白字符的实验输出路径。不要放在原始 UVMF 包目录下。

## 复现

在仓库根目录执行。任一步失败时先检查相应日志，不继续沿用不完整产物。`prepare` 拒绝覆盖已有输出；`run.sh` 拒绝复用运行目录。

```bash
experiment=build/uvmf-standalone/new-run
uvmf_input=build/vendor/uvmf/unpacked/UVMF_2023.4_2
node experiments/uvmf-standalone/experiment.mjs prepare "$experiment" "$uvmf_input"
bash experiments/uvmf-standalone/compile.sh "$experiment" out
bash experiments/uvmf-standalone/run.sh "$experiment" baseline 101
bash experiments/uvmf-standalone/run.sh "$experiment" replay 101
bash experiments/uvmf-standalone/run.sh "$experiment" seed202 202
node experiments/uvmf-standalone/experiment.mjs fault "$experiment"
bash experiments/uvmf-standalone/compile.sh "$experiment" fault
bash experiments/uvmf-standalone/run.sh "$experiment" fault 101 fault
node experiments/uvmf-standalone/experiment.mjs regenerate "$experiment"
bash experiments/uvmf-standalone/compile.sh "$experiment" regenerated
bash experiments/uvmf-standalone/run.sh "$experiment" regenerated 101 regenerated
node experiments/uvmf-standalone/experiment.mjs verify "$experiment"
```

`prepare` 先复现旧教程缺少 custom 结束标记的失败，再仅修复工作副本中的该标记并重新合并。这个失败属于预期检查，日志保存在 `logs/merge-original-tutorial.log`。复现脚本不适用于其他版本或任意工程。

`fault` 创建独立的 DUT 副本，将输出最低位翻转，使用独立文件清单和编译目录。该运行应产生 UVM_ERROR，但 VCS 原始退出码应为 0。最终 `verify` 同时检查原始退出码、错误诊断、非零事务比较、seed 轨迹、编译产物哈希、再生成文件哈希和原始包未变；不以单次 `run.sh` 的退出码作为功能通过依据。

## 输出

`generated/` 是当前生成器的原始骨架，`alu/` 是合并业务逻辑后的工程；`upstream/` 是未修改的发行包副本。`sources.f` 和 `fault.f` 是 VCS 编译清单。`out/`、`fault/`、`regenerated/` 保存三套编译产物，`runs/` 保存五次仿真日志及命令。`results.json` 保存最终检查结果，`regeneration-check.json` 保存再生成前后 HDL 哈希。

每次运行保留两条 UVMF 模板审查提醒；每次编译保留两条 `TFIPC` 警告。评估脚本核对这些已知诊断，未全局屏蔽警告。生成器另外报告旧 YAML 字段弃用及 Python 转义告警，详见评估报告。
