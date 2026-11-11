# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

用户要求在当前 `/home/guodz/workspace/knob` 配置 `setup-matt-pocock-skills` 并初始化 Git。用户已确认默认分诊标签、`AGENTS.md` 入口及完整配置草稿，setup 已完成。远端、发布和父仓库 submodule 登记尚未配置。

项目目标：VCS 编译完成后，通过预留的 knob 系统调整仿真 case 中组件的特定值，避免为这些仿真参数重新编译。当前处于需求待收敛阶段，未编写实现或确认详细规格。

## 恢复入口

配置任务与检查证据：项目内 Beads 任务 `knob-c3k`，已关闭。先读取 `AGENTS.md`，执行 `bd where --json` 确认路径，再按 `docs/agents/issue-tracker.md` 恢复任务状态。

本地 Git 根目录已确认为本目录；初始分支 `master`，无提交、无 remote。Beads 1.3.1 使用项目内 `.beads/embeddeddolt`，前缀 `knob`。已配置本仓库 maintainer 角色和 `.beads/hooks`；Git 初始化及配置写入经过沙箱提权成功完成。

## 下一步

`AGENTS.md` 及 `docs/agents/issue-tracker.md`、`triage-labels.md`、`domain.md` 已写入。任务跟踪使用项目内 Beads，保留五个默认 triage 标签，领域文档采用 single-context。`GLOSSARY.md` 与 ADR 按需建立。

后续需求需确认参数生效时机（仿真启动时或运行中）、组件接入方式及可修改值范围；不将这些待定内容视为已批准需求。

## 验证与记忆

已验证 Git 根目录与 Beads 数据库均属于本目录，任务可创建、认领和关闭。四个配置文件的空白检查通过；入口仅有一个 `Agent skills` 区块，三个引用文件存在，五个默认标签完整。文件版本见 `docs/harness/setup-files.sha256`，哈希校验全部通过。尚无产品代码，未运行 VCS 编译或功能仿真。

setup 完成前的完整交接归档于 `docs/harness/handoffs/HANDOFF-before-setup-complete-20261111.md`。

Nowledge `thread_search` 查询 `knob setup-matt-pocock-skills` 仍返回 HTTP 530 / error 1033，外部记忆同步 pending 已记录在 Beads。项目恢复以本地文件与 Beads 为准；未手动重复归档 transcript。
