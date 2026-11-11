#!/usr/bin/env bash
set -euo pipefail
knob_deploy_script=${BASH_SOURCE[0]}
if [[ $knob_deploy_script == */* ]]; then
  knob_deploy_directory=${knob_deploy_script%/*}
else
  knob_deploy_directory=.
fi
repo=$(cd -- "$knob_deploy_directory/.." && pwd)
if ! command -v node >/dev/null 2>&1; then
  printf 'Deployment requires Node.js 20 or newer on PATH.\n' >&2
  exit 1
fi
exec node "$repo/scripts/deploy-shared-deps.mjs" "$@"
