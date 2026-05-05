"""
Upload Route
POST /api/upload  — batch xlsx/csv processing
"""
from __future__ import annotations
import uuid
import logging
from datetime import date as dt_date
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from models.database import db, MilkRecord, Setting
from services.decision_engine import MilkSample, get_engine_with_db_settings
from services.file_processor import parse_file
from services.ml_service import MLService
from routes.predict import _f, _parse_date, _get_or_create_farmer, _update_farmer_stats

upload_bp = Blueprint("upload", __name__)
logger = logging.getLogger(__name__)


ALLOWED_EXT = {"xlsx", "csv", "xls"}


def _allowed(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXT


@upload_bp.post("")
@jwt_required()
def upload():
    uid = get_jwt_identity()

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if not file.filename or not _allowed(file.filename):
        return jsonify({"error": "Only .xlsx, .xls, .csv files allowed"}), 400

    file_bytes = file.read()
    if len(file_bytes) > 50 * 1024 * 1024:
        return jsonify({"error": "File too large (max 50 MB)"}), 413

    rows, parse_errors = parse_file(file_bytes, secure_filename(file.filename))
    if not rows:
        return jsonify({"error": "Empty or unreadable file", "details": parse_errors}), 400

    # Load settings & engine
    settings = {s.setting_key: s.setting_value for s in Setting.query.all()}
    engine = get_engine_with_db_settings(settings)

    ml_svc: MLService = current_app.config.get("ML_SERVICE")
    batch_id = str(uuid.uuid4())[:12]

    accepted = rejected = manual_check = 0
    fraud_alerts = 0
    saved_records = []
    row_results = []

    for row in rows:
        sample = MilkSample(
            fat=row.get("fat"),
            snf=row.get("snf"),
            ph=row.get("ph"),
            acidity=row.get("acidity"),
            temperature=row.get("temperature"),
            specific_gravity=row.get("specific_gravity"),
            cob_test=row.get("cob_test", "negative"),
            alcohol_test=row.get("alcohol_test", "negative"),
            organoleptic=row.get("organoleptic", "normal"),
            sediment_test=row.get("sediment_test", "clean"),
            mbrt=row.get("mbrt"),
            raw_milk_temp=row.get("raw_milk_temp"),
            quantity=row.get("quantity"),
        )
        result = engine.evaluate(sample)

        ml_pred, ml_conf = "unknown", 0.0
        if ml_svc:
            enc = MLService.encode_categorical(row)
            ml_pred, ml_conf = ml_svc.predict_decision(enc)

        record_date = _parse_date(row.get("date")) or dt_date.today()
        shift = row.get("shift", "morning")
        farmer_name = row.get("farmer_name", "Unknown")
        farmer_code = row.get("farmer_code", "")
        farmer_id = _get_or_create_farmer(farmer_code, farmer_name)

        rec = MilkRecord(
            batch_id=batch_id,
            farmer_id=farmer_id,
            farmer_name=farmer_name,
            farmer_code=farmer_code,
            date=record_date,
            shift=shift,
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
            entry_type="upload",
            entered_by=uid,
        )
        db.session.add(rec)
        _update_farmer_stats(farmer_id, result.decision, result.fraud_risk)

        if result.decision == "accept":
            accepted += 1
        elif result.decision == "reject":
            rejected += 1
        else:
            manual_check += 1
        if result.fraud_risk in ("medium", "high"):
            fraud_alerts += 1

        row_results.append({
            "farmer_name": farmer_name,
            "farmer_code": farmer_code,
            "date": str(record_date),
            "shift": shift,
            "decision": result.decision,
            "fraud_risk": result.fraud_risk,
            "reasons": result.reasons[:2],  # trim for response
        })

    db.session.commit()

    return jsonify({
        "batch_id": batch_id,
        "total_rows": len(rows),
        "accepted": accepted,
        "rejected": rejected,
        "manual_check": manual_check,
        "fraud_alerts": fraud_alerts,
        "parse_errors": parse_errors,
        "rows": row_results,
    }), 200
