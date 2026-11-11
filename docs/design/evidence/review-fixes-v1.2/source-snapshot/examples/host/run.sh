#!/usr/bin/env bash
# Host policy: UVM log diagnostics determine test_result, raw status is separate.
# Neither KNOB_DEMO_PASS nor a knob-specific success marker is required.
set -euo pipefail
[[ $# -ge 2 ]] || { printf 'Usage: %s BUILD_DIRECTORY RUN_DIRECTORY [sim args]\n' "$0" >&2; exit 2; }
build=$(realpath -e -- "$1")
dir=$(realpath -e -- "$2")
shift 2
args=("$@")
has_test=0
for arg in "${args[@]}"; do [[ "$arg" != +UVM_TESTNAME=* ]] || has_test=1; done
if [[ $has_test -eq 0 ]]; then args+=(+UVM_TESTNAME=host_test); fi
[[ ! -e "$dir/simulation.log" ]] || { printf 'Use a fresh run directory\n' >&2; exit 2; }
sha256sum --status -c "$build/artifacts.sha256"
cd "$dir"
cp "$build/artifacts.sha256" artifacts.sha256
if [[ -f knob.cfg ]]; then sha256sum knob.cfg > config.sha256; fi
printf '%q ' "$build/simv" "${args[@]}" > command.txt
printf '\n' >> command.txt
raw=0
timeout "${HOST_TIMEOUT:-60}" "$build/simv" "${args[@]}" > simulation.log 2>&1 || raw=$?
printf '%s\n' "$raw" > process-status.txt
result=pass
if awk '/^UVM_(FATAL|ERROR).*@|^Fatal:|^Error-/ {found=1} END {exit !found}' simulation.log; then result=fail; fi
runtime=ok
if [[ $raw -ne 0 ]]; then
  runtime=error
  if [[ "$result" == pass ]]; then result=undetermined; fi
fi
printf 'test_result=%s\nruntime_result=%s\nprocess_status=%s\n' "$result" "$runtime" "$raw" > result.txt
awk '/^HOST_TX / {print}' simulation.log > transactions.log
awk '/^HOST_SEQUENCE / {print}' simulation.log > sequences.log
awk '/^HOST_TIMING / {print}' simulation.log > timing.log
awk '/^HOST_FRAME / {print}' simulation.log > frames.log
awk '/^KNOB_VALUE / {print}' simulation.log > effective-config.log
cat result.txt
if [[ "$runtime" == error ]]; then exit 2; fi
[[ "$result" == pass ]]
