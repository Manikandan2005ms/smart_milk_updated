"""
Decision Engine — Source-of-truth rule processor for milk quality.

All thresholds are loaded from the database settings table at runtime
so operators can adjust them without code changes.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional


# ── Data Transfer Object ───────────────────────────────────────────────────────

@dataclass
class MilkSample:
    fat: Optional[float] = None
    snf: Optional[float] = None
    ph: Optional[float] = None
    acidity: Optional[float] = None
    temperature: Optional[float] = None
    specific_gravity: Optional[float] = None
    cob_test: str = "negative"          # "positive" | "negative"
    alcohol_test: str = "negative"      # "positive" | "negative"
    organoleptic: str = "normal"        # "normal"  | "abnormal"
    sediment_test: str = "clean"        # "clean"   | "dirty"
    mbrt: Optional[float] = None
    raw_milk_temp: Optional[float] = None
    quantity: Optional[float] = None


@dataclass
class DecisionResult:
    decision: str = "accept"            # "accept" | "reject" | "manual_check"
    reasons: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    fraud_risk: str = "low"             # "low" | "medium" | "high"
    parameter_flags: dict = field(default_factory=dict)


# ── Default Thresholds (used if DB settings not available) ────────────────────

DEFAULT_THRESHOLDS = {
    "fat_min": 3.2,
    "fat_max": 3.5,
    "snf_min": 8.3,
    "snf_max": 8.5,
    "ph_min": 6.5,
    "ph_max": 6.8,
    "acidity_min": 0.10,
    "acidity_max": 0.15,
    "temp_ideal": 10.0,
    "temp_acceptable": 15.0,
    "sg_min": 1.028,
    "sg_max": 1.032,
    "mbrt_good": 3.0,
    "mbrt_check": 2.0,
    "raw_milk_temp_min": 25.0,
    "raw_milk_temp_max": 37.0,
}


# ── Engine ─────────────────────────────────────────────────────────────────────

class DecisionEngine:
    """
    Applies business rules to a MilkSample and returns a DecisionResult.
    Thresholds can be overridden at construction time (loaded from DB).
    """

    def __init__(self, thresholds: Optional[dict] = None):
        self.t = {**DEFAULT_THRESHOLDS, **(thresholds or {})}

    # ── public API ────────────────────────────────────────────────

    def evaluate(self, sample: MilkSample) -> DecisionResult:
        result = DecisionResult()
        critical_failures = []
        minor_warnings = []
        flags = {}

        # ── 1. FAT ─────────────────────────────────────────────
        if sample.fat is not None:
            if not (self.t["fat_min"] <= sample.fat <= self.t["fat_max"]):
                msg = (
                    f"FAT {sample.fat:.2f}% outside acceptable range "
                    f"({self.t['fat_min']}–{self.t['fat_max']}%) — "
                    "Possible Adulteration"
                )
                minor_warnings.append(msg)
                flags["fat"] = "fail"
            else:
                flags["fat"] = "pass"

        # ── 2. SNF ─────────────────────────────────────────────
        if sample.snf is not None:
            if not (self.t["snf_min"] <= sample.snf <= self.t["snf_max"]):
                msg = (
                    f"SNF {sample.snf:.2f}% outside acceptable range "
                    f"({self.t['snf_min']}–{self.t['snf_max']}%) — "
                    "Added Water Suspected"
                )
                minor_warnings.append(msg)
                flags["snf"] = "fail"
            else:
                flags["snf"] = "pass"

        # ── 3. pH ──────────────────────────────────────────────
        if sample.ph is not None:
            if not (self.t["ph_min"] <= sample.ph <= self.t["ph_max"]):
                msg = (
                    f"pH {sample.ph:.2f} outside acceptable range "
                    f"({self.t['ph_min']}–{self.t['ph_max']}) — "
                    "Possible Spoilage"
                )
                minor_warnings.append(msg)
                flags["ph"] = "fail"
            else:
                flags["ph"] = "pass"

        # ── 4. Acidity ─────────────────────────────────────────
        if sample.acidity is not None:
            if not (self.t["acidity_min"] <= sample.acidity <= self.t["acidity_max"]):
                msg = (
                    f"Acidity {sample.acidity:.3f}% LA outside acceptable range "
                    f"({self.t['acidity_min']}–{self.t['acidity_max']}% LA) — "
                    "Souring Detected"
                )
                minor_warnings.append(msg)
                flags["acidity"] = "fail"
            else:
                flags["acidity"] = "pass"

        # ── 5. Temperature ─────────────────────────────────────
        if sample.temperature is not None:
            if sample.temperature <= self.t["temp_ideal"]:
                flags["temperature"] = "pass"
            elif sample.temperature <= self.t["temp_acceptable"]:
                msg = (
                    f"Temperature {sample.temperature:.1f}°C — "
                    f"Above ideal (>{self.t['temp_ideal']}°C), Manual Verification Advised"
                )
                minor_warnings.append(msg)
                flags["temperature"] = "warning"
            else:
                msg = (
                    f"Temperature {sample.temperature:.1f}°C — "
                    f"Above acceptable limit (>{self.t['temp_acceptable']}°C) — "
                    "Risk of Spoilage"
                )
                minor_warnings.append(msg)
                flags["temperature"] = "fail"

        # ── 6. Specific Gravity ────────────────────────────────
        if sample.specific_gravity is not None:
            if not (self.t["sg_min"] <= sample.specific_gravity <= self.t["sg_max"]):
                msg = (
                    f"Specific Gravity {sample.specific_gravity:.4f} outside range "
                    f"({self.t['sg_min']}–{self.t['sg_max']}) — "
                    "Water Mixing / Quality Issue Detected"
                )
                minor_warnings.append(msg)
                flags["specific_gravity"] = "fail"
            else:
                flags["specific_gravity"] = "pass"

        # ── 7. COB Test (CRITICAL) ─────────────────────────────
        cob = str(sample.cob_test).lower().strip()
        if cob == "positive":
            critical_failures.append(
                "COB Test POSITIVE — Carbonate/Soda Adulteration Detected (Immediate Rejection)"
            )
            flags["cob_test"] = "critical"
        else:
            flags["cob_test"] = "pass"

        # ── 8. Alcohol Test (CRITICAL) ─────────────────────────
        alc = str(sample.alcohol_test).lower().strip()
        if alc == "positive":
            critical_failures.append(
                "Alcohol Test POSITIVE — Preservative / Alcohol Adulteration (Immediate Rejection)"
            )
            flags["alcohol_test"] = "critical"
        else:
            flags["alcohol_test"] = "pass"

        # ── 9. Organoleptic (CRITICAL) ─────────────────────────
        org = str(sample.organoleptic).lower().strip()
        if org == "abnormal":
            critical_failures.append(
                "Organoleptic Test ABNORMAL — Abnormal Smell/Color/Taste Detected (Immediate Rejection)"
            )
            flags["organoleptic"] = "critical"
        else:
            flags["organoleptic"] = "pass"

        # ── 10. Sediment Test (CRITICAL) ───────────────────────
        sed = str(sample.sediment_test).lower().strip()
        if sed == "dirty":
            critical_failures.append(
                "Sediment Test DIRTY — Physical Contamination Present (Immediate Rejection)"
            )
            flags["sediment_test"] = "critical"
        else:
            flags["sediment_test"] = "pass"

        # ── 11. MBRT ───────────────────────────────────────────
        if sample.mbrt is not None:
            if sample.mbrt < self.t["mbrt_check"]:
                critical_failures.append(
                    f"MBRT {sample.mbrt:.1f}h — Below 2h: Very High Bacterial Load (Immediate Rejection)"
                )
                flags["mbrt"] = "critical"
            elif sample.mbrt < self.t["mbrt_good"]:
                msg = (
                    f"MBRT {sample.mbrt:.1f}h — 2–3h Range: Elevated Bacterial Load, "
                    "Manual Verification Required"
                )
                minor_warnings.append(msg)
                flags["mbrt"] = "warning"
            else:
                flags["mbrt"] = "pass"

        # ── 12. Raw Milk Temperature ───────────────────────────
        if sample.raw_milk_temp is not None:
            if not (
                self.t["raw_milk_temp_min"]
                <= sample.raw_milk_temp
                <= self.t["raw_milk_temp_max"]
            ):
                critical_failures.append(
                    f"Raw Milk Temperature {sample.raw_milk_temp:.1f}°C outside "
                    f"accepted range ({self.t['raw_milk_temp_min']}–"
                    f"{self.t['raw_milk_temp_max']}°C) — Quality Compromised"
                )
                flags["raw_milk_temp"] = "critical"
            else:
                flags["raw_milk_temp"] = "pass"

        # ── Decision Logic ─────────────────────────────────────

        all_reasons = critical_failures + minor_warnings

        if critical_failures:
            # Any critical failure → REJECT
            result.decision = "reject"
            result.reasons = all_reasons
        elif len(minor_warnings) >= 3:
            # Multiple minor issues combined → REJECT
            result.decision = "reject"
            all_reasons.append(
                "Multiple minor quality issues combined — Automatic Rejection"
            )
            result.reasons = all_reasons
        elif any(
            flags.get(k) == "warning"
            for k in ("temperature", "mbrt")
        ) or minor_warnings:
            # Single or double warnings → MANUAL CHECK
            result.decision = "manual_check"
            result.reasons = all_reasons
            result.warnings = minor_warnings
        else:
            result.decision = "accept"
            result.reasons = ["All quality parameters within acceptable limits"]

        # ── Fraud Risk Assessment ──────────────────────────────
        result.fraud_risk = self._assess_fraud_risk(sample, flags, len(critical_failures))
        result.parameter_flags = flags

        return result

    # ── helpers ───────────────────────────────────────────

    def _assess_fraud_risk(
        self,
        sample: MilkSample,
        flags: dict,
        critical_count: int,
    ) -> str:
        risk_score = 0

        if critical_count >= 2:
            risk_score += 3
        elif critical_count == 1:
            risk_score += 1

        # FAT + SNF both fail → likely water addition
        if flags.get("fat") == "fail" and flags.get("snf") == "fail":
            risk_score += 2

        # COB or Alcohol positive → deliberate adulteration
        if flags.get("cob_test") == "critical" or flags.get("alcohol_test") == "critical":
            risk_score += 3

        # SG fail with SNF fail
        if flags.get("specific_gravity") == "fail" and flags.get("snf") == "fail":
            risk_score += 2

        if risk_score >= 4:
            return "high"
        elif risk_score >= 2:
            return "medium"
        return "low"


# ── Factory helper ─────────────────────────────────────────────────────────────

def get_engine_with_db_settings(db_settings: dict | None = None) -> DecisionEngine:
    """Build an engine using settings pulled from the database."""
    if not db_settings:
        return DecisionEngine()
    parsed = {}
    for k, v in db_settings.items():
        try:
            parsed[k] = float(v)
        except (ValueError, TypeError):
            pass
    return DecisionEngine(thresholds=parsed)
