#!/usr/bin/env bash
set -euo pipefail
name=${PWD##*/}
if [[ $name == "$VERDICT_TARGET" ]]; then
  printf 'UVM_WARNING @ 0: reporter [%s] expected ID only; no fatal\n' "$VERDICT_ID"
  if [[ $VERDICT_MODE == warning_timeout ]]; then exit 124; else exit 0; fi
fi
# Replay real successful startup cases preceding the chosen negative case.
case "$name" in
  config_a|replay|other_seed|config_b|defaults|hex_min_crlf|max_value|negative_seed|maximum_seed|schema_values|schema_defaults)
    cat "$VERDICT_RECORDINGS/$name/simulation.log" ;;
  *) printf 'STUB_END: target case already passed\n'; exit 90 ;;
esac
