# knob 公共接口

适用：VCS W-2024.09-SP1、UVM 1.2，规格 v1.2。框架通过 `knob_pkg` 导出以下接口；接入者保留自己的 UVM 基类和运行流程。源文件只有 [knob_pkg.sv](../../src/knob_pkg.sv)，编译入口为 [knob.f](../../knob.f)。

## 对象与职责

| 对象 | 职责 | 生命周期 |
| --- | --- | --- |
| `knob_schema` | 一组可复用的名称、类型、默认值、范围及上下限规则 | 定义完成后绑定；第一次绑定后声明不可修改，可继续绑定其他位置 |
| `knob_store` | 本次运行的登记表、配置加载、校验、冻结与使用记录 | 宿主创建并持有，所有接入位置共享同一次准备结果 |
| `knob_scope` | 一个显式使用位置的带类型读取入口 | 绑定时获得；配置冻结后取值 |
| `knob_validator` | 接入方实现的确定性跨参数校验 | 准备期登记，由框架在冻结前调用 |
| `knob_view` | 校验期间只读的候选生效值 | 只在本次校验函数调用期间有效，返回后失效 |

## 声明与绑定

`knob_schema.define_int(name, value, minimum=KNOB_MIN, maximum=KNOB_MAX)` 登记 signed64 数学整数的默认值与范围。`define_bool(name, value)` 登记布尔默认值，参数类型为 SystemVerilog `bit`；调用方应传入布尔值，不依赖语言的隐式窄化表达其他类型。

`schema.require_le(lower_name, upper_name)` 为已经声明的两个整数加入上下限检查。`schema.bind_scope(store, usage_scope)` 将全部声明复制到指定位置，返回 `knob_scope`。相同声明组可重复绑定不同位置；相同完整键的重复登记仍然报错。第一次绑定会封闭声明组，防止后续位置意外采用不同的声明版本。

`scope.key(name)` 生成完整配置键，适合校验函数使用。`scope.get_int(name)`、`scope.get_bool(name)` 读取对应位置的生效值。`scope.is_ready()` 和 `store.is_ready()` 表示配置是否已经冻结，不会触发加载。

宿主统一持有 store，配置使用方持有或接收对应 scope。scope 不要求使用方继承 sequence 或 UVM 基类；可用于 UVM 组件、普通 SV 类和能够传入句柄的 task/function。框架本身仍依赖 UVM。框架不强制使用单例、config_db 或某种对象传递方式。需要通过 config_db 传递 scope 时，由宿主沿用已有方式完成。

## 直接登记与准备

| 接口 | 约定 |
| --- | --- |
| `store.register_int(key, value, minimum, maximum)` | 不使用声明组时直接登记完整键；范围默认 signed64 全范围 |
| `store.register_bool(key, value)` | 直接登记完整布尔键 |
| `store.require_le(lower_key, upper_key)` | 为两个已登记的整数加入上下限检查 |
| `store.add_validator(name, object)` | 登记一个具名校验对象；拒绝空名称、空对象和重复名称 |
| `validate_seed()` | 检查唯一显式 signed32 十进制 seed，记录并返回输入值，不重新播种 |
| `store.load_and_freeze()` | 从当前运行目录读取 knob.cfg，完成解析、单项校验、上下限规则和用户校验，再冻结 |
| `store.get_int(key)` / `get_bool(key)` | 冻结后按完整键读取值，并标记为已使用 |
| `store.report_unused()` | 冻结后报告未被普通取值接口读取的项；不会发出错误或致命诊断 |

所有声明与校验必须在 `load_and_freeze()` 之前完成。重复加载、冻结后登记、未就绪取值和类型不匹配都会失败。读取返回标量副本，框架不提供修改生效配置的接口。

编排建议：build 阶段收集声明；指定一个 test/env 在 end_of_elaboration 阶段检查 seed 并加载；run 阶段创建 sequence、应用配置后再随机化。示例在 build 阶段检查 seed，也满足「激励前检查」约定。宿主需要确保自己的其他激励入口不会绕过准备过程。

## 用户校验

接入方继承 `knob_validator`，实现：

```systemverilog
function bit validate(knob_view values, output string reason);
  reason = "packet count exceeds budget";
  return values.get_int("link0.tx.count") <= values.get_int("shared.budget");
endfunction
```

