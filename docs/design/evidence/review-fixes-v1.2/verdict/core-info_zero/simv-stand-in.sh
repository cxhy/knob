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
