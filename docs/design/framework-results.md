# knob v1.1 框架验证

日期：2026-11-11。目标环境：VCS W-2024.09-SP1、UVM 1.2。正式规格为 [knob-spec.md](knob-spec.md)，本轮未修改规格合同。

状态：82 个场景全部通过，其中核心 58 个、框架接口 13 个、独立宿主 11 个。两套最终编译日志均无 VCS warning/error 诊断。各组运行期间产物保持不变，规格合同未修改。

证据入口：[summary.json](evidence/framework-v1.1/summary.json)。分组结果：[核心](evidence/framework-v1.1/core/results.tsv)、[框架接口](evidence/framework-v1.1/interfaces/results.tsv)、[独立宿主](evidence/framework-v1.1/host/results.tsv)。摘要记录源码哈希、实际运行目录和全部场景；同目录保存输入、日志、轨迹、编译命令和源代码快照。

## 交付内容

框架新增可复用 `knob_schema`、按逻辑位置取值的 `knob_scope`、用户实现的 `knob_validator` 和仅在校验期间可读的 `knob_view`。原型的完整键 register/get 接口仍可使用。用户无需修改原有 UVM 基类。

交付编译清单为 `knob.f`；VCS 通过 `-F` 解析相对于该文件的源路径。独立宿主拥有自己的编译、运行入口和 test/env/sequence 基类，实际执行 sequence、item 原生随机化以及 sequencer/driver 握手。示例并未实现某个具体 DUT 协议。

接入文档为 [快速开始](quickstart.md) 和 [公共接口](knob-api.md)。核心库没有开发机器绝对路径，也不依赖任何演示类；本机工具路径只属于开发验证入口。

## 验收映射

全部检查以编译后的仿真程序为入口，不断言框架私有存储。下表列出规格验收与可观察证据的对应关系。

| 规格 | 回归与依据 |
| --- | --- |
| T1 | core/host 的 config_a、config_b；同一产物下计数、开关和包长变化，产物哈希不变 |
| T2 | core/host 两位置独立配置，每个位置重复启动两次 |
| T3 | defaults、comment_defaults、shared.unused；host 的仅被校验读取的 shared.budget 普通报告 |
| T4 | hex_min_crlf、max_value、decimal_min、hex_max；空白、注释及 signed64 两端 |
| T5 | missing、unknown、duplicate、syntax、range、overflow、underflow 与字面量/键语法负例；零事务失败 |
| T6 | duplicate_registration、invalid_default、invalid_range、invalid_key、wrong_type |
| T7 | early_read、late_registration、reload，以及校验中普通提前读、过期视图、修改登记表和冻结后增加校验 |
| T8 | core/cross 内置上下限检查；host/callback_rejected 用户预算规则 |
| T9 | min=max=65 与偶数协议约束冲突，在原生 randomize 返回失败时立即终止 |
| T10 | seed 缺失、重复、空值、无等号、非数值、非十进制、小数、上下越界与 signed32 两端 |
| T11 | core/host 的 config_a 与 replay，事务及宿主 sequence 轨迹相同 |
| T12 | 选定 12345、54321 两个 seed 的轨迹不同；不要求任意两 seed 必不同 |
| T13 | 输入配置、命令中的 seed、日志、生效值与来源、事务轨迹、源码和产物 SHA |
| T14 | 公共接口文档给出新增类型的存储、声明、解析、视图、读取与验证扩展位置；实际只实现整数和布尔 |
| T15 | 复制仅有框架清单/源码及独立宿主源码到另一工程目录，使用该宿主的编译入口完成 VCS 编译和运行 |
| T16 | schema_values、schema_defaults、duplicate_bind、sealed_schema；同组声明跨位置复用且重复键仍拒绝 |
| T17 | 用户预算校验读取整数和布尔候选值；超预算、类型误用、普通提前读取和过期读取均按合同失败 |
| T18 | host 沿用 UVM/原生 fatal 日志规则；原始码为 0 的负例判用例失败；真实进程超时单独判运行异常；不要求 KNOB_DEMO_PASS |
| T19 | 快速开始与独立宿主 fixture 使用相同入口，完成引入、登记、首次运行、换配置、用户校验错误定位；宿主不修改框架内部实现 |

这些场景覆盖规格规定的验收行为，不表示枚举了所有可能的输入或完成所有第三方验证平台认证。

## 宿主与结果判定

宿主配置 A 的两个位置每轮分别发送 3、1 条事务，重复两轮后共 8 条。配置 B 关闭第二个位置，第一个位置每轮发送 5 条、长度固定 256，共 10 条。相同配置与 seed 的重放轨迹一致。

UVM_FATAL 后原始退出码可以为 0，宿主通过日志判用例失败。这符合用户既有流程，不是待修复问题。示例还按日志识别 SystemVerilog 原生 fatal。

运行异常用真实进程超时独立验证。退出码 124 来自外层 timeout，不能描述成 VCS 自身返回 124。宿主保留运行命令的状态，分别输出 test_result 和 runtime_result；这只是示例策略，不强制调用方采用相同状态码。

## 接入限制

- 宿主负责统一初始化和激励顺序，框架不能阻止无关代码提前发包。
- 校验函数不得抽取随机数、重新播种或产生激励；只读视图防止通过公开配置接口修改值，但不是任意用户 SystemVerilog 代码的沙箱。
- 目标字段宽度和用户校验表达式的算术安全由接入方保证；示例用有限登记范围确保 int 转换和计数求和安全。
- 只保证选定 VCS/UVM 环境中的已验证行为，不保证跨版本或修改配置/代码后的随机序列仍一致。

## 复现与历史证据

执行 `make compile`、`make compile-host`，然后执行 `make test-all`。编译与回归分开。核心、框架接口和宿主回归分别保存自己的目录与结果表；每个目录保留输入和日志。

最终核心与接口共用的 simv SHA-256 为 `feba9580b57e64b32521ba69c5a9d3afea90d8b6cc54c48bf849e22b7fa131d2`；独立宿主 simv 为 `e69a10074c6358c0674dad73f548e838a143c78abf9a851df763e5155ce1dbdf`。共享库也列入各组的 artifacts.sha256。开发中重新编译用于修正问题；每组最终回归本身不编译。

开发时修正过一个测试夹具字段名遮蔽 UVM 旧 check 回调的警告，最终核心与接口组均重新验证。宿主代码和库源码未因此改变，宿主最终 11 场景证据复用对应不变版本。宿主脚本明确区分原生 fatal 日志失败与进程超时，未把它们当作 knob 配置错误。

旧的 30 场景原型证据与 v1.0 规格快照保留不变。它们不用于替代本轮修改后版本的验证；现行源码与证据应通过对应 SHA 核对。
