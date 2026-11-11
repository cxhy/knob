#!/usr/bin/env bash
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
experiment=$(cd -- "${1:?OUTPUT}" && pwd)
name=${2:?NAME}
fixture=${3:?a|b|disabled|unknown}
shift 3
[[ $name =~ ^[a-zA-Z0-9_-]+$ ]] || exit 2
run="$experiment/runs/$name"
[[ ! -e "$run" ]] || exit 2
mkdir -p "$run"
case "$fixture" in
  a|unknown) printf 'alu.input.minimum=4\nalu.input.maximum=8\nalu.input.enabled=true\n' > "$run/knob.cfg" ;;
  b) printf 'alu.input.minimum=11\nalu.input.maximum=15\nalu.input.enabled=true\n' > "$run/knob.cfg" ;;
  disabled) printf 'alu.input.minimum=4\nalu.input.maximum=8\nalu.input.enabled=false\n' > "$run/knob.cfg" ;;
  *) exit 2 ;;
esac
if [[ $fixture == unknown ]]; then printf 'alu.input.typo=1\n' >> "$run/knob.cfg"; fi
cd "$run"
sha256sum "$experiment/out/simv" "$experiment/out/simv.daidir/"*.so > artifacts-before.sha256
command=(timeout 60 "$experiment/out/simv" +UVM_TESTNAME=test_top +UVM_VERBOSITY=UVM_HIGH "$@" -l run.log)
printf '%q ' "${command[@]}" > run-command.txt
printf '\n' >> run-command.txt
set +e
"${command[@]}" > console.log 2>&1
result=$?
set -e
printf '%s\n' "$result" > raw-exit-code.txt
sha256sum -c artifacts-before.sha256 > artifacts-check.txt
exit "$result"
