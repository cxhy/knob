# 随机化与 seed 的只读证据

核查日期：2026-11-11。本文件保存接口事实。项目后续已在 Q19 选定 VCS W-2024.09-SP1 与 UVM 1.2；该选择与本文件的只读核查都不代表运行验证通过。

## VCS 运行时 seed

本机 VCS W-2024.09-SP1 手册支持 `./simv +ntb_random_seed=12345`。该参数设置仿真启动时顶层 RNG 的 seed，接受 32 位有符号整数，工具默认值为 1；相应 RNG 后续可被 `srandom` 重设。项目已在 Q14/ADR-0003 确认强制显式提供数值 seed，遗漏时报错，不沿用工具默认值作为产品缺省策略。

证据：`/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_user_guide/simulation_options/options_for_simulating_native_testbenches.html:213`。

## UVM 派生状态与调用顺序

查阅安装内 UVM 1.2 源码。`base/uvm_misc.svh:313` 中全局随机 seed 来自 `$urandom`，受命令行 seed 影响，但不是输入数字的简单复制。`base/uvm_object.svh:836` 的 `reseed()` 通过类型与完整名称派生对象 seed。`base/uvm_misc.svh:416` 及后续逻辑还维护哈希与计数状态，同名对象再次派生 seed 不保证相同。

`seq/uvm_sequence_item.svh:109` 的上下文设置会触发 `reseed()`。类型、名称、上下文和相关调用过程因此都属于复现条件。

`seq/uvm_sequence_base.svh:258/332/337/347` 中 `start()` 依次进入 `pre_start()`、条件调用的 `pre_body()` 和 `body()`，不自动对 sequence 随机化。`macros/uvm_sequence_defines.svh:199/204/208` 的宏路径可能先随机化，再 `start(...,0)`，并跳过 `pre_body()`。仅在启动回调读取约束参数无法覆盖所有随机化入口。

源码根目录：`/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/`。公开交叉参考：[Accellera UVM 1.1 Class Reference 的 uvm_object seeding 定义](https://accellera.org/images/downloads/standards/uvm/UVM_1.1_Class_Reference_Final_06062011.pdf)。首版实际目标采用用户已选定的 UVM 1.2。

## 可复现边界

本机 ISR 手册提醒，命令行选项、TB/DUT 修改、工具版本和补丁变化可能影响同 seed 的结果。证据：`/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_ico/what_s_new_in_this_release/intelligent_simulation_replayer_isr_for_modified_testbench.html:121`。

基于上述证据，复现验收应固定编译产物、工具/UVM 版本与选项、配置与输入数据、对象上下文及随机化调用过程，并避免依赖竞态或非确定性外部输入。用户已在 Q15/ADR-0003 确认对应复现边界，不要求跨版本、修改代码或配置后仍产生相同序列；实际保证仍需运行验证。

本轮只读文档和源码，没有执行 VCS、许可证操作、编译或仿真。
