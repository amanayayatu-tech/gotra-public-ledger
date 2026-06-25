#!/usr/bin/env python3
"""Build the public-safe GOTRA ledger dataset.

Allowed sources:
- Current repository public-safe JSON: public/data/ledger.demo.json.
- amanayayatu-tech/gotra public GitHub raw docs at the locked commit below.

Forbidden sources:
- local GOTRA experiment run directories or local GOTRA experiment outputs.
- provider raw responses, local databases, paper trading artifacts, Stage8/Stage9 local artifacts.
- .env*, API keys, auth files, secrets, private run logs, zip/tar/bundle artifacts.

Run from repo root:
    python3 scripts/build_public_dataset.py
"""

from __future__ import annotations

import argparse
import copy
import json
import re
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
LEDGER_PATH = REPO_ROOT / "public" / "data" / "ledger.demo.json"
EVIDENCE_INDEX_PATH = REPO_ROOT / "public" / "data" / "evidence-index.json"

GOTRA_REPO = "amanayayatu-tech/gotra"
GOTRA_SOURCE_COMMIT = "d42492cd9d1016aaf87581765a2c8d119776c0e0"
PREREG_PATH = "data/backtest/PREREGISTERED.md"
PREREG_URL = f"https://raw.githubusercontent.com/{GOTRA_REPO}/{GOTRA_SOURCE_COMMIT}/{PREREG_PATH}"
PREREG_BLOB_SHA = "f4faaf0932d301afd2f2c4db05458bda3d77deb9"

OUTPUT_DATASET_ID = "gotra-public-ledger-phase5-public-safe-2026-06-20"
SNAPSHOT_DATE = "2026-06-20"
CURRENT_DATE_FOR_BOUNDARY_REVIEW = "2026-06-20"
SKELETON_START_MONTH = date(2024, 1, 1)
SKELETON_END_MONTH = date(2025, 12, 1)


def fetch_text(url: str) -> str:
  with urllib.request.urlopen(url, timeout=30) as response:
    return response.read().decode("utf-8")


def load_json(path: Path) -> dict[str, Any]:
  return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
  path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def parse_iso(value: str) -> date:
  return datetime.strptime(value, "%Y-%m-%d").date()


def month_starts(start_month: date, end_month: date) -> list[date]:
  months: list[date] = []
  current = start_month
  while current <= end_month:
    months.append(current)
    if current.month == 12:
      current = date(current.year + 1, 1, 1)
    else:
      current = date(current.year, current.month + 1, 1)
  return months


def safe_symbol_id(symbol: str) -> str:
  return re.sub(r"[^A-Z0-9]", "", symbol.upper())


