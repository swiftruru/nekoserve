"""
NekoServe Simulator — CLI Entry Point

Usage:
    # Default config, result to stdout
    python -m simulator

    # Custom JSON config file, result to stdout
    python -m simulator --config config.json

    # Custom config, result to file
    python -m simulator --config config.json --output result.json

    # Read config from stdin (Electron bridge mode)
    echo '{"seatCount": 10, ...}' | python -m simulator

Error handling:
    Exit 0  → success, JSON result on stdout
    Exit 1  → failure, JSON error on stderr: {"error": "...", "type": "..."}
"""

import argparse
import json
import sys

# Force UTF-8 on stdio so Chinese strings survive on Windows where the default
# console codepage (cp950/cp936) would otherwise mangle or fail to encode them.
for _stream in (sys.stdout, sys.stderr, sys.stdin):
    reconfigure = getattr(_stream, "reconfigure", None)
    if reconfigure is not None:
        reconfigure(encoding="utf-8")

try:
    from .core import run_simulation
    from .models import DEFAULT_CONFIG
except ImportError:
    # PyInstaller one-folder mode: runs __main__ without package context
    from simulator.core import run_simulation   # type: ignore[no-redef]
    from simulator.models import DEFAULT_CONFIG  # type: ignore[no-redef]


def _error(msg: str, error_type: str = "UNKNOWN_ERROR", code: int = 1) -> None:
    print(json.dumps({"error": msg, "type": error_type}), file=sys.stderr)
    sys.exit(code)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="NekoServe — 貓咪咖啡廳座位與服務模擬引擎"
    )
    parser.add_argument(
        "--config",
        metavar="FILE",
        help="JSON 設定檔路徑；省略則從 stdin 讀取（若 stdin 為空則使用預設值）",
    )
    parser.add_argument(
        "--output",
        metavar="FILE",
        help="模擬結果輸出路徑；省略則輸出到 stdout",
    )
    args = parser.parse_args()

    # ── Load config ────────────────────────────────────────
    config_dict: dict

    if args.config:
        try:
            with open(args.config, "r", encoding="utf-8") as f:
                config_dict = json.load(f)
        except FileNotFoundError:
            _error(f"設定檔不存在：{args.config}", "INVALID_CONFIG")
        except json.JSONDecodeError as e:
            _error(f"設定檔 JSON 解析失敗：{e}", "INVALID_CONFIG")
    elif not sys.stdin.isatty():
        # Stdin mode: used by Electron bridge
        try:
            raw = sys.stdin.read()
            config_dict = json.loads(raw) if raw.strip() else DEFAULT_CONFIG.to_dict()
        except json.JSONDecodeError as e:
            _error(f"stdin JSON 解析失敗：{e}", "INVALID_CONFIG")
    else:
        # No config source — use defaults
        config_dict = DEFAULT_CONFIG.to_dict()

    # ── Run simulation ─────────────────────────────────────
    try:
        result = run_simulation(config_dict)
    except ValueError as e:
        _error(str(e), "INVALID_CONFIG")
    except Exception as e:
        _error(f"模擬執行失敗：{e}", "SIMULATION_ERROR")

    # ── Output result ──────────────────────────────────────
    result_json = json.dumps(result, ensure_ascii=False)

    if args.output:
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(result_json)
        except OSError as e:
            _error(f"無法寫入輸出檔案：{e}", "UNKNOWN_ERROR")
    else:
        print(result_json, flush=True)

    sys.exit(0)


if __name__ == "__main__":
    main()
