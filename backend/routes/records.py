"""
Records & Dashboard Routes
GET /api/records
GET /api/records/:id
GET /api/dashboard
GET /api/farmers
GET /api/farmers/:id
"""
from __future__ import annotations
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func, and_
from datetime import datetime, timedelta, date

from models.database import db, MilkRecord, Farmer

records_bp = Blueprint("records", __name__)
dashboard_bp = Blueprint("dashboard", __name__)
farmers_bp = Blueprint("farmers", __name__)


# ── Records ────────────────────────────────────────────────────────────────────

@records_bp.get("")
@jwt_required()
def get_records():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    decision = request.args.get("decision")
    fraud_risk = request.args.get("fraud_risk")
    date_from = request.args.get("date_from")
    date_to = request.args.get("date_to")
    shift = request.args.get("shift")
    search = request.args.get("search", "").strip()

    q = MilkRecord.query

    if decision:
        q = q.filter(MilkRecord.decision == decision)
    if fraud_risk:
        q = q.filter(MilkRecord.fraud_risk == fraud_risk)
    if shift:
        q = q.filter(MilkRecord.shift == shift)
    if date_from:
        try:
            q = q.filter(MilkRecord.date >= datetime.strptime(date_from, "%Y-%m-%d").date())
        except ValueError:
            pass
    if date_to:
        try:
            q = q.filter(MilkRecord.date <= datetime.strptime(date_to, "%Y-%m-%d").date())
        except ValueError:
            pass
    if search:
        q = q.filter(
            MilkRecord.farmer_name.ilike(f"%{search}%") |
            MilkRecord.farmer_code.ilike(f"%{search}%")
        )

    q = q.order_by(MilkRecord.created_at.desc())
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "records": [r.to_dict() for r in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
        "per_page": per_page,
    }), 200


@records_bp.get("/<int:record_id>")
@jwt_required()
def get_record(record_id):
    rec = MilkRecord.query.get_or_404(record_id)
    return jsonify({"record": rec.to_dict()}), 200


# ── Dashboard ──────────────────────────────────────────────────────────────────

@dashboard_bp.get("")
@jwt_required()
def get_dashboard():
    today = date.today()
    thirty_ago = today - timedelta(days=30)

    # Totals
    total = MilkRecord.query.count()
    accepted = MilkRecord.query.filter_by(decision="accept").count()
    rejected = MilkRecord.query.filter_by(decision="reject").count()
    manual_check = MilkRecord.query.filter_by(decision="manual_check").count()
    fraud_high = MilkRecord.query.filter_by(fraud_risk="high").count()
    fraud_medium = MilkRecord.query.filter_by(fraud_risk="medium").count()

    # Quantities
    morning_qty = db.session.query(func.sum(MilkRecord.quantity)).filter(
        MilkRecord.shift == "morning",
        MilkRecord.date == today,
    ).scalar() or 0

    evening_qty = db.session.query(func.sum(MilkRecord.quantity)).filter(
        MilkRecord.shift == "evening",
        MilkRecord.date == today,
    ).scalar() or 0

    # Daily trend (last 30 days)
    daily_rows = db.session.query(
        MilkRecord.date,
        MilkRecord.decision,
        func.count(MilkRecord.id).label("cnt"),
    ).filter(
        MilkRecord.date >= thirty_ago
    ).group_by(MilkRecord.date, MilkRecord.decision).all()

    daily_map: dict = {}
    for row in daily_rows:
        key = str(row.date)
        if key not in daily_map:
            daily_map[key] = {"date": key, "accept": 0, "reject": 0, "manual_check": 0}
        daily_map[key][row.decision] = row.cnt
    daily_trend = sorted(daily_map.values(), key=lambda x: x["date"])

    # Top farmers (by accepted count)
    top_farmers = db.session.query(
        MilkRecord.farmer_name,
        MilkRecord.farmer_code,
        func.count(MilkRecord.id).label("total"),
        func.sum(
            db.case((MilkRecord.decision == "accept", 1), else_=0)
        ).label("accepted"),
        func.sum(MilkRecord.quantity).label("total_qty"),
    ).group_by(
        MilkRecord.farmer_name, MilkRecord.farmer_code
    ).order_by(
        func.count(MilkRecord.id).desc()
    ).limit(10).all()

    top_farmers_list = [
        {
            "farmer_name": r.farmer_name,
            "farmer_code": r.farmer_code,
            "total": r.total,
            "accepted": int(r.accepted or 0),
            "total_qty": float(r.total_qty or 0),
        }
        for r in top_farmers
    ]

    # Shift comparison
    shift_data = db.session.query(
        MilkRecord.shift,
        func.count(MilkRecord.id).label("cnt"),
        func.sum(MilkRecord.quantity).label("qty"),
    ).group_by(MilkRecord.shift).all()

    shift_map = {r.shift: {"count": r.cnt, "quantity": float(r.qty or 0)} for r in shift_data}

    return jsonify({
        "kpis": {
            "total": total,
            "accepted": accepted,
            "rejected": rejected,
            "manual_check": manual_check,
            "fraud_high": fraud_high,
            "fraud_medium": fraud_medium,
            "morning_qty": float(morning_qty),
            "evening_qty": float(evening_qty),
        },
        "daily_trend": daily_trend,
        "top_farmers": top_farmers_list,
        "shift_comparison": shift_map,
        "accept_rate": round(accepted / total * 100, 1) if total else 0,
        "reject_rate": round(rejected / total * 100, 1) if total else 0,
    }), 200


# ── Farmers ────────────────────────────────────────────────────────────────────

@farmers_bp.get("")
@jwt_required()
def list_farmers():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    search = request.args.get("search", "").strip()
    fraud_only = request.args.get("fraud_only", "false").lower() == "true"

    q = Farmer.query
    if search:
        q = q.filter(
            Farmer.full_name.ilike(f"%{search}%") |
            Farmer.farmer_code.ilike(f"%{search}%")
        )
    if fraud_only:
        q = q.filter(Farmer.fraud_flag == True)

    q = q.order_by(Farmer.registered_at.desc())
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        "farmers": [f.to_dict() for f in paginated.items],
        "total": paginated.total,
        "pages": paginated.pages,
    }), 200


@farmers_bp.get("/<int:farmer_id>")
@jwt_required()
def get_farmer(farmer_id):
    farmer = Farmer.query.get_or_404(farmer_id)
    records = MilkRecord.query.filter_by(
        farmer_id=farmer_id
    ).order_by(MilkRecord.date.desc()).limit(50).all()

    return jsonify({
        "farmer": farmer.to_dict(),
        "records": [r.to_dict() for r in records],
    }), 200
