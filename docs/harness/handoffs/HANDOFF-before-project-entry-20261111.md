# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与恢复入口

最新进展：用户采纳公共依赖范围并授权实施，knob-uv7.10 已完成并关闭。实际公共根目录为 /home/guodz/workspace/verification-deps，部署 uvmf/2023.4_2、framework/0.1.0、knob/1.2.0，各自有 payload 与 release.json 内容标识。framework 当前仅 dependency-foundation，入口为 framework/bin/knob-deps.mjs 的 publish/pin/check；项目保存 verification-deps.lock.json，显式 replace 才升级或回退，无 knob 时不引用 knob。Python/uv/Node/VCS/UVM/MCP 保持外部安装。具体用法 framework/README.md；准备入口 scripts/prepare-shared-deps.sh。不再重问已确认组成。

本轮8组CLI集成测试通过，真实uv离线就绪确认CPython3.12.13及UVMF随包4项依赖来源；项目内测试版本0.1.1升级回退成功（夹具未部署公共根）。实际共享UVMF基础库一次VCS编译、两次无knob仿真，各25请求/21算术匹配、error/fatal0，轨迹一致且产物不变。实际workspace安装入口无knob/带knob项目pin/check均成功。报告 docs/design/shared-dependencies-results.md，48文件+manifest证据 docs/design/evidence/shared-deps-20261111/，检查 docs/harness/shared-dependencies-checks.json。输出 build/shared-deps-validation/。沙箱Node/uv限制经批准外部执行，公共根写入经批准，原UVMF/knob代码未改。本轮完成依赖层，不代表新统一工程入口/连线/再生成/完整可选knob验收。

用户已确认 Q1～Q27，并要求继续完成正式规格及实施任务拆分。M1 已收尾，下一步进入 M3；公共框架尚未实现或验收。执行顺序保留 M0 → M2 → M1 → M3 → M4 → M5 → M6，M5 为首版交付点。无需重复访谈已确认问题。

正式行为基线：docs/design/uvmf-framework-spec.md，版本 1.1（F3补入用户确认的公共组成），spec_id 为 uvmf-framework-v1；对应规格事项 knob-uv7.9 正文与文件逐字一致。验收为 docs/design/uvmf-framework-acceptance.md 的 A01～A16。第一阶段 docs/design/knob-spec.md v1.2、全部 ADR 及产品代码保持不变。

恢复时先核对 Git、bd where、bd prime 和 ready；当前数据库为 .beads/embeddeddolt、前缀 knob。Beads 地图 knob-uv7 管理唯一任务状态。接入决定 .2、部署决定 .3、验收设计 .4 和规格记录 .9 均已关闭。实施任务已建立原生依赖，当前可领取 knob-uv7.11「实现无knob新工程统一入口与再生成维护」。后续任务通过地图查询，不在本交接重复维护任务清单。

## 已确定的实施边界

- 公共依赖后续统一放 workspace，按版本区分；项目固定版本并主动升级，保留回退，已发布公共内容不原地修改。具体子目录及命令由实现设计选择；写出当前可写范围时遵守权限要求，不覆盖已有公共安装。
- 提供初始化、生成/再生成、独立编译、单次运行和回归入口；公共依赖准备完成后支持离线日常使用。Python 统一由 uv 管理。
- 先打通无 knob 的基础工程，再贯通完整 ALU 示例与可选 knob。代表性 YAML 增量再生成必须实际验收，冲突由 DV 修复。
- RTL 使用 hdl-kgraph 查询，结合设计文档连线，保留可编辑映射及来源。设计信息矛盾/缺失由设计侧澄清；验证工程合并冲突由 DV 修复。两个项目 MCP（hdl-kgraph、xverif）已写入 AGENTS.md。
- 无真实 RTL 时缺项目图非阻塞，不重复安装或修服务。ALU 连线实施时按自己的输入/编译上下文建图并验证真实查询，不用旧握手冒充验收。
- 首版用当前 VCS W-2024.09-SP1 / UVM1.2；不围绕假设性兼容差异增加前置设计，实际遇到再处理。工具路径保留适配入口。
- DV 可增减基础验证流程，补充协议/业务激励、模型、检查和覆盖。骨架检查不得冒充功能通过。真实项目/CHI 试点留 M6，不访问或改造原 CHI。

## 可复用证据与限制

无 knob 独立评估 knob-uv7.6 已关闭：固定 UVMF 2023.4_2 的 ALU 生成、三套编译、五次仿真及同 YAML 再生成有证据。报告 docs/design/uvmf-standalone-evaluation.md；入口 experiments/uvmf-standalone/；输出 build/uvmf-standalone/repro2。不能直接当新公共部署验收。

Q19 用户要求的定向确认 knob-uv7.8 已关闭：一次编译、八次有效运行；合法 seed101/202 接受，同101轨迹重放一致，A为6请求/6匹配、B为14请求/11算术匹配、202为8请求/7匹配。冻结约束输入在两次配置求解、initialize及behavior保持有效。未知键、缺seed、重复seed均指定fatal且激励前失败。disabled确实零请求，但宿主SCBD报1个零事务error，明确不是功能通过。

报告 docs/design/uvmf-knob-seed-confirmation.md；入口 experiments/uvmf-knob-lifecycle/；输出 build/uvmf-knob-lifecycle/seed-check/；稳定证据 docs/design/evidence/uvmf-knob-seed-20261111/（87文件+manifest）。原ALU/库输入未变。沙箱临时目录与许可证失败及经批准外部成功记录保留。本实验未覆盖再生成、无解及任意字段所有权，不扩大结论或设置额外前置大实验。

## 本轮检查与 Git

docs/harness/uvmf-framework-spec-checks.json 记录规格映射、正文同步及实施依赖，已刷新为规格1.1。公共依赖本轮的实际检查在 docs/harness/shared-dependencies-checks.json：8组CLI、4次实际离线就绪、最终发布与源码/暂存内容一致、16本地链接和VCS两次运行证据。Node/Shell语法及git diff --check通过。第一阶段knob核心及规格相对HEAD无改动。下一任务为.11；若修改framework发布内容，使用新版本，不原地改已部署0.1.0。

master 稳定基线为 8847bc73dee4bced619ee1ef526150c441e37fcd（v1.2.0）。既有第二阶段文档/实验/证据等工作区改动保留，未提交或推送。Beads已导出到.beads/issues.jsonl；该文件是任务快照，不是数据库完整备份。

## 历史交接

公共依赖部署前完整交接已归档到 docs/harness/handoffs/HANDOFF-before-shared-deps-20261111.md。规格整理前交接见 docs/harness/handoffs/HANDOFF-before-phase2-spec-20261111.md。更早交接、第一阶段100场景验收和原始证据沿历史入口恢复，不因本次整理改写。
