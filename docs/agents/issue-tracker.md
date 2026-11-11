# Issue tracker：Beads

本项目使用本地 `.beads/`，通过 `bd` CLI 管理。工程 skills 中的创建、读取和更新 issue 均映射到 Beads。

## 恢复与操作

- 先运行 `bd where --json`，确认数据库属于当前项目。
- 再运行 `bd prime`、`bd list --status in_progress,blocked --json` 和 `bd ready --json`。
- 读取任务：`bd show <id> --json`。
- 创建任务：`bd create`，记录范围、验收条件和产物路径。
- 开始工作：`bd update <id> --claim`。
- 更新进展：`bd update <id> --append-notes '进展与证据'`。
- 添加依赖：`bd dep add <任务> <前置任务>`。
- 完成任务：`bd close <id> --reason '完成依据'`。

技术决策使用 `decision` 类型，区分建议和用户批准。Beads 不可用时报告缺口，不切换到其他项目数据库。

## 分诊与交接

分诊标签按 `triage-labels.md` 映射，使用 `bd update` 的 `--add-label` 和 `--remove-label` 更新。标签表示分诊结果；任务执行状态仍由 Beads `status` 管理。

结束实际工作时先更新任务，再更新 `HANDOFF.md`。规格和验证报告保存在 `docs/design/`，任务引用对应路径。
