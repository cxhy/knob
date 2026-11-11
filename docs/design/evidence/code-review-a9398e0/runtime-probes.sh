#!/usr/bin/env bash
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
cd /home/guodz/workspace/knob
suite=$(mktemp -d "$PWD/runs/review-a9398e0-XXXXXXXX")
printf '%s\n' "$suite" > /tmp/knob-review-runtime-path
for name in seed_auto_1 seed_auto_2 seed_auto_first nul_suffix nul_between; do
  mkdir -p "$suite/$name"
  args=(+ntb_random_seed=12345)
  case "$name" in
    seed_auto_1|seed_auto_2) cp examples/host/knob.cfg "$suite/$name/knob.cfg"; args+=(+ntb_random_seed_automatic) ;;
    seed_auto_first) cp examples/host/knob.cfg "$suite/$name/knob.cfg"; args=(+ntb_random_seed_automatic +ntb_random_seed=12345) ;;
    nul_suffix) printf 'link0.tx.count=1\0junk\n' > "$suite/$name/knob.cfg" ;;
    nul_between) printf 'link0.tx.count=1\0\nlink0.tx.count=2\n' > "$suite/$name/knob.cfg" ;;
  esac
  status=0
  bash examples/host/run.sh build/host-isolated/out "$suite/$name" "${args[@]}" > "$suite/$name/runner.log" 2>&1 || status=$?
  printf '%s runner=%s raw=%s\n' "$name" "$status" "$(cat "$suite/$name/process-status.txt")"
  rg 'random seed|random_seed|KNOB_SEED|UVM_FATAL|UVM_WARNING|^KNOB_VALUE link0.tx.count' "$suite/$name/simulation.log" || true
 done
if cmp -s "$suite/seed_auto_1/transactions.log" "$suite/seed_auto_2/transactions.log"; then printf 'auto replay identical\n'; else printf 'auto replay differs\n'; fi
printf 'evidence=%s\n' "$suite"
