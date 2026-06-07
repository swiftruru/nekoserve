"""
Read output/results.csv, pick the best scenario per BEST_RULES,
draw two bar charts, and produce a self-contained HTML report
that auto-opens in the default browser.

All maths is deterministic numeric tidying. No network, no AI.
"""

from __future__ import annotations

import argparse
import base64
import csv
import io
import os
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")  # no GUI; we render to PNG and embed.
import matplotlib.pyplot as plt  # noqa: E402

# Use a Chinese-capable sans-serif font for the chart labels. macOS
# ships PingFang / Heiti; we list a few common names so the report
# still renders if the demo machine prefers a different font. The
# unicode_minus=False line keeps `-` from rendering as a tofu box.
matplotlib.rcParams["font.sans-serif"] = [
    "PingFang TC", "Heiti TC", "Apple LiGothic", "Microsoft JhengHei",
    "Arial Unicode MS", "sans-serif",
]
matplotlib.rcParams["axes.unicode_minus"] = False

HERE = Path(__file__).resolve().parent
RESULTS_CSV = HERE / "output" / "results.csv"

# ── Best-scenario rule ─────────────────────────────────────────
#
# Each rule is (filter_expression, metric, "min" or "max").
# The example demo brief was: "of the scenarios where staffCount <= 3,
# the one with the shortest avgWaitForSeat wins."
#
# Filter expression is a Python boolean using the column names in
# results.csv. Change here, rerun report.py, the table re-highlights.
BEST_RULES: list[tuple[str, str, str]] = [
    ("staffCount <= 3", "avgWaitForSeat", "min"),
]

# ── KPI columns to show in the table, in display order ────────
KPI_COLS = [
    "avgWaitForSeat",
    "avgWaitForOrder",
    "avgTotalStayTime",
    "abandonRate",
    "totalCustomersServed",
    "seatUtilization",
    "staffUtilization",
    "catUtilization",
    "customerSatisfactionScore",
    "catWelfareScore",
]
KPI_LABEL_ZH = {
    "avgWaitForSeat":            "平均等位 (分)",
    "avgWaitForOrder":           "平均等餐 (分)",
    "avgTotalStayTime":          "平均停留 (分)",
    "abandonRate":               "放棄率",
    "totalCustomersServed":      "完成服務",
    "seatUtilization":           "座位利用率",
    "staffUtilization":          "店員利用率",
    "catUtilization":            "貓咪利用率",
    "customerSatisfactionScore": "顧客滿意度",
    "catWelfareScore":           "貓福祉",
}

HIGHLIGHT_COLOR = "#ffe9b8"
BAR_COLOR = "#FFA94D"
BEST_BAR_COLOR = "#16a34a"