返回 1 表示通过；返回 0 时框架使用校验名称和 reason 发出 `KNOB_CHECK` 致命诊断。函数不能等待时间，也不应产生激励、取随机数、重新播种或通过外部句柄修改配置。这些是校验作者的接口约定；框架并不沙箱化用户 SystemVerilog 代码。

框架按登记顺序执行校验，传入独立复制的标量视图。视图没有写接口，也不暴露登记表；每次校验返回后关闭该视图。不得保存后用于普通配置使用方取值。校验中通过普通 store/scope 取值依然失败，防止提前开放激励端读取。校验读取不计作普通配置使用方的使用，因此仅被校验读取的项仍会出现在 unused 信息中。

声明范围应限制算术规模；校验作者负责自己业务表达式中的溢出。例如两个有界计数的和可以安全检查，不要把两个任意 signed64 值无检查地相加。

## 非 sequence 接入

`host_driver` 在 connect 阶段接收已登记的 timing/header scope，在 run 阶段由 `wait_for_transfer()` 调用 `configured_delay_ns()` 读取整数，控制实际仿真延迟。普通 SV 类 `host_header_policy` 在冻结后创建，其 `frame_length()` 直接读取整数 `header_bytes` 和布尔 `enabled`，计算发送帧长度。它不继承 UVM 或 sequence 类。完整代码见 [宿主示例](../../examples/host/tb.sv)。

使用方对象可以晚于冻结创建，但它使用的键和位置必须提前登记。多次读取返回同一冻结值；不会重新加载文件或新增登记。未知键、提前读取、类型不匹配等诊断对所有使用方相同。

若某参数要在 build 阶段使用，必须先安排全部登记与统一冻结，不能沿用 end_of_elaboration 加载又在 build 提前取值。框架不替宿主重排 phase，也不提供编译期 parameter、位宽或 generate 调整能力。

## 随机化接入

配置字段保持为非 rand，赋值目标宽度必须覆盖登记范围。对 sequence 本身的随机化，先调用应用配置方法，再检查 `seq.randomize()` 的返回值；对 item，先赋约束参数，再检查 `item.randomize()`。失败立即终止，不重试、不换 seed、不退默认。

`start()` 不代替上述操作。不要只在 `pre_body()` 或 `pre_start()` 读取配置，因为已有宏调用可能在这些回调之前随机化。接入方可以使用 `pre_randomize()` 检查配置是否已应用。完整的 sequence 和 item 接入见 [独立宿主示例](../../examples/host/tb.sv)。

## 诊断与结果判定

| 标识 | 含义 |
| --- | --- |
| `KNOB_FILE` | 文件缺失或读取错误 |
| `KNOB_SYNTAX` | 行结构或配置键语法错误 |
| `KNOB_UNKNOWN` / `KNOB_DUPLICATE` | 未登记键或重复文件键 |
| `KNOB_VALUE` / `KNOB_RANGE` | 非法字面量、类型范围溢出或超出声明范围 |
| `KNOB_REGISTER` | 重复声明、非法默认值/范围/绑定或校验对象登记错误 |
| `KNOB_STATE` / `KNOB_TYPE` | 调用时机或读取类型错误 |
| `KNOB_CROSS` / `KNOB_CHECK` | 内置上下限检查或用户校验失败 |
| `KNOB_SEED` | 原生 seed 缺失、重复或非法 |
| `KNOB_APPLY` / `KNOB_RANDOMIZE` | 示例中的应用顺序错误或原生随机化失败 |

错误使用 UVM_FATAL；不要求仿真器返回非零。宿主按现有 UVM 日志规则判断用例结果，将原始非零退出码独立归入运行异常。框架的 `KNOB_VALUE`、`KNOB_SEED`、`KNOB_UNUSED` 普通信息行不是 UVM 错误关键字；同名诊断 ID 与普通信息应按 UVM severity 区分。框架不提供整体仿真 PASS 标志。

## 类型扩展

新增类型时，在 `knob_kind` 和登记项/候选视图的存储表示中加入对应类型；增加声明与取值接口，扩展解析和报告分支，并让 schema 绑定复制该类型。继续保留值来源、类型检查、只读校验和冻结约束。新增类型的测试从配置文件到仿真诊断/事务行为验证，不只测试转换函数。

当前只实现整数和布尔。`knob_entry`、`knob_candidate_view`、解析辅助函数及内部存储不是接入 API，不应由宿主直接操作。已有 prototype 的完整键 register/get 接口继续可用。
