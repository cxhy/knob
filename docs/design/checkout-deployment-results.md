# 干净 checkout 的公共部署验证

日期：2026-11-11。任务：`knob-uv7.16`。用户要求：推进连线之前，确保新环境 checkout 本项目后仍能向指定路径部署公共内容。

## 结论与交付记录

交付完成：源码提交 693b39f7fa573eed09eefbc38639572600807451 已推送 origin/master，真实 GitHub 无标签浅 clone、指定路径部署及 VCS 复验通过。下文候选及缺口保留为提交前记录，当前结论见末尾实际交付结果。

部署源码候选已经通过不带标签的干净浅 clone 检查。仅在 PATH 提供 Bash、Node、tar/gzip，显式传入已核查的 UVMF 原始归档，就能部署到新的调用者指定目录。没有读取旧共享目录、build 缓存、Git 标签或 Python 环境来完成复制部署。

随后从独立部署材料执行真实 uv 检查、生成、VCS 编译和仿真：25 个请求、21 个算术匹配、UVM error/fatal 为 0，原始退出码为 0。

本次使用的是从当前工作区所需源码构造的独立测试仓库，再对它做浅 clone；不是对现有产品提交或远端的新 clone。提交前本项目 HEAD 8847bc7 未包含 framework/、deployment/ 和准备入口，当时不能声称正常 checkout 已有本轮功能。该交付缺口现已通过下述实际提交与远端复验补齐。

## 已补齐的入口

- `scripts/prepare-shared-deps.sh` 从任意调用目录定位本仓库，无 Git 元数据和 dirname 命令依赖。
- `scripts/deploy-shared-deps.mjs` 接受指定目标路径，以及固定 UVMF 归档或匹配的解包目录；不隐式下载。
- `deployment/inputs.json` 随源码记录固定输入哈希，代替部署时必须读取 v1.2.0 标签的要求；knob 核心和类型合同未变。
- 全部组件先在临时目录准备并预检目标冲突，普通输入错误在目标写入前失败；发布仍是单组件版本原子操作，不宣称跨组件故障事务。
- 新发布文件清单按固定规则排序，避免依赖 locale；核验和幂等发布兼容旧清单的排序及内容标识，不改写旧版本。
- framework 版本升为候选 `0.3.0`。原常用共享根中的 `0.1.0`、`0.2.0`、UVMF 和 knob 保持不变；本轮只向隔离指定目标安装候选版本。

使用方式和前置条件见 [新环境部署说明](../../deployment/README.md)。本仓库不携带 UVMF 原始归档，使用者须显式提供已授权材料。复制部署不需要 uv/Python/VCS；生成和真实仿真阶段仍需要相应外部工具及许可证。

## 验证方式与结果

[deployment-portability.mjs](../../tests/deployment-portability.mjs) 从 `deployment/inputs.json` 声明的必要源码创建测试候选仓库，创建测试提交，再通过 file:// 做无标签的 depth=1 clone。没有改动本项目的提交历史。候选 clone 不含 build/、runs/ 或上游归档；归档作为独立输入复制。

| 场景 | 通过依据 |
| --- | --- |
| 原始归档、新目标 | 三组件部署成功，未下载内容；目标名称不依赖 workspace/verification-deps |
| 相同版本重跑 | already-present，所有发布 manifest 不变 |
| 目录输入、不同 locale 配置、含空白目标 | 部署成功，发布 manifest 与归档方式逐字节一致 |
| 无 .git 的源码导出 | 部署成功，不需要标签或 Git 命令 |
| 输入缺失 | 指定错误，未创建目标 |
| 归档哈希错误 | 指定错误，未创建目标 |
| 目录内容错误 | 指定错误，未创建目标 |
| knob 固定源内容错误 | 指定错误，未创建目标 |
| 框架必要文件缺失 | 预检失败，未创建目标 |
| 已有同版本不同内容 | 预检失败，已有目录逐文件不变，没有新建 UVMF 目录 |
| 旧 manifest 排序 | 返回 already-present，保留其旧 manifest 字节与内容标识 |
| 从 scripts 目录按脚本名调用 | 同样可部署/幂等检查，路径定位不依赖调用目录 |

