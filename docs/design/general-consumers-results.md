# knob v1.2 通用配置使用方验收

日期：2026-11-11。环境：VCS W-2024.09-SP1、UVM 1.2。对应 [规格 v1.2](knob-spec.md) 和 [ADR-0005](../adr/0005-general-runtime-consumers.md)。

本轮重新编译独立宿主，18 个场景全部通过，其中 11 个为既有宿主回归、7 个为新增场景。核心库、最小环境及核心/接口回归输入逐文件与 v1.1 快照一致，因此复用核心 58、接口 13 个场景的历史证据。本次有效验收集合共 89 个场景，其中 18 个是本轮实测，71 个是版本一致的历史证据。

证据入口：[summary.json](evidence/general-consumers-v1.2/summary.json)、[宿主结果表](evidence/general-consumers-v1.2/host/results.tsv)、[文件校验清单](evidence/general-consumers-v1.2/manifest.sha256)。每个场景保留配置、命令、日志、原始状态、宿主判定及事务、时序和帧长度轨迹；同时保存编译日志、源码快照和可执行文件/共享库标识。

## 实现范围

核心库与公共 API 无需修改。`host_driver` 持有显式位置句柄，在 `wait_for_transfer()` 中调用取值函数，以 `delay_ns` 控制实际仿真耗时。普通 SV 类 `host_header_policy` 不继承 UVM 或 sequence；它在冻结后创建，在 `frame_length()` 中读取整数 `header_bytes` 与布尔 `enabled`，计算输出帧长度。

test 在 build 中登记两组位置，在 connect 中传递句柄，在 end_of_elaboration 中统一加载和冻结。driver 在 run 中使用参数，每个位置重复处理 4 个包，证明非 sequence 代码可以复用同一冻结配置。既有 sequence/item 随机化和 sequencer/driver 握手保持原有组织。

## 新增场景与实测结果

两位置的输入包长均固定为 64，每个位置默认每轮发送 2 包，重复两轮。

| 配置 | link0 等待 | link1 等待 | link0 输出长度 | link1 输出长度 |
| --- | --- | --- | --- | --- |
| consumers_a | 2 ns | 5 ns | 72（启用 8 字节帧头） | 64（禁用 16 字节帧头） |
| consumers_b | 7 ns | 0 ns | 64（禁用 8 字节帧头） | 80（启用 16 字节帧头） |

这些结果由 `HOST_TIMING` 中的实测耗时、`HOST_FRAME` 中的输入/输出长度以及实际 `HOST_TX` 记录共同验证。两组配置只改变下一次运行的文件，复用相同编译产物；等待为 0 的场景也通过。

`consumers_replay` 与 consumers_a 使用相同 seed 12345，事务、sequence、时序和帧长度四类轨迹逐字一致。两个提前读取用例分别从真实 driver 和普通辅助类触发 `KNOB_STATE`，失败前均无事务。`driver_range` 将延迟设为 1001，触发 `KNOB_RANGE`；`helper_bool` 将布尔值写为 1，触发 `KNOB_VALUE`，均在激励前终止。

## 验收映射

T1～T19 的原始定义和用例映射见 [v1.1 报告](framework-results.md)。下表说明本轮对应证据的使用方式；v1.1 的旧宿主编译产物不代表当前宿主。

| 规格 | 当前依据 |
| --- | --- |
| T1、T2、T3 | 当前宿主 config_a/config_b/defaults 与新增两位置用例；未变核心历史证据补充默认值、注释和未使用项 |
| T4、T5、T6、T7 | 未变核心/接口的数值、语法、登记、类型与生命周期回归；当前宿主 unknown、driver_range、helper_bool 及两个提前读取负例 |
| T8、T9、T10 | 当前宿主 callback_rejected、unsatisfiable、missing_seed；未变核心覆盖上下限关系及 seed 全部边界 |
| T11、T12、T13 | 当前宿主 replay/other_seed/consumers_replay、完整生效值、四类轨迹及源码/产物哈希；未变核心原始复现证据 |
| T14、T16、T17 | 核心接口保持不变，复用声明组/校验接口的 13 场景；当前宿主继续使用声明组与预算校验，接口文档已同步范围 |
| T15、T18、T19 | 在独立工程目录编译宿主；沿用原始日志/退出码分层、native_abort/timed_out，按快速开始的配置完成换值与错误定位 |
| T20 | consumers_a/consumers_b/consumers_replay：组件 task 与普通类 function 使用整数、布尔；实际耗时、帧长度、重复使用、位置隔离和固定条件复现 |
| T21 | driver_early_read/helper_early_read/driver_range/helper_bool：非 sequence 使用方遵守准备顺序和类型/范围规则；冻结后登记等公共规则沿用未变接口证据 |

## 版本与复现

执行 `make compile-host` 后执行 `make test-host`。本轮原始运行目录为 `runs/host-tndInjdw`；全部 18 场景运行期间，可执行文件及共享库哈希保持不变。编译日志没有 VCS warning/error 诊断。

宿主 simv SHA-256：`a22f583c357a73b18dd4f7b5b2e23cba14db3859bf4cc7a1c1b21c3e539a9dce`。核心库 SHA-256：`663c607666751efd144359c75b4508ea361a10cf8da4488e9af91206108a3e60`，与 v1.1 完全一致。完整共享库哈希见 [artifacts.sha256](evidence/general-consumers-v1.2/host/artifacts.sha256)。

UVM_FATAL 原始退出码为 0 的负例继续由日志判失败；进程超时独立判运行异常，124 来自外层 timeout。没有为扩大使用方范围改变结果判定合同。

## 限制

本次直接验证的是 driver、普通 SV 类以及其中的 task/function。其他 UVM 组件可使用相同接口，但没有逐个实现 monitor、scoreboard 或具体 DUT 协议。更早阶段读取时，宿主仍须先完成全部登记与冻结；编译期 parameter、位宽和 generate 结构不在支持范围。框架仍依赖 UVM。

帧头模型只计算输出长度，不实现真实协议字段。宿主负责类型转换、算术范围、句柄传递和行为顺序。本次测试不承诺跨构建或跨工具版本的随机轨迹一致，也不代替独立代码审查。
