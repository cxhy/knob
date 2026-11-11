# 从干净 checkout 部署到指定目录

本入口随仓库源码交付。它只需要当前 checkout 的文件和显式提供的 UVMF 输入，不查找旧共享目录、build 缓存或 Git 标签，也不联网下载材料。

## 前置条件

| 阶段 | 外部条件 |
| --- | --- |
| 复制公共版本 | Linux/Bash、Node.js 20+；读取源码及输入、写入目标目录的权限 |
| 从归档部署 | 另需 GNU tar/gzip，用户提供固定 UVMF_2023.4_2.tar.gz |
| 工程生成 | uv 和已准备的 CPython 3.12.13；随包 Python 依赖由 UVMF 提供 |
| 编译和仿真 | VCS 环境脚本、兼容包装入口、UVM 1.2 和有效许可证 |
| RTL 查询/验证工具 | 对应的 hdl-kgraph/xverif 服务，部署公共版本本身无需调用 |

UVMF 不包含在 Git 中，必须从已有授权来源取得。其原始归档 SHA-256 为 `36e556e84960158f0d036a49881e900628d301264e647fd9789c8ebc03bd31d0`。这标识本项目核查的输入，不是发行方另行提供的身份认证。工具和许可证不会被公共部署入口复制或自动安装。

## 一条命令部署

可以从任意工作目录调用，目标和输入参数的相对路径以调用目录为基准：

```bash
bash /path/to/knob/scripts/prepare-shared-deps.sh /path/to/shared /path/to/UVMF_2023.4_2.tar.gz
```

也支持已解包目录：

```bash
bash /path/to/knob/scripts/prepare-shared-deps.sh /path/to/shared /path/to/UVMF_2023.4_2
```

成功后目标目录中有 uvmf/2023.4_2、framework/0.3.0 和 knob/1.2.0。三个版本各有 payload 和 release.json。目标可由调用者指定，无需命名 workspace 或 verification-deps；路径中含空白时正常使用引号。现有 VCS 工程 filelist 适配仍不支持空白路径，因此用于后续仿真的共享目录应选择不含空白的路径。

入口先核对 Node 版本、knob 固定源文件哈希、UVMF 归档/目录内容及框架必要文件，在临时目录准备全部组件，再检查目标版本冲突。普通输入错误或已有版本冲突在写入目标前失败。发布仍以单组件版本为原子单位，不声称在磁盘/进程故障或并发外部写入下提供跨组件事务。

已有同版本相同内容返回 already-present，不替换已有发布；不同内容会拒绝，不能通过重跑覆盖旧安装。新发布清单使用固定排序，校验兼容此前的清单顺序。

`inputs.json` 和本目录、framework/、脚本及 knob 库必须随源码纳入 Git。固定 knob 内容校验不需要 v1.2.0 标签，因此浅 clone 或不带 .git 的源码导出也可执行。源码变更后应更新相应版本与输入记录，不能随意修改哈希来接受错误来源。

## 部署后检查与使用

```bash
node /path/to/shared/framework/0.3.0/payload/bin/knob-deps.mjs pin --root /path/to/shared --project /path/to/project --uvmf 2023.4_2 --framework 0.3.0
node /path/to/shared/framework/0.3.0/payload/bin/knob-deps.mjs check --root /path/to/shared --project /path/to/project --uv /path/to/uv
```

check 通过 uv 离线检查解释器及依赖，不下载缺失内容。之后使用 [公共框架说明](../framework/README.md) 的 init/generate/compile/run/regress。无 knob 项目不引入 knob 库或配置文件。

要声明整个新环境已经可仿真，仍需在该环境执行真实编译和运行。源码可部署检查不替代工具和许可证可用性验证，也不保证尚未测试的操作系统或工具版本。
