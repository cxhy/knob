# HDL 解析 MCP 输入核查

用户澄清：当前尚无 RTL，本阶段只需记录已具备 hdl-kgraph MCP 服务；项目图数据库尚未建立不构成当前设计工作的阻塞。无需现在建图或继续排查服务，待实际设计输入到位后再验证项目查询。以下启动失败仅记录当时无数据库的现象，不代表需要立即修复。

## 重启后当前会话核验（2026-11-11）

当前工具目录没有 hdl-kgraph 工具。对 `hdl-kgraph` 调用 MCP resources/list，客户端返回 `MCP startup failed: handshaking with MCP server failed: connection closed: initialize response`。从 knob 工作目录直接执行 `/home/guodz/.local/bin/hdl-kgraph serve --mcp` 返回码 2：`Error: no .hdl-kgraph/graph.db found here or in any parent directory; run hdl-kgraph build first or pass --db`。客户端已识别服务，但当前项目缺图数据库，实际会话尚不能调用；此前隔离 stdio 验证不替代此项。未修改配置、建立数据库、索引 CHI 或运行 VCS。后续按批准输入准备图并重新核验。

## 接入结果（2026-11-11 更新）

用户明确授权接入后，已确认实际服务为 `hdl-kgraph`，并注册到 `/home/guodz/.codex/config.toml`：

```toml
[mcp_servers.hdl-kgraph]
command = "/home/guodz/.local/bin/hdl-kgraph"
args = ["serve", "--mcp"]
```

`codex mcp get hdl-kgraph` 确认 enabled、stdio。未固定数据库；启动时从当前工作目录向上查找 `.hdl-kgraph/graph.db`，没有数据库时启动失败。实际目标工程必须先以其批准的 filelist、宏和 include 路径执行 `hdl-kgraph build`；本轮未索引 knob 或 CHI，未将测试数据库设为全局默认。

隔离最小输入位于 `/tmp/knob-hdl-mcp-smoke`。使用现有安装构建 1 个 SV 文件、2 个模块，得到 10 个节点、17 条边。真实 stdio MCP initialize、tools/list 和三项查询成功：find_module 返回两个模块，get_hierarchy 返回 probe_top.u_leaf，port_map 返回端口方向、参数默认值及 a/y 连接。端口类型保留 `[W-1:0]` 文本；不能据此声称实例化后的数值位宽已经展开。filelist 选项由 CLI 提供，MCP 本身只读，不执行构建。没有验证复杂宏、generate、完整参数展开、真实 DUT 连线或 VCS 功能。

现有安装暴露 9 个工具：find_module、get_hierarchy、who_instantiates、port_map、impact_of_change、clock_domains、find_signal_drivers、uvm_topology、search_nodes。源码在 `/home/guodz/test/hdl-kgraph`，本机安装文件标记 hdl-kgraph 2.4.0；MCP serverInfo 中的 4.0.5 是 FastMCP 框架版本，不作为 hdl-kgraph 版本。

沙箱内首次握手 20 秒超时，服务日志已显示 stdio 启动；经批准在沙箱外原样重试成功。未安装或升级依赖。证据位于 `docs/design/evidence/hdl-mcp-20261111/`：probe.sv、check.cjs、result.json。检查脚本使用固定临时目录；复现时先按 probe.sv 创建输入并构建上述数据库，再执行 `node check.cjs`。这属于 MCP 接口检查，不是 VCS 验收。

当前会话的工具清单尚无新入口，需客户端重新加载 MCP 或重启会话后确认；此项不由独立 stdio 验证代替。原始核查记录保留如下。

日期：2026-11-11。关联事项：`knob-uv7.7`；设计决定来源：接入访谈 Q15。

用户指定 RTL 解析调用其 `hdl-kragph` MCP，并依据设计交付的相关文档进行连线。该名称先按用户原文保留，实际服务名与工具前缀尚未确认。此前「首版由 DV 完全手写 DUT 连线」只是未获采纳的推荐。

## 本轮只读核查

按照 grilling 对环境事实的核查要求，委派只读子 agent 检查工具与本机配置。核查结果：

- 当前 `ALL_TOOLS` 的名称或描述中，匹配 `hdl`、`kragph`、`kgraph` 的工具为 0。
- `/home/guodz/.codex/config.toml` 发现的 MCP 服务为 `nowledge-mem`、`xverif`，没有对应 HDL graph 服务。只核对服务标识，未输出凭据或完整配置。
- `/home/guodz/.claude.json` 顶层服务为 `codex-subagent`，其 knob 项目配置未找到对应服务。
- 检查了常用 Cursor、VS Code、Claude Desktop、Windsurf 及 knob 本地配置位置，未获得对应工具路径。
- Nowledge 的相关检索没有返回工具来源，且语义检索处于降级状态；检索无结果不能证明工具不存在。

以上只能证明在本轮可见范围中没有找到入口，不能推断该工具不存在或用户提供的名称错误。未将其他工具当作替代，也未启动服务、执行 RTL 解析或访问 CHI 项目。

## 待补输入与验证边界

需要实际 MCP 服务名、工具前缀、配置位置或工具仓库路径中的任一项，以便继续核查。当前无法确认端口、方向、位宽、参数展开、filelist 或诊断接口，也没有 RTL 解析和自动连线实测结论。

拿到入口后再核对接口说明及适用范围；实际连线仍须结合设计文档中的接口语义、时钟/复位和特殊连接要求。本轮不新增解析器，不修改 MCP 配置。与接口细节无关的设计访谈可以继续，相关决定不能据此当作已经实现或验证。
