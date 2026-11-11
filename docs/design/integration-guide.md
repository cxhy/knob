# 验证开发人员接入指南

本指南面向维护 UVM test/env、sequence、driver 和辅助类的验证开发人员，说明如何把 knob 加入已有工程。完成一次源码接入和编译后，验证人员可以通过每次运行目录中的 `knob.cfg` 调整预留参数，复用同一份仿真产物。

适用版本：knob 规格 v1.2，已验证环境为 VCS W-2024.09-SP1、UVM 1.2。框架只提供 signed64 整数和布尔值；配置在激励前加载、校验并冻结，一次运行内保持不变。新增可调项、修改声明范围或改变接入代码仍需重新编译。不能用它修改 `parameter`、位宽或 `generate` 结构。

首次接入按本文顺序执行；简要步骤见 [快速开始](quickstart.md)，函数和诊断见 [公共 API](knob-api.md)，完整行为以 [正式规格](knob-spec.md) 为准。本文代码片段沿用 [独立宿主示例](../../examples/host/tb.sv) 的名称，需合入已有类和回调，不能直接拼成独立源文件。可编译的完整工程位于 [examples/host](../../examples/host/)。

## 1. 确定参数和接入职责

先选择一个有明确行为的参数，例如 sequence 每次启动的发包数量。为每个参数确定名称、类型、默认值、允许范围、单位及使用位置。单位由接入方定义，框架本身只保存整数和布尔值。

| 示例使用位置 | 参数 | 默认值 | 允许值及用途 |
| --- | --- | --- | --- |
| `link0.tx`、`link1.tx` | `count` | 2 | 整数 0～1000；每次 sequence 启动的发包数量 |
| 同上 | `enabled` | true | true / false；控制是否发包 |
| 同上 | `min_length`、`max_length` | 64、128 | 各为 1～4096，且 min ≤ max；item 包长约束 |
| `link0.driver`、`link1.driver` | `delay_ns` | 1 | 整数 0～1000，单位 ns；每次发送前等待 |
| `link0.header`、`link1.header` | `header_bytes`、`enabled` | 0、true | 整数 0～64、布尔；普通 SV 类计算帧长度 |

`link0.tx.count` 由使用位置 `link0.tx` 和参数名 `count` 组成。这是显式逻辑名称，不会自动查询 UVM 对象层次，也不支持通配符。两个位置可以使用同名参数并分别配置；同一位置多次启动 sequence 会读取相同的冻结值。

| 接入点 | 需要增加的内容 |
| --- | --- |
| 工程编译入口 | 在宿主 package 之前引用 `knob.f`，导入 `knob_pkg` |
| test/env 中的准备入口 | 持有 store，汇总声明和校验、绑定位置、检查 seed、统一加载冻结 |
| sequence/item/组件/辅助类 | 接收 scope，在行为前读取或应用值，检查类型转换和随机化结果 |
| case 运行入口 | 准备独立目录、`knob.cfg` 和显式 seed，记录输入与结果 |

## 2. 安排准备阶段

推荐在 build 阶段完成全部登记，在 connect 阶段传递句柄，在指定 test/env 的 end_of_elaboration 阶段加载，在 run 阶段使用：

```mermaid
flowchart LR
  A[声明参数与校验] --> B[绑定全部使用位置]
  B --> C[传递 scope 句柄]
  C --> D[检查 seed 并统一加载、校验、冻结]
  D --> E[读取或应用配置]
  E --> F[随机化、执行行为]
```

登记和句柄传递不等于可以取值。`store.is_ready()` / `scope.is_ready()` 只查询状态，不触发加载。宿主指定一个准备入口调用一次 `load_and_freeze()`，各使用方不能自行加载。

若某项必须在 build 阶段读取，需要先重新安排宿主的全部登记与冻结顺序。不能保留 end_of_elaboration 加载，却在构造函数或 build 回调中提前读取。检查现有基类回调和其他激励入口，确保它们也遵守此顺序；框架不会自动拦截无关激励。

## 3. 加入编译输入

