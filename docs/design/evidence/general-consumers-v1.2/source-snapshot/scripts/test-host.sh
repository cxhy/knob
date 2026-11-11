#!/usr/bin/env bash
# Exercises the copied consumer project, without invoking its compiler.
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
isolated="$root/build/host-isolated"
build="$isolated/out"
sha256sum --status -c "$build/sources.sha256"
cmp knob.f "$isolated/vendor/knob/knob.f"
cmp src/knob_pkg.sv "$isolated/vendor/knob/src/knob_pkg.sv"
for file in tb.sv compile.sh run.sh knob.cfg; do cmp "examples/host/$file" "$isolated/consumer/$file"; done
mkdir -p runs
suite=$(mktemp -d "$root/runs/host-XXXXXXXX")
printf 'case\texpected\thost_status\tsimulator_status\n' > "$suite/results.tsv"
cases=0
run_case() {
  local name=$1 expected=$2 dir="$suite/$1" status=0
  shift 2
  mkdir -p "$dir"
  cat > "$dir/knob.cfg"
  bash "$isolated/consumer/run.sh" "$build" "$dir" "$@" > "$dir/runner.log" 2>&1 || status=$?
  case "$expected" in
    pass)
      [[ $status -eq 0 ]] || { tail -30 "$dir/simulation.log"; exit 1; }
      rg -q '^test_result=pass$' "$dir/result.txt"
      rg -q '^runtime_result=ok$' "$dir/result.txt" ;;
    runtime_error)
      [[ $status -eq 2 ]]
      rg -q '^runtime_result=error$' "$dir/result.txt"
      [[ $(cat "$dir/process-status.txt") -ne 0 ]]
      [[ $(cat "$dir/process-status.txt") -eq 124 ]]
      [[ ! -s "$dir/transactions.log" ]] ;;
    native_fatal)
      [[ $status -eq 1 ]]
      rg -q '^test_result=fail$' "$dir/result.txt"
      rg -q '^runtime_result=ok$' "$dir/result.txt"
      rg -q '^Fatal:' "$dir/simulation.log"
      [[ ! -s "$dir/transactions.log" ]] ;;
    *)
      [[ $status -eq 1 ]]
      rg -q "\[$expected\]" "$dir/simulation.log"
      rg -q '^test_result=fail$' "$dir/result.txt"
      rg -q '^runtime_result=ok$' "$dir/result.txt"
      [[ $(cat "$dir/process-status.txt") -eq 0 ]]
      [[ ! -s "$dir/transactions.log" ]] ;;
  esac
  # The host never emits or requires the prototype's success marker.
  if rg -q '^KNOB_DEMO_PASS$' "$dir/simulation.log"; then exit 1; fi
  printf '%s\t%s\t%s\t%s\n' "$name" "$expected" "$status" "$(cat "$dir/process-status.txt")" >> "$suite/results.tsv"
  cases=$((cases+1))
  printf 'PASS host %s\n' "$name"
}
run_case config_a pass +ntb_random_seed=12345 < examples/host/knob.cfg
run_case replay pass +ntb_random_seed=12345 < examples/host/knob.cfg
cmp "$suite/config_a/transactions.log" "$suite/replay/transactions.log"
cmp "$suite/config_a/sequences.log" "$suite/replay/sequences.log"
run_case other_seed pass +ntb_random_seed=54321 < examples/host/knob.cfg
if cmp -s "$suite/config_a/transactions.log" "$suite/other_seed/transactions.log"; then exit 1; fi
run_case config_b pass +ntb_random_seed=12345 <<'CFG'
link0.tx.count=5
link0.tx.min_length=256
link0.tx.max_length=256
link1.tx.enabled=false
CFG
[[ $(rg -c '^HOST_TX port=link0 ' "$suite/config_a/transactions.log") -eq 6 ]]
[[ $(rg -c '^HOST_TX port=link1 ' "$suite/config_a/transactions.log") -eq 2 ]]
[[ $(wc -l < "$suite/config_b/transactions.log") -eq 10 ]]
awk '{if($2!="port=link0" || $3!="length=256")exit 1}' "$suite/config_b/transactions.log"
awk '{split($3,x,"="); if(x[2]%2 || ($2=="port=link0" && (x[2]<64 || x[2]>96)) || ($2=="port=link1" && (x[2]<128 || x[2]>160)))exit 1}' "$suite/config_a/transactions.log"
run_case defaults pass +ntb_random_seed=1 </dev/null
[[ $(wc -l < "$suite/defaults/transactions.log") -eq 8 ]]
rg -q '^KNOB_UNUSED shared.budget$' "$suite/defaults/simulation.log"
run_case callback_rejected KNOB_CHECK +ntb_random_seed=1 <<'CFG'
shared.budget=1
CFG
run_case unknown KNOB_UNKNOWN +ntb_random_seed=1 <<'CFG'
link0.tx.typo=3
CFG
run_case unsatisfiable KNOB_RANDOMIZE +ntb_random_seed=1 <<'CFG'
link0.tx.min_length=65
link0.tx.max_length=65
CFG
run_case missing_seed KNOB_SEED </dev/null
run_case native_abort native_fatal +ntb_random_seed=1 +UVM_TESTNAME=host_runtime_abort_test </dev/null
# A component task controls actual elapsed time; a plain class computes frame length.
for name in consumers_a consumers_replay; do
  run_case "$name" pass +ntb_random_seed=12345 <<'CFG'
