#!/usr/bin/env bash
set -euo pipefail
source /home/guodz/install_vcs/vcs_env.sh
# Reuse verified unchanged build from review-fixes-v1.2.

# mktemp 保证本次目录未被旧日志占用。
mkdir -p runs
guide_runs=$(mktemp -d runs/integration-guide-XXXXXXXX)
mkdir "$guide_runs/a" "$guide_runs/b" "$guide_runs/replay" "$guide_runs/invalid"

cp examples/host/knob.cfg "$guide_runs/a/knob.cfg"
bash examples/host/run.sh build/host-isolated/out "$guide_runs/a" +ntb_random_seed=12345

cat > "$guide_runs/b/knob.cfg" <<'CFG'
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
CFG
bash examples/host/run.sh build/host-isolated/out "$guide_runs/b" +ntb_random_seed=12345

cp "$guide_runs/b/knob.cfg" "$guide_runs/replay/knob.cfg"
bash examples/host/run.sh build/host-isolated/out "$guide_runs/replay" +ntb_random_seed=12345
cmp "$guide_runs/b/transactions.log" "$guide_runs/replay/transactions.log"
cmp "$guide_runs/b/sequences.log" "$guide_runs/replay/sequences.log"

cp examples/host/knob.cfg "$guide_runs/invalid/knob.cfg"
printf '\nlink0.tx.unknown=1\n' >> "$guide_runs/invalid/knob.cfg"
invalid_status=0
bash examples/host/run.sh build/host-isolated/out "$guide_runs/invalid" +ntb_random_seed=12345 || invalid_status=$?
test "$invalid_status" -eq 1

sha256sum --status -c build/host-isolated/out/artifacts.sha256
printf '运行证据目录：%s\n' "$guide_runs"

printf "%s\n" "$guide_runs" > build/integration-guide/latest.txt
