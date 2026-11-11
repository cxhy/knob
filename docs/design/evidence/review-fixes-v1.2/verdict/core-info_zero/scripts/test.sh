#!/usr/bin/env bash
# End-to-end tests against one existing VCS build. Does not invoke a compiler.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
cd "$root"
sha256sum --status -c build/poc/sources.sha256
sha256sum --status -c build/poc/simv.sha256
sha256sum --status -c build/poc/artifacts.sha256
mkdir -p "$root/runs"
suite=$(mktemp -d "$root/runs/regression-XXXXXXXX")
cp build/poc/simv.sha256 "$suite/build-before.sha256"
printf 'case\texpected\trunner_status\tsimulator_status\n' > "$suite/results.tsv"
printf 'Evidence: %s\n' "$suite"
cases=0

# Config bytes are supplied on stdin. "missing" deliberately omits the file.
run_case() {
  local name=$1 expected=$2 test_name=$3
  shift 3
  local dir="$suite/$name" status=0
  mkdir -p "$dir"
  if [[ "$name" != missing ]]; then cat > "$dir/knob.cfg"; fi
  bash scripts/run.sh "$dir" "+UVM_TESTNAME=$test_name" "$@" > "$dir/runner.log" 2>&1 || status=$?
  if [[ "$expected" == pass ]]; then
    [[ $status -eq 0 ]] || { cat "$dir/runner.log"; tail -30 "$dir/simulation.log"; exit 1; }
  else
    [[ $status -eq 1 ]] || { printf 'Unexpected runner status %s: %s\n' "$status" "$name"; exit 1; }
    [[ $(cat "$dir/process-status.txt") == 0 ]] || { printf 'Runtime error is not an expected configuration failure: %s\n' "$name"; exit 1; }
    rg -q "^UVM_FATAL .*@[^:]*: [^ ]+ \[$expected\]" "$dir/simulation.log" || { tail -30 "$dir/simulation.log"; exit 1; }
    [[ ! -s "$dir/transactions.log" ]] || { printf 'Transactions before failure: %s\n' "$name"; exit 1; }
    if rg -q '^KNOB_DEMO_PASS$' "$dir/simulation.log"; then exit 1; fi
  fi
  printf '%s\t%s\t%s\t%s\n' "$name" "$expected" "$status" "$(cat "$dir/process-status.txt")" >> "$suite/results.tsv"
  cases=$((cases+1))
  printf 'PASS %s\n' "$name"
}

run_case config_a pass knob_demo_test +ntb_random_seed=12345 < examples/minimal/knob.cfg
run_case replay pass knob_demo_test +ntb_random_seed=12345 < examples/minimal/knob.cfg
cmp "$suite/config_a/transactions.log" "$suite/replay/transactions.log"
cmp "$suite/config_a/effective-config.log" "$suite/replay/effective-config.log"
run_case other_seed pass knob_demo_test +ntb_random_seed=54321 < examples/minimal/knob.cfg
if cmp -s "$suite/config_a/transactions.log" "$suite/other_seed/transactions.log"; then
  printf 'Chosen distinct seeds did not exercise different traces\n'; exit 1
fi
run_case config_b pass knob_demo_test +ntb_random_seed=12345 <<'CFG'
agent0.tx.packet_count=7
agent0.tx.min_length=256
agent0.tx.max_length=256
agent1.tx.enabled=false
CFG
[[ $(rg -c '^TX scope=agent0.tx ' "$suite/config_a/transactions.log") -eq 8 ]]
[[ $(rg -c '^TX scope=agent1.tx ' "$suite/config_a/transactions.log") -eq 4 ]]
[[ $(wc -l < "$suite/config_b/transactions.log") -eq 14 ]]
awk '{if ($2 != "scope=agent0.tx" || $4 != "length=256") exit 1}' "$suite/config_b/transactions.log"
awk '{split($4,x,"="); if (x[2]%2 || ($2=="scope=agent0.tx" && (x[2]<64 || x[2]>96)) || ($2=="scope=agent1.tx" && (x[2]<128 || x[2]>160))) exit 1}' "$suite/config_a/transactions.log"
run_case defaults pass knob_demo_test +ntb_random_seed=1 </dev/null
[[ $(wc -l < "$suite/defaults/transactions.log") -eq 12 ]]
rg -q 'agent0.tx.packet_count=3 source=default' "$suite/defaults/effective-config.log"
run_case hex_min_crlf pass knob_demo_test +ntb_random_seed=12345 < <(printf '  # CRLF comment\r\nagent0.tx.packet_count = 0x2 # trailing = comment\r\nshared.unused = -0x8000000000000000\r\n')
rg -q 'shared.unused=-9223372036854775808 source=file' "$suite/hex_min_crlf/effective-config.log"
rg -q '^KNOB_UNUSED shared.unused$' "$suite/hex_min_crlf/simulation.log"
[[ $(rg -c '^TX scope=agent0.tx ' "$suite/hex_min_crlf/transactions.log") -eq 4 ]]
run_case max_value pass knob_demo_test +ntb_random_seed=12345 <<'CFG'
shared.unused=9223372036854775807
CFG
rg -q 'shared.unused=9223372036854775807 source=file' "$suite/max_value/effective-config.log"
run_case negative_seed pass knob_demo_test +ntb_random_seed=-2147483648 </dev/null
run_case maximum_seed pass knob_demo_test +ntb_random_seed=2147483647 </dev/null

