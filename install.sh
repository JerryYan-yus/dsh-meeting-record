#!/usr/bin/env bash
# One-click installer for macOS / Linux.
# Usage: ./install.sh [--profile <name>] [--dry-run]
set -euo pipefail

DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$DIR/scripts/install.mjs"

run_with_node() {
  if command -v node >/dev/null 2>&1; then
    exec node "$SCRIPT" "$@"
  fi
  if [ -n "${DSH_NODE:-}" ] && [ -x "${DSH_NODE}" ]; then
    exec "${DSH_NODE}" "$SCRIPT" "$@"
  fi

  # Use the DeepSeek Harness Electron binary as Node when no system Node exists.
  local candidates=()
  if [ "$(uname -s)" = "Darwin" ]; then
    candidates=(
      "/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
      "$HOME/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness"
    )
  else
    candidates=(
      "/opt/DeepSeek Harness/deepseek-harness"
      "/opt/DeepSeek Harness/DeepSeek Harness"
      "/opt/deepseek-harness/deepseek-harness"
      "/usr/bin/deepseek-harness"
    )
  fi
  for bin in "${candidates[@]}"; do
    if [ -x "$bin" ]; then
      export ELECTRON_RUN_AS_NODE=1
      exec "$bin" --expose-internals "$SCRIPT" "$@"
    fi
  done

  echo "安装失败：没有找到 node，也没有找到 DeepSeek Harness 可执行文件。" >&2
  echo "请先安装 Node.js，或设置 DSH_NODE=/path/to/node 后重试。" >&2
  exit 1
}

run_with_node "$@"
