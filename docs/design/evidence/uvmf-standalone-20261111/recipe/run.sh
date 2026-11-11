#!/usr/bin/env bash
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
experiment=$(cd -- "${1:?Usage: run.sh OUTPUT NAME SEED [out|fault|regenerated]}" && pwd)
name=${2:?Run name required}
seed=${3:?Seed required}
variant=${4:-out}
[[ $name =~ ^[a-zA-Z0-9_-]+$ && $seed =~ ^[0-9]+$ ]] || exit 2
[[ $variant == out || $variant == fault || $variant == regenerated ]] || exit 2
run="$experiment/runs/$name"
[[ ! -e "$run" ]] || { printf 'Run directory already exists: %s\n' "$run" >&2; exit 2; }
mkdir -p "$run"
cd "$run"
sha256sum "$experiment/$variant/simv" "$experiment/$variant/simv.daidir/"*.so > artifacts-before.sha256
command=(timeout 60 "$experiment/$variant/simv" +UVM_TESTNAME=test_top +ntb_random_seed="$seed" +UVM_VERBOSITY=UVM_HIGH -l run.log)
printf '%q ' "${command[@]}" > run-command.txt
printf '\n' >> run-command.txt
set +e
"${command[@]}" > console.log 2>&1
result=$?
set -e
printf '%s\n' "$result" > raw-exit-code.txt
sha256sum -c artifacts-before.sha256 > artifacts-check.txt
exit "$result"
