# 审查缺陷修复验收

日期：2026-11-11。对应问题：`knob-zkf`（负例误判）、`knob-8nh`（NUL 尾缀丢失）。依据为 [全量审查报告](code-review-a9398e0.md) 和未修改的 [规格 v1.2](knob-spec.md)。

两项问题已修复。重新编译核心和独立宿主后，本轮实际执行并通过 100 个 VCS 场景：核心 58、接口 13、宿主 29；另通过 16 个脚本判定场景。本次没有复用旧版本仿真结果代替新代码验证。两套编译日志均无 VCS warning/error 诊断。

证据入口：[summary.json](evidence/review-fixes-v1.2/summary.json)、[归档校验清单](evidence/review-fixes-v1.2/manifest.sha256)。保留修复前失败、分步修复后通过、最终完整回归、源码快照及编译产物标识。脚本替身证据与 VCS 实测分开归档。

## 修复行为

`load_and_freeze()` 通过 `$fgetc` 读取原始字节，在转成 SV string 前拒绝 NUL，输出 `KNOB_SYNTAX` 及文件行号。按 LF 分行，保留 CRLF、空行和注释处理，文件末尾没有换行时仍解析最后一行；读取错误仍在冻结前终止。NUL 在注释中也不被当作合法文本忽略。

核心与接口回归的预期失败分支独立要求原始进程码为 0。核心、接口和宿主回归均要求预期 ID 位于 `UVM_FATAL` 的诊断头部，warning/info、其他 fatal 的消息正文不能满足该条件。宿主运行脚本和接入者的结果策略没有被替换，UVM_FATAL 原始码为 0 的约定保持不变。

## 先失败再通过的证据

| 阶段 | 检查 | 实际结果 |
| --- | --- | --- |
| 原始负例判定 | warning 同 ID，脚本替身退出 124 | 两套 CLI 都误记 PASS，新测试失败 |
| 增加原始码检查 | 同一反例 | 两套 CLI 均拒绝，新测试通过 |
| 仅有原始码检查 | warning 同 ID，脚本替身退出 0 | 两套 CLI 仍误记 PASS，新增测试失败 |
| 增加诊断级别/ID 检查 | 16 个场景 | 全部符合预期，fatal/raw=0 正控制仍被接受 |
| 旧 VCS 产物 | `link0.tx.count=1<NUL>junk` | 仍被接受为 1，产生 6 条事务；新增回归失败 |
| 修复后 VCS 产物 | 同一 NUL 反例 | 第 1 行 KNOB_SYNTAX、原始码 0、零事务；回归通过 |

脚本判定测试执行复制后的完整回归 CLI 与真实运行脚本，只将外部 simv 进程替换为脚本。录制的历史成功日志用于推进到目标负例；目标运行记录必须存在。正常 fatal/raw=0 的正控制通过目标负例后，替身主动在下一场景退出，故其整个被测 CLI 仍非零；测试判据是目标负例是否被正确接受，不将整个模拟回归声称为成功。替身的 124/139 是人为退出码，不是真实 VCS 超时或崩溃。

## 新增边界与完整回归

宿主新增 8 个 NUL 负例：整数尾缀、整数中部、键、布尔值、行首、注释、CRLF 第二行和无换行的 EOF 尾部。所有场景均在零事务时触发 KNOB_SYNTAX；第一行和第二行诊断已核对。另有 3 个正例验证无末尾换行、CRLF/行内注释，以及超过 8 KiB 的 UTF-8 注释行；均按配置产生预期的 2 条 link0 事务。

原有 89 个场景全部重新执行。严格语法、signed64 边界、默认值、未知/重复键、登记与冻结、只读校验视图、随机化失败、显式 seed、同 seed 重放、声明复用、独立宿主及通用使用方均继续通过。结合新增 11 个宿主场景，VCS 回归总数为 100。规格 T1～T21 的场景映射沿用 [通用接入报告](general-consumers-results.md)，当前证据替换为本轮重新编译后的三组结果；新增字节边界补充 T4、T5、T7、T21，判定检查补充 T18 及验收证据规则。

| 组别 | 场景数 | 原始目录 | 稳定结果 |
| --- | --- | --- | --- |
| 核心 | 58 | `runs/regression-uK7Mlvbb` | [results.tsv](evidence/review-fixes-v1.2/core/results.tsv) |
| 接口 | 13 | `runs/framework-3MK5QqDX` | [results.tsv](evidence/review-fixes-v1.2/interfaces/results.tsv) |
| 宿主 | 29 | `runs/host-nLSxIow4` | [results.tsv](evidence/review-fixes-v1.2/host/results.tsv) |
| 脚本判定（非 VCS） | 16 | `runs/verdict-zKNgTuvl` | [results.tsv](evidence/review-fixes-v1.2/verdict/results.tsv) |

## 复现与版本

固定环境为 VCS W-2024.09-SP1、UVM 1.2。执行 `make compile`、`make compile-host`，然后 `make test-all`。编译与运行分开，每组最终回归期间可执行文件和共享库保持不变。

脚本判定可单独用 `make test-verdict` 执行。它仍沿用本机环境脚本，但不启动 VCS 或占用仿真许可证，不替代实际仿真。

核心/接口 simv SHA-256 为 `7af8675aee8fb4bd8940a9f5095c10470ef59c99fd06f97e6730a5a61abffa80`；宿主 simv 为 `29e83b46ec7c74d13d450608e1e49aa4e639c29f67877ffd4d49797bdb277464`。库源码 SHA-256 为 `03fb4758719501d9f8642dbf901813eb74420ce87502ed84b96d706c6dcc95ed`。完整共享库标识保存在各组编译证据中。

## Standards

独立复核未发现新增硬违例或需报告的代码味道。原负例误判已解决，原始状态与致命诊断分别检查；16 个完整 CLI 测试包含目标运行存在性检查及正控制，避免前置执行失败造成测试空过。原 Standards 问题关闭。

## Spec

独立复核未发现新的遗漏、错误实现或范围扩张。NUL 在字符串转换前被拒绝，行号、EOF 和文件错误处理符合 R3/R4；负例判定符合 R8，未改变 UVM_FATAL/raw=0 的合同。复核时核心回归仍在运行，随后主 agent 确认核心 58 场景完成；本报告的 100 场景结论以全部进程结束和结果表为准。

Standards：0 项新增发现；Spec：0 项新增发现。审查原有的 2 个独立问题均已修复；结果仍限定于选定环境和覆盖的场景，不构成对任意输入或其他工具版本的保证。