run_case missing KNOB_FILE knob_demo_test +ntb_random_seed=1 </dev/null
run_case unknown KNOB_UNKNOWN knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.packte_count=1
CFG
run_case duplicate KNOB_DUPLICATE knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.packet_count=1
agent0.tx.packet_count=2
CFG
run_case overflow KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=0xffffffffffffffff
CFG
run_case underflow KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=-9223372036854775809
CFG
run_case long_number KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=99999999999999999999999999999999999999
CFG
run_case trailing_garbage KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=123junk
CFG
run_case invalid_bool KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.enabled=1
CFG
run_case range KNOB_RANGE knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.packet_count=-1
CFG
run_case syntax KNOB_SYNTAX knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.packet_count=1=2
CFG
run_case cross KNOB_CROSS knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.min_length=200
agent0.tx.max_length=100
CFG
run_case unsatisfiable KNOB_RANDOMIZE knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.min_length=65
agent0.tx.max_length=65
CFG
run_case no_seed KNOB_SEED knob_demo_test </dev/null
run_case duplicate_seed KNOB_SEED knob_demo_test +ntb_random_seed=1 +ntb_random_seed=1 </dev/null
run_case invalid_seed KNOB_SEED knob_demo_test +ntb_random_seed=abc </dev/null
run_case overflow_seed KNOB_SEED knob_demo_test +ntb_random_seed=2147483648 </dev/null
run_case early_read KNOB_STATE early_read_test +ntb_random_seed=1 </dev/null
run_case duplicate_registration KNOB_REGISTER duplicate_registration_test +ntb_random_seed=1 </dev/null
run_case late_registration KNOB_STATE late_registration_test +ntb_random_seed=1 </dev/null
run_case reload KNOB_STATE reload_test +ntb_random_seed=1 </dev/null
run_case wrong_type KNOB_TYPE wrong_type_test +ntb_random_seed=1 </dev/null

# Remaining grammar boundaries are observed at the simulator/file boundary.
for token in '+1' '1_000' "64'h1" '1+2' '0x' '-' '1 2' '0x8000000000000000'; do
  printf 'shared.unused=%s\n' "$token" > "$suite/token.cfg"
  run_case "bad_integer_$cases" KNOB_VALUE knob_demo_test +ntb_random_seed=1 < "$suite/token.cfg"
done
for line in '=1' 'shared.unused=' 'shared.unused' '1bad.key=1' 'bad..key=1' 'bad.key.=1'; do
  printf '%s\n' "$line" > "$suite/token.cfg"
  run_case "bad_syntax_$cases" KNOB_SYNTAX knob_demo_test +ntb_random_seed=1 < "$suite/token.cfg"
done
run_case bool_case KNOB_VALUE knob_demo_test +ntb_random_seed=1 <<'CFG'
agent0.tx.enabled=True
CFG
run_case key_case KNOB_UNKNOWN knob_demo_test +ntb_random_seed=1 <<'CFG'
Agent0.tx.packet_count=1
CFG
run_case comment_defaults pass knob_demo_test +ntb_random_seed=0 <<'CFG'
# A complete comment-only configuration is valid.

  # Empty lines and surrounding whitespace are ignored.
CFG
run_case decimal_min pass knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=-9223372036854775808
CFG
rg -q 'shared.unused=-9223372036854775808 source=file' "$suite/decimal_min/effective-config.log"
run_case hex_max pass knob_demo_test +ntb_random_seed=1 <<'CFG'
shared.unused=0x7fffffffffffffff
CFG
rg -q 'shared.unused=9223372036854775807 source=file' "$suite/hex_max/effective-config.log"
run_case empty_seed KNOB_SEED knob_demo_test +ntb_random_seed= </dev/null
run_case bare_seed KNOB_SEED knob_demo_test +ntb_random_seed </dev/null
run_case hex_seed KNOB_SEED knob_demo_test +ntb_random_seed=0x10 </dev/null
run_case fractional_seed KNOB_SEED knob_demo_test +ntb_random_seed=1.5 </dev/null
run_case underflow_seed KNOB_SEED knob_demo_test +ntb_random_seed=-2147483649 </dev/null
run_case invalid_default KNOB_REGISTER invalid_default_test +ntb_random_seed=1 </dev/null
run_case invalid_range KNOB_REGISTER invalid_range_test +ntb_random_seed=1 </dev/null
run_case invalid_key KNOB_REGISTER invalid_key_test +ntb_random_seed=1 </dev/null
run_case unapplied_sequence KNOB_APPLY unapplied_sequence_test +ntb_random_seed=1 </dev/null

sha256sum "$root/build/poc/simv" > "$suite/build-after.sha256"
cmp "$suite/build-before.sha256" "$suite/build-after.sha256"
sha256sum --status -c build/poc/sources.sha256
sha256sum --status -c build/poc/artifacts.sha256
printf 'PASS %s cases; same binary; replay identical; configuration behavior checked\n' "$cases" | tee "$suite/summary.txt"
printf '%s\n' "$suite" > "$root/build/poc/latest-regression.txt"
