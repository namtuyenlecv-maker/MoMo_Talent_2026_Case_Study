from __future__ import annotations

import argparse
import json
import math
import os
import re
from datetime import date, datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pandas as pd


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "Data"
OUTPUT_JSON = DATA_DIR / "dashboard.json"

METRICS_FILE = DATA_DIR / "CX_MoMo_Data_Metrics.xlsx"
INSIGHTS_FILE = DATA_DIR / "CX_MoMo_AI_Insights.xlsx"
DEEPDIVE_FILE = DATA_DIR / "Export_For_AI_DeepDive.csv"


def _clean_value(value: Any) -> Any:
    if pd.isna(value):
        return None
    if isinstance(value, (datetime, date, pd.Timestamp)):
        return value.isoformat()
    if hasattr(value, "item"):
        return value.item()
    return value


def records(df: pd.DataFrame, limit: int | None = None) -> list[dict[str, Any]]:
    if limit is not None:
        df = df.head(limit)
    return [
        {str(col): _clean_value(value) for col, value in row.items()}
        for row in df.to_dict(orient="records")
    ]


def fmt_topic_group(summary: pd.DataFrame) -> pd.DataFrame:
    summary = summary.copy()
    if summary.empty:
        summary["topic_group"] = []
        return summary

    top_priority = summary.nlargest(2, "priority_score_new")["topic_label"].tolist()
    low_pain = summary.nsmallest(2, "avg_pain_score")["topic_label"].tolist()
    high_volume = summary.nlargest(4, "total_feedback")["topic_label"].tolist()
    build_group = [topic for topic in low_pain if topic in high_volume]

    def classify(row: pd.Series) -> str:
        if row["topic_label"] in top_priority:
            return "Nhóm rủi ro cao"
        if row["topic_label"] in build_group:
            return "Nhóm xây dựng"
        return "Nhóm thông thường"

    summary["topic_group"] = summary.apply(classify, axis=1)
    return summary


