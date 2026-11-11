# 公共依赖版本与离线准备结果

日期：2026-11-11。任务：`knob-uv7.10`。依据：[公共框架规格 1.1](uvmf-framework-spec.md) F3/F4，用户已确认三项公共内容及外部工具独立管理，并授权推进。

## 已实现和部署

共享目录为 `/home/guodz/workspace/verification-deps`。各版本包含 `payload/`、逐文件哈希及内容标识 `release.json`。部署使用经过项目内验证的同一准备入口；该目录原先不存在，未覆盖其他安装。

| 组件 | 版本 | 内容范围 |
| --- | --- | --- |
| uvmf | 2023.4_2 | 用户提供并核查的完整上游树，含基础 SV 库、生成器、模板、随包依赖和许可材料 |
| framework | 0.1.0 | 依赖发布/引用/离线检查入口、自有许可及说明；当前阶段为 dependency-foundation |
| knob | 1.2.0 | src/knob_pkg.sv、knob.f、LICENSE；准备入口逐项对照 v1.2.0 Git 标签 |

framework 0.1.0 不是已完成的全部框架。工程初始化、生成/再生成、编译运行统一入口由 `knob-uv7.11` 后续实现。Python/uv、Node、VCS/UVM 和两个 MCP 保持外部安装，没有复制工具目录或许可证配置。

入口：[依赖 CLI](../../framework/bin/knob-deps.mjs)、[使用说明](../../framework/README.md)、[准备脚本](../../scripts/prepare-shared-deps.sh)。本机实际部署命令：

```bash
bash scripts/prepare-shared-deps.sh /home/guodz/workspace/verification-deps build/vendor/uvmf/unpacked/UVMF_2023.4_2
```

publish 拒绝同版本不同内容；相同内容重复准备不改已有发布。项目 pin 保存版本、manifest 和内容哈希，显式 replace 才能升级或回退。无 knob 项目不产生 knob 引用。锁文件不写共享根目录，搬迁后可显式指定新根目录使用。工具合同不允许原地修改发布；拥有文件权限的人仍可手改，check 会检测内容或 manifest 与锁不符。

## 验证结果

| 层级 | 实际检查 | 结果和边界 |
| --- | --- | --- |
| CLI 集成 | 8 组 Node CLI 测试 | 全通过：重复发布与拒绝替换、无 knob、显式升级回退、不隐式影响旧项目、缺版本保持原锁、内容/manifest篡改、链接/版本路径错误、缺运行环境、共享根搬迁 |
| 真实离线环境 | 经 uv --no-project --offline 执行 Python 3.12.13 | 成功，禁止自动下载解释器；不借用其他项目虚拟环境 |
| Python 依赖来源 | Jinja2 3.1.3、MarkupSafe 2.1.5、PyYAML 6.0.1、voluptuous 0.14.2 | 实际模块文件均位于所选 UVMF 包，完整内容哈希固定依赖 |
| 实际版本切换 | 项目显式切换 0.1.0→0.1.1→0.1.0，切换后执行离线检查 | 成功；0.1.1 仅为项目内的测试发布夹具，未部署到 workspace；不声称已完成真实后续产品升级验证 |
| 无 knob 冒烟 | 从共享 UVMF 生成 ALU，基础库编译清单直接引用共享目录 | 一次 VCS W-2024.09-SP1/UVM1.2 编译成功，两条既有 TFIPC 警告；不是新统一工程入口验收 |
| 两次仿真 | seed101，独立运行目录 | 各25请求/21算术匹配，UVM error/fatal均0；轨迹SHA-256均为 cd4c7cdb0ff8c06d90d73133020e78b64557d906b8e444f98fdecaeba1436c10；simv及共享库标识不变 |
| workspace 实装 | 用已部署入口 pin/check 无 knob 和含 knob 两个新项目 | 均成功；三个最终 manifest 与项目内最终暂存相同 |
| 静态检查 | Node/Shell 语法、git diff --check | 通过；原始UVMF及knob核心未改 |

本轮测试使用 Node v20.19.2、uv 0.11.21（`/home/guodz/bin/uv`）。本入口没有新增 Python 文件；就绪探针通过 uv 执行短检查，UVMF 原生成器依赖来自被锁定的上游树。本轮未安装或升级 Python 包。

离线结论针对 uv 的强制离线/禁止下载调用和现有本地依赖；没有将整个 VCS 运行置于断网环境，因为许可证使用已有服务。原 ALU 教程的缺 custom 结束标记在工作副本修复；生成器 SyntaxWarning/弃用提醒及原有运行模板提醒继续保留。

## 证据与复现

检查入口为 `node --test tests/shared-deps.test.mjs`。冒烟复用已有 `experiments/uvmf-standalone` 的 prepare/compile/run，仅替换生成输入与基础库编译路径，验证入口为 [verify-smoke.mjs](../../experiments/shared-deps/verify-smoke.mjs)。实际输出：`build/shared-deps-validation/`。

初期隔离发布位于 `shared/`，用于版本切换和ALU编译；补齐自有 LICENSE 后的最终暂存位于 `final-shared/`。两者 UVMF/knob 内容相同，framework 仅增加许可材料。workspace 部署使用最终内容，已通过实装入口再次检查；没有因为许可文本增加机械重编译未改变的 SV 基础库。

稳定证据位于 `docs/design/evidence/shared-deps-20261111/`，保存 CLI 测试输出、最终三项 manifest、实际引用/离线检查、生成命令/日志、编译日志、两次运行日志/seed/原始码/产物哈希、代码标识及归档 manifest。不归档上游完整源码、外部工具安装或二进制。

首次沙箱内 uv 查询因缓存只读失败；Node测试/uv子进程受沙箱限制，出现空输出/EPERM。均按原入口经批准在沙箱外执行成功，未为通过测试更换工具版本。上述环境失败不作为产品功能通过证据。实际 workspace 写入经批准执行。

## 验收边界

本任务完成公共版本准备、锁定与离线就绪入口，并以真实 ALU 使用共享基础库补足可用性证据。它支持 A01/A02/A10 的依赖层检查，不代表新统一工程入口或全部公共框架验收通过。A03～A09 的工程/再生成/连线工作、完整可选 knob 集成与 M5 自助使用仍由后续任务完成。

下阶段无需再讨论公共依赖组成，直接使用这三项发布和项目引用接口实现无 knob 工程入口；行为合同变化再核对正式规格。
