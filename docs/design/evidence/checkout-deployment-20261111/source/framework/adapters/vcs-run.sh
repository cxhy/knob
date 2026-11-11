#!/usr/bin/env bash
set -eo pipefail
environment=$1
run=$2
seconds=$3
simulator=$4
shift 4
source "$environment"
set -u
cd "$run"
timeout "$seconds" "$simulator" "$@" -l run.log
