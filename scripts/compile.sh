#!/usr/bin/env bash
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
if [[ ${1:-minimal} == host ]]; then
  VCS=/home/guodz/install_vcs/bin/vcs bash "$root/examples/host/compile.sh" "$root" "$root/build/host"
  exit
fi
if [[ ${1:-minimal} == host-isolated ]]; then
  isolated="$root/build/host-isolated"
  mkdir -p "$isolated/vendor/knob/src" "$isolated/consumer"
  cp "$root/knob.f" "$isolated/vendor/knob/"
  cp "$root/src/knob_pkg.sv" "$isolated/vendor/knob/src/"
  cp "$root/examples/host/"* "$isolated/consumer/"
  VCS=/home/guodz/install_vcs/bin/vcs bash "$isolated/consumer/compile.sh" "$isolated/vendor/knob" "$isolated/out"
  exit
fi
[[ ${1:-minimal} == minimal ]] || { printf 'Unknown compile target\n' >&2; exit 2; }
build="$root/build/poc"
mkdir -p "$build"
cd "$build"
command=(/home/guodz/install_vcs/bin/vcs -full64 -sverilog -ntb_opts uvm-1.2
         -timescale=1ns/1ps -F "$root/knob.f" "$root/examples/minimal/tb.sv"
         -top tb -o "$build/simv" -l "$build/compile.log")
printf '%q ' "${command[@]}" > compile-command.txt
printf '\n' >> compile-command.txt
if ! "${command[@]}" > "$build/compile-console.log" 2>&1; then
  tail -60 "$build/compile-console.log"
  exit 1
fi
sha256sum "$build/simv" > "$build/simv.sha256"
sha256sum "$build/simv" "$build"/simv.daidir/*.so > "$build/artifacts.sha256"
sha256sum "$root/knob.f" "$root/src/knob_pkg.sv" "$root/examples/minimal/tb.sv" > "$build/sources.sha256"
printf 'Compiled: %s\n' "$build/simv"
