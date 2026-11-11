# UVMF 无 knob 独立能力评估

日期：2026-11-11。关联事项：`knob-uv7.6`。仓库基线：`8847bc73dee4bced619ee1ef526150c441e37fcd`（`v1.2.0`）；本轮评估入口和文档尚未提交。

## 结论与适用范围

UVMF 可以在本机 VCS/UVM 1.2 中独立完成工程生成、编译、事务驱动、采样、参考计算和结果比较，无需接入 knob。本轮从当前版本 YAML 生成骨架，合并官方 ALU 教程已有业务代码，实际执行了正例、同 seed 重放、另一 seed、DUT 错误注入和再生成后的仿真。

这支持继续采用 UVMF 作为公共验证框架候选。落地还需要维护 VCS 入口、生成与手写代码边界以及面向 DV 的部署说明。当前证据只覆盖本版 ALU 教程和固定工具组合，不能推广为任意 UVMF 工程、协议或工具均兼容，也不等于另一位 DV 已完成自助部署验收。

用户本轮明确要求「即使没有 knob，这个也应该可以被用起来」。因此独立 UVMF 基线先于 knob 集成验收，后续 knob 作为可选增强；无 knob 路径仍需能够生成、编译、运行和自动检查。更新后的推进顺序见 [路线图](phase2-uvmf-roadmap.md)。第一阶段 knob 合同不变。

## 固定输入与实际执行

| 项目 | 本轮输入 |
| --- | --- |
| UVMF | 用户提供的 2023.4_2；`release.INFO` 为 `2024-08-05:817b9746ddcfa2b003d5034380a9dc44a3fc14bc` |
| 归档 SHA-256 | `36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0`，不是官方签名或独立校验值 |
| 生成输入 | `docs/generator_tutorials/alu/yaml_config_files/` 下 5 个 YAML |
| 业务实现 | 同教程的 `completed_solution/completed_uvmf_template_output/`，其原始生成版本为 2020.2 |
| Python | `uv 0.11.21`，CPython 3.12.13，`uv run --no-project --offline --python 3.12.13 python ...` |
| Python 依赖 | 使用随包 Jinja2 3.1.3、MarkupSafe 2.1.5、PyYAML 6.0.1 和 voluptuous 0.14.2；未另外安装 |
| 仿真工具 | VCS W-2024.09-SP1，显式 `-ntb_opts uvm-1.2` |
| 实验目录 | `build/uvmf-standalone/repro2/`；此前探测和沙箱失败日志保留在同级目录 |
| 正式复现入口 | [experiments/uvmf-standalone](../../experiments/uvmf-standalone/README.md) |

`prepare` 在新目录复制发行包，执行当前生成器，并把旧教程的业务 custom 区块合并进当前骨架。业务 driver、monitor、predictor 和 DUT 连接来自教程；YAML 本身不会推导这些逻辑。所运行的测试为当前生成的 `test_top`，不是旧教程额外定义的 `ALU_random_test`。

编译输入为 VCS 自带 UVM 1.2、UVMF 基础包、ALU 接口包/BFM、环境包、参数包、sequence/test 包、ALU DUT 和双顶层。使用项目现有 VCS 包装入口；另写显式文件清单替代官方 Questa 构建入口。UVMF 基础库和生成器源码没有修改。没有编译 knob 库，也没有在运行目录提供 `knob.cfg`。

## 实测结果

| 场景 | seed | 预计结果数 | 匹配 | 不匹配 | UVM_ERROR / UVM_FATAL | 原始退出码 |
| --- | --- | ---: | ---: | ---: | --- | ---: |
| 基线 | 101 | 21 | 21 | 0 | 0 / 0 | 0 |
| 同产物重放 | 101 | 21 | 21 | 0 | 0 / 0 | 0 |
| 同产物换 seed | 202 | 20 | 20 | 0 | 0 / 0 | 0 |
| DUT 输出位翻转 | 101 | 21 | 0 | 21 | 21 / 0 | 0 |
| 再生成、重新编译 | 101 | 21 | 21 | 0 | 0 / 0 | 0 |

