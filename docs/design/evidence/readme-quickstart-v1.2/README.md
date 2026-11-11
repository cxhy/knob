# knob

**为 UVM 验证环境提供启动前配置：接入一次，编译一次，通过文件调整后续仿真参数。**

knob 是一个 SystemVerilog 配置库。验证开发人员为可调参数显式添加接口；验证人员在每次运行目录中准备 `knob.cfg`，即可复用已编译的 VCS 产物，调整 sequence 发包数量、随机包长约束、driver 等待时长或辅助逻辑开关。

例如，独立宿主示例可以使用下面的配置：

```ini
# link0 每次启动发送 5 包，包长固定为 256；关闭 link1 发包
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
```

首次接入或新增参数需要修改源码并编译。之后修改已登记参数的文件值，不需要重新编译。配置在激励前加载、校验并冻结，一次运行内保持不变。

[快速体验](#快速体验) · [接入已有工程](#接入已有工程) · [配置规则](#配置规则) · [文档](#文档) · [开发与验证](#开发与验证) · [反馈与贡献](#反馈与贡献) · [许可证](#许可证)

## 能做什么

- **显式配置**：整数与布尔参数具有名称、默认值和有效范围，文件缺项采用默认值。
- **位置隔离**：同一组声明绑定到多个逻辑位置，各位置独立配置；同一位置重复使用时保持一致。
- **通用使用方**：sequence、item、UVM 组件、普通 SV 类以及持有句柄的 task/function 使用同一接口。
- **激励前检查**：拒绝未知键、重复键、非法值和范围错误，支持上下限规则及用户业务校验。
- **原生随机化**：配置提供确定的约束参数，随机值由原生 `randomize()` 产生，使用显式 VCS seed。
- **保留宿主流程**：沿用现有类继承、factory、编译入口及日志判定，不要求替换验证平台。

当前不支持运行中修改、命令行 knob 覆盖、自动发现字段、通配符、配置表达式和文件 include。配置不能改变编译期 `parameter`、位宽或 `generate` 结构。框架依赖 UVM，不提供无 UVM 运行模式。

## 环境要求

| 用途 | 要求 |
| --- | --- |
| 框架与仿真示例 | 已验证 VCS W-2024.09-SP1、UVM 1.2；编译显式选择 `-ntb_opts uvm-1.2` |
| 编译与运行 | 已加载的 VCS/许可证环境及可用许可证；示例不附带仿真器 |
| 示例脚本 | Linux、Bash、GNU coreutils（含 `realpath`、`sha256sum`、`timeout`）、awk |
| 仓库完整回归 | 另需 make、ripgrep（`rg`）；无 Python 依赖 |

其他仿真器或版本尚未验证。以下快速体验使用不含开发机器路径的宿主脚本；如需兼容包装器，可先将环境变量 `VCS` 设置为该编译入口的路径。

## 快速体验

先加载自己的 VCS 与许可证环境，确认 `vcs` 位于 PATH，或已设置 `VCS`。下面的命令使用 Bash，从克隆仓库开始：

```bash
git clone https://github.com/cxhy/knob.git
cd knob
```

编译独立宿主示例一次：

```bash
bash examples/host/compile.sh "$PWD" build/readme-host
```

准备新运行目录并运行默认示例配置：

```bash
mkdir -p runs
readme_runs=$(mktemp -d runs/readme-XXXXXXXX)
mkdir "$readme_runs/a" "$readme_runs/b"
cp examples/host/knob.cfg "$readme_runs/a/knob.cfg"
bash examples/host/run.sh build/readme-host "$readme_runs/a" +ntb_random_seed=12345
```

预期输出：

```text
test_result=pass
runtime_result=ok
process_status=0
```

示例每个位置启动两轮 sequence，配置 A 每轮分别发送 3、1 包，总计 **8 条事务**。在同一个 Bash 会话继续执行，准备配置 B：

```bash
cat > "$readme_runs/b/knob.cfg" <<'CFG'
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
CFG
bash examples/host/run.sh build/readme-host "$readme_runs/b" +ntb_random_seed=12345

wc -l "$readme_runs/a/transactions.log" "$readme_runs/b/transactions.log"
sha256sum --status -c build/readme-host/artifacts.sha256
```

配置 B 应通过，并产生 **10 条来自 link0、长度均为 256 的事务**。两次运行复用 `build/readme-host` 中的同一产物；最后的哈希检查成功时没有输出。示例还保存完整日志、生效配置、sequence、时序和帧长度轨迹。修改配置时使用新的运行目录，示例脚本拒绝覆盖已有日志。

同 seed 重放和错误配置的操作见 [接入指南第 9 节](docs/design/integration-guide.md#9-用仓库示例完成首次验证)。示例展示真实 UVM 随机化及 sequencer/driver 握手，没有具体 DUT 协议实现。

## 接入已有工程

框架编译只需要两个文件，保留相对路径；交付时同时保留仓库的 [LICENSE](LICENSE)：

```text
vendor/knob/
├── LICENSE
├── knob.f
└── src/
    └── knob_pkg.sv
```

在宿主 package 之前加入文件列表：

```text
-F /your/vendor/knob/knob.f
```

大写 `-F` 使库内路径相对于文件列表解析。在调用方 package 中导入 `knob_pkg::*`，保留原有 UVM 导入和宏。无需复制演示类、项目 Makefile 或开发验证脚本。

接入顺序是：**声明与绑定 → 统一加载、校验和冻结 → 应用配置 → 随机化或执行行为**。

下面展示一个位置的接口调用；它是需要合入宿主对应阶段的片段，不是独立 testbench：

```systemverilog
// test/env 成员
knob_store knobs;
knob_schema schema;
knob_scope tx_cfg;

// build：声明参数并绑定逻辑位置
knobs = new;
schema = new;
schema.define_int("count", 2, 0, 1000);
schema.define_bool("enabled", 1);
tx_cfg = schema.bind_scope(knobs, "link0.tx");

// 全部登记完成后，由指定 test/env 在激励前准备一次
void'(validate_seed());
knobs.load_and_freeze();

// 冻结后：使用方通过传入的 tx_cfg 读取
count = int'(tx_cfg.get_int("count"));
enabled = tx_cfg.get_bool("enabled");
```

这里使用方的 `count` 为非 `rand int`，`enabled` 为非 `rand bit`，由宿主声明。整数转换须保持声明范围。sequence 和 item 必须先应用配置，再随机化，并检查每次 `randomize()` 的返回值；仅在 `pre_body()` 取值可能晚于随机化。

宿主持有 `knob_store` 并负责传递 `knob_scope`；schema 定义默认值和范围，可以绑定多个位置。常见编排是 build 登记、connect 传递句柄、end_of_elaboration 加载、run 使用。若要更早读取，必须先完成全部登记与冻结。

完整步骤、可复制的接入片段及排错表见 [验证开发人员接入指南](docs/design/integration-guide.md)。

## 配置规则

- 固定读取 **仿真当前工作目录**中的 `knob.cfg`。文件必须存在，空文件表示全部使用声明默认值。
- 一行一个 `key=value`，键区分大小写并按完整逻辑位置匹配；支持空行、LF/CRLF、两侧空白及 `#` 注释。
- 整数支持十进制和 `0x` 十六进制，可带前导负号；须满足 signed64 和声明范围，不接受表达式或 SV 宽度字面量。
- 布尔只接受小写 `true` / `false`。未知键、重复键、非法值和 NUL 字节会失败；已登记且合法但未使用的项只报告普通信息。
- 每次运行显式提供唯一的 signed32 十进制 `+ntb_random_seed=<数值>`。seed 控制原生随机状态，不是 knob 覆盖项。

同 seed 复现要求编译产物、工具环境、配置、外部输入和随机化调用过程相同；不承诺改代码或改配置后的随机序列仍一致。详细语法和边界见 [正式规格](docs/design/knob-spec.md)。

## 结果判定

宿主继续按 UVM 日志判断用例结果。**出现 UVM_FATAL 时，即使原始退出码为 0，用例仍然失败**；原始非零退出码独立记录为运行异常。正常 `KNOB_VALUE`、`KNOB_SEED` 和 `KNOB_UNUSED` 信息不能仅因 ID 名称被误判为错误，应结合诊断级别。

示例运行脚本在 `result.txt` 中分别记录 `test_result`、`runtime_result` 和 `process_status`。正常情况下原始码来自 simv，超时 124 来自外层 timeout。接入者无需使用示例状态码或 `KNOB_DEMO_PASS`；配置加载成功不代表整个验证用例通过。

## 文档

| 需要了解什么 | 入口 |
| --- | --- |
| 首次接入成熟验证工程 | [验证开发人员接入指南](docs/design/integration-guide.md) |
| 精简接入步骤 | [快速开始](docs/design/quickstart.md) |
| 函数、生命周期、用户校验和诊断 | [公共 API](docs/design/knob-api.md) |
| 配置合同、边界和验收项 | [正式规格 v1.2](docs/design/knob-spec.md) |
| 可编译的完整宿主 | [examples/host/tb.sv](examples/host/tb.sv) |
| 当前实现的回归证据 | [修复验收报告](docs/design/review-fixes-results.md) |

## 开发与验证

已有验收记录：在固定 VCS/UVM 环境通过 **100 个 VCS 场景**（核心 58、接口 13、宿主 29）及 **16 个脚本判定场景**。这些是归档验证结果，不是持续集成状态；本次 README 操作验证单独记录于 [检查记录](docs/harness/knob-readme-checks.json)。

仓库开发入口使用 [AGENTS.md](AGENTS.md) 中约定的本机 VCS 环境与包装路径。外部用户先使用上面的独立宿主入口；运行完整开发回归前需要准备相应环境。

```bash
make compile
make compile-host
make test-all
```

编译与运行分开，`test-all` 不触发编译。也可分别执行 `make test`、`make test-framework`、`make test-host`。`make test-verdict` 使用录制日志与模拟 simv 进程检查脚本判定，不启动 VCS、不占用许可证，但仍沿用本机环境脚本，不替代真实仿真。

| 目录 | 用途 |
| --- | --- |
| `src/`、`knob.f` | 框架库及编译清单 |
| `examples/host/` | 独立宿主与可移植编译、运行入口 |
| `examples/minimal/` | 原型和错误注入示例 |
| `scripts/`、`Makefile` | 开发验证入口 |
| `docs/design/` | 接入文档、规格及版本关联的验证证据 |
| `build/`、`runs/` | 本地生成产物，Git 忽略 |

## 反馈与贡献

欢迎通过 [GitHub Issues](https://github.com/cxhy/knob/issues) 报告问题或讨论接入需求，通过 Pull Request 提交改进。

报告问题时，请附上工具版本、代码提交号、最小声明及配置、seed、实际命令、相关 UVM 诊断和原始退出码，并说明预期行为与实际行为。提交代码改动时提供对应行为验证；只修改文档时检查命令、链接和示例预期。请先讨论会改变配置来源、类型或生命周期的需求。

## 许可证

本项目采用 **GNU Affero General Public License v3.0**，全文见 [LICENSE](LICENSE)。
