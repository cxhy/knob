# UVMF 2023.4_2 包内核查

日期：2026-11-11。关联事项：准备可核验的 UVMF 官方发行包设计输入（`knob-uv7.5`）。结论：发行包已收到，设计输入准备完成；本记录为静态核查，不是安装、生成、再生成或 VCS 兼容性验收。

## 来源与完整性

用户在请求官方包后提供 `UVMF_2023.4_2.tar.gz`。根目录与 `build/vendor/uvmf/incoming/` 的两份文件内容一致，均保留并排除在 Git 之外。来源记录为「用户提供」，未取得发行方另行发布的校验值或签名，不把本地哈希当作独立的官方身份认证。

- 大小：16,247,563 字节。
- SHA-256：`36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0`。
- 包内版本：`templates/python/uvmf_version.py` 为 `2023.4_2`。
- `release.INFO`：`2024-08-05:817b9746ddcfa2b003d5034380a9dc44a3fc14bc`。
- 归档共 2,529 项，其中 2,112 个普通文件、417 个目录；没有链接或特殊文件，路径检查通过。
- 解包目录：`build/vendor/uvmf/unpacked/UVMF_2023.4_2/`。逐文件与归档核对，并在只读调查结束时再次验证，2,112 个文件哈希均一致。

机器可读证据见 [检查记录](../harness/uvmf-package-checks.json)。完整成员清单和逐文件哈希留在 `build/vendor/uvmf/audit/`，原始归档与包内源码不加入公共 Git。

## 现在可以确认的事实

以下路径均相对于解包目录。

| 主题 | 包内证据 | 对后续设计的影响 |
| --- | --- | --- |
| 生成输入与结构 | `scripts/yaml2uvmf.py` 接收 YAML，调用 `templates/python/uvmf_gen.py`；包中含基础库、模板、基础示例、VIP 示例和教程 | 可以分开管理上游包、项目描述、生成物和 DV 手写逻辑；具体公共接口仍待决定 |
| Python 版本 | `docs/uvmf.RELEASE_NOTES` 的 2023.4_1 条目要求 Python 3.7 或更新版本，并停止 Python 2 支持 | `generators.README` 及部分 PDF 中的旧 Python 2 说明不能直接照搬；实际解释器版本在工具链阶段验证 |
| 随包依赖 | `templates/python/python3/` 内含 Jinja2 3.1.3、MarkupSafe 2.1.5、PyYAML 6.0.1；`templates/python/voluptuous/` 为 0.14.2。源码中的版本值与发布说明一致 | 生成入口将这些目录置于导入路径前部；不能只看外部环境的包版本便判断实际加载来源。当前未安装依赖或生成 uv 锁文件 |
| 生成扩展 | `uvmf_gen.py:210` 起定义输出目录、模板目录和覆盖选项；`yaml2uvmf.py:1888` 起提供合并源及相关选项 | 上游存在模板替换和合并入口，可以评估在上游之外增加适配；尚未确定采用方式 |
| 手写代码与合并 | `uvmf_yaml/regen.py` 解析成对的 `pragma uvmf custom` 标记，按文件/标签迁移内容；旧标记未被使用时默认报错，可通过选项改为记录并继续 | 保留机制围绕指定代码区，不是任意文件差异的通用合并保证。必须用实际再生成实验核查我们采用的扩展模式 |
| 构建与运行 | `scripts/Makefile` 使用 Questa/Veloce 相关命令，BCR 命令实现位于 `scripts/bcr_mods/mentor_commands/` | 当前已检查入口不能直接当作 VCS 调用合同。需评估 VCS 编译运行适配，不能由脚本面向 Questa 推断 SV 库无法用于 VCS |
| 配置时序 | `uvmf_base_pkg/src/uvmf_test_base.svh:80` 起在 build 阶段创建并随机化 configuration，再创建 environment；`bench_tb_tests_src_test_top_svh.TMPL:127` 起提供 super 调用前以及配置随机化后、initialize 前的 custom 区 | knob 若影响初始化或 configuration 随机化，必须按首次使用时间安排接入，不能直接沿用旧示例较晚的冻结时机；本轮仅识别候选位置，没有批准生命周期方案 |

生成模板还提供 bench plusarg 能力。该能力不改变本项目专用文件配置和不支持命令行 knob 覆盖的合同；不能把它直接作为 knob 的配置入口。

## 许可材料的位置

基础库和生成器源码头部声明 Apache-2.0；包内用户指南 1.1.6 节也对这两部分给出相同说明。随包 Python 组件的许可材料位于 `templates/python/legal/`。本轮没有发现覆盖整包所有内容的统一根目录 LICENSE，不将基础库的声明扩大到全部示例或第三方组件。

本轮仅定位这些材料，没有将第三方包发布到公共仓库。具体分发方案由后续部署与版本管理决定，按实际纳入内容保留相应许可材料。

## 完成边界与下一步

本轮通过 uv 调用现有 Python 3.12 检查归档并计算哈希，使用 pdftotext 读取包内 PDF；没有导入或运行 UVMF 的 Python 模块，也没有安装依赖、生成代码、编译或仿真。检查工具使用的 Python 版本不等于已验证的 UVMF 运行环境。

此前「缺少发行包」的阻塞已解除。接下来可进入「确定新项目接入合同与 knob 扩展边界」以及「确定公共依赖部署与版本管理方式」的设计讨论。优先明确模板/手写区的使用方式、knob 与配置随机化的顺序及 VCS 入口职责；生成和运行行为仍由后续工具链实验验证。