基线 sequence 发送 25 个随机请求，其中包含 reset 操作，因此参考模型生成的待比较结果数不等于请求数。同 seed 的输入/输出 monitor 轨迹哈希完全一致；seed 202 的轨迹不同。基线、重放和 seed 202 共用同一编译产物，运行前后 simv 及其共享库哈希保持一致。

负例仅修改独立 DUT 副本：将每个有效结果的最低位翻转。参考模型保持原样；scoreboard 报出 21 条指定的 `SCBD MISMATCH` 错误。VCS 退出码仍为 0，验证脚本通过日志识别功能失败，同时把非零原始退出码视为运行异常。

再次使用相同 YAML 和 `-m` 合并时，工作工程的 60 个 `.sv/.svh/.v` 文件全部保持相同哈希。重新编译后，seed 101 的结果及 monitor 轨迹与基线一致。本次只证明相同 YAML、同版本的再生成保留，不证明新增字段、改变接口或跨版本升级可无条件合并。

基线 simv SHA-256 为 `b86beaeba226582730e8cc821c16a2f9cc932a8a4bbdb3657db6c2dd1048d0d9`。不同编译目录的 simv 不要求字节相同；再生成验收比较 HDL 输入和事务行为。完整结果见 [检查记录](../harness/uvmf-standalone-checks.json) 和 [证据目录](evidence/uvmf-standalone-20261111/README.md)。

## 发现的适配点和限制

| 发现 | 实际影响 | 本轮处理与后续要求 |
| --- | --- | --- |
| 默认编译入口面向 Questa | 不能直接把原 Makefile 当成 VCS 入口 | 提供显式 VCS 文件清单及编译/运行入口；未改 UVMF 核心 |
| 旧教程输入 monitor 少一处 custom 结束标记 | 官方合并退出，提示 `Reached end of file while still in custom block` | 先记录失败，再仅补齐实验副本的标记；原包不变 |
| 旧教程的额外 test/sequence include 位于 custom 区块外 | 合并后 include 被生成内容覆盖，独立源文件仍在 | 当前用 `test_top`；未来手写 include 必须放入约定 custom 区块或独立手写入口，不能假定任意改动都会保留 |
| 每套编译有 2 条 `TFIPC` | 教程仅给 interface 连接 clk/rst，其他端口由层次连接使用 | 保留诊断；本例功能通过，正式模板仍需明确连接策略 |
| 每次运行有 2 条 UVM_WARNING | `COVERAGE_MODEL_REVIEW` 和 `PREDICTOR_REVIEW` 提醒审查生成内容 | 本轮显式核对并保留；未将其描述为零警告工程或完整覆盖验收 |
| 生成器有弃用与转义告警 | 旧 YAML 的 `response_info` 已弃用；Python 3.12 报 4 条 invalid escape SyntaxWarning | 当前生成/合并完成；未压制告警或修改随包依赖，正式模板应使用现行字段 |
| 生成器只提供验证骨架 | 空骨架缺少 DUT 协议和业务检查，不能据此证明功能验证可用 | 复用已完成教程的业务逻辑，并以实际比较和错误注入验收 |

本轮工具问题还包括沙箱禁止 VCS 临时目录写入、许可证连接和 Node 启动 uv 子进程。获得工具执行批准后，相同实验成功；这些属于本机执行权限问题，不能算作 UVMF 代码兼容性失败。

## 对下一阶段的建议

接入设计应保留三个独立入口：生成、编译、运行。先把本轮固定组合整理成可由 DV 使用的无 knob 工程，再增加可选 knob 接入。基础回归应继续覆盖无 knob 的正例和确定性错误注入，避免把「缺少 knob」变成无法启动或检查的原因。

第一版适配的主要工作在部署入口、可维护扩展位置和文档，ALU 实测没有显示必须重写 UVMF 核心库。对具体模块而言，协议驱动/采样、参考模型、检查规则和覆盖仍由 DV 提供；这部分成本取决于业务复杂度，不能由本例推算统一工期。

尚未验证多协议/多时钟、参数化宽度变化、寄存器模型、层次环境复用、覆盖率收集、第三方 VIP、其他仿真器或另一台机器。公共版本分发、升级策略和另一位 DV 自助使用仍由后续决策与验收确定。本轮未访问或修改 CHI 项目，也未改动现有 knob 产品代码。
