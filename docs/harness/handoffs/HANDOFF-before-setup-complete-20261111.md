# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与授权

用户要求在当前 `/home/guodz/workspace/knob` 配置 `setup-matt-pocock-skills` 并初始化 Git。已授权独立本地仓库；后续远端、发布和父仓库 submodule 登记尚未配置。

项目目标：VCS 编译完成后，通过预留的 knob 系统调整仿真 case 中组件的特定值，避免为这些仿真参数重新编译。当前只完成基础初始化，未编写实现或确认详细规格。

## 恢复入口

任务与当前证据：项目内 Beads 任务 `knob-c3k`。先执行 `bd where --json` 确认路径，再执行 `bd prime` 和 `bd show knob-c3k --json`。

本地 Git 根目录已确认为本目录；初始分支 `master`，无提交、无 remote。Beads 1.3.1 使用项目内 `.beads/embeddeddolt`，前缀 `knob`。已配置本仓库 maintainer 角色和 `.beads/hooks`；Git 初始化及配置写入经过沙箱提权成功完成。

## 下一步

用户已确认全部保留五个默认 triage 标签。项目内任务跟踪沿用用户指定的 Beads，领域文档采用 single-context。当前没有 `AGENTS.md` 或 `CLAUDE.md`；本轮回复展示完整配置草稿，推荐 `AGENTS.md`，等待用户选择入口文件并确认草稿写入。`docs/agents/` 尚未生成，setup 未完成。

后续需求需确认参数生效时机（仿真启动时或运行中）、组件接入方式及可修改值范围；不将这些待定内容视为已批准需求。

## 验证与记忆

已验证 `git rev-parse --show-toplevel` 返回本目录，`bd where --json` 返回本项目数据库，`bd prime` 可读取，任务可创建并认领。尚无产品代码，未运行 VCS 编译或功能仿真。

Nowledge `thread_search` 前次返回 HTTP 502，本轮查询 `knob setup-matt-pocock-skills` 返回 HTTP 530 / error 1033，未取得历史依据。项目恢复以本地文件与 Beads 为准；未手动重复归档 transcript。
