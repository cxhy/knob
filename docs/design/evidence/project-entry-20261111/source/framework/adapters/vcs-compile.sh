#!/usr/bin/env bash
set -eo pipefail
environment=$1
compiler=$2
build=$3
filelist=$4
shift 4
source "$environment"
set -u
cd "$build"
"$compiler" -full64 -sverilog -ntb_opts uvm-1.2 -timescale=1ns/1ps -f "$filelist" "$@" -o "$build/simv" -l compile.log
