#!/usr/bin/env bash
set -euo pipefail
source /home/guodz/install_vcs/vcs_env.sh
export VCS=/home/guodz/install_vcs/bin/vcs
bash examples/host/compile.sh "$PWD" build/readme-host

mkdir -p runs
readme_runs=$(mktemp -d runs/readme-XXXXXXXX)
mkdir "$readme_runs/a" "$readme_runs/b"
cp examples/host/knob.cfg "$readme_runs/a/knob.cfg"
bash examples/host/run.sh build/readme-host "$readme_runs/a" +ntb_random_seed=12345

cat > "$readme_runs/b/knob.cfg" <<'CFG'
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
CFG
bash examples/host/run.sh build/readme-host "$readme_runs/b" +ntb_random_seed=12345

wc -l "$readme_runs/a/transactions.log" "$readme_runs/b/transactions.log"
sha256sum --status -c build/readme-host/artifacts.sha256

printf "%s\n" "$readme_runs" > build/readme-check/latest.txt
