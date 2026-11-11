# VCS 首版 knob 可行性评估

日期：2026-11-11。评估对象：[knob-spec.md](knob-spec.md) v1.0、ADR-0001～0004，目标工具为 VCS W-2024.09-SP1 和 UVM 1.2。

## 结论与证据边界

在已确认的「每个值显式接入、启动时从文件加载、运行中保持冻结」范围内，文档和源码支持采用 SystemVerilog/UVM 实现。所需文件读取、字符串处理、关联数组、阶段控制、原生随机化和命令行参数枚举都有现成接口。没有发现必须自行编写 VPI/DPI 插件或修改 VCS 的需求。这里的「不需要自编插件」不等于 UVM 内部完全没有 DPI；安装版 `uvm_cmdline_processor` 自身通过 UVM DPI 获取命令行参数。[S1][S2][S3][S4]

整体属于中等实现与验证难度：难点集中在严格数值解析、全局激励前检查、sequence 随机化接入和失败结果判定。把文件读进来本身较简单，满足规格的完整错误合同需要专门验证。该判断是基于接口的工程评估，不是工期承诺。

这里调整的是已编译逻辑读取的运行时变量，例如发包数量和约束上下限。首次仍需编译文件读取与显式赋值代码；编译期 `parameter`、类型和 `generate` 结构的变化不属于本方案。

本轮只读取本机手册、UVM 源码和项目文档，并编写本报告。没有运行 VCS、许可证探测、编译或仿真。**文档/源码支持不等于本机编译通过，更不等于 T1～T14 功能验收通过。** 下文的接口组织是实现候选，不修改正式规格，也不批准具体 API。

## 已有能力与候选接入

| 需要实现的能力 | 可用接口或事实 | 工程约束 |
| --- | --- | --- |
| 读取运行目录 `knob.cfg` | VCS 手册列出 `$fopen`、`$fgets`、`$fclose`、`$ferror`。[S1] | 检查文件打开和读错误；逐行维护行号，处理 LF/CRLF、注释和空行。不能把读错误当正常 EOF。 |
| 字符串与完整键处理 | UVM 源码使用 `string.len()`、`substr()`、索引和字符串比较。[S2] | 这些足以实现受限的 `key=value` 语法；应先剥离注释，再验证单个等号、键段和值。 |
| 精确键查找与登记表 | UVM 源码存在字符串索引关联数组及 `exists()`。[S3] | 可用独立登记表记录类型、默认值、范围、来源和是否读取；精确键匹配不需要正则或通配符。 |
| 启动准备与冻结 | UVM common domain 顺序为 build、connect、end_of_elaboration、start_of_simulation、run 等。[S4] | 要由接入方保证全部登记结束后才校验冻结，并保证产生激励的入口等待准备成功。仅把代码放到某个回调并不能防止用户在更早阶段或独立 initial 中发包。 |
| sequence 取值 | sequence 是 `uvm_object` 继承链中的对象，`start()` 提供回调和 body 执行。[S5] | 逻辑使用位置由接入方提供，不能假定它等于 UVM component 层次。应显式把生效值应用到原生随机化可见的参数。 |
| 检查唯一 seed | `uvm_cmdline_processor::get_arg_values()` 返回全部前缀匹配值及数量。[S2] | 用包含等号的前缀匹配 `+ntb_random_seed=`，数量必须为 1，再严格解析十进制 signed32。该接口不是数值校验器。 |
| 输出诊断和轨迹 | UVM 报告机制及 SV 文件输出接口可用。[S1][S11] | 需要稳定诊断类别和可比较轨迹；进程退出码与 UVM 诊断共同决定验收。 |

候选库边界可以分为登记、加载校验/冻结、带类型取值、跨参数校验回调、报告五类操作；具体类名和签名仍由后续设计决定。类型、范围和生命周期检查要在库边界执行，不能只依赖示例调用者自觉遵守。新增类型的位置应明确，但首版不需要通用插件系统。[规格 R2～R6]

### `uvm_config_db` 可选，但不能直接代替 knob 合同

