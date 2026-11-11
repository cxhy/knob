# knob 最小实现

在 VCS 编译后，通过每次运行目录中的 `knob.cfg` 调整 UVM sequence 的发包数量、使能开关和包长约束。配置在产生事务前加载并冻结。正式合同见 [首版规格](docs/design/knob-spec.md)，当前实现是验证核心能力的最小原型。

正式规格已更新为 v1.1，后续交付目标是便于接入既有验证系统的框架。独立宿主接入、声明组复用和用户校验回调属于待实现目标；下文描述当前原型的实际接口与操作方式。

环境固定为 VCS W-2024.09-SP1 和 UVM 1.2。脚本加载本机 VCS 环境，并通过规定的包装入口编译。运行需要访问有效的 VCS 许可证服务。脚本依赖 Bash、GNU coreutils、`rg`；本原型没有 Python 依赖。

## 编译与运行

在仓库根目录编译一次：

```bash
make compile
```

为一次运行准备独立目录与配置文件：

```bash
mkdir -p runs/demo-a
cp examples/minimal/knob.cfg runs/demo-a/knob.cfg
bash scripts/run.sh runs/demo-a +ntb_random_seed=12345
```

再次调参时，创建新的运行目录，复制并编辑其中的 `knob.cfg`，然后调用同一个运行脚本。无需重新执行 `make compile`。运行脚本拒绝覆盖已有 `simulation.log` 的目录，以保留证据。

配置示例：

```ini
agent0.tx.packet_count = 7
agent0.tx.min_length = 256
agent0.tx.max_length = 256
agent1.tx.enabled = false
```

未填写的合法项使用登记默认值。两个使用位置各启动两次，因此该配置产生 14 条 `agent0.tx` 事务，`agent1.tx` 不产生事务。示例协议要求包长为偶数；配置范围只有奇数时，原生求解会失败。

执行回归时复用现有编译产物：

```bash
make test
```

`make test` 不编译。源码与编译时的哈希不一致时，回归会停止，需先显式重新编译。回归使用新的独立目录，结果位置写入 `build/poc/latest-regression.txt`。

## 接入方式

[配置库](src/knob_pkg.sv) 提供以下接口：

| 调用 | 时机与用途 |
| --- | --- |
| `register_int(key, default_value, minimum, maximum)` | 准备期登记整数键、默认值与范围 |
| `register_bool(key, default_value)` | 准备期登记布尔键 |
| `require_le(lower_key, upper_key)` | 两个整数键登记后，加入上下限检查 |
| `load_and_freeze()` | 全部登记结束后，读取 `knob.cfg`、校验并冻结 |
| `get_int(key)` / `get_bool(key)` | 冻结后读取生效值，记录该项已使用 |
| `report_unused()` | 运行结束时报告已登记但未使用的项 |
| `validate_seed()` | 检查唯一显式十进制 signed32 seed；不重新播种 |

集成时遵守以下调用规范：

1. test/env 汇总所有合法键，登记时使用显式逻辑位置，例如 `agent0.tx`。同一个键只登记一次。
2. 所有登记结束后，test/env 统一调用 `load_and_freeze()`。产生激励的入口必须等待该调用成功。
3. 创建 sequence 后，调用示例中的 `apply_knobs()`。配置字段使用非 `rand` 变量，目标字段类型必须容纳登记范围。
4. 配置应用后再启动 sequence 或随机化。每次 `randomize()` 都检查返回值；失败立即终止。
5. 最后调用 `report_unused()`。未使用项只输出普通信息。

[示例](examples/minimal/tb.sv) 在 build 阶段登记，在 end_of_elaboration 阶段加载并冻结。run 阶段执行 `apply_knobs()` → `start()`，sequence 的 body 内执行受控随机化。示例不依赖 `uvm_do_*`，也不依赖 `pre_body()` 读取配置；`pre_randomize()` 会拦截未应用配置的随机化。

这些是当前示例的接入规范，未改变已确认的产品边界。将库用于其他环境时，必须保证所有发包入口遵守准备顺序；库不能阻止无关的 `initial` 块绕过该流程发包。

## 配置语法与结果

整数按 signed64 数学范围解析，支持十进制、`0x` 十六进制和前导负号。逐字符检查合法性，并在累加前检查溢出。布尔只接受 `true`、`false`。支持空行、空白、LF/CRLF 和 `#` 注释。未知键、重复键、非法值、越界和上下限矛盾均失败。完整语法以正式规格为准。

每次运行保存原始仿真日志、事务轨迹、生效配置、输入配置哈希、执行命令、编译产物哈希和状态。`process-status.txt` 保存仿真器原始退出码；`result-status.txt` 保存运行脚本判定，0 为成功、1 为失败。脚本同时检查退出码、错误诊断和完成标志，不能只用原始退出码判断 UVM 用例。

以上汇总结果与完成标志仅供项目自测。宿主继续按既有 UVM 日志关键字判断用例结果，将 VCS 非零退出码单独归入运行异常；UVM_FATAL 后原始退出码为 0 是允许的行为。框架不要求宿主采用示例脚本、`KNOB_DEMO_PASS` 标志或修改原始退出码。

`build/poc/artifacts.sha256` 包含 `simv` 及生成的共享库。回归前后检查产物未变。构建与运行产物已被 Git 忽略，稳定验证摘要放入 `docs/design/`。

## 原型边界与后续扩展

示例运行真正的 UVM sequence 和 VCS 原生约束求解，但事务以日志表示，没有 DUT、driver、sequencer 握手或时钟。它验证配置与随机化链路，不代表实际协议环境已集成。

当前跨参数接口只实现整数 `require_le`；任意用户校验回调尚未提供。类型扩展集中在 `knob_kind`、登记接口、`parse_line()` 的类型分支、生效值格式化及带类型取值接口；新增类型时同步扩展存储表示和外部行为测试，不改写现有类型的含义。

原型不等于正式规格 v1.1 的 T1～T19 全量验收。具体已验证范围、实测限制和证据见 [最小实现验证报告](docs/design/minimal-implementation-results.md)。