复制或引用 [knob.f](../../knob.f) 与 [src/knob_pkg.sv](../../src/knob_pkg.sv)，保留相对位置：

```text
vendor/knob/
├── knob.f
└── src/knob_pkg.sv
```

在已有 VCS 编译命令中，把库放到使用它的宿主 package 之前。以下是命令模板，路径、top 和其他工程选项需要替换：

```bash
vcs -full64 -sverilog -ntb_opts uvm-1.2 -timescale=1ns/1ps \
  -F /your/vendor/knob/knob.f \
  /your/project/tb.sv -top host_tb -o simv
```

使用大写 `-F`，使库内源路径相对于文件列表解析。保留原工程的 VCS 环境、许可证和兼容包装入口；不要重复编译 `knob_pkg.sv`。本仓库本机操作使用第 9 节的 `make` 入口，其中已包含项目环境处理。

在调用 knob 的 package 内导入：

```systemverilog
import uvm_pkg::*;
import knob_pkg::*;
`include "uvm_macros.svh"
```

接入工程不需要包含演示类，也不需要采用本仓库的脚本、类继承关系或成功标志。

## 4. 声明参数、绑定位置并冻结

在已有 test/env 类中增加成员：

```systemverilog
knob_store knobs;
knob_scope scopes[2];
```

在该类的 build 回调中加入下面的准备代码。局部变量声明放在语句之前，保留宿主已有的 `super.build_phase(phase)` 和其他初始化：

```systemverilog
knob_schema schema;
// ...宿主原有初始化...
knobs = new;
schema = new;
schema.define_int("count", 2, 0, 1000);
schema.define_int("min_length", 64, 1, 4096);
schema.define_int("max_length", 128, 1, 4096);
schema.define_bool("enabled", 1);
schema.require_le("min_length", "max_length");
for (int i = 0; i < 2; i++)
  scopes[i] = schema.bind_scope(knobs, $sformatf("link%0d.tx", i));
```

`define_int` 的参数依次为名称、默认值、最小值、最大值。先完成声明，再绑定所有位置；第一次绑定后声明组不可修改，但可以继续绑定到其他位置。重复登记同一完整键会失败，不能靠后一次登记覆盖默认值。

在指定准备入口中，全部登记完成后执行：

```systemverilog
void'(validate_seed());
knobs.load_and_freeze();
```

示例在 build 中检查 seed、end_of_elaboration 中加载，两者都发生在激励前。接入时也可以把这两步放在同一准备入口。保留宿主原有回调，并确认执行顺序没有导致提前读取。

`load_and_freeze()` 从当前工作目录读取 `knob.cfg`，解析全部键值、检查类型和范围、执行跨参数校验，然后冻结并报告生效值。文件缺失也会失败；想全部使用默认值时，应提供空文件。

## 5. 在 sequence 和 item 中应用配置

保留已有 sequence 基类和 factory。增加非 `rand` 配置字段及显式应用函数；以下片段对应示例的 `host_sequence`：

```systemverilog
local int count, minimum, maximum;
local bit enabled, applied;

function void apply_knobs(knob_scope cfg);
  count = int'(cfg.get_int("count"));
  minimum = int'(cfg.get_int("min_length"));
  maximum = int'(cfg.get_int("max_length"));
  enabled = cfg.get_bool("enabled");
  applied = 1;
endfunction
```

这里 `int` 能容纳声明范围。对其他参数，需要核对接收字段宽度和符号；不要将任意 signed64 值直接窄化。字段保持非 `rand`，避免后续随机化覆盖配置。

在已有 test 或 virtual sequence 的启动位置，按此顺序调用。这里 `scopes[i]` 已冻结，`env.agents[i].sequencer` 是宿主已有的 sequencer：

```systemverilog
host_sequence seq = host_sequence::type_id::create("seq");
seq.apply_knobs(scopes[i]);
if (!seq.randomize())
  `uvm_fatal("KNOB_RANDOMIZE", "sequence randomization failed")
seq.start(env.agents[i].sequencer);
```

