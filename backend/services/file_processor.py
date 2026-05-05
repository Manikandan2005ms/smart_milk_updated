"""
File Processor — handles xlsx/csv batch uploads.
Returns list of normalised row dicts ready for the decision engine.
"""
from __future__ import annotations
import io
import csv
import logging
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# Map of possible column aliases → canonical field names
COLUMN_ALIASES: dict[str, str] = {
    # fat
    "fat": "fat", "fat %": "fat", "fat_pct": "fat", "fat(%)": "fat",
    # snf
    "snf": "snf", "snf %": "snf", "snf_pct": "snf", "snf(%)": "snf",
    # ph
    "ph": "ph", "ph value": "ph",
    # acidity
    "acidity": "acidity", "acidity %": "acidity", "acidity_pct": "acidity",
    # temperature
    "temperature": "temperature", "temp": "temperature", "temp(°c)": "temperature",
    "temperature(°c)": "temperature",
    # specific gravity
    "specific_gravity": "specific_gravity", "sg": "specific_gravity",
    "specific gravity": "specific_gravity", "sp gravity": "specific_gravity",
    # cob test
    "cob_test": "cob_test", "cob test": "cob_test", "cob": "cob_test",
    # alcohol test
    "alcohol_test": "alcohol_test", "alcohol test": "alcohol_test",
    "alcohol": "alcohol_test",
    # organoleptic
    "organoleptic": "organoleptic", "organoleptic test": "organoleptic",
    # sediment test
    "sediment_test": "sediment_test", "sediment test": "sediment_test",
    "sediment": "sediment_test",
    # mbrt
    "mbrt": "mbrt", "mbrt (h)": "mbrt", "mbrt(h)": "mbrt",
    # raw milk temp
    "raw_milk_temp": "raw_milk_temp", "raw milk temp": "raw_milk_temp",
    "raw milk temperature": "raw_milk_temp", "raw_temp": "raw_milk_temp",
    # quantity
    "quantity": "quantity", "qty": "quantity", "quantity (l)": "quantity",
    "volume": "quantity",
    # farmer info
    "farmer_name": "farmer_name", "farmer name": "farmer_name",
    "name": "farmer_name", "supplier name": "farmer_name",
    "farmer_code": "farmer_code", "farmer code": "farmer_code",
    "code": "farmer_code", "supplier code": "farmer_code",
    "date": "date", "shift": "shift",
}

NUMERIC_FIELDS = {
    "fat", "snf", "ph", "acidity", "temperature",
    "specific_gravity", "mbrt", "raw_milk_temp", "quantity",
}

CATEGORICAL_FIELDS = {
    "cob_test": ("negative", "positive"),
    "alcohol_test": ("negative", "positive"),
    "organoleptic": ("normal", "abnormal"),
    "sediment_test": ("clean", "dirty"),
}


def parse_file(file_bytes: bytes, filename: str) -> tuple[list[dict], list[str]]:
    """
    Parse xlsx/csv bytes.
    Returns (rows, errors).
    rows: list of normalised dicts.
    errors: list of human-readable error strings.
    """
    errors: list[str] = []

    try:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ("xlsx", "xls"):
            df = pd.read_excel(io.BytesIO(file_bytes), dtype=str)
        elif ext == "csv":
            df = pd.read_csv(io.StringIO(file_bytes.decode("utf-8", errors="replace")), dtype=str)
        else:
            return [], [f"Unsupported file type: .{ext}"]
    except Exception as e:
        return [], [f"Could not read file: {e}"]

    # ── Normalise column names ────────────────────────────────────────────
    df.columns = [str(c).strip().lower() for c in df.columns]
    rename_map = {}
    for col in df.columns:
        canonical = COLUMN_ALIASES.get(col)
        if canonical:
            rename_map[col] = canonical
    df.rename(columns=rename_map, inplace=True)

    rows: list[dict] = []

    for idx, row in df.iterrows():
        row_num = idx + 2  # 1-indexed + header
        record: dict = {}

        # ── Numeric fields ────────────────────────────────────────────────
        for field in NUMERIC_FIELDS:
            raw = row.get(field)
            if pd.isna(raw) or raw is None or str(raw).strip() == "":
                record[field] = None
            else:
                try:
                    record[field] = float(str(raw).strip())
                except ValueError:
                    errors.append(f"Row {row_num}: '{field}' value '{raw}' is not numeric.")
                    record[field] = None

        # ── Categorical fields ────────────────────────────────────────────
        for field, (default, alt) in CATEGORICAL_FIELDS.items():
            raw = str(row.get(field, default) or default).strip().lower()
            record[field] = alt if raw == alt else default

        # ── Text fields ───────────────────────────────────────────────────
        record["farmer_name"] = str(row.get("farmer_name", "Unknown")).strip() or "Unknown"
        record["farmer_code"] = str(row.get("farmer_code", "")).strip()
        record["date"] = str(row.get("date", "")).strip()
        record["shift"] = _parse_shift(row.get("shift", "morning"))

        rows.append(record)

    return rows, errors


def _parse_shift(value) -> str:
    v = str(value or "").strip().lower()
    if "eve" in v or v in ("e", "pm"):
        return "evening"
    return "morning"


def dataframe_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert an already-normalised DataFrame to list of dicts."""
    return df.to_dict(orient="records")