`uvm_config_db#(T)::get/set` 可作为既有环境传递配置对象或句柄的适配方式。其 `get` 接受 `uvm_component` 上下文，内部进行名称模式查找；build 期采用层次优先级，其他时期存在 last-wins 规则。这与本项目精确键、重复拒绝、统一登记和冻结后不可变的合同不同。因此 config_db 只能是可选集成手段，不能因复用它而省略 knob 校验与冻结层。sequence 不是 component，不能直接把 sequence 的 `this` 当该 API 的 component 上下文。[S5][S6]

## 主要难点

### 1. signed64 解析：类型够宽不代表文本转换正确

规格要求完整的 −2^63～2^63−1 数学范围，且正十六进制不能按二补码悄悄变负。`longint` 或 64 位存储只解决保存结果的问题，不自动实现文本合法性、整个字符串消费和溢出诊断。[规格 R3]

本机手册专门指出 `atohex()` 的标准返回宽度为 32 位，旧 VCS 行为曾按左值宽度处理，并提供 `-xlrm atox_context_width` 切回旧行为。这是不能直接用 `txt.atohex()` 承担规格 signed64 解析的具体证据；把返回值再赋给 64 位变量无法恢复已丢失的信息。也不应依赖兼容选项让解析正确性与编译选项耦合。[S7]

`$sscanf` 在工具中存在，UVM 自己也用它做数值转换，但这些调用不证明它独自满足本项目的严格字面量和越界合同。候选实现应先逐字符验证符号、进制、数字和尾部，再在每次累加前检查范围；或采用能提供等效证明的受控解析方式。[S1][S8]

一种可评估的算法是以无符号 64 位幅值累加：正数上限 2^63−1，负数幅值上限 2^63；在执行 `magnitude * base + digit` 前检查界限，最后单独处理 −2^63。不要先溢出再检查，也不要用有符号 64 位正数保存 2^63。该算法属于候选实现推导，尚未在 VCS 验证。

关键反例包括 `-0x8000000000000000`、`0x8000000000000000`、`0xffffffffffffffff`、超长十进制数字、`123junk`、`0x`、`+1`、`1_000`、SystemVerilog 宽度字面量，以及配置有效但写入目标 sequence 字段时发生窄化。最后一项也需要接入代码保持 R2 类型/范围合同。

### 2. 激励前拒绝错键需要完整登记表

提前登记合法键后，加载器可以一次比较所有文件键，拒绝拼错或未登记项；合法但未读取项则属于结束时报告信息。若只在 sequence 查询时才发现键，尚未执行或条件分支中的 sequence 无法为全局激励前检查提供完整信息。[规格 R2/R4；S4][S5]

候选集成方式是在 test/env 准备阶段汇总登记和跨参数规则，在进入产生激励的流程前加载、检查并冻结。多组件登记的先后、重复登记、回调读取候选值的能力，以及校验失败是否阻止全部发包，是需要明确的内部接口边界。跨参数回调可验证上下限等确定关系，不能据此声称提前证明所有未来随机化问题可解。

### 3. 配置必须早于受影响的 `randomize()`

`uvm_sequence_base::start()` 依次执行 `pre_start()`、可选 `pre_body()`、`body()`，自身不自动随机化 sequence。`uvm_do_on_pri_with` 则先创建并随机化 sequence，再调用 `start(..., 0)`，因此 `pre_start()` 已晚于该次随机化，`pre_body()` 还会被跳过。只在这两个回调中读取 knob 不能保证 R5。[S5]

候选接入顺序是创建对象、显式取得并应用生效配置、检查原生随机化返回值、再启动或发送。对 sequence 自身随机化和 sequence 内 item 随机化，需要分别确认值已应用；配置参数不应被随后未经约束的随机化覆盖。具体采用非随机配置字段还是明确的约束绑定，属于实现选择。

本机 `uvm_do_on_pri_with` 对随机化失败只发出 `uvm_warning("RNDFLD", ...)`，随后继续后续流程。直接沿用该默认路径不满足「无解立即使运行失败」。示例和接入说明应显式检查 `randomize()` 返回值并进入受控失败路径，不能依靠默认宏警告来证明 T9。[S5]

### 4. seed 枚举可行，但必须覆盖仿真器先行解析的边界

VCS 手册明确 `+ntb_random_seed=value` 是运行时设置顶层随机状态的参数，接受 32 位有符号整数，工具默认值是 1。产品要求每次显式提供 seed，因而仍需检查原始命令行而不能只查询最终 seed。[S9；规格 R5]

