#!/usr/bin/env bash
# Host-owned entry: no installation-specific paths or project scripts.
# Usage: VCS=/path/to/vcs bash compile.sh KNOB_ROOT BUILD_DIRECTORY
set -euo pipefail
[[ $# -eq 2 ]] || { printf 'Usage: %s KNOB_ROOT BUILD_DIRECTORY\n' "$0" >&2; exit 2; }
knob_root=$(realpath -e -- "$1")
host_root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mkdir -p "$2"
build=$(realpath -e -- "$2")
compiler=${VCS:-vcs}
cd "$build"
command=("$compiler" -full64 -sverilog -ntb_opts uvm-1.2 -timescale=1ns/1ps
         -F "$knob_root/knob.f" "$host_root/tb.sv" -top host_tb -o "$build/simv" -l "$build/compile.log")
printf '%q ' "${command[@]}" > compile-command.txt
printf '\n' >> compile-command.txt
if ! "${command[@]}" > compile-console.log 2>&1; then tail -50 compile-console.log; exit 1; fi
sha256sum "$build/simv" "$build"/simv.daidir/*.so > artifacts.sha256
sha256sum "$knob_root/knob.f" "$knob_root/src/knob_pkg.sv" "$host_root/tb.sv" > sources.sha256
printf 'Compiled independent host: %s\n' "$build"
