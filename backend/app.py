"""
Smart Milk Decision Tool System — Flask Application Entry Point
"""
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.security import generate_password_hash

from config import get_config
from models.database import db, User, Setting




logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


def create_app():
    app = Flask(__name__)
    app.config.from_object(get_config())

    # ── Extensions ─────────────────────────────────────────────────────────
    db.init_app(app)
    JWTManager(app)
    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
         supports_credentials=True)

    # ── Ensure upload folder exists ─────────────────────────────────────────
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["ML_MODELS_PATH"], exist_ok=True)

    # ── ML Service (lazy-loaded, won't crash if models missing) ────────────
    from services.ml_service import MLService
    ml_svc = MLService(app.config["ML_MODELS_PATH"])
    app.config["ML_SERVICE"] = ml_svc
    if ml_svc.models_ready():
        logger.info("✓ ML models loaded and ready.")
    else:
        logger.warning("⚠  ML models not found. Run: python ml/train_models.py")

    # ── Blueprints ──────────────────────────────────────────────────────────
    from routes.auth import auth_bp
    from routes.predict import predict_bp
    from routes.upload import upload_bp
    from routes.records import records_bp, dashboard_bp, farmers_bp
    from routes.export import export_bp
    from routes.settings import settings_bp
    from routes.batches import batches_bp

    app.register_blueprint(auth_bp,      url_prefix="/api/auth")
    app.register_blueprint(predict_bp,   url_prefix="/api/predict")
    app.register_blueprint(upload_bp,    url_prefix="/api/upload")
    app.register_blueprint(records_bp,   url_prefix="/api/records")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(farmers_bp,   url_prefix="/api/farmers")
    app.register_blueprint(export_bp,    url_prefix="/api/export")
    app.register_blueprint(settings_bp,  url_prefix="/api/settings")
    app.register_blueprint(batches_bp,   url_prefix="/api/batches")

    # ── Health check ────────────────────────────────────────────────────────
    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok", "ml_ready": ml_svc.models_ready()}), 200

    # ── Error handlers ──────────────────────────────────────────────────────
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def internal(e):
        logger.exception("Unhandled server error")
        return jsonify({"error": "Internal server error"}), 500

    # ── DB init ─────────────────────────────────────────────────────────────
    with app.app_context():
        try:
            db.create_all()
            _seed_defaults()
            logger.info("✓ Database initialized successfully.")
        except Exception as e:
            logger.critical(f"FATAL: Could not connect to the database. Please verify your MySQL credentials and host. Error: {e}")
            raise

    return app


def _seed_defaults():
    """Create default admin user and settings if they don't exist."""
    if not User.query.filter_by(username="admin").first():
        admin = User(
            username="admin",
            email="admin@milkquality.com",
            password_hash=generate_password_hash("Admin@123"),
            role="admin",
            full_name="System Administrator",
        )
        db.session.add(admin)
        logger.info("✓ Default admin user created  (admin / Admin@123)")

    defaults = [
        ("fat_min", "3.2"), ("fat_max", "3.5"),
        ("snf_min", "8.3"), ("snf_max", "8.5"),
        ("ph_min", "6.5"), ("ph_max", "6.8"),
        ("acidity_min", "0.10"), ("acidity_max", "0.15"),
        ("temp_ideal", "10"), ("temp_acceptable", "15"),
        ("sg_min", "1.028"), ("sg_max", "1.032"),
        ("mbrt_good", "3"), ("mbrt_check", "2"),
        ("raw_milk_temp_min", "25"), ("raw_milk_temp_max", "37"),
        ("company_name", "DairyPure Quality Labs"),
        ("fraud_threshold", "3"),
    ]
    for key, value in defaults:
        if not Setting.query.filter_by(setting_key=key).first():
            db.session.add(Setting(setting_key=key, setting_value=value))

    db.session.commit()


if __name__ == "__main__":
    application = create_app()
    application.run(host="0.0.0.0", port=5001, debug=True)