def compute_ai_summary(detail: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    neg_patterns = [
        r"lag|giật",
        r"chậm",
        r"lỗi|treo",
        r"không được",
        r"phiền",
        r"đe dọa",
        r"tín dụng đen|tiêu cực",
        r"bức xúc",
        r"lừa đảo",
        r"mất tiền|trừ tiền",
        r"phí cao",
        r"bị từ chối",
    ]
    urg_patterns = [
        r"liên tục|nhiều lần|gọi hoài|spam",
        r"chưa đến hạn|chưa tới hạn|chưa quá hạn",
        r"người thân|danh bạ",
        r"khiếu nại|báo công an|kiện|khẩn cấp|cần gấp",
    ]

    def score_row(text: Any) -> tuple[float, float]:
        if pd.isna(text):
            return 0.0, 0.0
        lowered = str(text).lower()
        neg_weight = sum(1 for pattern in neg_patterns if re.search(pattern, lowered))
        urg_weight = sum(1 for pattern in urg_patterns if re.search(pattern, lowered))
        neg_score = 1 - math.exp(-neg_weight / 2.5)
        urg_score = 1 - math.exp(-urg_weight / 2.0)
        return neg_score, urg_score

    scored = detail.copy()
    scores = scored["content_masked"].apply(score_row)
    scored["neg_score"] = scores.apply(lambda pair: pair[0])
    scored["urg_score"] = scores.apply(lambda pair: pair[1])
    scored["pain_score_new"] = 0.65 * scored["neg_score"] + 0.35 * scored["urg_score"]

    summary = scored.groupby("topic_label", as_index=False).agg(
        total_feedback=("suggestion_id", "count"),
        avg_pain_score=("pain_score_new", "mean"),
    )
    max_volume = summary["total_feedback"].max() or 1
    max_pain = summary["avg_pain_score"].max() or 1
    summary["vol_index"] = summary["total_feedback"] / max_volume * 100
    summary["pain_index"] = summary["avg_pain_score"] / max_pain * 100
    summary["priority_score_new"] = summary["vol_index"] * 0.4 + summary["pain_index"] * 0.6
    summary = fmt_topic_group(summary)
    return summary.sort_values("priority_score_new", ascending=False), scored


def load_workbook(path: Path) -> dict[str, pd.DataFrame]:
    if not path.exists():
        raise FileNotFoundError(f"Không tìm thấy file dữ liệu: {path}")
    workbook = pd.ExcelFile(path)
    return {sheet: workbook.parse(sheet) for sheet in workbook.sheet_names}


def make_dashboard_data() -> dict[str, Any]:
    metrics = load_workbook(METRICS_FILE)
    insights = load_workbook(INSIGHTS_FILE)

    quality = metrics["Data_Quality"]
    master = metrics["Master_Data_Cleaned"]
    weekly = metrics["Weekly_SLA_Summary"].sort_values("Created_week")
    weekly_service = metrics["Weekly_Service_SLA"].sort_values(["Created_week", "Level"])
    kpi = metrics["Overall_KPI"]
    agents = metrics["Agent_Performance"].sort_values("SLA_On_Time_Rate", ascending=False)
    services = metrics["Service_Delay_Summary"].sort_values("Priority_Score", ascending=False)
    delay_buckets = metrics["Delay_Bucket_Summary"].sort_values("Total_ticket", ascending=False)
    top_late = metrics["Top_Late_Tickets"].sort_values("Delay_Minutes", ascending=False)
    ai_topics_raw = insights["Tong_Hop_Chu_De"].sort_values("priority_score", ascending=False)
    ai_detail = insights["Chi_Tiet_Phan_Hoi"]

    ai_summary, ai_scored = compute_ai_summary(ai_detail)

    detail_source = ai_scored
    pain_column = "pain_score_new"
    if DEEPDIVE_FILE.exists():
        deep_dive = pd.read_csv(DEEPDIVE_FILE)
        detail_source = deep_dive
        pain_column = "pain_score_new" if "pain_score_new" in detail_source.columns else "pain_score"

    deep_clusters = (
        detail_source.groupby("topic_label", as_index=False)
        .agg(total_feedback=("suggestion_id", "count"), avg_pain_score=(pain_column, "mean"))
        .sort_values("avg_pain_score", ascending=False)
    )

    cluster_cards: list[dict[str, Any]] = []
    for _, row in deep_clusters.iterrows():
        topic = row["topic_label"]
        cluster_rows = detail_source[detail_source["topic_label"] == topic].copy()
        cluster_rows = cluster_rows.sort_values(pain_column, ascending=False)
        quote_rows = cluster_rows[["suggestion_id", "content_masked", pain_column]].head(4)
        sample_rows = cluster_rows[["suggestion_id", "content_masked", pain_column]].sample(
            min(5, len(cluster_rows)), random_state=42
        )
        cluster_cards.append(
            {
                "topic_label": topic,
                "total_feedback": int(row["total_feedback"]),
                "avg_pain_score": float(row["avg_pain_score"]),
                "quotes": records(quote_rows),
                "samples": records(sample_rows),
            }
        )

    by_weekday = (
        master.groupby("Created_weekday", as_index=False)
        .agg(Total_ticket=("Ticket_id", "count"), Late_ticket=("Is_Late", "sum"))
    )
    weekday_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    by_weekday["order"] = by_weekday["Created_weekday"].map({day: i for i, day in enumerate(weekday_order)})
    by_weekday = by_weekday.sort_values("order").drop(columns=["order"])

    top_service_names = services.head(10)["Level"].tolist()
    weekly_service_top = weekly_service[weekly_service["Level"].isin(top_service_names)]

    kpi_dict = {str(row["Metric"]): _clean_value(row["Value"]) for _, row in kpi.iterrows()}
    total_tickets = float(kpi_dict.get("Total_ticket") or 0)
    kpi_dict["Avg_ticket_per_week"] = total_tickets / max(len(weekly), 1)
    kpi_dict["Peak_week"] = weekly.loc[weekly["Total_ticket"].idxmax(), "Created_week"]
    kpi_dict["Worst_sla_week"] = weekly.loc[weekly["SLA_On_Time_Rate"].idxmin(), "Created_week"]
    kpi_dict["Worst_sla_rate"] = float(weekly["SLA_On_Time_Rate"].min())

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source_files": {
            "metrics": METRICS_FILE.name,
            "insights": INSIGHTS_FILE.name,
            "deep_dive": DEEPDIVE_FILE.name if DEEPDIVE_FILE.exists() else None,
        },
        "kpi": kpi_dict,
        "weekly": records(weekly),
        "weekly_service": records(weekly_service_top),
        "services": records(services),
        "delay_buckets": records(delay_buckets),
        "agents": records(agents),
        "top_late": records(top_late, 20),
        "weekday": records(by_weekday),
        "ai_topics_original": records(ai_topics_raw),
        "ai_topics": records(ai_summary),
        "voc": records(
            ai_scored.sort_values("pain_score_new", ascending=False)[
                ["suggestion_id", "topic_label", "content_masked", "pain_score_new"]
            ],
            8,
        ),
        "deep_clusters": cluster_cards,
        "data_quality": records(quality),
    }


def build() -> None:
    DATA_DIR.mkdir(exist_ok=True)
    dashboard_data = make_dashboard_data()
    OUTPUT_JSON.write_text(
        json.dumps(dashboard_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Generated {OUTPUT_JSON.relative_to(ROOT)}")


class DashboardHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def serve(host: str, port: int) -> None:
    os.chdir(ROOT)
    build()
    server = ThreadingHTTPServer((host, port), DashboardHandler)
    print(f"MoMo CX dashboard: http://{host}:{port}/")
    print("Nhấn Ctrl+C để dừng server.")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Build and serve the MoMo CX static dashboard.")
    parser.add_argument("--build", action="store_true", help="Chỉ tạo Data/dashboard.json.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8501)
    args = parser.parse_args()

    if args.build:
        build()
        return
    serve(args.host, args.port)


if __name__ == "__main__":
    main()