这 12 组结果全部通过。原 8 组依赖 CLI 集成及 7 组结果判定测试也通过。

真实运行使用 Node v20.19.2、uv 0.11.21、CPython 3.12.13、VCS W-2024.09-SP1/UVM 1.2。uv 及 VCS 环境/包装器均显式提供，未复制外部安装或许可证配置。复制部署的精简 PATH 中不存在 Git、uv、Python 或 VCS；runtime 检查阶段则按前置条件使用实际外部工具。

真实 ALU 的编译清单引用本次独立目标的 UVMF 基础库，不引用原共享目录。编译保留两条原有 TFIPC，仿真保留原模板审查提醒；没有通过屏蔽诊断获得通过。

最终 12 组候选与真实仿真所用的上一组候选，framework/UVMF/knob 发布内容与 manifest 均相同。最后改动仅为仓库外层 Bash 定位代码去除 dirname 依赖及新增调用方式测试，已重做最终浅 clone 部署；没有机械重编译相同的发布材料。

## 证据与限制

最终源码及部署检查：`build/checkout-deploy-validation/delivery-candidate/`。真实 uv/生成/编译/仿真：`build/checkout-deploy-validation/final-clean/`。两者均绑定各自候选源码清单、命令和发布标识。

检查记录：`docs/harness/checkout-deployment-checks.json`。稳定证据：`docs/design/evidence/checkout-deployment-20261111/`，保存必要源码哈希、候选浅 clone 状态、12 组命令/日志、运行环境检查、编译/仿真和产物标识、发布 manifest。UVMF 原始包和完整第三方源码不归档入 Git。

这是同机隔离源码、目录及环境条件的验证，不是第二台机器或其他操作系统的实测。Node/Bash/GNU tar/gzip 及适用的 uv/Python/VCS 必须满足说明中的前置条件。含空白路径的复制部署已验证，现有 VCS 工程 filelist 适配仍要求后续使用的共享/工程路径不含空白。

源码、说明和验证材料现已纳入实际产品提交，源码可获取性要求完成后才关闭本任务；没有将候选测试代替真实远端交付。

## 实际产品提交与远端复验

源码提交 `693b39f7fa573eed09eefbc38639572600807451` 已经正常 hooks 提交并普通推送至 `https://github.com/cxhy/knob.git` 的 master。随后从 GitHub 以 `--depth 1 --no-tags --branch master` 重新 clone 到独立目录；实际 HEAD 与该提交一致，标签为空，初始不存在 build/runs。必要源码及输入记录与已验证候选哈希一致。

仅给部署进程提供 Bash/Node/tar/gzip 的 PATH，使用显式原始 UVMF 包，向另一个新指定目录部署成功。然后执行真实 clone 自身的15组测试，并使用新目标中的入口完成 uv 离线检查、ALU初始化/生成、VCS W-2024.09-SP1/UVM1.2编译与seed101仿真：25请求、21算术匹配、UVM error/fatal均0、raw0；simv及共享库运行前后哈希不变。clone在验证后仍干净。

实际输出 `build/git-delivery/`，新检查记录 `docs/harness/remote-checkout-checks.json`，稳定证据 `docs/design/evidence/remote-checkout-20261111/`。本次状态和证据回写只修改文档/任务记录，不改变已验证部署与工程执行代码；最终同步提交的运行时文件与已验源码提交保持一致。

现在可从真实仓库checkout后调用根README或deployment/README.md中的命令部署。UVMF授权包、Node/Bash等外部前置条件继续有效；工具许可证与第二台物理机器仍不由本次同机远端clone测试代替。
