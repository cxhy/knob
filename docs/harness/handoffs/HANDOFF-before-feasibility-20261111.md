# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

用户已确认 Q1～Q21 及整体共同理解，需求访谈结束；正式规格已整理并发布。当前恢复阶段为任务拆分与实现准备，尚未编写产品代码或进行 VCS 运行验收。

用户已批准将通用工程规则写入 `AGENTS.md`，任务 `knob-u00` 已完成。执行 Python、VCS、构建或验证前遵守新增规则；Python 环境、Makefile 和仿真运行入口尚未建立。

正式合同以 `docs/design/knob-spec.md` 为入口；访谈依据保留在 `docs/design/knob-requirements-notes.md`，理由见 `docs/adr/0001`～`0004` 对应文档。已确认的问题无需重新询问；若实施需要改变可见合同，再向用户提出具体差异。

## 恢复入口

读取 `AGENTS.md`、正式规格、`GLOSSARY.md` 和相关 ADR。按 `docs/agents/issue-tracker.md` 确认本项目数据库，再恢复 Beads。

实现规格事项：`knob-be2`，状态 open，标签 `ready-for-agent`；描述包含完整规格，`spec_id` 指向 `docs/design/knob-spec.md`。发布时已核对正文逐字一致；后续修改规格需同步该事项。

需求访谈 `knob-4ys`、规格整理 `knob-0nb` 已关闭。下一步将 `knob-be2` 按可验证的功能切片拆分为实施任务并登记依赖，然后开展实现。当前没有未关闭的访谈问题。

## 已确认的核心边界

VCS W-2024.09-SP1＋UVM 1.2；交付库及最小 sequence 示例。每个 knob 显式接入，编译一次后从每次运行目录的 `knob.cfg` 提供启动前配置。永久不支持运行中动态调参；首版不支持命令行覆盖 knob。

按显式使用位置精确匹配配置键。首版整数和布尔，预留类型扩展点。登记→加载校验→冻结→sequence应用后随机化；合法已登记但未使用项是正常情况，只报告。未知键、非法配置和调用、约束失败按规格处理。

knob 提供确定约束参数，sequence 使用原生 randomize；每次必须显式提供唯一合法数值 `+ntb_random_seed`。在固定产物、环境、配置、seed、输入与调用过程下验证事务序列复现。完整语法、错误策略与 T1～T14 验收要求见正式规格。

## 证据与实际状态

`docs/harness/knob-spec-checks.json` 保存文档结构、8条本地引用、相关文件SHA、31条用户故事、14项验收编号及 Beads 正文一致性检查。已人工核对已确认合同，未委派独立审阅。该检查不证明产品行为通过。

本轮只更新通用工程规则和交接。`AGENTS.md` 原项目前言与 Agent skills 区块保持完整，产品规格哈希仍与发布证据一致；文档差异空白检查和引用/工具路径检查通过。新 `AGENTS.md` 哈希及检查摘要见任务 `knob-u00`；上述规格检查JSON中的 `AGENTS.md` 哈希属于发布时历史快照，不再对应当前规则版本。

工具安装和 UVM 接口仅做只读核查，见 `docs/design/randomization-evidence.md`。环境入口 `/home/guodz/install_vcs/vcs_env.sh`，VCS包装入口 `/home/guodz/install_vcs/bin/vcs`。尚未执行许可证探测、VCS编译或仿真。

Git 根目录为本项目，初始分支 `master`，无提交、无remote、无推送；当前文件为未跟踪产物。Beads 1.3.1 位于项目 `.beads/embeddeddolt`，前缀 `knob`，本仓库 hooks 已配置。

切换到规格阶段前的完整交接归档于 `docs/harness/handoffs/HANDOFF-before-spec-20261111.md`。`docs/harness/setup-files.sha256` 是初次 setup 历史快照，不用于断言后续修改后的版本。

补充通用工程规则前的完整交接归档于 `docs/harness/handoffs/HANDOFF-before-engineering-rules-20261111.md`。本轮未初始化Python环境、安装依赖或执行VCS。

Nowledge decision `463149ca-1713-4a17-a1f8-1c2cb4673631` 已成功更新至 Q1～Q21 收敛及规格发布状态，先前同步缺口已补齐。项目恢复以本地文档、Beads 和 Git 为准。

通用工程规则已保存为 Nowledge procedure `feb4f5b4-5719-42b0-97fc-d22607f953a4`。本轮检索曾返回HTTP530，规则保存成功。