def load_results(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        raise SystemExit(f"results file missing: {path}; run bot.py first")
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise SystemExit(f"{path} has no rows yet")
    return rows


def coerce(rows: list[dict[str, str]]) -> list[dict[str, object]]:
    """Turn the CSV strings into typed values where it matters.
    Keep status / scenario_id as strings; coerce numeric columns to
    float (or None if blank / unparseable so the report still renders)."""
    typed: list[dict[str, object]] = []
    for r in rows:
        out: dict[str, object] = dict(r)
        for k in ("catCount", "staffCount", *KPI_COLS):
            v = r.get(k, "")
            try:
                out[k] = float(v) if v != "" else None
            except ValueError:
                out[k] = None
        typed.append(out)
    return typed


def apply_filter(rows: list[dict[str, object]], expr: str) -> list[dict[str, object]]:
    """Evaluate the boolean expression against each row. `expr` may
    reference any results.csv column by name. Safe-ish because we
    only pass the row dict as locals -- no builtins."""
    keep: list[dict[str, object]] = []
    for r in rows:
        try:
            if eval(expr, {"__builtins__": {}}, r):
                keep.append(r)
        except Exception:
            continue
    return keep


def pick_best(rows: list[dict[str, object]]) -> dict[str, object] | None:
    """Run BEST_RULES in order, return the first scenario that wins.

    Each rule is independent; later rules act as tie-breakers if the
    first leaves multiple winners (rare). For the demo brief, the
    first rule alone is enough.
    """
    candidates = [r for r in rows if r.get("status") == "ok"]
    if not candidates:
        return None
    for filt, metric, direction in BEST_RULES:
        filtered = apply_filter(candidates, filt)
        if not filtered:
            continue
        keyfn = lambda r: (r.get(metric) if r.get(metric) is not None else float("inf"))
        if direction == "max":
            filtered.sort(key=keyfn, reverse=True)
        else:
            filtered.sort(key=keyfn)
        return filtered[0]
    return None


def scenario_label(row: dict[str, object]) -> str:
    """Turn a row into a human-readable Chinese label like '2貓 × 2店員'.

    The scenario_id (`cats2_staff2`) is the technical key used by the
    bot / CSV; the label is what the viewer of the report should see.
    """
    cat = row.get("catCount")
    staff = row.get("staffCount")
    cat_s = str(int(cat)) if isinstance(cat, (int, float)) else str(cat or "?")
    staff_s = str(int(staff)) if isinstance(staff, (int, float)) else str(staff or "?")
    return f"{cat_s}貓 × {staff_s}店員"


def bar_chart_png(
    rows: list[dict[str, object]],
    metric: str,
    title: str,
    xlabel: str,
    *,
    best_id: str | None,
) -> str:
    """Render a horizontal bar chart of one metric across scenarios,
    return a base64-encoded PNG ready for `<img src="data:...">`."""
    ok_rows = [r for r in rows if r.get("status") == "ok"]
    ok_rows.sort(key=lambda r: r["scenario_id"])  # type: ignore[arg-type]
    labels = [scenario_label(r) for r in ok_rows]
    values = [r.get(metric) or 0.0 for r in ok_rows]
    colors = [
        BEST_BAR_COLOR if r["scenario_id"] == best_id else BAR_COLOR
        for r in ok_rows
    ]
    fig, ax = plt.subplots(figsize=(7.5, max(2.4, 0.36 * len(labels))))
    bars = ax.barh(labels, values, color=colors, edgecolor="#333", linewidth=0.5)
    ax.set_title(title, fontsize=12)
    ax.set_xlabel(xlabel)
    ax.invert_yaxis()
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    # Value labels at the end of each bar.
    for bar, v in zip(bars, values):
        ax.text(
            bar.get_width(), bar.get_y() + bar.get_height() / 2,
            f" {v:.3g}", va="center", fontsize=9,
        )
    fig.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=140)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def fmt(v: object) -> str:
    if v is None:
        return ""
    if isinstance(v, float):
        if abs(v) >= 100:
            return f"{v:.1f}"
        return f"{v:.3f}".rstrip("0").rstrip(".")
    return str(v)