在 sequence 的 `body()` 中，`enabled` 控制是否发包，`count` 控制循环次数。item 的约束参数也必须在其随机化之前赋值：

```systemverilog
if (enabled) for (int i = 0; i < count; i++) begin
  host_packet packet = host_packet::type_id::create("packet");
  packet.min_length = minimum;
  packet.max_length = maximum;
  start_item(packet);
  if (!packet.randomize())
    `uvm_fatal("KNOB_RANDOMIZE", "packet randomization failed")
  finish_item(packet);
end
```

对应 item 中的字段和约束如下，其他 payload 字段、约束和协议检查保留：

```systemverilog
rand int length;
int min_length, max_length;
constraint legal_length {
  length inside {[min_length:max_length]};
  length % 2 == 0;
}
```

`start()` 不负责应用配置或替代随机化检查。不要只在 `pre_body()` / `pre_start()` 取值，已有宏可能先随机化再调用这些回调。可在现有 `pre_randomize()` 和 `body()` 中检查 `applied`，漏调用时立即发出致命诊断；合入时保留原有回调逻辑。完整防护代码见宿主示例。

上下限合法不保证所有业务约束都可满足。例如示例要求偶数包长，范围 65～65 会在实际随机化时失败。每次失败立即终止，不重试、不换 seed、不退回默认值。

## 6. 在组件、普通类和 task/function 中使用

这些使用方采用相同的 scope 接口，无需继承 knob 类。宿主在加载前绑定全部位置，通过成员赋值、函数参数或已有的 config_db 流程传递句柄。框架不自动分发句柄；接入方必须保证句柄非空且对应正确位置。

宿主示例在 build 中声明 `delay_ns` 并绑定 `link0.driver`、`link1.driver`，connect 中赋给 driver 的 `timing_cfg`，run 中调用以下 task：

```systemverilog
knob_scope timing_cfg;

function int configured_delay_ns();
  return int'(timing_cfg.get_int("delay_ns"));
endfunction

task wait_for_transfer();
  int delay_ns = configured_delay_ns();
  #(delay_ns * 1ns);
endtask
```

该字段的声明范围是 0～1000，示例使用 `1ns/1ps` 时间尺度。把 task 接到已有发送路径后，才能实际改变发送时序；声明参数本身不会自动修改 driver。

普通 SV 类可以在冻结后创建，接收提前绑定的 scope。示例的帧头策略如下：

```systemverilog
class host_header_policy;
  local knob_scope cfg;
  function new(knob_scope cfg);
    this.cfg = cfg;
  endfunction
  function int frame_length(int payload_length);
    int header_bytes = int'(cfg.get_int("header_bytes"));
    bit enabled = cfg.get_bool("enabled");
    return payload_length + (enabled ? header_bytes : 0);
  endfunction
