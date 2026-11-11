#!/usr/bin/env bash
# Focused public-interface tests. Reuses the normal VCS build, never compiles.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
sha256sum --status -c build/poc/sources.sha256
mkdir -p runs
suite=$(mktemp -d "$root/runs/framework-XXXXXXXX")
printf 'case\texpected\trunner_status\tsimulator_status\n' > "$suite/results.tsv"
cases=0
run_case() {
  local name=$1 test_name=$2 expected=$3 dir="$suite/$1" status=0
  mkdir -p "$dir"
  cat > "$dir/knob.cfg"
  bash scripts/run.sh "$dir" +ntb_random_seed=12345 "+UVM_TESTNAME=$test_name" > "$dir/runner.log" 2>&1 || status=$?
  if [[ "$expected" == pass ]]; then
    [[ $status -eq 0 ]] || { tail -30 "$dir/simulation.log"; exit 1; }
  else
    [[ $status -eq 1 ]]
    [[ $(cat "$dir/process-status.txt") == 0 ]] || { printf 'Runtime error is not an expected interface failure: %s\n' "$name"; exit 1; }
    rg -q "^UVM_FATAL .*@[^:]*: [^ ]+ \[$expected\]" "$dir/simulation.log"
    [[ ! -s "$dir/transactions.log" ]]
    if rg -q '^KNOB_DEMO_PASS$' "$dir/simulation.log"; then exit 1; fi
  fi
  printf '%s\t%s\t%s\t%s\n' "$name" "$expected" "$status" "$(cat "$dir/process-status.txt")" >> "$suite/results.tsv"
  cases=$((cases+1))
  printf 'PASS %s\n' "$name"
}
run_case schema_values schema_test pass < examples/minimal/knob.cfg
rg -q '^SCHEMA_COUNTS 4 2$' "$suite/schema_values/simulation.log"
run_case schema_defaults schema_test pass </dev/null
rg -q '^SCHEMA_COUNTS 3 3$' "$suite/schema_defaults/simulation.log"
run_case duplicate_bind duplicate_bind_test KNOB_REGISTER </dev/null
run_case callback_valid callback_test pass < examples/minimal/knob.cfg
run_case callback_rejected callback_test KNOB_CHECK <<'CFG'
agent0.tx.packet_count=9
CFG
run_case callback_early_read callback_early_read_test KNOB_STATE </dev/null
run_case callback_expired_view callback_expired_view_test KNOB_STATE </dev/null
run_case callback_type callback_type_test KNOB_TYPE </dev/null
run_case callback_mutation callback_mutation_test KNOB_STATE </dev/null
run_case sealed_schema sealed_schema_test KNOB_STATE </dev/null
run_case null_validator null_validator_test KNOB_REGISTER </dev/null
run_case duplicate_validator duplicate_validator_test KNOB_REGISTER </dev/null
run_case late_validator late_validator_test KNOB_STATE </dev/null
sha256sum --status -c build/poc/artifacts.sha256
printf 'PASS %s framework cases\n' "$cases" | tee "$suite/summary.txt"
printf '%s\n' "$suite" > build/poc/latest-framework.txt