def render_html(
    rows: list[dict[str, object]],
    best: dict[str, object] | None,
    chart_b64_wait: str,
    chart_b64_util: str,
) -> str:
    generated = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    best_id = best["scenario_id"] if best else None
    rule_summary = "; ".join(
        f"{filt} → {direction} {metric}" for filt, metric, direction in BEST_RULES
    )

    # Header cells
    th_cells = "".join(
        f'<th>{KPI_LABEL_ZH.get(c, c)}</th>' for c in KPI_COLS
    )

    # Body rows
    body_rows = []
    rows_sorted = sorted(rows, key=lambda r: r["scenario_id"])  # type: ignore[arg-type]
    for r in rows_sorted:
        is_best = r["scenario_id"] == best_id
        row_style = f' style="background:{HIGHLIGHT_COLOR}"' if is_best else ""
        status_badge = (
            '<span class="badge ok">ok</span>'
            if r.get("status") == "ok"
            else '<span class="badge fail">failed</span>'
        )
        star = ' <span class="star">★</span>' if is_best else ""
        cells = "".join(f"<td>{fmt(r.get(c))}</td>" for c in KPI_COLS)
        zh_label = scenario_label(r)
        body_rows.append(
            f'<tr{row_style}>'
            f'<td class="sid">'
            f'<div>{zh_label}{star}</div>'
            f'<div class="sid-code">{r["scenario_id"]}</div>'
            f'</td>'
            f'<td>{fmt(r.get("catCount"))}</td>'
            f'<td>{fmt(r.get("staffCount"))}</td>'
            f'{cells}'
            f'<td>{status_badge}</td>'
            f'</tr>'
        )
    body = "\n".join(body_rows)

    best_summary = (
        f'<p>最佳情境：<strong>{best_id}</strong>（'
        f'catCount={fmt(best.get("catCount"))}, '
        f'staffCount={fmt(best.get("staffCount"))}, '
        f'avgWaitForSeat={fmt(best.get("avgWaitForSeat"))} 分鐘）</p>'
        if best
        else '<p>沒有符合規則的情境（可能全部 failed，或規則太嚴）</p>'
    )

    return f"""<!doctype html>
<html lang="zh-TW">
<head>
<meta charset="utf-8">
<title>NekoServe RPA 報表 - {generated}</title>
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
         margin: 24px auto; max-width: 1100px; color: #222; }}
  h1 {{ font-size: 22px; margin-bottom: 4px; }}
  .meta {{ color: #666; font-size: 13px; margin-bottom: 18px; }}
  .rule {{ background: #fff5e6; border-left: 4px solid #FFA94D; padding: 8px 12px;
          margin: 12px 0; font-size: 13px; }}
  table {{ width: 100%; border-collapse: collapse; margin: 16px 0;
          font-size: 13px; }}
  th, td {{ border: 1px solid #ddd; padding: 6px 8px; text-align: right; }}
  th {{ background: #f4f4f4; font-weight: 600; }}
  td.sid {{ text-align: left; font-weight: 600; line-height: 1.3; }}
  td.sid .sid-code {{ font-size: 10px; font-weight: 400; color: #999;
                      font-family: ui-monospace, "SF Mono", Menlo, monospace; }}
  .star {{ color: #d97706; }}
  .legend {{ background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;
             padding: 14px 18px; margin-top: 24px; font-size: 12.5px; color: #374151;
             line-height: 1.55; }}
  .legend h3 {{ font-size: 13px; margin: 0 0 8px 0; color: #1f2937;
                display: flex; align-items: center; gap: 6px; }}
  .legend dl {{ margin: 0; display: grid; grid-template-columns: max-content 1fr;
                column-gap: 12px; row-gap: 4px; }}
  .legend dt {{ font-weight: 600; color: #ea580c; }}
  .legend dd {{ margin: 0; color: #4b5563; }}
  .legend + .legend {{ margin-top: 12px; }}
  .badge {{ display: inline-block; padding: 2px 8px; border-radius: 10px;
           font-size: 11px; font-weight: 600; }}
  .badge.ok {{ background: #d1fae5; color: #065f46; }}
  .badge.fail {{ background: #fee2e2; color: #991b1b; }}
  .charts {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
             margin-top: 20px; }}
  .charts img {{ width: 100%; border: 1px solid #eee; border-radius: 4px;
                 background: white; }}
  footer {{ color: #888; font-size: 11px; margin-top: 32px;
            border-top: 1px solid #eee; padding-top: 10px; }}
</style>
</head>
<body>
<h1>NekoServe RPA 情境比較報表</h1>
<div class="meta">產生時間：{generated} ｜ 共 {len(rows)} 組情境</div>
<div class="rule">最佳情境規則：{rule_summary}</div>
{best_summary}
<table>
<thead>
<tr><th>scenario_id</th><th>catCount</th><th>staffCount</th>{th_cells}<th>status</th></tr>
</thead>
<tbody>
{body}
</tbody>
</table>
<div class="charts">
<div><img src="data:image/png;base64,{chart_b64_wait}" alt="各情境的平均等位時間（分鐘）"></div>
<div><img src="data:image/png;base64,{chart_b64_util}" alt="各情境的店員利用率"></div>
</div>

<div class="legend">
<h3>📖 怎麼讀這份報表</h3>
<dl>
<dt>情境代碼</dt>
<dd><code>cats<i>N</i>_staff<i>M</i></code> 代表「<i>N</i> 隻貓 × <i>M</i> 名店員」的組合。例如 <code>cats3_staff2</code> = 3 貓 × 2 店員。表格與圖表都同時顯示中文名稱與代碼。</dd>
<dt>橘色長條</dt>
<dd>各情境在該指標的數值，由 NekoServe 模擬器跑出。橫軸長度等比例。</dd>
<dt>綠色長條</dt>
<dd>依本次規則挑出來的最佳情境（同時在表格中以淡黃色橫線標示）。</dd>
<dt>規則</dt>
<dd>本次的最佳定義為「{rule_summary}」，可以在 <code>report.py</code> 開頭的 <code>BEST_RULES</code> 改。</dd>
</dl>
</div>

<div class="legend">
<h3>📊 表格欄位意思</h3>
<dl>
<dt>平均等位（分）</dt>
<dd>顧客從進門到坐下的平均等待時間。越短越好。</dd>
<dt>平均等餐（分）</dt>
<dd>顧客點餐到拿到餐的平均時間。越短越好。</dd>
<dt>平均停留（分）</dt>
<dd>顧客從進門到離開的全長。受用餐時間與貓咪互動長度影響。</dd>
<dt>放棄率</dt>
<dd>因等太久而放棄離開的顧客比例。越低越好。</dd>
<dt>完成服務</dt>
<dd>本次模擬期間順利吃完離開的顧客人數。</dd>
<dt>座位利用率</dt>
<dd>座位平均被使用的比例（0~1）。太高代表排隊，太低代表資源浪費。</dd>
<dt>店員利用率</dt>
<dd>店員平均忙碌的比例。1 = 一直在忙、店員是瓶頸；過低 = 人力過剩。</dd>
<dt>貓咪利用率</dt>
<dd>貓咪平均跟顧客互動的比例。</dd>
<dt>顧客滿意度</dt>
<dd>NekoServe 內建的綜合滿意度（0~1）。越高越好。</dd>
<dt>貓福祉</dt>
<dd>依 Hirsch 2025 的貓行為比例計算的貓咪福利分數（0~5）。</dd>
</dl>
</div>

<footer>
本報表由 rpa/report.py 從 output/results.csv 產生。所有計算為本機決定性運算，無連網、無 AI。
</footer>
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--no-open", action="store_true",
                    help="produce the HTML but do not open browser")
    ap.add_argument("--results", default=str(RESULTS_CSV),
                    help="path to results.csv (defaults to output/results.csv)")
    args = ap.parse_args()

    rows_raw = load_results(Path(args.results))
    rows = coerce(rows_raw)
    best = pick_best(rows)

    best_id = best["scenario_id"] if best else None  # type: ignore[index]
    chart_wait = bar_chart_png(
        rows, "avgWaitForSeat",
        title="各情境的平均等位時間（分鐘）",
        xlabel="平均等位時間（分鐘）",
        best_id=best_id,
    )
    chart_util = bar_chart_png(
        rows, "staffUtilization",
        title="各情境的店員利用率",
        xlabel="店員利用率（0 ~ 1）",
        best_id=best_id,
    )
    html = render_html(rows, best, chart_wait, chart_util)

    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out_path = HERE / "output" / f"report-{ts}.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"Report: {out_path}")

    if not args.no_open:
        url = "file://" + os.path.abspath(out_path)
        webbrowser.open(url)
    return 0


if __name__ == "__main__":
    sys.exit(main())
