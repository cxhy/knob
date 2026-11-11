#!/usr/bin/env bash
# Exercise the real regression CLIs with recorded VCS output and a simulator stand-in.
# This checks shell verdicts only; it is not VCS functional evidence.
set -euo pipefail
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
mkdir -p "$root/runs" "$root/build/review-fixes"
suite=$(mktemp -d "$root/runs/verdict-XXXXXXXX")
printf 'suite\tmode\texpected\taccepted\tcli_status\n' > "$suite/results.tsv"
failures=0
for group in core interfaces; do
  for mode in warning_timeout warning_zero info_zero wrong_fatal fatal_message_id fatal_timeout fatal_crash fatal_zero; do
    fixture="$suite/$group-$mode"
    mkdir -p "$fixture/scripts" "$fixture/build/poc" "$fixture/examples/minimal"
    cp "$root/scripts/run.sh" "$fixture/scripts/"
    if [[ $group == core ]]; then script=test.sh; target=missing; id=KNOB_FILE
    else script=test-framework.sh; target=duplicate_bind; id=KNOB_REGISTER; fi
    cp "$root/scripts/$script" "$fixture/scripts/"
    cp "$root/examples/minimal/knob.cfg" "$fixture/examples/minimal/"
    cat > "$fixture/build/poc/simv" <<'STUB'
#!/usr/bin/env bash
set -euo pipefail
name=${PWD##*/}
if [[ $name == "$VERDICT_TARGET" ]]; then
  case "$VERDICT_MODE" in
    warning_timeout|warning_zero)
      printf 'UVM_WARNING @ 0: reporter [%s] expected ID only; no fatal\n' "$VERDICT_ID" ;;
    info_zero) printf 'UVM_INFO @ 0: reporter [%s] not fatal\n' "$VERDICT_ID" ;;
    wrong_fatal) printf 'UVM_FATAL @ 0: reporter [OTHER] wrong diagnostic\n' ;;
    fatal_message_id) printf 'UVM_FATAL @ 0: reporter [OTHER] message mentions [%s]\n' "$VERDICT_ID" ;;
    *) printf 'UVM_FATAL @ 0: reporter [%s] expected failure\n' "$VERDICT_ID" ;;
  esac
  case "$VERDICT_MODE" in
    warning_timeout|fatal_timeout) exit 124 ;;
    fatal_crash) exit 139 ;;
    *) exit 0 ;;
  esac
fi
# Replay real successful startup cases preceding the chosen negative case.
case "$name" in
  config_a|replay|other_seed|config_b|defaults|hex_min_crlf|max_value|negative_seed|maximum_seed|schema_values|schema_defaults)
    cat "$VERDICT_RECORDINGS/$name/simulation.log" ;;
  *) printf 'STUB_END: target case already passed\n'; exit 90 ;;
esac
STUB
    chmod +x "$fixture/build/poc/simv"
    sha256sum "$fixture/build/poc/simv" > "$fixture/build/poc/artifacts.sha256"
    cp "$fixture/build/poc/artifacts.sha256" "$fixture/build/poc/simv.sha256"
    cp "$fixture/build/poc/artifacts.sha256" "$fixture/build/poc/sources.sha256"
    status=0
    VERDICT_TARGET="$target" VERDICT_ID="$id" VERDICT_MODE="$mode" VERDICT_RECORDINGS="$root/docs/design/evidence/framework-v1.1/$group" \
      bash "$fixture/scripts/$script" > "$fixture/cli.log" 2>&1 || status=$?
    target_dir=("$fixture"/runs/*/"$target")
    [[ ${#target_dir[@]} -eq 1 && -f "${target_dir[0]}/process-status.txt" ]] || { cat "$fixture/cli.log"; exit 2; }
    accepted=no
    if rg -q "^PASS $target$" "$fixture/cli.log"; then accepted=yes; fi
    expected=no
    if [[ $mode == fatal_zero ]]; then expected=yes; fi
    printf '%s\t%s\t%s\t%s\t%s\n' "$group" "$mode" "$expected" "$accepted" "$status" >> "$suite/results.tsv"
    if [[ $accepted != "$expected" || $status -eq 0 ]]; then
      printf 'FAIL %s %s: expected acceptance=%s, got=%s\n' "$group" "$mode" "$expected" "$accepted"
      failures=$((failures+1))
    else printf 'PASS %s %s\n' "$group" "$mode"; fi
  done
done
printf 'Evidence: %s\n' "$suite"
printf '%s\n' "$suite" > "$root/build/review-fixes/latest-verdict.txt"
[[ $failures -eq 0 ]]
printf 'PASS 16 shell verdict scenarios (simulator stand-in, no VCS)\n' | tee "$suite/summary.txt"