link0.tx.min_length=64
link0.tx.max_length=64
link1.tx.min_length=64
link1.tx.max_length=64
link0.driver.delay_ns=2
link1.driver.delay_ns=5
link0.header.header_bytes=8
link1.header.header_bytes=16
link1.header.enabled=false
CFG
done
for trace in transactions sequences timing frames; do
  cmp "$suite/consumers_a/$trace.log" "$suite/consumers_replay/$trace.log"
done
run_case consumers_b pass +ntb_random_seed=12345 <<'CFG'
link0.tx.min_length=64
link0.tx.max_length=64
link1.tx.min_length=64
link1.tx.max_length=64
link0.driver.delay_ns=7
link1.driver.delay_ns=0
link0.header.header_bytes=8
link0.header.enabled=false
link1.header.header_bytes=16
CFG
for name in consumers_a consumers_b; do
  [[ $(wc -l < "$suite/$name/timing.log") -eq 8 ]]
  [[ $(wc -l < "$suite/$name/frames.log") -eq 8 ]]
  [[ $(rg -c '^HOST_TX port=link0 ' "$suite/$name/transactions.log") -eq 4 ]]
  [[ $(rg -c '^HOST_TX port=link1 ' "$suite/$name/transactions.log") -eq 4 ]]
done
awk '{if($2=="port=link0"){if($3!="delay_ns=2"||$4!="elapsed_ps=2000")exit 1}
      else if($2=="port=link1"){if($3!="delay_ns=5"||$4!="elapsed_ps=5000")exit 1}else exit 1}' "$suite/consumers_a/timing.log"
awk '{if($2=="port=link0"){if($3!="delay_ns=7"||$4!="elapsed_ps=7000")exit 1}
      else if($2=="port=link1"){if($3!="delay_ns=0"||$4!="elapsed_ps=0")exit 1}else exit 1}' "$suite/consumers_b/timing.log"
awk '{if($3!="input_length=64"||($2=="port=link0"&&$4!="output_length=72")||($2=="port=link1"&&$4!="output_length=64"))exit 1}' "$suite/consumers_a/frames.log"
awk '{if($3!="input_length=64"||($2=="port=link0"&&$4!="output_length=64")||($2=="port=link1"&&$4!="output_length=80"))exit 1}' "$suite/consumers_b/frames.log"
awk '{if(($2=="port=link0"&&$3!="length=72")||($2=="port=link1"&&$3!="length=64"))exit 1}' "$suite/consumers_a/transactions.log"
awk '{if(($2=="port=link0"&&$3!="length=64")||($2=="port=link1"&&$3!="length=80"))exit 1}' "$suite/consumers_b/transactions.log"
run_case driver_early_read KNOB_STATE +ntb_random_seed=1 +UVM_TESTNAME=host_driver_early_read_test </dev/null
run_case helper_early_read KNOB_STATE +ntb_random_seed=1 +UVM_TESTNAME=host_helper_early_read_test </dev/null
run_case driver_range KNOB_RANGE +ntb_random_seed=1 <<'CFG'
link0.driver.delay_ns=1001
CFG
run_case helper_bool KNOB_VALUE +ntb_random_seed=1 <<'CFG'
link0.header.enabled=1
CFG
# Force an actual process deadline, independently of UVM failure diagnostics.
HOST_TIMEOUT=0.001 run_case timed_out runtime_error +ntb_random_seed=1 </dev/null
sha256sum --status -c "$build/artifacts.sha256"
printf 'PASS %s independent-host cases; same artifacts; no prototype pass marker\n' "$cases" | tee "$suite/summary.txt"
printf '%s\n' "$suite" > "$build/latest-host.txt"
