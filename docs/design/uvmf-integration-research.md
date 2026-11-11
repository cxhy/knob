# UVMF 公共接入：官方资料核查

核查日期：2026-11-11。对应事项：核查 UVMF 官方组成、扩展机制与工具依赖。研究基线：knob `8847bc73dee4bced619ee1ef526150c441e37fcd`。本文是设计输入，不是发行版选型决定或本机兼容性验收。

## 结论与证据边界

公开资料足以确认 UVMF 提供生成流程，并为手工补充、再生成合并和运行管理安排了专门机制。但本轮未取得发行包源码，不能据此确定当前版本的扩展 API、完整依赖、合并规则或 VCS 兼容性。接入设计可以继续讨论职责与输入输出；具体钩子和工具命令应在固定发行包后核查。以下各项分别标明历史证据和未验证部分。

本轮只阅读第一方页面与官方课程作者的历史答复，没有下载 UVMF 大软件包，没有安装、执行生成器、编译或仿真，也没有访问 CHI 项目。未使用第三方镜像作为官方发行来源。

## 已核对的事实

| 主题 | 可支持的结论 | 来源与限制 |
| --- | --- | --- |
| 发行来源 | Siemens Verification Academy 的 UVMF 课程页列出 `2023.4_2`（页面标注 2024-08-05）、`2023.4`、`2023.3`、`2023.1` 等发行资源。 | [官方课程与发行列表](https://verificationacademy.com/topics/uvm-universal-verification-methodology/uvmf/uvm-framework/)。这只是本次公开页面可见版本，不能声明它覆盖全部当前发行。 |
| 获取限制 | `2023.4_2` 的资源页实际显示 Full-access members only，未获得匿名可下载的发行包。 | [官方发行资源](https://verificationacademy.com/resource/4e363d30-6cf4-41a7-8003-01901415ca28)。未登录或绕过访问限制，未取得包校验值、许可文件和源码。 |
| 输入与生成后补充 | 官方 bench 生成课程明确以 YAML 描述 bench，并说明生成后仍有需要修改的内容。 | [Bench Code Generation](https://verificationacademy.com/topics/uvm-universal-verification-methodology/uvmf/uvm-framework/bench-code-generation/)，页面标注 2018-04。公开摘要没有给出当前完整 schema。 |
| 业务实现职责 | 官方培训流程包含描述设计、生成 testbench、补充设计细节及仿真。 | [Siemens 课程说明](https://training.plm.automation.siemens.com/ilt/iltdescription.cfm?pID=303572________EDA__2023.2_1252)。生成不等于模块特有功能检查已经实现。 |
| 再生成 | 官方课程介绍了把旧版本手工修改转移到新一轮生成代码的合并能力。 | [Code Generation Merging](https://verificationacademy.com/topics/uvm-universal-verification-methodology/uvmf/uvm-framework/code-generation-merging/)，页面标注 2020-04。未读到实现，不能承诺任意手写改动均被保留。 |
| 构建入口 | 官方课程目录包含独立的 Build/Compile/Run script 课程。 | [官方课程目录](https://verificationacademy.com/topics/uvm-universal-verification-methodology/uvmf/uvm-framework/)，课程日期 2023-02-20。专页获取超时；目录摘要不包含可验证的命令参数或当前 VCS 后端支持范围。 |

## 基础库、生成代码与仿真器的区别

官方课程作者 Jonathan Craft 于 2022-03-25 在 Verification Academy 回答：UVMF 基础类和生成代码曾在其他仿真器上测试，但当时附带的建议编译/运行脚本没有提供其他仿真器支持，需要接入方补充。这份历史第一方答复支持将「SV 基础库与生成代码」和「工具驱动脚本」分别评估；它不构成 `2023.4_2` 配合 VCS W-2024.09-SP1 / UVM 1.2 的验证结果。[作者答复](https://verificationacademy.com/forums/t/uvmf-without-questa/40203)

因此，后续不能把运行官方脚本、编译基础库、编译生成环境、运行业务用例合并成一个「兼容」结论。至少分别记录这些结果，并在实际使用的输入、宏、filelist、工具环境和产物上保留证据。这是依据上述资料提出的验证建议，不是已批准的新实现合同。

## Python 与生成入口：仅有历史线索

官方课程作者 Graeme Jessiman 于 2021-11 给出的用法是向 `$UVMF_HOME/scripts/yaml2uvmf.py` 提供相关 agent、environment、bench YAML，并用输出目录选项选择生成位置；其答复指向包内 `templates/python/README` 和 ALU 教程。该答复还列出当时 Python 3 所需的 `yaml`、`jinja2`、`markupsafe`，并提到 Python 2 包装内含 `voluptuous`。[历史作者答复](https://verificationacademy.com/forums/t/how-to-generate-uvm-code-from-yaml-code/39834)

这些信息只用于寻找应核对的文件，不应直接成为新工程的 requirements 或执行命令。当前解释器版本、模块对应的发行包名、版本范围、是否仍需其他依赖，均须读取所选发行包。本项目继续按既有规则用 uv 管理 Python，不因旧答复推荐 Anaconda 而更换环境策略。本文没有安装任何依赖。

## 接入设计现在能采用的工作划分

以下为研究建议，等待设计讨论，不是已经批准的目录结构或 API：

1. 分别管理 UVMF 发行输入、生成描述、生成产物和 DV 业务代码，避免在尚未核对合并语义时承诺覆盖式再生成安全。
2. 先确定公共部署入口接受什么、生成什么以及 DV 在哪里补充逻辑，再选取具体模板扩展方式。
3. knob 的声明、加载冻结与应用位置必须依据配置字段首次读取和随机化时机确定；公开摘要不能证明某个 UVM phase 普遍适用。
4. 保留项目现有的编译/运行分离、显式原生 seed 和日志/进程结果分层合同；公共接入应通过最小环境验证这些合同。

## 固定发行包后必须补齐的证据

| 未决问题 | 建议证据 | 当前状态 |
| --- | --- | --- |
| 发行身份与分发 | 官方包、校验值、完整 release notes、许可和再分发条件 | 未取得包；不声明已允许再分发 |
| 生成器与基础库版本关系 | 包目录、源码、生成模板与依赖清单 | 未读源码；未核实官方公开 Git 仓库 |
| 输入格式与扩展位置 | 同版 YAML 参考、公开钩子或保留区的源码定位 | 当前只有课程级说明 |
| 再生成保护 | 同版工具生成 → 增加 DV 代码/knob 接入 → 修改输入再生成 → 比对并编译 | 未执行 |
| VCS 工具链 | 固定 VCS/UVM 的最小环境编译与运行日志、告警处置 | 未执行；历史跨仿真器答复不能替代 |
| knob 生命周期 | 首次配置读取、对象创建、随机化和激励前的调用证据；提前读取负例 | 未执行；不预设 phase |
| 调参无需重编译 | 同一 simv/共享库哈希下，多配置行为变化与同 seed 重放 | 未执行；knob 一阶段证据不等于 UVMF 集成通过 |

完成本次公开资料核查，可以进入接入合同和部署方式的人工讨论；具体发行包相关事实仍需补查，实际兼容性仍需要独立实验。资料核查完成不表示这些实验已通过。
