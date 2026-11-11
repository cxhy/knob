# knob 当前交接

更新日期：2026-11-11。

## 当前前置：干净 checkout 部署与 Git 交付

用户要求继续连线前，先保证新环境 checkout 本项目仍可向指定路径部署公共材料。knob-uv7.16 保持 in_progress，连线任务 .12 已原生依赖 .16，当前不推进连线。

代码与候选检查已完成：scripts/prepare-shared-deps.sh 不依赖 Git 标签、dirname、旧共享目录或 build；scripts/deploy-shared-deps.mjs 接受固定 UVMF 归档或匹配目录，deployment/inputs.json 固定输入，所有组件在目标写入前预检。framework 源码候选为 0.3.0。外部工具分阶段准备，UVMF 原包不在 Git，入口不自动下载。用法 deployment/README.md。

12 组干净候选浅 clone/无标签/精简 PATH 部署检查、15 组 CLI/结果判定检查通过；独立新目标实际 uv 检查、生成、VCS 编译和仿真为 25 请求/21 算术匹配、error/fatal0、raw0。报告 docs/design/checkout-deployment-results.md，检查 docs/harness/checkout-deployment-checks.json，87 文件+manifest 证据 docs/design/evidence/checkout-deployment-20261111/。最终候选输出 build/checkout-deploy-validation/delivery-candidate/，真实运行输出 build/checkout-deploy-validation/final-clean/；两者发布 manifest 一致。不是第二台机器实测，不承诺零外部条件。

重要交付缺口：该 clone 来自必要工作区源码构造的独立测试仓库，不是实际产品提交。产品 HEAD 8847bc7 仍缺 12 个必要部署文件；本阶段新增源码尚未提交/推送。因此不能声称正常 checkout 当前提交或远端已包含这些入口。下一步须取得用户对已验证阶段源码、文档和证据提交并推送 origin/master 的明确授权，完成实际产品提交 checkout 验证后再关闭 .16、推进 .12。暂未获得本阶段提交推送授权，不自行提交或推送。

实际常用共享根 /home/guodz/workspace/verification-deps 保留 UVMF2023.4_2、framework0.1.0/0.2.0、knob1.2.0；候选0.3.0只部署到隔离指定目标。旧发布内容哈希未变。发布清单新排序不依赖 locale，但核验和幂等发布兼容旧清单，不重写旧版本。

## 规格与任务恢复

恢复先读 AGENTS.md，核对 Git、bd where、bd prime 和 ready。数据库 .beads/embeddeddolt、前缀 knob。Beads 地图 knob-uv7 是唯一任务状态源；当前47事项已导出 .beads/issues.jsonl（任务快照，不是完整数据库备份）。

正式规格 docs/design/uvmf-framework-spec.md 1.2，spec_id uvmf-framework-v1，knob-uv7.9 正文逐字同步；用户新增 checkout 要求已补入 F4/A01。验收矩阵 docs/design/uvmf-framework-acceptance.md A01～A16。第一阶段 docs/design/knob-spec.md v1.2、核心和 ADR 未改变。M1设计已完成，M3仍有 Git 交付和图连线前置，M4完整可选knob及M5真实DV自助未完成。

## 已完成的工程入口

knob-uv7.11 已关闭，framework0.2.0 实际公共入口为 payload/bin/knob-project.mjs 的 init/generate/compile/run/regress；knob-deps.mjs 提供 publish/pin/check。项目固定 verification-deps.lock.json，显式 replace 升级回退。公共已发布版本不原地修改。

project.json 明确原生 YAML、生成和编译输入、设计 filelist、tracked_inputs 及 skeleton/functional 检查规则。支持项目/团队模板和 UVMF -t 模板目录；独立 handwritten 文件与 custom 保留区有边界。generate 在候选中官方合并，成功才切换 generated 并保留旧副本，失败原工程不变。compile 检查 YAML 生成状态；run 检查登记输入及产物，不隐式编译。filelist 直接使用 VCS -F，外部依赖须显式登记，任意依赖闭包不自动解析；当前空白路径/被跟踪树符号链接有限制。

.11 报告 docs/design/project-entry-results.md，检查 docs/harness/project-entry-checks.json，230 文件+manifest 证据 docs/design/evidence/project-entry-20261111/；输出 build/project-entry-validation/。8组CLI+7组判定、6套实际VCS编译、9次运行通过预期（8功能、1显式skeleton不报告功能通过），同YAML60个HDL不变、audit_marker17增量实际读取、合并冲突保护与修复、过期构建拒绝、团队模板及workspace新项目均实测。

## 连线及后续边界

当前 ALU 连接和业务导入上游完成教程，不是 hdl-kgraph 驱动连线完成。.12 需使用示例自己的 filelist/顶层/宏/include 建图查询，结合设计文档保存可编辑映射及来源并验证 A08/A09；不能用旧最小握手代替项目验收。无真实输入时缺图不阻塞设计，不重复安装或修服务。两个项目 MCP 已记录 AGENTS.md。

设计文档/RTL矛盾或缺失由设计侧澄清；验证工程再生成合并冲突由DV修复。Q19 定向 seed 证据见 docs/design/uvmf-knob-seed-confirmation.md；合法101/202接受，同seed重放，选定冻结值有效，disabled触发宿主零事务错误没有伪报通过。它不能代替公共工程完整knob接入。真实CHI改造和M6试点仍留后，不访问原项目。

## Git 与历史

master 稳定基线 8847bc73dee4bced619ee1ef526150c441e37fcd（v1.2.0），origin https://github.com/cxhy/knob.git。工作区保留第二阶段源码、文档和证据，尚未提交或推送；禁止把候选验证当远端更新。

本轮前完整交接归档 docs/harness/handoffs/HANDOFF-before-checkout-deployment-20261111.md。此前工程入口、公共依赖和规格交接依次为同目录的 HANDOFF-before-project-entry-20261111.md、HANDOFF-before-shared-deps-20261111.md、HANDOFF-before-phase2-spec-20261111.md。第一阶段100场景验收及更早历史沿旧交接恢复，不改写旧证据。
