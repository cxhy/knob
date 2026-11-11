# knob 当前交接

更新日期：2026-11-11。

## 当前阶段与恢复入口

用户已确认全部问题并授权逐项推进，M1规格已定稿，当前处于M3实施。最新完成 knob-uv7.11：无knob统一入口和再生成维护，framework0.2.0已部署到 /home/guodz/workspace/verification-deps/framework/0.2.0/，原0.1.0保留。当前可领取 knob-uv7.12「实现hdl-kgraph与文档驱动的DUT连线映射」。恢复时先核对Git、bd where、bd prime及ready；本项目数据库.beads/embeddeddolt，前缀knob。任务状态以Beads地图knob-uv7为准，不重复访谈已确认需求。

正式规格为 docs/design/uvmf-framework-spec.md 1.1，spec_id uvmf-framework-v1，对应knob-uv7.9正文逐字同步；验收矩阵 docs/design/uvmf-framework-acceptance.md A01～A16。第一阶段knob v1.2规格和核心代码保持不变。M3仍缺图驱动连线，后续M4完整可选knob、M5真实DV自助使用尚未完成，不将入口完成当整个框架验收。

## 公共发布与统一入口

共享根 /home/guodz/workspace/verification-deps 保留UVMF2023.4_2、framework0.1.0和0.2.0、可选knob1.2.0。公共依赖三项独立版本，Python/uv/Node/VCS/UVM/MCP均使用外部工具；不复制安装或许可证配置。公共版本保持不变，项目verification-deps.lock.json显式固定引用，升级回退通过pin --replace。修改框架后发布新版本，不覆盖已部署内容。

framework0.2.0/payload/bin/knob-project.mjs提供init/generate/compile/run/regress；knob-deps.mjs继续publish/pin/check。工具路径显式传入，生成经uv离线执行CPython3.12.13及UVMF随包依赖。使用说明framework/README.md，准备入口scripts/prepare-shared-deps.sh从release.json读取框架版本，并核对knob v1.2.0标签。

项目project.json定义原生YAML、编译输入、设计filelist、跟踪输入及结果规则；支持项目/团队模板目录和UVMF -t模板目录。生成/custom/独立handwritten文件边界明确。generate先复制候选，再官方merge，成功才切换generated并保留旧工程；失败保留原工程及成功记录。compile要求YAML已生成；run要求已登记输入和产物未变，不隐式编译。filelist使用VCS -F自身相对路径基准，外部依赖需显式列入tracked_inputs；不自动解析任意清单依赖闭包，当前空白路径/被跟踪树符号链接有限制。骨架结果明确skeleton_ok且functional_pass=false。

## .11实际验证与证据

报告 docs/design/project-entry-results.md，检查 docs/harness/project-entry-checks.json，稳定证据 docs/design/evidence/project-entry-20261111/（230文件+manifest）。实际输出 build/project-entry-validation/；复现驱动 experiments/project-entry/validate.mjs 仅用于本机验收，公共入口不固化本机工具路径。

8组依赖CLI集成+7组判定测试通过；真实VCS W-2024.09-SP1/UVM1.2共6套编译9次运行：8次功能通过、1次显式skeleton模式，均raw0/errorfatal0，各25请求；101为21算术匹配，202为20。baseline/replay/回归101轨迹相同且产物hash不变。相同YAML再生成60个HDL文件逐字节不变；增量audit_marker=17在仿真读取校验成功；custom和独立手写扩展保留。orphan custom冲突被拒绝，原工程/成功记录哈希不变，测试DV修复后生成成功。旧YAML构建和未生成YAML编译均明确拒绝。团队模板的最终副本以及实际workspace新项目都实际生成/编译/运行通过。

framework0.2.0 manifest SHA256 c7c5579dd992b760471af3b6f0743fd75dd8c13b060d791ed453942c20695b76，与最终暂存一致；初始隔离暂存仅README说明与最终不同，执行代码相同。原UVMF2112文件、knob核心和framework0.1.0哈希未变。Node/Shell语法、本地链接和git diff --check通过。实际工具子进程按已知沙箱限制经批准外部运行，新增公共发布写入经批准。

## 下一步边界

.12须使用hdl-kgraph查询示例自己的图，结合设计文档形成可编辑映射和来源，实际验证A08/A09。当前ALU只是导入上游已完成教程的既有连线，不能当自动连线完成。设计文档/RTL矛盾或缺失由设计侧澄清；验证工程再生成合并冲突由DV修复。两个项目MCP已记录于AGENTS.md。无真实输入时缺图不阻塞设计，不重复安装或修服务；实施示例已有输入时按自己的filelist/顶层/宏/include建图验证，不复用其他工程图。

Q19先前定向确认见docs/design/uvmf-knob-seed-confirmation.md：合法101/202接受、同seed重放、重复求解后选定冻结值有效。该实验disabled确实零请求，但宿主SCBD报错，未记功能通过。它不代替公共工程可选knob集成或任意字段所有权验证。.10依赖基础结果见docs/design/shared-dependencies-results.md。后续按Beads依赖推进，不访问或改造原CHI。

## Git与历史

master稳定基线8847bc73dee4bced619ee1ef526150c441e37fcd（v1.2.0）。既有第二阶段脏工作区保留，本轮未提交或推送，Beads已导出.beads/issues.jsonl（任务快照，不是完整数据库备份）。

本轮前完整交接归档 docs/harness/handoffs/HANDOFF-before-project-entry-20261111.md。此前共享依赖部署与规格归档分别为HANDOFF-before-shared-deps-20261111.md、HANDOFF-before-phase2-spec-20261111.md，均在同目录。第一阶段100场景及更早历史沿旧交接恢复，不改写旧证据。
