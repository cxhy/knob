# 公共依赖准备入口 0.1.0

本版本提供共享源码发布、项目版本引用和离线 Python 就绪检查，是公共框架的依赖基础；初始化、工程生成、编译与运行统一入口由后续阶段提供。本入口只读取已有本地材料，不下载依赖。

共享区有三个独立版本：UVMF 上游包、framework、可选 knob。Python/uv、Node、VCS/UVM 及 MCP 使用外部安装，不复制到发布内容。UVMF 发布保留完整上游材料及其许可文件；knob 发布包含 `src/knob_pkg.sv`、可供 `-F` 引用的 `knob.f` 和 `LICENSE`。框架源码与说明按 framework 版本发布。

## 准备共享版本

以下为入口用法，具体部署根目录由调用者显式指定。版本目录已经存在且内容不同时拒绝写入；内容相同时返回 already-present。工具不提供覆盖已发布内容的命令。

```bash
node framework/bin/knob-deps.mjs publish --root /path/to/shared --component uvmf --version 2023.4_2 --source /path/to/UVMF_2023.4_2
node framework/bin/knob-deps.mjs publish --root /path/to/shared --component framework --version 0.1.0 --source framework
node framework/bin/knob-deps.mjs publish --root /path/to/shared --component knob --version 1.2.0 --source /path/to/knob-checkout
```

发布目录为 `<root>/<component>/<version>/`，包括 `payload/` 和 `release.json`。manifest 记录逐文件 SHA-256 和内容标识；本地哈希是完整性标识，不是发行方认证。knob 源码的发行版本由准备者核对，不能仅凭传入的版本标签证明来源。

发布器复制已有本地文件，拒绝源树链接和特殊文件；写入使用临时目录和每版本排他锁。相同版本不替换已有目录。这里的不可变性是入口合同，并非阻止拥有文件权限的人手工修改；检查会拒绝与 manifest 或项目锁不符的内容。

## 固定项目引用

```bash
node /path/to/shared/framework/0.1.0/payload/bin/knob-deps.mjs pin --root /path/to/shared --project /path/to/project --uvmf 2023.4_2 --framework 0.1.0
node /path/to/shared/framework/0.1.0/payload/bin/knob-deps.mjs check --root /path/to/shared --project /path/to/project --uv /path/to/uv
```

`pin` 创建项目自己的 `verification-deps.lock.json`，记录各组件版本、manifest 和内容标识，不写开发机共享根目录。项目使用时显式指定共享根目录，因此可以将共享目录搬到另一位置后检查。无 knob 项目不填写 `--knob`；启用时显式增加 `--knob 1.2.0`。

已有引用要切换或回退时，重新执行 pin 并指定全部期望版本及 `--replace`。工具先核对目标发布，再原子更新锁文件；不会升级其他项目。原锁内容应随项目纳入版本管理，需要的旧发布由共享区保留。

## 离线运行环境

check 通过 uv 的 `--no-project --offline --python 3.12.13` 验证已准备的解释器，不使用其他项目的虚拟环境，不下载 Python。它导入 UVMF 随包的 Jinja2、MarkupSafe、PyYAML 和 voluptuous，并核对实际加载位置属于选定 UVMF 内容；这些组件由 UVMF 的完整内容哈希固定，不额外复制或升级。

缓存默认写到项目 `.verification-cache/uv/`，可通过 `--cache` 指定。它属于生成缓存，不是源码或版本锁。准备者使用 uv 管理本机解释器；若缺失，check 明确失败。check 成功不代表 VCS 许可证、工程生成或功能验收已经通过，这些需要对应阶段的实际检查。

外部工具环境记录仅保存必要入口和版本，不归档含凭据的完整进程环境、许可证配置或 MCP 配置文件。VCS 编译继续显式使用 `-ntb_opts uvm-1.2`；具体工程入口在后续阶段接入。
