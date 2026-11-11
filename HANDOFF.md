# knob 当前交接

更新日期：2026-11-11。

## 当前阶段

用户已明确授权本阶段源码、文档和证据提交并推送。源码提交 693b39f7fa573eed09eefbc38639572600807451 已普通推送 origin/master，真实GitHub浅clone复验完成，knob-uv7.16已关闭。下一可领取任务 knob-uv7.12「实现hdl-kgraph与文档驱动的DUT连线映射」。本轮后续报告/任务/交接同步不改变已验证运行时代码，不再把交付描述为只完成候选验证。

正式规格 docs/design/uvmf-framework-spec.md 1.2，spec_id uvmf-framework-v1，knob-uv7.9正文逐字同步。验收 docs/design/uvmf-framework-acceptance.md A01～A16。第一阶段knob v1.2规格、核心与ADR保持有效。M1已完成，M3仍缺图连线，M4完整可选knob和M5真实DV自助未完成。

恢复先核对Git及bd where/prime/ready；数据库.beads/embeddeddolt，前缀knob，地图knob-uv7是唯一任务状态源。47事项已导出.beads/issues.jsonl（快照非完整数据库备份）。不重复访谈已确认需求。

## 已保证的 checkout 部署入口

从本项目真实checkout执行 scripts/prepare-shared-deps.sh TARGET UVMF_DIRECTORY_OR_TAR_GZ。入口不依赖旧共享目录、build、Git标签或Git本身，也不会自动下载。deployment/inputs.json固定knob三文件及UVMF归档/目录内容；完整材料预检后才写目标，已有同版不同内容拒绝。说明 deployment/README.md，根README有入口。外部UVMF授权包必须显式提供；纯部署需Bash/Node20+，归档方式另需GNU tar/gzip，生成和编译运行再准备uv/Python/VCS/许可证。

framework源码0.3.0已随Git交付，部署验证安装在build/git-delivery/remote-shared；原常用共享根/home/guodz/workspace/verification-deps中的0.1.0/0.2.0及UVMF2023.4_2、knob1.2.0保留不变。项目固定各组件独立版本和内容标识，显式pin --replace升级回退，不覆盖已发布版本。新manifest固定排序并兼容旧排序。

实际远端验证使用GitHub --depth1 --no-tags --branchmaster clone，HEAD为693b39f，无标签、初始无build/runs，必要源码hash与候选一致；部署进程PATH仅Bash/Node/tar/gzip，向新的指定目录成功部署。该clone自身15测试通过，新目标入口完成uv离线检查、ALU初始化/生成、VCS W-2024.09-SP1/UVM1.2编译及seed101运行：25请求21算术匹配、error/fatal0、raw0，simv及共享库hash不变，clone仍干净。

实际报告 docs/design/checkout-deployment-results.md，检查 docs/harness/remote-checkout-checks.json，51文件+manifest证据 docs/design/evidence/remote-checkout-20261111/；输出build/git-delivery/。先前12组候选边界检查及87文件证据继续保留，不伪装成产品clone。新环境条件是同机隔离及实际远端源码验证，不是第二台物理机/其他OS实测；工具和许可证前置仍有效。

## 工程入口与证据

framework payload/bin/knob-project.mjs提供init/generate/compile/run/regress；knob-deps.mjs提供publish/pin/check。project.json明确原生YAML、设计filelist、tracked_inputs及skeleton/functional判定；支持项目/团队模板目录、UVMF -t、自定义custom和独立handwritten源。

generate先复制候选，官方merge成功才切换generated并保留旧副本，失败不改原工程/最后成功记录。compile检查生成状态；run检查登记输入/产物，不隐式编译。filelist使用VCS -F自身路径基准，外部输入需完整登记，不自动解析任意依赖闭包；当前被跟踪树符号链接和VCS路径空白有限制。骨架结果明确skeleton_ok且functional_pass=false。

.11报告docs/design/project-entry-results.md：8组CLI+7组判定、6套编译9次运行、同YAML60个HDL保留、audit_marker17增量读取、合并失败保护/修复、旧构建拒绝和团队/实际安装入口均有证据。它不等于图连线、完整可选knob或DV自助验收。

## 下一步边界

.12使用hdl-kgraph对示例自身filelist/顶层/宏/include建图查询，结合设计文档保存可编辑映射和来源，验证A08/A09。现有ALU业务和连接导入上游完成教程，不当图驱动连线完成。设计文档/RTL矛盾或缺失归设计侧澄清；再生成合并冲突由DV修复。两个项目MCP已写AGENTS.md，无真实输入时缺图非阻塞，不重复安装/修服务。真实CHI改造和M6试点留后，不访问原项目。

Q19定向seed确认见docs/design/uvmf-knob-seed-confirmation.md：合法101/202接受、同seed重放和选定冻结值生效；disabled宿主零事务error未伪报通过。它不代替完整公共工程knob接入。

## Git与历史

origin https://github.com/cxhy/knob.git，master。第一阶段稳定标签v1.2.0仍指8847bc7；第二阶段源码验证基线为693b39f，之后只同步本次远端验收与任务状态。提交和推送正常hooks，未绕过或重写历史；原包/二进制/波形/凭据未提交。

实际交付前交接归档docs/harness/handoffs/HANDOFF-before-verified-remote-checkout-20261111.md，授权前归档HANDOFF-before-git-delivery-20261111.md；更早checkout前、工程入口、公共依赖、规格交接均在同目录。旧证据不改写。