endclass
```

宿主需在冻结前为对应位置声明 `header_bytes`（默认 0，范围 0～64）和 `enabled`（默认 true）。示例输入包长有界，能够安全相加；其他算术表达式由宿主检查溢出。此示例只计算长度，不实现真实协议头。

task/function 也可以直接接收 `knob_scope` 参数。冻结后重复读取返回相同值；运行期间修改磁盘文件不会更新本次运行的配置。monitor、scoreboard 可采用相同模式，具体检查行为由接入方实现。

## 7. 添加业务校验

最小值不大于最大值可用前面的 `schema.require_le()`。涉及多个位置的业务关系时，继承 `knob_validator`，实现 `validate(knob_view values, output string reason)`。例如检查两个启用位置的发包数量之和不超过 `shared.budget`，完整实现见宿主示例的 `host_budget_check`。

在加载前登记该规则：

```systemverilog
host_budget_check budget_check;
// ...位置声明及绑定完成后...
knobs.register_int("shared.budget", 16, 0, 2000);
budget_check = new;
knobs.add_validator("host_budget", budget_check);
```

校验函数只通过 `knob_view` 读取候选值，返回 0 时给出 `reason`，框架发出 `KNOB_CHECK`。不要通过普通 store/scope 提前取值，不保存 view 留待以后使用，不等待时间、产生激励、取随机数或重新播种。参数范围及业务算术安全由校验作者负责。

## 8. 编写配置文件并接入运行脚本

每次运行创建独立目录，在其中准备固定文件名 `knob.cfg`，再以该目录为当前工作目录启动已编译的 simv。只把文件放在源码目录，或者仅从另一目录传入 simv 路径，都不会改变配置查找位置。

```ini
# link0 每次启动发送 3 包，包长固定为 64
link0.tx.count=3
link0.tx.min_length=64
link0.tx.max_length=64
link1.tx.enabled=false
```

配置语法要点：

- 键精确匹配、区分大小写；每个点分段以字母或下划线开头，其余字符为字母、数字或下划线。
- 一行一个 `key=value`；支持空行、LF/CRLF、两侧空白和 `#` 整行或行尾注释。
- 整数支持十进制、`0x` 十六进制及前导负号，例如 `32`、`0x20`、`-1`；仍须满足 signed64 和声明范围。不支持 `+1`、`1_000`、`32'h20` 或算术表达式。
- 布尔只写小写 `true` / `false`，不能写 `0` / `1`。
- 缺项使用声明默认值；重复键、未知键、非法值和 NUL 字节均失败。NUL 出现在注释中也会被拒绝。
- 已登记且合法但未读取的项允许存在，可在结束阶段调用 `knobs.report_unused()` 输出普通信息。未知键不能因本次不用而被忽略。
- 暂不支持 include、环境变量展开和命令行 knob 覆盖。

运行时显式传入唯一的 `+ntb_random_seed=12345`。seed 是原生仿真参数，不是 knob 覆盖项；接受十进制 signed32 数值，不使用 automatic、缺省 seed 或重复 seed。`validate_seed()` 检查并记录参数，不重新播种。配置只提供确定的约束，随机样本仍由原生 `randomize()` 生成。

宿主脚本分别保存 UVM 日志结果和原始进程退出码：`UVM_FATAL` 即使伴随原始码 0，仍应按日志判用例失败；非零原始码独立记录为运行异常。使用管道或外层 timeout 时，保留实际来源，避免把 tee 的状态当作 simv 状态。无需引入 `KNOB_DEMO_PASS`；框架加载成功不能代表整个 case 通过。

保存配置文件、seed、命令、生效值及来源、事务轨迹、工具版本和编译产物标识。比较产物时包括 simv 及其共享库。同 seed 重放还要求产物、工具环境、配置、外部输入和随机化调用过程相同；改代码或改配置后不承诺原序列不变。

## 9. 用仓库示例完成首次验证

以下命令从仓库根目录执行，使用本机项目环境；在其他机器上替换环境脚本。第一次执行 `make compile-host`；后续运行步骤不编译。宿主默认每个位置启动两轮 sequence，因此总事务数是每轮数量的两倍。

```bash
source /home/guodz/install_vcs/vcs_env.sh
make compile-host

# mktemp 保证本次目录未被旧日志占用。
mkdir -p runs
guide_runs=$(mktemp -d runs/integration-guide-XXXXXXXX)
mkdir "$guide_runs/a" "$guide_runs/b" "$guide_runs/replay" "$guide_runs/invalid"

cp examples/host/knob.cfg "$guide_runs/a/knob.cfg"
bash examples/host/run.sh build/host-isolated/out "$guide_runs/a" +ntb_random_seed=12345

cat > "$guide_runs/b/knob.cfg" <<'CFG'
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
CFG
bash examples/host/run.sh build/host-isolated/out "$guide_runs/b" +ntb_random_seed=12345

cp "$guide_runs/b/knob.cfg" "$guide_runs/replay/knob.cfg"
bash examples/host/run.sh build/host-isolated/out "$guide_runs/replay" +ntb_random_seed=12345
cmp "$guide_runs/b/transactions.log" "$guide_runs/replay/transactions.log"
cmp "$guide_runs/b/sequences.log" "$guide_runs/replay/sequences.log"

cp examples/host/knob.cfg "$guide_runs/invalid/knob.cfg"
printf '\nlink0.tx.unknown=1\n' >> "$guide_runs/invalid/knob.cfg"
invalid_status=0
bash examples/host/run.sh build/host-isolated/out "$guide_runs/invalid" +ntb_random_seed=12345 || invalid_status=$?
test "$invalid_status" -eq 1

sha256sum --status -c build/host-isolated/out/artifacts.sha256
printf '运行证据目录：%s\n' "$guide_runs"
```

