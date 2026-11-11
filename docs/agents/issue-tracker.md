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

## Wayfinding operations

调用 wayfinder 时，用一个 `epic` 作为地图，标记 `wayfinder:map`；子事项通过 `--parent` 关联，创建时使用 `--no-inherit-labels`，只添加对应的 `wayfinder:research`、`wayfinder:grilling`、`wayfinder:prototype` 或 `wayfinder:task` 标签，不附加分诊标签。

- 地图正文使用 skill 的 Destination、Notes、Decisions so far、Not yet specified、Out of scope 结构。只索引已解决子事项，不复制其完整结论或开放事项清单。
- 查询子事项：`bd list --parent <map-id> --all --json`；查询可领取前沿：`bd list --parent <map-id> --status open --ready --no-assignee --json`。
- 用 `bd dep add <后续事项> <前置事项>` 表达原生阻塞依赖。创建完成后再连依赖，不使用占位编号。
- 开始工作前用 `bd update <id> --claim` 认领。研究可由子 agent 在独立研究分支进行；人工取舍必须取得用户回答。
- 解决时用 `bd comments add <id> -f <结论文件>` 保存答案和证据指针，再关闭子事项；地图只添加带标题的链接与一句摘要。本地事项链接使用 `beads:<id>`，读取仍用 `bd show`，不冒充 GitHub issue URL。
- milestone 文档描述预期交付能力，执行状态与依赖由 Beads 管理；地图规划完成不等于已实施或已验收。

## 分诊与交接

分诊标签按 `triage-labels.md` 映射，使用 `bd update` 的 `--add-label` 和 `--remove-label` 更新。标签表示分诊结果；任务执行状态仍由 Beads `status` 管理。

结束实际工作时先更新任务，再更新 `HANDOFF.md`。规格和验证报告保存在 `docs/design/`，任务引用对应路径。
