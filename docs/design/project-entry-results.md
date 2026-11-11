# 无 knob 统一工程入口与再生成结果

日期：2026-11-11。任务：`knob-uv7.11`。依据：[公共框架规格 1.1](uvmf-framework-spec.md) F1/F2/F5/F8/F9，[验收矩阵](uvmf-framework-acceptance.md) A03～A07。

## 已实现与部署

framework `0.2.0` 已新增部署到 `/home/guodz/workspace/verification-deps/framework/0.2.0/`；原 `0.1.0` 及其项目引用保持不变。UVMF `2023.4_2`、可选 knob `1.2.0` 内容未变。本任务的工程路径不引用 knob 库，不读取 knob.cfg。

新入口 [knob-project.mjs](../../framework/bin/knob-project.mjs) 提供 init、generate、compile、run 和 regress。项目或团队可以提供自己的模板目录、UVMF 模板目录及独立手写文件，无需修改框架核心。依赖入口仍提供 publish/pin/check，供新项目锁定已发布版本。

每次再生成先复制当前工程到候选目录，再调用 UVMF 官方合并。成功后才切换 generated，保留完整旧副本；失败不修改当前工程及最后成功生成记录。custom 之外的任意手改仍不承诺保留，合并冲突由 DV 修复。

编译前核对 YAML 是否已生成，运行前核对已登记输入与产物哈希。变化时要求显式生成或重编译，运行和回归不调用编译。所有构建标签、运行名称均拒绝覆盖旧目录。每次实际进程的命令、原始退出结果、日志和判定保存到项目目录。

使用说明见 [framework README](../../framework/README.md)。VCS 环境脚本与包装入口显式通过参数指定，编译固定 `-ntb_opts uvm-1.2`。公共源码没有固化开发实验目录。

## 实际验证

Node v20.19.2、uv 0.11.21，离线执行已安装的 CPython 3.12.13 及 UVMF 随包依赖。VCS W-2024.09-SP1 / UVM 1.2。没有安装或升级工具版本。

8 组依赖 CLI 集成测试和 7 组结果判定测试全部通过。判定测试证明非零原始退出码、致命诊断头、缺少报告、零事务及不完整比较均不能报告功能通过；skeleton 的干净运行明确为 functional_pass=false。

真实流程共执行 6 套 VCS 编译和 9 次仿真。全部原始退出码为 0，UVM error/fatal 均为 0；每次有 25 个请求。skeleton 场景按声明只报告 skeleton_ok，其余 8 次报告功能通过。

| 场景 | seed | 算术匹配数 | 检查内容 |
| --- | --- | --- | --- |
| 初始构建 baseline | 101 | 21 | 独立手写模块和 custom 业务扩展实际执行 |
| 同构建 replay | 101 | 21 | 配置、代码和产物固定时轨迹一致 |
| 同构建回归 case0 | 101 | 21 | regress 不编译，与 baseline 轨迹一致 |
| 同构建回归 case1 | 202 | 20 | 选定不同 seed 的轨迹不同 |
| 相同 YAML 再生成后重编译 | 101 | 21 | 60 个 HDL 文件逐字节保持，业务扩展保留 |
| 增量 YAML 后重编译 | 101 | 21 | 环境新增 audit_marker=17，实际 test 读取并校验成功 |
| 显式 skeleton 模式 | 101 | 21 | 即使同一功能夹具运行干净，仍不报告功能通过 |
| 项目/团队模板目录 | 101 | 21 | 使用最终发布副本入口初始化、生成、编译和运行 |
| workspace 公共目录新项目 | 101 | 21 | 直接使用实际安装入口全流程，不依赖开发源码 CLI |

请求中的非算术操作不产生算术结果，因此 25 个请求不要求等于匹配数。所有构建保留原有两条 TFIPC 警告，运行保留模板审查提醒；未全局压制诊断。