| 目录 | 应核对的结果 |
| --- | --- |
| `a` | `test_result=pass`、`runtime_result=ok`、原始码 0；8 条 `HOST_TX`，两位置各启动两轮，每轮分别发 3、1 包 |
| `b` | 同样通过；10 条事务全部来自 link0，输出长度均为 256 |
| `replay` | 与 b 的事务及 sequence 轨迹逐字一致 |
| `invalid` | 运行脚本返回 1；`test_result=fail`、`runtime_result=ok`、原始码 0；日志出现 `UVM_FATAL` 的 `KNOB_UNKNOWN` 诊断，事务文件为空 |

`simulation.log` 保存完整日志，`effective-config.log` 保存生效值和来源，`process-status.txt` 保存原始码，`result.txt` 保存宿主判定。最后的哈希检查成功表示编译记录中的产物仍未变化；所有运行均使用同一构建目录。示例运行脚本拒绝覆盖旧日志，重新操作时新建目录。

本指南运行步骤的核对记录见 [文档验证记录](../harness/knob-integration-guide-checks.json)。框架完整回归结果见 [修复验收报告](review-fixes-results.md)。这里的四次运行用于检查说明中的操作与预期，不代替完整回归或实际 DUT 接入验收。

## 10. 接入排错和完成检查

| 现象或诊断 | 优先检查 |
| --- | --- |
| 找不到 `knob_pkg` | 文件列表是否在宿主 package 前编译；是否使用 `-F`；是否导入 package |
| `KNOB_FILE` | simv 的当前工作目录是否有可读的 `knob.cfg`，包括全默认场景 |
| `KNOB_UNKNOWN` / `KNOB_DUPLICATE` | 文件键与绑定位置是否一致；是否重复写了键 |
| `KNOB_VALUE` / `KNOB_RANGE` / `KNOB_SYNTAX` | 字面量、声明范围、行号和原始文件字节；布尔不能写数字 |
| `KNOB_REGISTER` | 是否重复绑定同一位置；默认值和范围是否合法；是否在绑定后修改 schema |
| `KNOB_STATE` | 是否提前读取、重复加载或冻结后登记；加载阶段是否晚于使用阶段 |
| 空句柄访问 | 宿主是否实际传递了 scope；不能只声明成员而不赋值 |
| `KNOB_CROSS` / `KNOB_CHECK` | 上下限关系或用户业务校验的 reason |
| `KNOB_SEED` | 最终 simv 命令中是否只有一个合法数值 seed，包括外层脚本自动追加的参数 |
| `KNOB_RANDOMIZE` | 是否先应用配置；约束是否冲突；是否保留随机化返回值检查 |
| 文件改了但行为没变 | 是否启动了新的运行、读对目录；目标字段是否显式应用；是否被其他赋值覆盖 |
| `KNOB_UNUSED` 普通信息 | 本次流程未读到该项，允许通过；若预期使用，检查分支和句柄位置 |

接入完成前，在真实工程核对以下结果：

- 同一产物使用两份配置后，目标行为按预期改变，两个位置互不串用。
- 使用相同输入和 seed 重放时，约定的随机事务轨迹一致。
- 缺项使用正确默认值；合法未使用项不误报失败。
- 拼错键、超范围值、业务规则冲突在激励前失败，并显示对应致命诊断。
- 提前读取和随机化失败能终止流程；日志失败与原始运行异常分别记录。

首次试点建议先接入一个整数和一个布尔项，确认生命周期与证据后再扩展。其他参数沿用相同登记、绑定和应用模式，不需要复制解析器。
