#!/usr/bin/env bash
set -eo pipefail
source /home/guodz/install_vcs/vcs_env.sh
set -u
experiment=$(cd -- "${1:?Usage: compile.sh OUTPUT [out|fault|regenerated]}" && pwd)
variant=${2:-out}
[[ $variant == out || $variant == fault || $variant == regenerated ]] || exit 2
build="$experiment/$variant"
filelist="$experiment/sources.f"
[[ $variant != fault ]] || filelist="$experiment/fault.f"
mkdir -p "$build"
cd "$build"
command=(/home/guodz/install_vcs/bin/vcs -full64 -sverilog -ntb_opts uvm-1.2 -timescale=1ns/1ps -f "$filelist" -top hdl_top -top hvl_top -o "$build/simv" -l "$build/compile.log")
printf '%q ' "${command[@]}" > compile-command.txt
printf '\n' >> compile-command.txt
"${command[@]}" > compile-console.log 2>&1
