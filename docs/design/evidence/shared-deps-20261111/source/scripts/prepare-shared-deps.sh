#!/usr/bin/env bash
set -euo pipefail
if [[ $# != 2 ]]; then
  printf 'Usage: bash scripts/prepare-shared-deps.sh SHARED_ROOT UVMF_SOURCE\n' >&2
  exit 2
fi
repo=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
shared_root=$1
uvmf_source=$2
# The knob label must describe the actual selected release, not a dirty copy.
for file in src/knob_pkg.sv knob.f LICENSE; do
  expected=$(git -C "$repo" show "v1.2.0:$file" | sha256sum)
  actual=$(sha256sum "$repo/$file")
  [[ ${expected%% *} == "${actual%% *}" ]] || { printf 'knob v1.2.0 source mismatch: %s\n' "$file" >&2; exit 1; }
done
node "$repo/framework/bin/knob-deps.mjs" publish --root "$shared_root" --component uvmf --version 2023.4_2 --source "$uvmf_source"
node "$repo/framework/bin/knob-deps.mjs" publish --root "$shared_root" --component framework --version 0.1.0 --source "$repo/framework"
node "$repo/framework/bin/knob-deps.mjs" publish --root "$shared_root" --component knob --version 1.2.0 --source "$repo"