def parse_preregistration(prereg_text: str) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
  universe: list[dict[str, str]] = []
  style_windows: list[dict[str, str]] = []
  current_section = None

  for line in prereg_text.splitlines():
    if line.startswith("## "):
      current_section = line[3:].strip()
      continue

    if current_section == "Universe":
      match = re.match(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$", line)
      if match and match.group(1) not in {"Symbol", "---"}:
        universe.append(
          {
            "ticker": match.group(1).strip(),
            "public_name": match.group(2).strip(),
            "listing_gate": match.group(3).strip(),
          },
        )

    if current_section == "Style Windows":
      match = re.match(r"^\|\s*([^|]+?)\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$", line)
      if match and match.group(1) not in {"Window", "---"}:
        style_windows.append(
          {
            "name": match.group(1).strip(),
            "start": match.group(2).strip(),
            "end": match.group(3).strip(),
          },
        )

  if len(universe) != 10:
    raise ValueError(f"Expected 10 symbols from PREREGISTERED.md, found {len(universe)}")
  if not style_windows:
    raise ValueError("Expected style windows from PREREGISTERED.md")

  return universe, style_windows


def style_window_for(decision_date: date, style_windows: list[dict[str, str]]) -> str:
  for window in style_windows:
    if parse_iso(window["start"]) <= decision_date <= parse_iso(window["end"]):
      return window["name"]
  return "protocol monthly 30-day window"


def profile_by_ticker(existing_records: list[dict[str, Any]]) -> dict[str, dict[str, str]]:
  profiles: dict[str, dict[str, str]] = {}
  for record in existing_records:
    profiles.setdefault(
      record["ticker"],
      {
        "company": record["company"],
        "sector": record["sector"],
      },
    )
  return profiles


def build_protocol_skeletons(
  existing_records: list[dict[str, Any]],
  universe: list[dict[str, str]],
  style_windows: list[dict[str, str]],
) -> list[dict[str, Any]]:
  profiles = profile_by_ticker(existing_records)
  existing_keys = {
    (record["ticker"], record["decision_date"], record["prediction_window"])
    for record in existing_records
  }
  skeletons: list[dict[str, Any]] = []
  source_label = f"{GOTRA_REPO}/{PREREG_PATH}@{GOTRA_SOURCE_COMMIT[:7]}"

  for decision_month in month_starts(SKELETON_START_MONTH, SKELETON_END_MONTH):
    for item in universe:
      ticker = item["ticker"]
      listing_gate = parse_iso(item["listing_gate"])
      if listing_gate > decision_month:
        continue
      if (ticker, decision_month.isoformat(), "30天") in existing_keys:
        continue

      profile = profiles.get(ticker, {"company": item["public_name"], "sector": "Protocol universe"})
      source_index = len(skeletons)
      skeletons.append(
        {
          "prediction_id": f"PROTO-{decision_month.strftime('%Y%m%d')}-{safe_symbol_id(ticker)}-{source_index + 1:04d}",
          "ticker": ticker,
          "company": profile["company"],
          "sector": profile["sector"],
          "decision_date": decision_month.isoformat(),
          "direction": "neutral",
          "expected_change_pct": 0,
          "confidence": 0,
          "reasoning": (
            "Protocol-derived pending skeleton generated from public PREREGISTERED.md. "
            "It represents a monthly 30-day ledger slot from the public protocol, not a published "
            "model prediction; no public-safe outcome is available, so actual_change_pct and error stay null."
          ),
          "evidence": [
            {
              "source": source_label,
              "date": "2026-06-14",
            },
          ],
          "prediction_window": "30天",
          "outcome_availability_date": (decision_month + timedelta(days=30)).isoformat(),
          "actual_change_pct": None,
          "error": None,
          "direction_correct": "pending",
          "style_window": style_window_for(decision_month, style_windows),
          "provenance": {
            "dataset_id": OUTPUT_DATASET_ID,
            "source": "public_preregistered_protocol_derived_pending_skeleton",
            "source_url_or_id": (
              f"https://github.com/{GOTRA_REPO}/blob/{GOTRA_SOURCE_COMMIT}/{PREREG_PATH}"
            ),
            "source_record_index": source_index,
            "immutable_demo_snapshot": False,
            "notes": (
              "Generated only from public protocol universe/monthly-window metadata. "
              "No actual outcome, model output, provider raw response, local run artifact, or private data was used."
            ),
          },
        },
      )

  return skeletons


def build_evidence_index(dataset: dict[str, Any]) -> dict[str, Any]:
  grouped: dict[str, list[tuple[dict[str, Any], dict[str, str]]]] = defaultdict(list)
  for record in dataset["records"]:
    for evidence in record["evidence"]:
      grouped[evidence["source"]].append((record, evidence))

  sources = []
  for source, items in sorted(grouped.items(), key=lambda entry: entry[0]):
    dates = sorted(evidence["date"] for _, evidence in items)
    record_ids = sorted({record["prediction_id"] for record, _ in items})
    provenance_sources = {record["provenance"].get("source", "") for record, _ in items}
    evidence_type = (
      "public_protocol_reference"
      if "public_preregistered_protocol_derived_pending_skeleton" in provenance_sources
      else "demo_evidence_label"
    )
    sources.append(
      {
        "source": source,
        "evidence_type": evidence_type,
        "source_dataset": dataset["metadata"]["dataset_id"],
        "first_evidence_date": dates[0],
        "last_evidence_date": dates[-1],
        "record_ids": record_ids,
        "record_count": len(record_ids),
      },
    )

  return {
    "metadata": {
      "index_id": "gotra-public-ledger-phase5-evidence-index-2026-06-20",
      "dataset_id": dataset["metadata"]["dataset_id"],
      "dataset_type": dataset["metadata"]["dataset_type"],
      "snapshot_date": dataset["metadata"]["snapshot_date"],
      "source": "derived_from_ledger_demo_json_and_public_preregistered_protocol",
      "note": (
        "Evidence entries are source labels/dates from the public-safe ledger dataset. "
        "Protocol-derived rows cite public PREREGISTERED.md only and contain no provider raw responses, "
        "private research artifacts, or fabricated outcomes."
      ),
      "claim_boundary": dataset["metadata"]["claim_boundary"],
    },
    "sources": sources,
  }


def build_dataset() -> dict[str, Any]:
  current = load_json(LEDGER_PATH)
  prereg_text = fetch_text(PREREG_URL)
  normalized_prereg = re.sub(r"\s+", " ", prereg_text)
  if "LLM leakage" not in prereg_text or "Absolute MSE is not interpreted as real forecasting skill" not in normalized_prereg:
    raise ValueError("PREREGISTERED.md no longer contains the expected leakage caveat")

  universe, style_windows = parse_preregistration(prereg_text)
  existing_records = [
    copy.deepcopy(record)
    for record in current["records"]
    if record.get("provenance", {}).get("source") != "public_preregistered_protocol_derived_pending_skeleton"
  ]
  if len(existing_records) != 54:
    raise ValueError(f"Expected 54 non-generated demo records as the base dataset, found {len(existing_records)}")
  skeletons = build_protocol_skeletons(existing_records, universe, style_windows)

  dataset = copy.deepcopy(current)
  dataset["metadata"] = {
    **dataset["metadata"],
    "dataset_id": OUTPUT_DATASET_ID,
    "dataset_type": "frozen_demo_plus_public_protocol_pending_skeleton/public_safe_demo",
    "snapshot_date": SNAPSHOT_DATE,
    "source": {
      "type": "zip_demo_rebuilt_plus_public_preregistered_protocol",
      "description": (
        "Original frozen demo records preserved; additional pending skeleton rows are generated "
        "only from the public amanayayatu-tech/gotra PREREGISTERED.md universe and monthly 30-day protocol."
      ),
      "source_url_or_id": f"https://github.com/{GOTRA_REPO}/tree/{GOTRA_SOURCE_COMMIT}",
      "notes": (
        f"Public protocol source: {PREREG_PATH}@{GOTRA_SOURCE_COMMIT}; blob_sha={PREREG_BLOB_SHA}. "
        "Skeleton rows are not resolved predictions and do not contain actual_change_pct/error."
      ),
    },
    "current_date_for_boundary_review": CURRENT_DATE_FOR_BOUNDARY_REVIEW,
    "record_count": len(existing_records) + len(skeletons),
    "pending_outcome_boundary": {
      "source_pending_count": sum(1 for record in existing_records if record["direction_correct"] == "pending"),
      "protocol_pending_skeleton_count": len(skeletons),
      "note": (
        "Source-pending demo rows and protocol-derived skeleton rows are displayed as pending/frozen_pending "
        "when outcomes are not present in public-safe sources. No actual_change_pct/error values are backfilled."
      ),
    },
  }
  dataset["records"] = sorted(
    existing_records + skeletons,
    key=lambda record: (record["decision_date"], record["ticker"], record["prediction_id"]),
    reverse=True,
  )
  return dataset


def main() -> None:
  parser = argparse.ArgumentParser(description="Build public-safe GOTRA ledger dataset")
  parser.add_argument("--check", action="store_true", help="build in memory and report counts without writing files")
  args = parser.parse_args()

  dataset = build_dataset()
  evidence_index = build_evidence_index(dataset)

  resolved = [record for record in dataset["records"] if record["direction_correct"] != "pending"]
  pending = [record for record in dataset["records"] if record["direction_correct"] == "pending"]
  summary = {
    "record_count": len(dataset["records"]),
    "resolved_count": len(resolved),
    "pending_count": len(pending),
    "dataset_id": dataset["metadata"]["dataset_id"],
  }

  if not args.check:
    write_json(LEDGER_PATH, dataset)
    write_json(EVIDENCE_INDEX_PATH, evidence_index)

  print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
  main()
