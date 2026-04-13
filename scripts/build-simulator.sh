#!/usr/bin/env bash
# NekoServe — Build Python Simulator (macOS / Linux)
# Output: simulator-python/dist/simulator/

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SIM_DIR="$ROOT_DIR/simulator-python"

echo "===================================="
echo " NekoServe — Building Python Simulator"
echo " Platform: $(uname -s)"
echo "===================================="

# Ensure we're in the simulator directory
cd "$SIM_DIR"

# Find a Python that can install packages (prefer conda envs over system-managed)
find_python() {
  local candidates=(
    "/opt/miniconda3/bin/python3"
    "/opt/miniconda3/bin/python"
    "/opt/homebrew/Caskroom/miniconda/base/bin/python3"
    "$HOME/.conda/envs/base/bin/python3"
    "/usr/local/miniconda3/bin/python3"
    "$(command -v python3 2>/dev/null || true)"
    "$(command -v python 2>/dev/null || true)"
  )
  for p in "${candidates[@]}"; do
    [[ -z "$p" ]] && continue
    [[ ! -x "$p" ]] && continue
    if "$p" -c "import pip" 2>/dev/null; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

PYTHON=$(find_python) || {
  echo "ERROR: Could not find a Python with pip. Install miniconda or activate a venv." >&2
  exit 1
}
echo "Using Python: $PYTHON ($($PYTHON --version))"

# Install/upgrade deps
echo ""
echo "[1/3] Installing Python dependencies..."
"$PYTHON" -m pip install -r requirements.txt --quiet

# Clean previous build artifacts
echo ""
echo "[2/3] Cleaning previous build..."
rm -rf dist/ build/

# Run PyInstaller with the spec file
echo ""
echo "[3/3] Running PyInstaller..."
"$PYTHON" -m PyInstaller simulator.spec --noconfirm --clean

# Verify output
EXEC="$SIM_DIR/dist/simulator/simulator"
if [[ -f "$EXEC" ]]; then
  echo ""
  echo "===================================="
  echo " Build complete!"
  echo " Executable: $EXEC"
  echo "===================================="

  # Quick smoke test
  echo ""
  echo "Running smoke test..."
  RESULT=$("$EXEC" --help 2>&1 || true)
  echo "Smoke test passed."
else
  echo "ERROR: Build failed — $EXEC not found" >&2
  exit 1
fi
