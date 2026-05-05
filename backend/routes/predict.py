"""
Predict Route
POST /api/predict   — single manual entry → instant decision
"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date as dt_date

from models.database import db, MilkRecord, Farmer, Setting, Log
from services.decision_engine import DecisionEngine, MilkSample, get_engine_with_db_settings
from services.ml_service import MLService

predict_bp = Blueprint("predict", __name__)


def _get_engine() -> DecisionEngine:
    settings = {s.setting_key: s.setting_value for s in Setting.query.all()}
    return get_engine_with_db_settings(settings)


def _get_ml() -> MLService:
    return current_app.config.get("ML_SERVICE")


@predict_bp.post("")
@jwt_required()
def predict():
    uid = get_jwt_identity()
    data = request.get_json(silent=True) or {}

    sample = MilkSample(
        fat=_f(data.get("fat")),
        snf=_f(data.get("snf")),
        ph=_f(data.get("ph")),
        acidity=_f(data.get("acidity")),
        temperature=_f(data.get("temperature")),
        specific_gravity=_f(data.get("specific_gravity")),
        cob_test=data.get("cob_test", "negative"),
        alcohol_test=data.get("alcohol_test", "negative"),
        organoleptic=data.get("organoleptic", "normal"),
        sediment_test=data.get("sediment_test", "clean"),
        mbrt=_f(data.get("mbrt")),
        raw_milk_temp=_f(data.get("raw_milk_temp")),
        quantity=_f(data.get("quantity")),
    )

    engine = _get_engine()
    result = engine.evaluate(sample)

    # ML prediction
    ml_svc: MLService = _get_ml()
    ml_pred, ml_conf = "unknown", 0.0
    if ml_svc:
        enc = MLService.encode_categorical(data)
        ml_pred, ml_conf = ml_svc.predict_decision(enc)

    # Persist record
    record_date = _parse_date(data.get("date")) or dt_date.today()
    farmer_id = _get_or_create_farmer(
        data.get("farmer_code", ""),
        data.get("farmer_name", "Unknown"),
    )

    rec = MilkRecord(
        farmer_id=farmer_id,
        farmer_name=data.get("farmer_name", "Unknown"),
        farmer_code=data.get("farmer_code", ""),
        date=record_date,
        shift=data.get("shift", "morning"),
        fat=sample.fat, snf=sample.snf, ph=sample.ph,
        acidity=sample.acidity, temperature=sample.temperature,
        specific_gravity=sample.specific_gravity,
        cob_test=sample.cob_test, alcohol_test=sample.alcohol_test,
        organoleptic=sample.organoleptic, sediment_test=sample.sediment_test,
        mbrt=sample.mbrt, raw_milk_temp=sample.raw_milk_temp,
        quantity=sample.quantity,
        decision=result.decision,
        reasons=result.reasons,
        fraud_risk=result.fraud_risk,
        ml_prediction=ml_pred,
        ml_confidence=ml_conf,
        entry_type="manual",
        entered_by=uid,
    )
    db.session.add(rec)
    _update_farmer_stats(farmer_id, result.decision, result.fraud_risk)
    db.session.commit()

    return jsonify({
        "record_id": rec.id,
        "decision": result.decision,
        "reasons": result.reasons,
        "fraud_risk": result.fraud_risk,
        "parameter_flags": result.parameter_flags,
        "ml_prediction": ml_pred,
        "ml_confidence": round(ml_conf, 4),
    }), 200


# ── Helpers ────────────────────────────────────────────────────────────────────

def _f(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None


def _parse_date(v):
    if not v:
        return None
    from datetime import datetime
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(str(v).strip(), fmt).date()
        except ValueError:
            pass
    return None


def _get_or_create_farmer(code: str, name: str) -> int | None:
    if not code:
        return None
    farmer = Farmer.query.filter_by(farmer_code=code).first()
    if not farmer:
        farmer = Farmer(farmer_code=code, full_name=name)
        db.session.add(farmer)
        db.session.flush()
    return farmer.id


def _update_farmer_stats(farmer_id, decision, fraud_risk):
    if not farmer_id:
        return
    farmer = Farmer.query.get(farmer_id)
    if not farmer:
        return
    farmer.total_submissions = (farmer.total_submissions or 0) + 1
    if decision == "accept":
        farmer.total_accepted = (farmer.total_accepted or 0) + 1
    elif decision == "reject":
        farmer.total_rejected = (farmer.total_rejected or 0) + 1
    if fraud_risk in ("medium", "high"):
        farmer.fraud_count = (farmer.fraud_count or 0) + 1
        if (farmer.fraud_count or 0) >= 3:
            farmer.fraud_flag = True
