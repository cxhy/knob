# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户批准将 knob 扩展为验证环境中通用的运行期配置接口。规格现为 `docs/design/knob-spec.md` v1.2；实施事项 `knob-l8r` 与范围决定 `knob-vjr` 已关闭。事项 knob-l8r 的正文与现行规格逐字一致；已完成的 v1.1 母事项 knob-be2 改为引用历史 `docs/design/knob-spec-v1.1.md`，其旧规格正文保留。

核心库没有修改，公共接口本来就不依赖 sequence 类型。本轮同步范围说明并在独立宿主验证非 sequence 使用方；独立代码审查尚未执行。

## 范围与用户决定

配置使用方可以是 sequence/item、UVM 组件、普通 SV 类，以及能够取得句柄的 task/function。每个可调值仍须显式接入，所有声明和使用位置在统一加载前登记。普通使用方只能在冻结后读取；使用方对象可在冻结后创建，重复读取返回同一冻结值。相关行为或随机化必须在配置应用后执行。

配置来自每次运行目录的 knob.cfg，永久不支持运行中动态修改，暂不支持命令行覆盖。类型仍为整数和布尔，随机化由原生 seed 控制。框架仍依赖 UVM，不修改编译期 parameter、位宽或 generate 结构。需要在 build 等更早阶段读取时，宿主必须提前完成全部登记和冻结，不能直接沿用示例 end_of_elaboration 加载后又提前取值。

用户关于结果判定的决定保持有效：UVM 日志关键字判断用例结果；VCS 非零退出码独立属于运行异常。UVM_FATAL 原始码为 0 允许，不是待修复问题。宿主无需使用 KNOB_DEMO_PASS 或项目示例汇总状态码。

范围依据为 ADR-0005，扩展 ADR-0002 的使用方范围，保留 ADR-0001/0004 的配置与冻结规则。开始工作时继续读取 AGENTS.md、正式规格、GLOSSARY 和相关 ADR，恢复本项目 Beads `.beads/embeddeddolt`，前缀 knob。

## 接入与实现入口

- `README.md`、`docs/design/quickstart.md`、`docs/design/knob-api.md`：通用接入步骤、生命周期和公共接口。
- `knob.f`、`src/knob_pkg.sv`：独立框架库。schema 声明组绑定位置；scope 提供带类型读取；store 统一准备；validator/view 提供冻结前只读校验。
- `examples/host/tb.sv`：既有 sequence/item 与 sequencer/driver 握手；新增 host_driver 的 delay_ns 配置及普通 SV 类 host_header_policy 的 header_bytes/enabled。driver 的 task 控制真实耗时，辅助类的 function 计算输出帧长度，无需 UVM 或 sequence 基类。
- `examples/host/run.sh`：宿主自有判定，保存事务、sequence、timing、frames 四类轨迹及原始状态。
- `scripts/test-host.sh`：当前 18 场景回归。

本机命令：`make compile-host` 在复制的独立工程目录编译，`make test-host` 执行宿主回归。完整环境仍可使用 `make compile`、`make compile-host`、`make test-all`。编译和回归分开，回归中不编译。

## 当前验证与证据复用

固定 VCS W-2024.09-SP1、UVM 1.2。本轮独立宿主 18 场景全部通过，包括 11 个既有场景与 7 个新增场景。当前运行目录 `runs/host-tndInjdw`，指针 `build/host-isolated/out/latest-host.txt`。编译日志无 VCS warning/error。

新增消费者配置 A：两位置原始包长均 64，driver 每包等待分别为 2 ns、5 ns，输出长度分别为 72、64。配置 B：等待分别为 7 ns、0 ns，输出长度分别为 64、80。每个位置重复发送 4 包，使用位置独立且重复调用一致。相同 seed 12345 重放的四类轨迹逐字一致。driver 和普通辅助类提前读触发 KNOB_STATE；非法延迟与布尔值分别触发 KNOB_RANGE、KNOB_VALUE，均无事务。超时 124 来自外层 timeout。

核心 58、接口 13 场景本轮未重跑。库、最小环境、编译/运行与对应测试脚本逐文件与 v1.1 源码快照相同，复用其原始证据。当前有效集合共 89 场景：18 本轮实测、71 版本一致的历史证据；不描述为本轮运行了 89 场景。旧 v1.1 宿主证据不用于证明已修改的当前宿主。

当前宿主 simv SHA-256：`a22f583c357a73b18dd4f7b5b2e23cba14db3859bf4cc7a1c1b21c3e539a9dce`。核心库 SHA-256：`663c607666751efd144359c75b4508ea361a10cf8da4488e9af91206108a3e60`。当前宿主回归期间可执行文件及共享库均保持不变。

报告：`docs/design/general-consumers-results.md`，映射 T1～T21。新证据：`docs/design/evidence/general-consumers-v1.2/`，包括全部 18 场景、编译记录、源码快照、复用文件哈希与归档 manifest。检查记录：`docs/harness/knob-general-consumers-checks.json`，含 44 文档链接、21 验收项映射、257 归档文件哈希和 Beads/规格一致性。Shell 语法与空白检查通过。

## 限制与后续

直接实测了 driver、普通 SV 类和其中的 task/function；没有逐个实现 monitor、scoreboard 或真实 DUT 协议。帧头示例只计算长度。宿主负责句柄传递、阶段顺序、字段宽度及算术安全；只读配置接口不沙箱化用户 SV 代码。复现只承诺固定产物、环境、配置、seed、外部输入与随机化过程。

后续可从独立代码审查或真实验证工程接入试点继续，不需要重做已确认的需求访谈。

## Git、历史与归档

初始本地基线为 `3fbde6a`，分支 master，无 remote、无推送。本轮变更作为其后的本地工作检查点管理；最新提交与工作区状态分别以 `git log -1 --oneline`、`git status` 为准。首次全量审查可用 `git show --root 3fbde6a`，本轮差异可与该基线比较。

`.beads/issues.jsonl` 为本轮结束时导出的事项快照，不是完整 Dolt 备份或自动同步的任务状态源；继续工作仍以本项目 Beads 为准。构建、运行产物、数据库与锁文件保持忽略，归档验收日志纳入 Git。

更新前完整交接保存在 `docs/harness/handoffs/HANDOFF-before-general-consumers-20261111.md`。v1.1 规格快照 SHA-256 保持 `51708698753bef37f584226d6aae4e1d0a40ad5f606968786d3752328cf57317`；v1.1、v1.0 和早期原型证据均保留，不重写历史记录。历史报告中指向现行规格的链接已改为对应版本快照。
