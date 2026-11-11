# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

工程 setup 已完成。用户已启动 `grill-with-docs`，当前进行需求访谈、术语和决策记录，尚未进入产品实现。

目标：复用 VCS 编译产物，在每次启动仿真前调整 UVM 组件相关 sequence 的可配置参数，例如发包数量。用户确认每个可调值显式添加 knob 接入代码后统一编译；每次运行前修改专用配置文件，暂不支持命令行覆盖，避免配置混乱，见 ADR-0002。

用户明确确认永久不支持仿真运行中动态修改参数，见 ADR-0001。这个永久边界与暂不支持命令行覆盖的范围不同。随机化与seed规则见 ADR-0003；登记、校验、冻结和应用流程见 ADR-0004，均已确认。

## 恢复入口

读取 `AGENTS.md`、`GLOSSARY.md`、`docs/design/knob-requirements-notes.md` 和 `docs/adr/` 中 ADR-0001～0004，再按 `docs/agents/issue-tracker.md` 恢复本项目 Beads。当前需求访谈任务为 `knob-4ys`（in_progress）；相关决定均由该任务与 ADR 追溯，最新决定 `knob-c1f` 已记录并关闭。setup 证据在已关闭任务 `knob-c3k`。

Git 根目录为本项目，初始分支 `master`，无提交或 remote。Beads 1.3.1 数据库位于项目内 `.beads/embeddeddolt`，前缀 `knob`。本仓库 Beads hooks 已配置。

## 当前访谈

Q1～Q19 已确认，完整规则见需求访谈记录。新增确认：test/env登记→加载校验→冻结→sequence应用后randomize；未就绪取值/冻结后登记报错；合法已登记未使用项是正常情况，结束时普通信息报告，不影响通过。未知键仍报错。跨参数检查在发包前，动态求解无解立即失败、不换seed或退默认。首版固定VCS W-2024.09-SP1+UVM1.2，交付库与最小sequence示例。

需求记录末尾有明确标为尚未批准的汇总草稿：Q20配置键/数值/seed语法边界及API错误规则；Q21编译一次多配置、作用域/默认/未用项、seed复现、错误处理、证据输出和扩展说明的验收组合。等待用户确认这两项及整体共同理解，之后再进入规格阶段。

类型、作用域和主体错误策略已确认；不要重新询问已经批准的问题，不把末尾汇总草稿当作批准，不跳过需求确认编写实现。

## 环境与证据

只读环境检查发现 `/home/guodz/install_vcs/vcs_env.sh`、包装入口 `/home/guodz/install_vcs/bin/vcs` 及安装 `/home/guodz/synopsys/vcs/W-2024.09-SP1/bin/vcs` 存在。检查时 shell PATH 未加载 VCS。用户已在Q19选定VCS W-2024.09-SP1和UVM1.2。没有执行 VCS、许可证探测、编译或仿真，安装信息不等于运行验证。

本轮新增 ADR-0004，并更新需求访谈记录的第五轮与待确认汇总草稿；文档空白检查通过。`docs/harness/setup-files.sha256` 是 setup 阶段历史快照，`AGENTS.md` 已随访谈范围确认更新，不再与该历史哈希相同。

只读核对 VCS 原生 `+ntb_random_seed` 与 UVM 派生随机状态，具体文件/行号见 `docs/design/randomization-evidence.md`。UVM 宏可能在启动回调前 randomize；seed复现还依赖类型/名称/上下文与调用过程。项目已要求显式seed，不沿用工具默认1。未运行VCS、许可证或仿真。

阶段切换前完整交接归档于 `docs/harness/handoffs/HANDOFF-before-grilling-20261111.md`。Nowledge decision `463149ca-1713-4a17-a1f8-1c2cb4673631` 此前成功更新至 Q1～Q15；本轮检索与更新均HTTP530/error1033，Q16～Q19与汇总草稿同步pending。本地文档与Beads完整，恢复以本地为准。
