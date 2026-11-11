# 接入已有 UVM 环境

目标环境为 VCS W-2024.09-SP1 和 UVM 1.2。保留现有编译、仿真脚本和类继承，只增加下面的接入点。完整公共合同见 [接口说明](knob-api.md)。

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

可放在 end_of_elaboration 回调。无需修改继承关系；保留宿主原有的 super 回调和其他初始化。

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

## 准备文件并运行

每次使用独立运行目录，在该目录保存 `knob.cfg`：

```ini
link0.tx.count=3
link1.tx.enabled=false
```

在该目录通过已有脚本运行已编译的 simv，并显式提供唯一数值 `+ntb_random_seed=12345`。缺项使用声明默认值；配置文件本身必须存在。再次调参时创建新的运行目录和配置文件，复用同一编译产物。

保持原有日志关键字判定。配置错误会输出 UVM_FATAL，原始进程码可以为 0；原始非零码独立表示运行异常。无需搜索原型专用的成功标志。可在宿主结束阶段调用 `knobs.report_unused()` 获取普通未使用信息。

## 用独立示例核对流程

[宿主示例](../../examples/host/tb.sv) 包含自己的 test/env、两个 agent、sequencer、driver、sequence 和 item，并保留自己的基类。driver 在 1 ns 延迟后记录握手事务；示例没有具体 DUT 协议实现。

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

完整运行日志、生效配置、事务与 sequence 轨迹、原始退出码和宿主分类都保存在运行目录。独立宿主的结果文件区分 `test_result` 与 `runtime_result`；这是示例策略，接入者可以沿用自己的状态表示。
