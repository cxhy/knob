# knob 项目约定

目标：VCS 编译完成后，通过预留 knob 接口修改仿真 case 中组件的特定值，避免为这些仿真参数重新编译。

配置在每次启动仿真前确定；永久不支持仿真运行中动态修改参数。范围依据见 `docs/adr/0001-startup-only-configuration.md`。

面向 UVM 验证环境中显式接入的运行期参数，sequence、组件和普通 SV 辅助代码均可使用，范围见 `docs/adr/0005-general-runtime-consumers.md`。每个可调值显式接入后统一编译。配置仅从专用文件提供，暂不支持命令行覆盖，见 `docs/adr/0002-explicit-sequence-knobs-from-file.md`。规划、实现或验证前读取正式规格 `docs/design/knob-spec.md`；需求确认过程保留于 `docs/design/knob-requirements-notes.md`。

开始工作时读取 `HANDOFF.md`，核对 Git 工作区，并恢复本项目 Beads 上下文。详细规格、设计和验证资料放在 `docs/design/`。

## Python 与工具环境

- Python 解释器、环境、依赖和脚本统一使用 `uv` 管理，包括所用 skill 的 Python 脚本。通过 `uv python install <版本>` 安装解释器，并根据依赖兼容性使用 `uv python pin <版本>` 固定项目版本。
- 引入项目 Python 脚本时建立 `pyproject.toml`、`uv.lock` 和 `.python-version`，依赖通过 `uv add` 或 `uv add --dev` 登记。将这些配置纳入版本控制，忽略 `.venv/`。
- 已有锁文件时，使用 `uv sync --locked` 准备环境，使用 `uv run --locked python <脚本>`、`uv run --locked python -m <模块>` 或 `uv run --locked <工具>` 执行检查。依赖变更显式更新锁文件，不在普通检查中隐式升级依赖。
- 执行前确认使用当前项目的配置和环境，不直接调用系统 `python`、`python3`、`pip` 或借用其他项目的 `.venv`。尚无项目环境的独立脚本使用 `uv run --no-project --python <版本> python <脚本>`，避免隐式使用父目录项目。
- 本机 `uv` 入口为 `/home/guodz/bin/uv`。执行工具前核对实际路径和版本；路径存在或版本命令成功不等于功能验证通过。
- 本项目 VCS 环境通过 `source /home/guodz/install_vcs/vcs_env.sh` 加载；编译使用包装入口 `/home/guodz/install_vcs/bin/vcs`，保留其中的本机兼容处理。
- 首版固定 VCS W-2024.09-SP1 与 UVM 1.2，编译显式选择 `-ntb_opts uvm-1.2`，不依赖安装目录的默认 UVM 链接。版本变更须先确认受影响范围。
- 工具、许可证或依赖失效时记录实际错误和证据，只暂停依赖该工具的步骤，不自行切换已批准版本。

## 构建、运行与验证

- 建立或修改构建流程时，提供可重复执行的编译、单次运行和回归入口，并记录实际调用方式。入口尚未建立时明确说明，不将示例命令描述为已验证命令。
- 编译与运行分开；验证“编译一次、多次运行”时记录并比对编译产物标识。每次仿真使用独立运行目录，按正式规格提供配置和 seed。
- 测试预期来自正式规格。保持合同的修改运行受影响检查；改变可见行为或验收条件时先确认具体差异，不为通过测试修改预期。
- 按用例预期共同核对进程结果、UVM 诊断和事务轨迹。预期失败用例必须证明指定错误被触发，不因脚本返回成功就认定产品通过。
- 分别报告工具可用性、文档或静态检查、编译结果及功能验收。没有实际执行的检查明确标为未验证；源码阅读或工具自测不代替 VCS 验收。
- 验证证据关联对应输入、配置、代码或产物版本。版本未变且证据有效时可复用；修改、失败或证据缺口只补跑受影响检查。

## 产物与 Git

- 明确构建、运行、日志和验收证据目录，避免源码与生成文件混放。通过 `.gitignore` 排除 `.venv/`、仿真可执行文件、编译中间文件和波形；保留需要审计的报告与证据。
- 编辑前检查工作区，保留用户已有改动。只修改、暂存和提交当前任务相关内容，不覆盖或整理无关文件。
- 本地提交是工作 checkpoint，不等于产品验收或发布。推送、发布、历史重写、绕过 hooks 和破坏性操作需要明确授权。
- 提交前核对差异、暂存范围和必要检查；不提交凭据、密钥或敏感环境配置。

## 文档与状态同步

- 正式规格定义行为合同，Beads 管理任务、阻塞和决策，`HANDOFF.md` 保存当前阶段与恢复入口。具体 Beads 操作遵循 `docs/agents/issue-tracker.md`，不维护第二套任务列表。
- 修改正式规格时同步对应 Beads 规格事项正文，通过规格路径或 `spec_id` 定位该事项。未确认建议与已批准决定分开记录。
- 结束实际工作时先更新任务与检查证据，再更新交接。阶段切换或重要配置变化时，先将完整旧交接归档到 `docs/harness/handoffs/`，同名归档不得覆盖。
- `AGENTS.md` 保持稳定规则和读取入口；阶段状态、完整日志与工具排障细节放入对应文档，不反复复制。维护资料放在 `docs/harness/`，规格、设计和验证报告放在 `docs/design/`。

## 项目 MCP

- `hdl-kgraph`：用于 RTL 解析结果查询，包括模块、层级、端口和连接关系；结合设计交付文档推导 DUT 连线，并保留可编辑映射及来源。实际 RTL 到位后，按设计 filelist、宏和 include 路径准备项目图；尚无 RTL 时缺图不阻塞设计收敛。入口与能力边界见 `docs/design/hdl-mcp-input-inspection.md`。
- `xverif`：用于验证工具调用，包括设计/FSDB 调试、覆盖率查询、位运算、结构化解码、日志位置及 SVA 语义检查。调用前发现实际工具与 action schema，按接口要求管理会话；结果只支持对应输入和工具范围的结论，不替代 VCS 功能验收。

## Agent skills

### Issue tracker

任务、阻塞和技术决策使用本项目 Beads。操作前读取 `docs/agents/issue-tracker.md`。

### Triage labels

保留五个默认分诊标签。分诊时读取 `docs/agents/triage-labels.md`。

### Domain docs

采用 single-context：根目录 `GLOSSARY.md` 与 `docs/adr/`。探索领域代码或形成设计建议前读取 `docs/agents/domain.md`。
