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
    decision: str = "accept"            # "accept" | "reject"
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

        # ── 1. FAT (CORE) ─────────────────────────────────────────────
        if sample.fat is not None:
            if not (self.t["fat_min"] <= sample.fat <= self.t["fat_max"]):
                critical_failures.append(f"Low/High Fat % ({sample.fat:.2f}%)")
                flags["fat"] = "fail"
            else:
                flags["fat"] = "pass"

        # ── 2. SNF (CORE) ─────────────────────────────────────────────
        if sample.snf is not None:
            if not (self.t["snf_min"] <= sample.snf <= self.t["snf_max"]):
                critical_failures.append(f"Low/High SNF % ({sample.snf:.2f}%)")
                flags["snf"] = "fail"
            else:
                flags["snf"] = "pass"

        # ── 3. pH (CORE) ──────────────────────────────────────────────
        if sample.ph is not None:
            if not (self.t["ph_min"] <= sample.ph <= self.t["ph_max"]):
                critical_failures.append(f"pH Abnormal ({sample.ph:.2f})")
                flags["ph"] = "fail"
            else:
                flags["ph"] = "pass"

        # ── 4. Acidity (CORE) ─────────────────────────────────────────
        if sample.acidity is not None:
            if not (self.t["acidity_min"] <= sample.acidity <= self.t["acidity_max"]):
                critical_failures.append(f"Acidity High/Abnormal ({sample.acidity:.3f}%)")
                flags["acidity"] = "fail"
            else:
                flags["acidity"] = "pass"

        # ── 5. Temperature (CORE) ─────────────────────────────────────
        if sample.temperature is not None:
            if sample.temperature <= self.t["temp_acceptable"]:
                flags["temperature"] = "pass"
            else:
                critical_failures.append(f"High Temperature ({sample.temperature:.1f}°C)")
                flags["temperature"] = "fail"

        # ── 6. Specific Gravity (CORE) ────────────────────────────────
        if sample.specific_gravity is not None:
            if not (self.t["sg_min"] <= sample.specific_gravity <= self.t["sg_max"]):
                critical_failures.append(f"Density Abnormal ({sample.specific_gravity:.4f})")
                flags["specific_gravity"] = "fail"
            else:
                flags["specific_gravity"] = "pass"

        # ── 7. MBRT (CORE) ───────────────────────────────────────────
        if sample.mbrt is not None:
            if sample.mbrt < self.t["mbrt_check"]:
                critical_failures.append(f"Poor MBRT ({sample.mbrt:.1f}h)")
                flags["mbrt"] = "fail"
            else:
                flags["mbrt"] = "pass"

        # ── 8. COB Test (CORE) ─────────────────────────────
        if sample.cob_test is not None:
            cob = str(sample.cob_test).lower().strip()
            if cob == "positive":
                critical_failures.append("COB Positive")
                flags["cob_test"] = "fail"
            elif cob == "negative":
                flags["cob_test"] = "pass"

        # ── 9. Alcohol Test (OPTIONAL) ─────────────────────────
        if sample.alcohol_test is not None:
            alc = str(sample.alcohol_test).lower().strip()
            if alc == "positive":
                minor_warnings.append("Alcohol Test POSITIVE")
                flags["alcohol_test"] = "warning"
            elif alc == "negative":
                flags["alcohol_test"] = "pass"

        # ── 10. Organoleptic (OPTIONAL) ─────────────────────────
        if sample.organoleptic is not None:
            org = str(sample.organoleptic).lower().strip()
            if org == "abnormal":
                minor_warnings.append("Organoleptic Test ABNORMAL")
                flags["organoleptic"] = "warning"
            elif org == "normal":
                flags["organoleptic"] = "pass"

        # ── 11. Sediment Test (OPTIONAL) ───────────────────────
        if sample.sediment_test is not None:
            sed = str(sample.sediment_test).lower().strip()
            if sed == "dirty":
                minor_warnings.append("Sediment Test DIRTY")
                flags["sediment_test"] = "warning"
            elif sed == "clean":
                flags["sediment_test"] = "pass"

        # ── 12. Raw Milk Temperature (OPTIONAL) ───────────────────────────
        if sample.raw_milk_temp is not None:
            if not (self.t["raw_milk_temp_min"] <= sample.raw_milk_temp <= self.t["raw_milk_temp_max"]):
                minor_warnings.append(f"Raw Milk Temp {sample.raw_milk_temp:.1f}°C outside range")
                flags["raw_milk_temp"] = "warning"
            else:
                flags["raw_milk_temp"] = "pass"

        # ── Fraud Risk Assessment ──────────────────────────────
        result.fraud_risk = self._assess_fraud_risk(sample, flags, len(critical_failures))
        result.parameter_flags = flags

        # ── Decision Logic ─────────────────────────────────────
        if critical_failures:
            result.decision = "reject"
            result.reasons = critical_failures
            result.warnings = minor_warnings
        else:
            result.decision = "accept"
            result.reasons = ["All core quality parameters within acceptable limits"]
            result.warnings = minor_warnings

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
        if flags.get("cob_test") == "fail" or flags.get("alcohol_test") == "warning":
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
