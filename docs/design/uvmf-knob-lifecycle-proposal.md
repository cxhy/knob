# UVMF 可选 knob 生命周期方案

日期：2026-11-11。关联事项：`knob-uv7.2`。状态：按用户要求先记录，所有问题过完后再核对此项。当前不阻塞访谈，不将覆盖点视为已确认缺陷或重大问题；候选接法及实验范围保留为参考，尚未批准或执行。

后续更新：用户要求「那你还是确认一下吧」，已授权并完成定向 ALU 接入检查 `knob-uv7.8`。合法 seed 101/202 均被接受，同 seed 重放一致；冻结值在两次配置求解、初始化和实际使用时有效。关闭请求的布尔项生效，但宿主 scoreboard 按原规则报零事务错误，未报告该用例功能通过。见 [实际确认报告](uvmf-knob-seed-confirmation.md)。下文六类完整实验仍为历史建议，本轮未验证其全部范围；不再将已完成的定向检查写成待授权。

## 已确认的接入合同

- 基础工程采用 UVMF 原生 YAML 和少量工程配置，直接引用设计 filelist。
- 基础 UVMF 工程可独立生成、编译、运行和检查；knob 是可选增强。
- 持续再生成；业务代码放在明确的扩展位置，再生成合并冲突由 DV 修复。
- RTL 查询使用 hdl-kgraph，结合设计文档连线，保存可编辑映射及来源。设计信息缺失或矛盾由设计侧澄清。
- 首版 knob 提供统一初始化模板和显式声明、应用示例；YAML 批量生成接入代码留后续。
- 项目和团队可扩展场景模板；业务激励、参考模型、检查和覆盖由 DV 负责。
- 骨架检查与功能检查分开报告。配置冻结、原生 seed 和日志判定沿用 knob v1.2。

以上来源为 [目标访谈](phase2-goals-interview.md) Q1～Q8 和 [接入访谈](phase2-integration-contract-interview.md) Q9～Q18。具体公共依赖部署、锁定和升级方式由 `knob-uv7.3` 决定。

## 源码证据

输入为已核查的 UVMF 2023.4_2 包及已有 ALU 合并工程；未修改发行包或旧实验。下列包内路径相对于 `build/vendor/uvmf/unpacked/UVMF_2023.4_2/`。

| 位置 | 可核对事实 | 接入影响 |
| --- | --- | --- |
| `uvmf_base_pkg/src/uvmf_test_base.svh:80` | build_phase 创建 configuration，随即 randomize，再创建 environment 并传入配置 | 约束输入必须在该次求解前应用 |
| `templates/python/template_files/bench_templates/bench_tb_tests_src_test_top_svh.TMPL:127` | pre_super custom 在基类 build 前，post_randomize custom 和 initialize 在其后 | pre_super 可做统一准备，此时不能访问基类尚未创建的 configuration |
| `templates/python/template_files/environment_templates/environment_configuration.TMPL:49` | 普通子环境和 agent 配置句柄声明为 rand；构造函数中创建它们 | 顶层求解可能包含子配置，不能把子配置首次使用推迟到 initialize |
| 同模板 `:73` | class_item_additional custom 可增加成员和方法；模板本身没有 pre_randomize 专用区块 | 可在该保留区加入 pre_randomize，具体调用与保留效果仍需实验 |
| 同模板 `:231` | initialize 根据 configVariableValues 再次赋值配置字段 | 随机化前应用成功不能证明最终使用值未被覆盖 |
| `build/uvmf-standalone/repro2/alu/verification_ip/environment_packages/ALU_env_pkg/src/ALU_env_configuration.svh:83` | 合并业务 custom 的 post_randomize 再次调用两个子配置的 randomize | 必须覆盖每次受影响求解，不能只在父配置应用一次 |

三个主要输入的 SHA-256：

```text
uvmf_test_base.svh
99d1280a93e30744dc14c1e6902fff19a4a6ec82a0d1e56d72115be6bb4b21d7
bench_tb_tests_src_test_top_svh.TMPL
84726d336fc9653285bdc0112bfe21a8e6bc0d7241635845e2e7cb93e7c488ee
environment_configuration.TMPL
79f3a389c014c4fa197cc1b1d4f5433e3c545845302d6fa922d6be817e30de08
```

## 候选接法

test 的 pre_super custom 调用项目统一准备函数，汇总全部声明和校验规则，加载 `knob.cfg` 并冻结。登记过程独立于尚未创建的 configuration 对象。后续创建的配置使用方接收已准备的逻辑位置句柄，不能重新登记。

配置类通过其 custom 保留区增加 pre_randomize，在每次求解前读取冻结值，设置非 rand 的约束输入。需要固定 rand 字段时，必须显式约束或关闭该字段随机化，不能仅赋值后任由求解覆盖。各类只应用自己声明接入的字段，避免依赖父子回调的相对顺序。

只影响后续行为的参数可在对应行为前应用；若在 initialize 前应用，还须确认 initialize 不会再次覆盖它。active/passive、接口绑定等由生成工程管理的结构设置，须在逐项明确所有权后接入，不能通过通用示例任意覆盖。接口配置模板也有类内 custom 保留区；若自定义继承链已有随机化回调，接入须保留父回调行为，具体写法通过编译核对。

无 knob 的工程不引用 knob 源码、不读取 knob.cfg。首版可选增强的具体生成选择入口和编译材料由后续设计确定。本方案不修改 UVMF 核心库或生成器。

## 待确认的隔离实验

已有无 knob ALU 实验授权不含 knob 集成。本次先给出可审阅的实验范围，确认后再创建独立实验事项和入口。

实验使用新的 `build/uvmf-knob-lifecycle/` 输出目录和独立运行目录，复用现行 knob v1.2 库与固定 UVMF/VCS/UVM1.2；不修改旧 repro2、原始包或 CHI。先建立可重复编译、单次运行和结果检查入口，再执行。

| 场景 | 预期证据 |
| --- | --- |
| 两组合法配置复用一次编译 | 配置约束和实际行为随文件变化，simv 及共享库标识不变 |
| 同 seed 同配置重放 | 事务轨迹一致，准备先于首次受影响求解 |
| 父子配置及再次随机化 | 每次受影响求解均使用冻结输入，无配置值被覆盖 |
| 错误配置 | 指定 knob 致命诊断出现，激励为零，独立记录原始退出码 |
| 实际约束无解 | 在失败求解处终止，不重试或回退 |
| 同 YAML 再生成 | 保留初始化和配置应用 custom 代码，重编译后结果满足同一预期 |

无 knob 路径继续使用其独立编译输入；若本实验引入会影响该路径的工程生成改动，补跑受影响基线。仅凭本报告不能关闭接入设计或声称生命周期已通过功能验收。