`get_arg_values("+ntb_random_seed=", values)` 保留所有匹配项，返回队列长度，可用于发现重复值，即使两次值完全相同也应按规格失败。返回字符串还需按十进制 signed32 规则完整解析；前缀匹配本身不会拒绝空值、尾随垃圾、越界或 malformed 参数。[S2]

`get_args()` 可用于核对完整原始参数，包括没有等号的错误拼写。但 VCS 可能在 UVM 初始化前先处理原生 seed 选项，某些非法值可能由仿真器先拒绝。因此实际 PoC 必须确定重复、非法及边界值怎样到达 UVM、产生什么退出码与诊断，不能预先承诺每个非法 seed 都会进入库的同一条报错路径。

UVM 派生 seed 来自受命令行影响的 `$urandom`，并结合 type、name、scope 及重复派生状态；sequence 上下文设置也可能触发 reseed。固定 seed 并不替代固定编译产物、工具环境、配置、外部输入和随机化调用过程。VCS 手册也明确列出命令行、TB/DUT 和版本/补丁变化会影响复现。[S10]

### 5. `UVM_FATAL` 和 shell 非零码必须分别核对

本机 UVM 的 `uvm_root::die()` 在报告汇总后执行 `$finish`。源码不能据此证明 shell 一定得到非零退出码。回归入口应共同检查进程结果、指定错误诊断、失败前事务轨迹和结束标志；预期失败用例必须证明预期错误确实触发。若需要统一对外返回失败码，应由经过实测的运行入口作明确判定。[S11；规格 Testing Decisions]

### 6. 不需要任意类字段反射

首版已经批准显式接入。SV 类方法和类型化字段赋值即可完成从生效配置到 sequence 的应用，不需要按任意字符串路径探测或改写所有对象字段。[规格 R2/Out of Scope；S5]

UVM 的 `set_int_local` 等接口也不是无条件反射：源码说明对象作者选择哪些字段可访问，`uvm_field_int` 等宏为明确列出的属性生成操作代码；`set_int_local` 调用字段自动化处理，并可能报告找不到匹配项。这些机制不能自动提供所有 sequence 字段的合法 knob 名单、范围和冻结语义。[S12]

因此无需为首版另做 VPI/DPI 插件是从已批准范围与现成接口得出的设计判断，不是关于 VCS 不能访问任何动态对象的断言。项目正常使用 UVM 自带的 DPI 链路；是否能在本机正确链接并获取全部运行参数仍需最小编译验证。[S2]

## 最小 PoC 验证建议（未执行）

先实现一份最小 UVM 环境，编译时显式选择 `-ntb_opts uvm-1.2`，使用批准的 VCS 包装入口；只编译一次并记录产物标识。以下运行均使用独立目录和同一份可执行文件。这是验证建议，不是已经建立的命令入口，也不替代完整 T1～T14。

1. **基础接口与配置生效**：用两组 `knob.cfg` 改变发包数量、布尔开关和包长范围，两个逻辑使用位置独立生效；检查完整生效值、来源、事务轨迹和产物标识。
2. **准备期失败**：缺文件、未知/重复键、跨参数矛盾分别触发指定错误，并证明错误前零事务。增加 CRLF、注释、空文件和缺项默认值正例。
3. **数值边界**：覆盖 signed64 两端、负十六进制、正十六进制越界和长数字；同时检查 sequence 应用时不发生窄化或符号变化。
4. **随机化时序与失败**：分别覆盖 sequence 自身和其 item 的约束；注入实际无解，核对不会仅警告后继续、不重试或换 seed。
5. **seed 输入链路**：固定合法 seed、signed32 边界、缺失、重复（含同值重复）、空值、非法十进制和越界；记录 VCS 与 UVM 各自诊断及原始进程码，核对是否在产生激励前失败。
6. **同 seed 重放及证据**：固定规格约定条件运行两次，逐项比较随机事务序列；再用选定不同 seed 案例验证受 seed 控制，不要求任意两 seed 输出必不同。核对所有运行前后编译产物标识一致。

## 来源索引

以下均为本机安装内的第一方手册或实际 UVM 1.2 源码。行号以核查时本机文件为准；未将大段手册正文复制到项目。

