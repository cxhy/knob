#!/usr/bin/env bash
# Usage: bash scripts/run.sh RUN_DIRECTORY +ntb_random_seed=123 [+UVM_TESTNAME=...]
# Prepare knob.cfg in RUN_DIRECTORY before calling this script. Never compiles.
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [[ $# -lt 1 ]]; then printf 'Usage: %s RUN_DIRECTORY [simulator arguments]\n' "$0" >&2; exit 2; fi
run_dir=$(realpath -e -- "$1")
shift
simv="$root/build/poc/simv"
[[ -x "$simv" ]] || { printf 'Compile first with bash scripts/compile.sh\n' >&2; exit 2; }
sha256sum --status -c "$root/build/poc/artifacts.sha256"
[[ -d "$run_dir" ]] || exit 2
# Existing logs are evidence: use a new directory for another run.
[[ ! -e "$run_dir/simulation.log" ]] || { printf 'Run directory already contains simulation.log\n' >&2; exit 2; }
args=("$@")
has_test=0
for arg in "${args[@]}"; do [[ "$arg" != +UVM_TESTNAME=* ]] || has_test=1; done
if [[ $has_test -eq 0 ]]; then args+=(+UVM_TESTNAME=knob_demo_test); fi
cd "$run_dir"
sha256sum "$simv" > simv.sha256
cp "$root/build/poc/artifacts.sha256" artifacts.sha256
if [[ -f knob.cfg ]]; then sha256sum knob.cfg > config.sha256; fi
printf '%q ' "$simv" "${args[@]}" > command.txt
printf '\n' >> command.txt
raw_status=0
timeout 60 "$simv" "${args[@]}" > simulation.log 2>&1 || raw_status=$?
printf '%s\n' "$raw_status" > process-status.txt
awk '/^TX / {print}' simulation.log > transactions.log
awk '/^KNOB_VALUE / {print}' simulation.log > effective-config.log
failed=0
[[ $raw_status -eq 0 ]] || failed=1
rg -q '^KNOB_DEMO_PASS$' simulation.log || failed=1
if rg -q '^(UVM_FATAL|UVM_ERROR) .*@|^(Fatal|Error)-\[' simulation.log; then failed=1; fi
printf '%s\n' "$failed" > result-status.txt
printf 'Result=%s simulator_exit=%s log=%s/simulation.log\n' "$failed" "$raw_status" "$run_dir"
exit "$failed"
