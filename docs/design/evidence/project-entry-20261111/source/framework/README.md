# 公共验证框架入口 0.2.0

本版本增加无 knob 工程的初始化、生成/再生成、独立编译、单次运行和回归。依赖发布、项目固定引用及离线检查继续可用。已经部署的 0.1.0 保持原样；升级由项目显式选择。

框架尚未提供 hdl-kgraph 驱动的 DUT 连线映射或完整可选 knob 工程集成。ALU 模板的业务与 DUT 连接来自上游已完成教程，不代表自动推导协议或已经通过新连线功能验收。

## 依赖准备与版本

共享区分别管理 UVMF、framework 和可选 knob 的版本。发布目录为 `<root>/<component>/<version>/payload` 和 `release.json`；manifest 保存逐文件 SHA-256 及内容标识。相同版本不同内容拒绝替换。这里的不可变是入口合同；手工修改仍会被项目锁和检查发现。

Python/uv、Node、VCS/UVM 和 MCP 保持外部安装。UVMF 完整上游树保留随包 Python 依赖及许可材料，knob 版本包含库、编译 filelist 和许可文件。准备脚本会把 knob 内容与 v1.2.0 标签核对。

```bash
bash scripts/prepare-shared-deps.sh /path/to/shared /path/to/UVMF_2023.4_2
```

准备脚本从当前 `framework/release.json` 取得框架版本。这个脚本用于本仓库维护者准备发布；项目日常命令使用已发布的入口，不依赖本仓库路径。

`knob-deps.mjs pin` 保存项目自己的 `verification-deps.lock.json`。已有引用只能通过显式 `--replace` 切换/回退，不影响其他项目。锁文件不记录共享根目录，使用时明确传入 `--root`。`check` 通过 uv 的 `--no-project --offline` 验证已安装的 Python 3.12.13，并核对 Jinja2、MarkupSafe、PyYAML 和 voluptuous 实际来自所选 UVMF 包；不下载解释器或借用其他虚拟环境。

## 新建 ALU 工程

以下为公共入口用法。把路径替换为已准备共享区和新的项目目录。VCS 环境与包装器显式传入，不固化到公共脚本。

```bash
node /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs init --root /path/to/shared --project /path/to/new-project --template alu
node /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs generate --root /path/to/shared --project /path/to/new-project --uv /path/to/uv
node /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs compile --root /path/to/shared --project /path/to/new-project --build baseline --env /path/to/vcs_env.sh --vcs /path/to/vcs
node /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs run --root /path/to/shared --project /path/to/new-project --build baseline --name seed101 --seed 101
node /path/to/shared/framework/0.2.0/payload/bin/knob-project.mjs regress --root /path/to/shared --project /path/to/new-project --build baseline --name regression --seeds 101,202
```

init 拒绝覆盖已有目录。它复制上游 ALU YAML 和教程业务到项目副本，明确修复此前核实的旧教程 monitor 缺 custom 结束标记，并记录 `template-origin.json`。不会修改上游包。新项目没有 knob 库引用，也不需要 knob.cfg。

## 项目文件与扩展

| 位置 | 内容与维护方式 |
| --- | --- |
| project.json | 项目生成、编译和结果检查配置，纳入项目版本管理 |
| verification-deps.lock.json | 项目依赖版本和内容标识，纳入项目版本管理 |
| config/ | 原生 UVMF YAML，项目维护 |
| generated/ | 生成工程；可保留业务写在官方 custom 区块中 |
| handwritten/ | 独立手写文件；通过 sources/incdirs 引用，不由生成器接管 |
| rtl/design.f | 示例的设计 filelist；真实项目可直接引用设计侧已有清单 |
| .verification/ | 生成候选、旧工程备份、命令、日志和离线缓存，排除在源码管理之外 |
| build/、runs/ | 各构建与独立运行证据，排除在源码管理之外 |

项目或团队可提供自己的模板目录，通过 `init --template /path/to/template` 使用。目录中放置 project.json 及 config、handwritten 等项目文件；不能预置依赖锁、内部缓存、build 或 runs。模板目录不允许符号链接。也可在 project.json 的 generation.template_dir 中指定项目侧完整 UVMF 模板目录，生成器通过官方 `-t` 扩展接口使用它。

project.json 路径默认相对项目根目录。sources/incdirs 支持 `${PROJECT}`、`${GENERATED}`、`${UVMF}`。RTL filelist 使用 VCS `-F` 引用，因此其内部相对路径以该 filelist 自身为基准；原清单由 VCS 解释，框架不重排 RTL 目录或猜测任意清单语法。

build.tracked_inputs 必须明确列出 RTL 和手写源目录，包括 filelist 引用的外部文件、include 或其他可能影响构建的输入。框架不会自动展开任意 filelist 来发现所有依赖；漏报的外部输入不能被构建过期检查保证覆盖。当前被跟踪目录不接受符号链接，VCS filelist 适配要求路径不含空白；不满足时给出错误。工具环境文件仅记录路径与实际命令，不复制含凭据的环境配置。

## 再生成与冲突处理

修改 YAML 后执行 generate。入口先复制已有工程到候选目录，在候选中调用 UVMF 官方 merge；成功后才切换 generated，并保留完整旧副本。失败时原工程及最后成功生成记录不变，诊断保存在对应 generation 目录。DV 根据日志修复源工程的 custom 冲突后重新生成。

custom 外的任意手改不承诺自动保留。独立业务文件优先放 handwritten，并通过编译输入引用。当前保留生成记录与备份，不自动清理审计证据。

## 编译产物与运行结果

compile 要求已有成功生成记录；YAML 或生成模板变更后先 generate。每个构建标签使用新目录，不能覆盖旧构建。编译显式使用 UVM 1.2；结果记录输入文件哈希、命令、原始退出结果及 simv/共享库标识。

run 不编译。它核对已登记输入和产物标识，发现变化时要求显式重新编译。每次运行使用新的名称、独立目录和显式 signed32 十进制 seed。VCS 原始进程码、UVM error/fatal、结束记录和项目检查规则共同决定结果，不仅看脚本退出码。regress 复用同一构建，不在各 case 之间编译。

verification.kind 由项目明确声明为 skeleton 或 functional。skeleton 的干净运行报告 skeleton_ok、functional_pass=false；不代表 DUT 功能通过。functional 必须配置检查规则，例如非零预测数、匹配数相等和零 mismatch。框架不能自动判断任意业务实现是否完整，DV 对检查规则负责。任何 UVM_ERROR/UVM_FATAL 或非零原始退出结果都报告失败。

## 验证边界

本机实际使用记录、代表性 YAML 增量与冲突检查报告保存在项目仓库的 docs/design/ 中。入口不自动读取或生成运行期 knob 配置，也不修改第一阶段 knob 合同。外部工具版本和许可证问题按实际错误报告，不自动换工具或兼容版本。
