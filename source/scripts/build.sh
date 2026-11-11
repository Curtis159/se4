#!/usr/bin/env bash
set -euo pipefail
# Usage: source /path/to/emsdk/emsdk_env.sh; bash scripts/build.sh /path/to/se4
repo_dir="$(cd -- "$(dirname -- "$0")/.." && pwd)"
install_dir="$(cd -- "${1:?Pass your extracted original SE4 folder}" && pwd)"
python3 "$repo_dir/scripts/prepare_engine_data.py" "$install_dir" "$repo_dir/private/se4"
install_dir="$repo_dir/private/se4"
command -v emcmake >/dev/null || { echo 'Activate Emscripten 4.0.19 first'; exit 1; }
cmake -S "$repo_dir" -B "$repo_dir/build-native" -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build "$repo_dir/build-native" -j "${SE4_BUILD_JOBS:-4}"
emcmake cmake -S "$repo_dir" -B "$repo_dir/build-wasm" -G Ninja -DCMAKE_BUILD_TYPE=Debug -DSE4_DATA_DIR="$install_dir"
cmake --build "$repo_dir/build-wasm" -j "${SE4_BUILD_JOBS:-4}"
(cd "$repo_dir"; node tests/engine-parity.mjs "$install_dir"; node tests/gameplay-loop.mjs; python3 scripts/package_single_html.py; node tests/offline-worker.mjs)
(cd "$repo_dir/web"; node --test tests/*.test.mjs)
