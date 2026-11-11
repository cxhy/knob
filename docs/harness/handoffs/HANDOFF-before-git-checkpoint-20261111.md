# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户批准按 v1.1 推进任务。本轮已完成任务拆分、首版接入框架实现、独立宿主集成和验收。Beads 母事项 `knob-be2` 已关闭；实施切片 `knob-be2.3`～`.6` 全部关闭，分别对应编译接入/声明复用、用户校验、独立宿主/文档、回归证据。此前原型 `.1`、规格整理 `.2` 已关闭。

正式合同为 `docs/design/knob-spec.md` v1.1。本轮未改规格，Beads 正文与其逐字一致。T1～T19 已映射至 `docs/design/framework-results.md` 的可观察证据；这表示固定 VCS/UVM 环境下的规格验收场景通过，不表示所有输入被穷举或完成第三方平台认证。

## 用户决定与恢复规则

用户明确：UVM 日志关键字判断用例结果，VCS 非零退出码单独属于运行异常。UVM_FATAL 后原始码为 0 是允许行为，不是待修复问题。接入方无需采用项目示例脚本、汇总状态码或 KNOB_DEMO_PASS 标志。

继续遵守 AGENTS.md。开始时读取本文件、正式规格、GLOSSARY 和相关 ADR，按 docs/agents/issue-tracker.md 确认本项目 Beads。数据库为本项目 `.beads/embeddeddolt`、前缀 knob。没有需要重新访谈的产品边界。

配置仅来自每次运行目录的 knob.cfg，永久不支持运行中动态修改；显式位置和逐项接入、整数/布尔、登记校验冻结、原生随机化、唯一显式 seed 与固定条件复现合同保持不变。

## 使用与实现入口

- `README.md`：当前框架概览与本机命令。
- `docs/design/quickstart.md`：在既有 UVM 环境中加入编译输入、声明/绑定、统一准备、sequence/item 接入和调参。
- `docs/design/knob-api.md`：公共 API、生命周期、诊断、用户校验与类型扩展。
- `knob.f`、`src/knob_pkg.sv`：独立库交付，VCS -F 相对文件列表解析，无本机绝对路径或演示依赖。
- `knob_schema`：一组声明，可通过 bind_scope 绑定多个位置；首次绑定后声明不可修改。
- `knob_scope`：组合到现有 sequence 的读取句柄，不要求改变宿主继承。
- `knob_validator`/`knob_view`：冻结前的确定性用户校验及只读候选视图；返回后视图失效，普通提前读取仍失败。
- `examples/host/`：独立宿主，保留自己的 test/sequence 基类，包含 sequence/item、sequencer/driver 握手与自有编译、运行入口。
- `examples/minimal/`：较小示例及核心/接口错误注入。

本机命令：`make compile` 编译核心测试环境，`make compile-host` 复制库和宿主至另一工程目录后编译，`make test-all` 依次执行三组回归，不编译。单组入口为 make test、make test-framework、make test-host。宿主无需使用这些项目脚本。

## 最终验证

固定工具：VCS W-2024.09-SP1、UVM 1.2。共 82 个场景通过：

- 核心 58：`runs/regression-6sk6ZeGN`；指针 `build/poc/latest-regression.txt`。
- 接口 13：`runs/framework-triBA7Jf`；指针 `build/poc/latest-framework.txt`。
- 独立宿主 11：`runs/host-jQcQMQiv`；指针 `build/host-isolated/out/latest-host.txt`。

核心与接口最终 simv SHA：`feba9580b57e64b32521ba69c5a9d3afea90d8b6cc54c48bf849e22b7fa131d2`。宿主最终 simv SHA：`e69a10074c6358c0674dad73f548e838a143c78abf9a851df763e5155ce1dbdf`。各组运行前后可执行文件及共享库保持不变。两套最终编译日志无 VCS warning/error 诊断。

宿主配置 A 共 8 条事务（两位置每轮 3、1 条，重复两轮）；B 共 10 条 link0 事务、长度固定 256，link1 禁用。同 seed 的事务与 sequence 轨迹一致，选定不同 seed 的轨迹不同。配置/调用错误在预期位置终止；宿主不用原型成功标志。运行异常用真实进程超时验证，124 来自外层 timeout，不是 VCS 自身产生的状态码。

稳定证据为 `docs/design/evidence/framework-v1.1/summary.json` 及分组目录，保存全部场景输入、命令、日志、轨迹、状态、源码/产物哈希和源代码快照。报告 `docs/design/framework-results.md` 映射 T1～T19；`docs/harness/knob-framework-delivery-checks.json` 记录 21 条文档引用、源码证据一致性、规格未变及交付检查。Shell 语法、空白检查通过。

开发中修复过测试夹具字段名 check 遮蔽 UVM 旧回调的编译警告；最终核心和接口组重新运行。宿主源代码和库未因此变化，复用对应不变版本的宿主证据。没有把中间运行当成最终证据。

## 边界与后续工作

宿主示例有实际 UVM 握手，但没有具体 DUT 协议。接入真实项目仍由宿主负责初始化/激励顺序、目标字段宽度和用户校验中的算术安全。只读视图保护配置访问，不是用户 SystemVerilog 代码的沙箱；校验必须无耗时、无随机副作用。没有本轮遗留的规格实施任务；后续可按用户提供的实际环境开展接入。

## Git、历史与归档

Git 分支 master，无提交、无 remote、无推送；源代码、脚本与文档尚未跟踪。build/ 和 runs/ 被忽略，稳定证据可纳入版本控制。没有修改无关用户文件。

实现前完整交接与 README 分别归档为 `docs/harness/handoffs/HANDOFF-before-framework-implementation-20261111.md`、`README-before-framework-implementation-20261111.md`。原型 30 场景、v1.0 规格快照以及早期 setup/规格检查均保留为历史版本，不用于断言当前源码或工具行为。

当前 v1.1 规格 SHA 为 `51708698753bef37f584226d6aae4e1d0a40ad5f606968786d3752328cf57317`。规格发布检查 JSON 是发布当时的快照；本次源码已更新，当前源码关联以 framework-v1.1 证据为准。

Nowledge event `2bbd1cf8-fcbf-47a5-8a43-503ec12980f0` 已成功保存本轮实现、验证、任务状态及用户关于日志/退出码的澄清，补充了此前 v1.1 同步缺口。本轮定向线程检索无结果；记忆检索提示索引重建，结果可能不完整。