baseline、replay、回归 seed101 的 monitor 轨迹 SHA-256 均为 `cd4c7cdb0ff8c06d90d73133020e78b64557d906b8e444f98fdecaeba1436c10`，seed202 为 `1923b2a227fda16e6a2792aa6c2d9c17fd0fd2a601d4427134135d883369945e`。运行前后的 simv 与共享库哈希相等，回归各 case 复用 baseline 构建。

## 增量、冲突及过期构建检查

- 修改环境 YAML 后，旧构建的 run 明确拒绝，未创建新的运行目录。
- 未重新生成时 compile 明确要求先 generate，未产生新构建。
- 新增非随机配置字段 audit_marker，生成类包含该字段，实际仿真在 custom 代码中检查值为 17；独立手写文件哈希不变。
- 人为添加无法映射的 orphan custom 区块，官方 merge 报错；当前工程全部 HDL 哈希及最后成功生成记录保持不变。
- DV 测试修复去掉该区块后，再生成成功；没有用跳过缺失区块或修改预期来掩盖冲突。

这些错误是计划中的边界检查，不是已确认的产品缺陷。验证脚本没有替换仿真器或许可证服务。

## 工程输入与实现边界

设计 filelist 通过 VCS `-F` 直接引用，其相对路径以自身为基准。生成源码、宏/include 及手写输入由 project.json 明确登记。tracked_inputs 必须覆盖 filelist 使用的 RTL、外部 include 等输入；当前不自动解析任意 filelist 的完整依赖闭包。路径空白及被跟踪目录中的符号链接不在当前适配范围，相关输入会报错，不能声称任意现有清单可用。

骨架/功能状态由项目明确声明，并由项目检查规则提供功能证据，框架不承诺自动识别任意业务实现是否完整。本次 skeleton 检查复用已完成 ALU 夹具验证状态分类，不把它描述为已经验证所有未完成协议骨架。

ALU 模板导入上游 completed_solution 的业务与既有 DUT 连接，并在项目副本中记录旧 monitor custom 结束标记修复。没有修改上游包。这里不是 hdl-kgraph 驱动的连线生成；A08/A09 仍由 `knob-uv7.12` 处理。完整可选 knob 工程集成、错误注入及 DV 自助使用也未由本任务替代。

## 复现与证据

[validate.mjs](../../experiments/project-entry/validate.mjs) 驱动真实公共 CLI，在新项目目录完成 4 套编译、7 次运行及再生成边界检查：

```bash
node --test tests/shared-deps.test.mjs tests/project-entry.test.mjs
node experiments/project-entry/validate.mjs /path/to/shared /path/to/new-project /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs
```

验证驱动使用本机 VCS 环境/包装器路径，仅用于本项目的可重复验收；公共 CLI 的工具路径均由调用参数指定。驱动拒绝复用项目与审计目录。

本次输出为 `build/project-entry-validation/`：e2e 是主验证工程，e2e-audit 保存 18 次入口操作及汇总；team-project 验证项目/团队模板；installed-project 直接使用 workspace 发布。初始隔离版本与最终发布的执行代码相同，最终补充了 0.2.0 使用说明；两组 manifest 与命令分别保存，未将开发暂存当已发布版本替换。

稳定证据位于 `docs/design/evidence/project-entry-20261111/`，包含源码标识、依赖锁与 manifest、命令、原始进程结果、生成/合并记录、构建日志、运行日志及产物比对。检查记录为 `docs/harness/project-entry-checks.json`。原 UVMF、knob 核心及已部署 framework 0.1.0 内容哈希未变。

静态检查包括 Node/Shell 语法、本地文档链接、git diff --check 和归档 manifest。新 Python 文件未引入；原生成器与就绪检查继续经 uv 离线执行。由于已知沙箱子进程/工具限制，实际生成、测试与 VCS 流程均按已批准权限在沙箱外执行；新增公共版本的写入经批准。未提交或推送 Git。
