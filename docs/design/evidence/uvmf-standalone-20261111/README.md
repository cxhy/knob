# UVMF 独立评估证据

本目录保存 2026-11-11 在 build/uvmf-standalone/repro2 实际执行的生成、编译、五次仿真和再生成证据。结果解释见 [评估报告](../../uvmf-standalone-evaluation.md)。

results.json 是自动判定结果；runs 保存原始日志、命令、退出码和产物哈希；compile 保存三次编译日志及命令；logs 保存生成与合并命令及日志（含预期的旧教程标记错误）。recipe 是本轮执行入口快照。sources.f 与 fault.f 保存编译输入顺序，路径指向本机实验目录。upstream-before.json、alu-before.json 和 regeneration-check.json 仅记录文件哈希，不包含第三方源码。

第三方发行包、生成源码、可执行文件和共享库未归档；复现需要使用报告指定的用户提供发行包和工具环境。manifest.json 覆盖本目录除自身之外的文件。
