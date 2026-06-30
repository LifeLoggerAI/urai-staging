#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: scripts/run-with-java.sh <command...>" >&2
  exit 2
fi

if command -v nix-shell >/dev/null 2>&1; then
  echo "[URAI staging] Running with nix-shell Java environment."
  nix-shell -p adoptopenjdk-bin --run "$*"
  exit $?
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Java is required for Firebase emulator tests." >&2
  echo "Install Java 17+, or run inside Firebase Studio/IDX where .idx/dev.nix provides openjdk17." >&2
  exit 1
fi

echo "[URAI staging] Running with existing Java: $(java -version 2>&1 | head -n 1)"
"$@"
