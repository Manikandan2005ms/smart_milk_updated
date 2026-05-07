"""
SQLAlchemy ORM models
"""
from __future__ import annotations
import json
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("admin", "operator", "viewer"), default="operator")
    full_name = db.Column(db.String(100))
    is_active = db.Column(db.Boolean, default=True)
    last_login = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Farmer(db.Model):
    __tablename__ = "farmers"

    id = db.Column(db.Integer, primary_key=True)
    farmer_code = db.Column(db.String(20), unique=True, nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    village = db.Column(db.String(100))
    district = db.Column(db.String(100))
    state = db.Column(db.String(100))
    total_submissions = db.Column(db.Integer, default=0)
    total_accepted = db.Column(db.Integer, default=0)
    total_rejected = db.Column(db.Integer, default=0)
    fraud_flag = db.Column(db.Boolean, default=False)
    fraud_count = db.Column(db.Integer, default=0)
    avg_fat = db.Column(db.Numeric(5, 3))
    avg_snf = db.Column(db.Numeric(5, 3))
    avg_quantity = db.Column(db.Numeric(10, 2))
    is_active = db.Column(db.Boolean, default=True)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    records = db.relationship("MilkRecord", backref="farmer_rel", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "farmer_code": self.farmer_code,
            "full_name": self.full_name,
            "phone": self.phone,
            "village": self.village,
            "district": self.district,
            "state": self.state,
            "total_submissions": self.total_submissions,
            "total_accepted": self.total_accepted,
            "total_rejected": self.total_rejected,
            "fraud_flag": self.fraud_flag,
            "fraud_count": self.fraud_count,
            "avg_fat": float(self.avg_fat) if self.avg_fat else None,
            "avg_snf": float(self.avg_snf) if self.avg_snf else None,
            "avg_quantity": float(self.avg_quantity) if self.avg_quantity else None,
            "registered_at": self.registered_at.isoformat() if self.registered_at else None,
        }


class UploadBatch(db.Model):
    __tablename__ = "upload_batches"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(100), unique=True, nullable=False)
    file_name = db.Column(db.String(255))
    session_name = db.Column(db.String(255))
    upload_date = db.Column(db.Date)
    shift = db.Column(db.Enum("morning", "evening"))
    total_records = db.Column(db.Integer, default=0)
    accepted = db.Column(db.Integer, default=0)
    rejected = db.Column(db.Integer, default=0)
    fraud_alerts = db.Column(db.Integer, default=0)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "file_name": self.file_name,
            "session_name": self.session_name,
            "upload_date": self.upload_date.isoformat() if self.upload_date else None,
            "shift": self.shift,
            "total_records": self.total_records,
            "accepted": self.accepted,
            "rejected": self.rejected,
            "fraud_alerts": self.fraud_alerts,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class MilkRecord(db.Model):
    __tablename__ = "milk_records"

    id = db.Column(db.Integer, primary_key=True)
    batch_id = db.Column(db.String(50))
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmers.id"), nullable=True)
    farmer_name = db.Column(db.String(100), nullable=False)
    farmer_code = db.Column(db.String(20))
    date = db.Column(db.Date, nullable=False)
    shift = db.Column(db.Enum("morning", "evening"), nullable=False)

    # Quality parameters
    fat = db.Column(db.Numeric(5, 3))
    snf = db.Column(db.Numeric(5, 3))
    ph = db.Column(db.Numeric(4, 2))
    acidity = db.Column(db.Numeric(5, 3))
    temperature = db.Column(db.Numeric(5, 2))
    specific_gravity = db.Column(db.Numeric(6, 4))
    cob_test = db.Column(db.Enum("negative", "positive"), default="negative")
    alcohol_test = db.Column(db.Enum("negative", "positive"), default="negative")
    organoleptic = db.Column(db.Enum("normal", "abnormal"), default="normal")
    sediment_test = db.Column(db.Enum("clean", "dirty"), default="clean")
    mbrt = db.Column(db.Numeric(4, 2))
    raw_milk_temp = db.Column(db.Numeric(5, 2))
    quantity = db.Column(db.Numeric(10, 2))

    # Decision
    decision = db.Column(db.Enum("accept", "reject", "manual_check"), nullable=False)
    reasons = db.Column(db.JSON)
    fraud_risk = db.Column(db.Enum("low", "medium", "high"), default="low")
    ml_prediction = db.Column(db.String(20))
    ml_confidence = db.Column(db.Numeric(5, 4))

    # Meta
    entry_type = db.Column(db.Enum("upload", "manual"), default="manual")
    upload_type = db.Column(db.String(50), default="bulk")
    session_name = db.Column(db.String(255))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    entered_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "farmer_id": self.farmer_id,
            "farmer_name": self.farmer_name,
            "farmer_code": self.farmer_code,
            "date": self.date.isoformat() if self.date else None,
            "shift": self.shift,
            "fat": float(self.fat) if self.fat else None,
            "snf": float(self.snf) if self.snf else None,
            "ph": float(self.ph) if self.ph else None,
            "acidity": float(self.acidity) if self.acidity else None,
            "temperature": float(self.temperature) if self.temperature else None,
            "specific_gravity": float(self.specific_gravity) if self.specific_gravity else None,
            "cob_test": self.cob_test,
            "alcohol_test": self.alcohol_test,
            "organoleptic": self.organoleptic,
            "sediment_test": self.sediment_test,
            "mbrt": float(self.mbrt) if self.mbrt else None,
            "raw_milk_temp": float(self.raw_milk_temp) if self.raw_milk_temp else None,
            "quantity": float(self.quantity) if self.quantity else None,
            "decision": self.decision,
            "reasons": self.reasons,
            "fraud_risk": self.fraud_risk,
            "ml_prediction": self.ml_prediction,
            "ml_confidence": float(self.ml_confidence) if self.ml_confidence else None,
            "entry_type": self.entry_type,
            "upload_type": self.upload_type,
            "session_name": self.session_name,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Setting(db.Model):
    __tablename__ = "settings"

    id = db.Column(db.Integer, primary_key=True)
    setting_key = db.Column(db.String(100), unique=True, nullable=False)
    setting_value = db.Column(db.Text)
    setting_type = db.Column(db.Enum("string", "number", "boolean", "json"), default="string")
    description = db.Column(db.Text)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "key": self.setting_key,
            "value": self.setting_value,
            "type": self.setting_type,
            "description": self.description,
        }


class Log(db.Model):
    __tablename__ = "logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    action = db.Column(db.String(100), nullable=False)
    entity_type = db.Column(db.String(50))
    entity_id = db.Column(db.Integer)
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(45))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
