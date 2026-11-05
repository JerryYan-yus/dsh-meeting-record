#!/bin/bash
# macOS Finder-friendly wrapper: double-click after allowing execution.
cd -- "$(dirname -- "$0")" || exit 1
bash ./install.sh "$@"
status=$?
echo
read -n 1 -s -r -p "按任意键关闭窗口…"
echo
exit $status
