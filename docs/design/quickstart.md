# 接入已有 UVM 环境

本页提供精简步骤。首次集成时，可按 [验证开发人员接入指南](integration-guide.md) 核对职责、调用位置、随机化顺序及运行结果。

目标环境为 VCS W-2024.09-SP1 和 UVM 1.2。保留现有编译、仿真脚本和类继承，只增加下面的接入点。sequence、UVM 组件、普通 SV 类和持有句柄的 task/function 都可作为配置使用方；框架仍依赖 UVM。完整公共合同见 [接口说明](knob-api.md)。

## 加入编译输入

交付库只需要 [knob.f](../../knob.f) 和 [src/knob_pkg.sv](../../src/knob_pkg.sv)，保留两者相对位置。将框架文件列表放在使用它的宿主 package 之前：

```bash
vcs -full64 -sverilog -ntb_opts uvm-1.2 \
  -F /your/vendor/knob/knob.f /your/project/tb.sv -top host_tb -o simv
```

`-F` 使源路径相对于文件列表所在目录解析。宿主可以把框架放在任意目录，不需要本项目的构建脚本。该命令中的路径是替换位置；本机开发验证仍通过 AGENTS.md 指定的 VCS 环境和包装入口执行。

在需要调用框架的宿主 package 中导入 `knob_pkg::*`。不要把演示 package 加入产品编译列表。

## 声明可调参数

在已有 test/env 中增加配置对象、声明组和位置句柄。以下代码是接入片段，放在宿主已有 build 回调内：

```systemverilog
knobs = new;
schema = new;
schema.define_int("count", 2, 0, 1000);
schema.define_bool("enabled", 1);
link0_cfg = schema.bind_scope(knobs, "link0.tx");
link1_cfg = schema.bind_scope(knobs, "link1.tx");
```

对象类型分别为 `knob_store`、`knob_schema`、`knob_scope`。同一声明组绑定到不同位置会生成独立键。创建全部声明后再绑定；第一次绑定后不再修改声明组。

## 统一加载与冻结

选择唯一一个 test/env 准备入口，在所有登记完成后、任何激励开始前执行：

```systemverilog
void'(validate_seed());
knobs.load_and_freeze();
```

若所有使用方均在此之后读取，可放在 end_of_elaboration 回调。需要更早读取时，必须提前完成全部登记和统一冻结；不能在未准备的构造函数或 build 回调中取值。无需修改继承关系；保留宿主原有的 super 回调和其他初始化。

上下限关系可用 `schema.require_le()` 或 `store.require_le()` 声明。复杂业务规则通过 `knob_validator` 实现并在加载前登记，示例见接口说明和 [host_budget_check](../../examples/host/tb.sv)。

## 应用到 sequence

在已有 sequence 中增加一个显式应用函数，将 scope 的值写到非 rand 字段：

```systemverilog
function void apply_knobs(knob_scope cfg);
  count = int'(cfg.get_int("count"));
  enabled = cfg.get_bool("enabled");
endfunction
```

这里的 count 为 int，声明范围 0～1000 保证转换不丢失。创建 sequence 后调用该函数，再执行宿主的随机化和启动流程。每次 randomize 失败都应立即终止。item 的约束参数同样在其 randomize 前写入。

## 应用到组件和普通 SV 类

已有组件可以持有 `knob_scope`，也可以将它作为 task/function 参数传递。对象无需继承 knob 基类。所有位置仍由宿主在加载前登记并绑定；对象本身可以在冻结后创建。

宿主示例为 driver 绑定 `link0.driver`、`link1.driver`，其中 `delay_ns` 是范围 0～1000 的整数，默认 1。driver 在 run 阶段的等待 task 中读取此值，并执行对应的 ns 延迟。

示例还为普通 SV 类 `host_header_policy` 绑定 `link0.header`、`link1.header`。`header_bytes` 的范围为 0～64，默认 0；`enabled` 默认 true。每次调用 `frame_length()` 都读取已冻结配置，返回原始包长加上启用的头部长度。该类没有 UVM 或 sequence 基类。

在两位置的原始包长均固定为 64 时，配置如下：

```ini
link0.tx.min_length=64
link0.tx.max_length=64
link1.tx.min_length=64
link1.tx.max_length=64
link0.driver.delay_ns=2
link1.driver.delay_ns=5
link0.header.header_bytes=8
link1.header.header_bytes=16
link1.header.enabled=false
```

每位置默认每轮发 2 包、重复两轮。预期 link0 每包实际等待 2 ns，输出帧长度 72；link1 每包等待 5 ns，输出帧长度 64。`HOST_TIMING` 记录实测耗时，`HOST_FRAME` 记录原始与输出长度。等待单位和长度换算由宿主定义，knob 只提供整数与布尔值。

沿用同一编译产物，在新的运行目录把 link0 的等待改为 7、头部 enabled 改为 false，把 link1 的等待改为 0、头部 enabled 改为 true。预期耗时分别为 7 ns 和 0 ns，输出长度分别为 64 和 80。这里修改的是下一次运行的文件；一次运行内冻结值保持不变。

这些接口控制运行期变量，不改变编译期 parameter、位宽或 generate 结构。

## 准备文件并运行

每次使用独立运行目录，在该目录保存 `knob.cfg`：

```ini
link0.tx.count=3
link1.tx.enabled=false
```

在该目录通过已有脚本运行已编译的 simv，并显式提供唯一数值 `+ntb_random_seed=12345`。缺项使用声明默认值；配置文件本身必须存在。再次调参时创建新的运行目录和配置文件，复用同一编译产物。

保持原有日志关键字判定。配置错误会输出 UVM_FATAL，原始进程码可以为 0；原始非零码独立表示运行异常。无需搜索原型专用的成功标志。可在宿主结束阶段调用 `knobs.report_unused()` 获取普通未使用信息。

## 用独立示例核对流程

[宿主示例](../../examples/host/tb.sv) 包含自己的 test/env、两个 agent、sequencer、driver、sequence 和 item，并保留自己的基类。driver 默认在 1 ns 延迟后记录握手事务，并支持上述等待与帧头配置；示例没有具体 DUT 协议实现。

在本仓库中执行：

```bash
make compile-host
make test-host
```

编译目标把框架和宿主源码复制到独立工程目录，再调用宿主自己的编译入口。回归不编译，检查配置变更、同 seed 重放、用户校验错误和原始非零异常分类。

手工运行时，先创建新的运行目录并复制 [示例配置](../../examples/host/knob.cfg)，然后调用宿主入口：

```bash
mkdir -p runs/host-manual
cp examples/host/knob.cfg runs/host-manual/knob.cfg
bash examples/host/run.sh build/host-isolated/out runs/host-manual +ntb_random_seed=12345
```

示例配置使两个位置每轮分别发送 3、1 条事务，各启动两轮，总计 8 条。修改为 link0 的 count=5、min_length=max_length=256、link1 的 enabled=false 后，总计 10 条、长度全部 256。改为 `shared.budget=1` 时应出现 `KNOB_CHECK`，且无事务。

完整运行日志、生效配置、事务、sequence、时序与帧长度轨迹、原始退出码和宿主分类都保存在运行目录。独立宿主的结果文件区分 `test_result` 与 `runtime_result`；这是示例策略，接入者可以沿用自己的状态表示。
