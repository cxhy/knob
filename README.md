# knob：启动前仿真配置框架

通过运行目录中的 `knob.cfg` 调整验证环境中显式接入的运行期参数，包括 sequence 发包数量、driver 等待时长和辅助逻辑开关，复用已编译的 VCS 产物。配置在激励前加载、校验并冻结；不支持运行中动态修改，也不提供命令行 knob 覆盖。

框架适用于 VCS W-2024.09-SP1 与 UVM 1.2。宿主保留自己的类继承关系、编译入口和日志判定流程，通过对象组合接入。

- [验证开发人员接入指南](docs/design/integration-guide.md)：接入职责、代码改动、随机化顺序、运行示例和排错。
- [快速接入已有环境](docs/design/quickstart.md)：需要改哪里、编译顺序、首次运行和调参。
- [公共 API 与诊断](docs/design/knob-api.md)：声明组、使用位置、只读校验、生命周期与类型扩展。
- [正式规格 v1.2](docs/design/knob-spec.md)：配置语法和 T1～T21 验收合同。
- [审查缺陷修复验收](docs/design/review-fixes-results.md)：当前实现的完整回归与脚本判定验证。
- [通用接入验证报告](docs/design/general-consumers-results.md)：通用使用方引入时的历史验收。
- [v1.1 框架报告](docs/design/framework-results.md)：上一版验收与原始证据。

## 框架组成

| 文件/目录 | 用途 |
| --- | --- |
| `knob.f`、`src/knob_pkg.sv` | 可交付的框架库；无开发机器绝对路径或演示类依赖 |
| `examples/host/` | 独立宿主工程，包含自己的基类、test/env、sequence/item、sequencer/driver 和编译/运行入口 |
| `examples/minimal/` | 较小的原型示例与错误注入用例 |
| `scripts/`、`Makefile` | 本项目开发验证入口，宿主无需采用 |

接入方定义一个 `knob_schema`，把它绑定到多个显式使用位置，得到各自的 `knob_scope`。每次仿真由一个 `knob_store` 汇总登记和校验，成功冻结后，配置使用方通过 scope 读取标量值。UVM 组件、普通 SV 类及持有句柄的 task/function 使用同一接口；sequence 是其中一种使用方。

用户业务校验继承 `knob_validator`。校验期间只能通过 `knob_view` 读取候选配置；返回后视图失效。普通配置使用方的提前读取仍被拒绝。

## 在本机编译与验证

本项目脚本加载 AGENTS.md 指定的 VCS 环境，并使用规定的兼容包装入口。独立宿主脚本由调用者提供 VCS 环境与入口，不包含本机路径。

```bash
make compile
make compile-host
make test-all
```

`compile-host` 把库和宿主复制到另一个工程目录后编译；`test-all` 先执行脚本判定测试，再执行核心、框架接口和独立宿主回归，不触发编译。单独执行时可使用 `make test`、`make test-framework`、`make test-host`。`make test-verdict` 单独检查回归脚本判定：以录制日志和模拟仿真器进程验证异常不会被误判为预期失败，不占用 VCS 许可证，不替代真实仿真。该检查使用仓库内的历史成功日志作为前置场景录制数据，无 Python 依赖。全部测试依赖 Bash、GNU coreutils、awk、rg；VCS 回归另需可用的 VCS 许可证。

调参时只创建新运行目录并准备配置文件，无需重新编译：

```bash
mkdir -p runs/host-manual
cp examples/host/knob.cfg runs/host-manual/knob.cfg
bash examples/host/run.sh build/host-isolated/out runs/host-manual +ntb_random_seed=12345
```

执行前加载已有 VCS/许可证环境。修改下一次运行的配置即可改变计数或约束。示例运行入口拒绝覆盖已有日志目录；该策略用于保存证据，不要求宿主替换自己的目录管理方式。

## 结果与边界

宿主按 UVM 日志关键字判断用例结果。UVM_FATAL 后原始退出码为 0 是允许的行为；非零退出码独立归入运行异常。框架不要求使用 `KNOB_DEMO_PASS` 或本项目的汇总状态码。

独立宿主示例分别保存 `test_result`、`runtime_result` 和运行命令退出码；正常情况下退出码来自 simv，超时情况下 124 来自外层 timeout。框架核心只负责配置诊断，不判断整场验证是否通过。

每次回归保存输入配置、seed、命令、日志、事务、源码与编译产物标识。构建和运行目录被 Git 忽略，稳定摘要保存在 `docs/design/evidence/`。历史 [30 场景原型报告](docs/design/minimal-implementation-results.md) 保留，不用于证明后续修改后的版本。

示例展示真实 UVM sequence/item 随机化、sequencer/driver 握手、driver 的可配置等待时长，以及普通 SV 类的帧长度计算，但没有具体 DUT 协议实现。接入实际验证系统时，宿主负责激励顺序、目标字段宽度、协议约束和用户校验中的算术安全；框架不会沙箱化用户 SystemVerilog 代码，也不会改写未显式接入的字段。
