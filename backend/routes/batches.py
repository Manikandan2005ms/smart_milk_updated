"""
Batches Route
GET /api/batches
DELETE /api/batches/:id
"""
from __future__ import annotations
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from models.database import db, UploadBatch, MilkRecord, User

batches_bp = Blueprint("batches", __name__)


@batches_bp.get("")
@jwt_required()
def get_batches():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 50))
    search = request.args.get("search", "").strip()

    q = db.session.query(UploadBatch, User.username).outerjoin(User, UploadBatch.uploaded_by == User.id)

    if search:
        q = q.filter(
            UploadBatch.batch_id.ilike(f"%{search}%") |
            UploadBatch.session_name.ilike(f"%{search}%") |
            UploadBatch.file_name.ilike(f"%{search}%")
        )
        
    date_filter = request.args.get("date")
    if date_filter:
        q = q.filter(UploadBatch.upload_date == date_filter)
        
    shift_filter = request.args.get("shift")
    if shift_filter:
        q = q.filter(UploadBatch.shift == shift_filter)

    uploaded_by_filter = request.args.get("uploaded_by")
    if uploaded_by_filter:
        q = q.filter(User.username.ilike(f"%{uploaded_by_filter}%"))

    q = q.order_by(UploadBatch.created_at.desc())
    paginated = q.paginate(page=page, per_page=per_page, error_out=False)

    results = []
    for batch, username in paginated.items:
        b_dict = batch.to_dict()
        b_dict["uploaded_by_name"] = username or "Unknown"
        results.append(b_dict)

    return jsonify({
        "batches": results,
        "total": paginated.total,
        "pages": paginated.pages,
        "page": page,
        "per_page": per_page,
    }), 200


@batches_bp.delete("/<int:batch_id>")
@jwt_required()
def delete_batch(batch_id):
    # Depending on auth role, might restrict to admin
    batch = UploadBatch.query.get_or_404(batch_id)
    
    # Delete associated records
    MilkRecord.query.filter_by(batch_id=batch.batch_id).delete()
    
    # Delete batch
    db.session.delete(batch)
    db.session.commit()
    
    return jsonify({"message": "Batch and related records deleted successfully"}), 200
