#!/usr/bin/env bash
# Reproduce the reviewed shell verdict bug with a script stand-in, not VCS.
set -euo pipefail
repo=$(realpath -e -- "${1:?Usage: bash reproduce-negative-verdict.sh REPO}")
snapshot=a9398e094b559f14d25396526ea7eeb7c0e43715
fixture=$(mktemp -d /tmp/knob-review-verdict-XXXXXXXX)
mkdir -p "$fixture/scripts" "$fixture/build/poc" "$fixture/suite"
git -C "$repo" show "$snapshot:scripts/run.sh" > "$fixture/scripts/run.sh"
git -C "$repo" show "$snapshot:scripts/test.sh" | sed -n '/^run_case() {/,/^}/p' > "$fixture/core-function.sh"
git -C "$repo" show "$snapshot:scripts/test-framework.sh" | sed -n '/^run_case() {/,/^}/p' > "$fixture/framework-function.sh"
cat > "$fixture/build/poc/simv" <<'STUB'
#!/usr/bin/env bash
printf 'UVM_WARNING @ 0: reporter [KNOB_STATE] expected ID only; no fatal\n'
exit 124
STUB
chmod +x "$fixture/build/poc/simv"
sha256sum "$fixture/build/poc/simv" > "$fixture/build/poc/artifacts.sha256"
cd "$fixture"
suite="$fixture/suite"
cases=0
source "$fixture/core-function.sh"
run_case core_negative KNOB_STATE knob_demo_test +ntb_random_seed=12345 </dev/null
source "$fixture/framework-function.sh"
run_case framework_negative knob_demo_test KNOB_STATE </dev/null
[[ $(cat "$suite/core_negative/process-status.txt") -eq 124 ]]
[[ $(cat "$suite/framework_negative/process-status.txt") -eq 124 ]]
printf 'Both reviewed verdict functions printed PASS despite raw=124 and warning-only diagnostics.\n'
cat "$suite/results.tsv"
printf 'fixture=%s\n' "$fixture"