- **S1 文件 I/O**：[VCS System Tasks and Functions，第 396～415 行](/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_user_guide/verilog_compiler_directives_system_tasks/system_tasks_functions.html:396)。手册列出文件开关、逐行读取、错误查询、格式读取及输出。
- **S2 字符串和命令行**：[uvm_cmdline_processor.svh:76](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_cmdline_processor.svh:76)（get_args）、[同文件:206](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_cmdline_processor.svh:206)（get_arg_values）、[同文件:248](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_cmdline_processor.svh:248)（DPI 枚举原始参数）。公开交叉参考：[Accellera UVM 1.2 User’s Guide，第 6.6 节](https://www.accellera.org/images/downloads/standards/uvm/uvm_users_guide_1.2.pdf)，由主 agent 核对。
- **S3 字符串关联数组**：[uvm_misc.svh:336](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_misc.svh:336)（字符串索引 seed 表）；[同文件:432](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_misc.svh:432)（exists 与键查找）；[uvm_resource.svh:661](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_resource.svh:661)（字符串索引资源表）。
- **S4 UVM 阶段**：[uvm_domain.svh:109](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_domain.svh:109)（common 阶段顺序）；[uvm_common_phases.svh:63](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_common_phases.svh:63)（build）、[同文件:198](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_common_phases.svh:198)（start_of_simulation）、[同文件:267](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_common_phases.svh:267)（run）。
- **S5 sequence 生命周期**：[uvm_sequence.svh:33](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence.svh:33)、[uvm_sequence_base.svh:134](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence_base.svh:134)、[uvm_sequence_item.svh:37](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence_item.svh:37)、[uvm_transaction.svh:124](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_transaction.svh:124)（对象继承链）；[uvm_sequence_base.svh:258](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence_base.svh:258)（start）、[同文件:332](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence_base.svh:332)（回调到 body 顺序）；[uvm_sequence_defines.svh:199](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/macros/uvm_sequence_defines.svh:199)（随机化后启动，失败仅 RNDFLD warning）。
- **S6 config_db**：[uvm_config_db.svh:89](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_config_db.svh:89)（get 的 component 上下文与模式查找）、[同文件:131](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_config_db.svh:131)（层次优先级与 last-wins）。
- **S7 atohex 返回宽度**：[VCS Extensions to SystemVerilog:462](/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_user_guide/using_systemverilog/extensions_to_systemverilog.html:462)，章节 LRM Compliant Behavior for the atohex Method；[命令参考:200](/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_cmd_ref/system_verilog_options/compilation_options.html:200)（-xlrm atox_context_width）。
- **S8 UVM 数值转换使用**：[uvm_root.svh:867](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_root.svh:867)（不同进制的 sscanf）；[uvm_misc.svh:644](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_misc.svh:644)（atoi 使用，不能作为本项目严格 signed64 解析的验收证据）。
- **S9 VCS 运行时 seed**：[Options for Simulating Native Testbenches:213](/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_user_guide/simulation_options/options_for_simulating_native_testbenches.html:213)。
- **S10 随机状态与复现**：[uvm_misc.svh:313](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_misc.svh:313)、[同文件:416](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_misc.svh:416)、[uvm_object.svh:836](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_object.svh:836)、[uvm_sequence_item.svh:109](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/seq/uvm_sequence_item.svh:109)；[VCS ISR 手册:121](/home/guodz/synopsys/vcs/W-2024.09-SP1/doc/UserGuide/html/vcs_ico/what_s_new_in_this_release/intelligent_simulation_replayer_isr_for_modified_testbench.html:121)。另见本项目 [randomization-evidence.md](randomization-evidence.md)。
- **S11 失败结束路径**：[uvm_root.svh:129](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_root.svh:129)，die 在第 135 行调用 `$finish`。
- **S12 字段显式接入**：[uvm_object.svh:719](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_object.svh:719)（对象作者决定可访问字段）、[同文件:957](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/base/uvm_object.svh:957)（set_int_local 调用字段自动化）、[uvm_object_defines.svh:635](/home/guodz/synopsys/vcs/W-2024.09-SP1/etc/uvm-1.2/macros/uvm_object_defines.svh:635)（uvm_field_int 对显式 ARG 生成处理）。

补充检索：Nowledge thread_search 查询 `knob VCS 可行性 规格` 成功，返回 0 个线程；本报告结论来自上述本地规格和第一方材料。
