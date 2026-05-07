"""
Configuration module for Smart Milk Decision Tool System
"""
import os
from datetime import timedelta
from urllib.parse import quote_plus
from dotenv import load_dotenv

load_dotenv()


class Config:
    # ── Flask ──────────────────────────────────────────────
    SECRET_KEY = os.getenv("SECRET_KEY", "milk-quality-secret-2024-xK9#mP")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"

    # ── Database ───────────────────────────────────────────
    DB_HOST = os.getenv("MYSQLHOST")
    DB_PORT = os.getenv("MYSQLPORT", "3306")
    DB_NAME = os.getenv("MYSQLDATABASE")
    DB_USER = os.getenv("MYSQLUSER")
    DB_PASSWORD = os.getenv("MYSQLPASSWORD", "")

    if not all([DB_HOST, DB_NAME, DB_USER]):
        raise ValueError("CRITICAL: Missing required database environment variables (MYSQLHOST, MYSQLDATABASE, MYSQLUSER). Please check your Railway variables or .env file.")

    _encoded_user = quote_plus(DB_USER)
    _encoded_password = quote_plus(DB_PASSWORD) if DB_PASSWORD else ""
    SQLALCHEMY_DATABASE_URI = (
        f"mysql+pymysql://{_encoded_user}:{_encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        "?charset=utf8mb4"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_recycle": 280,
        "pool_pre_ping": True,
        "pool_size": 10,
        "max_overflow": 20,
    }

    # ── JWT ────────────────────────────────────────────────
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "smartmilksecret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # ── File Upload ────────────────────────────────────────
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB
    ALLOWED_EXTENSIONS = {"xlsx", "csv", "xls"}

    # ── ML Models ──────────────────────────────────────────
    ML_MODELS_PATH = os.path.join(os.path.dirname(__file__), "ml", "saved_models")

    # ── CORS ───────────────────────────────────────────────
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

    # ── Pagination ─────────────────────────────────────────
    PAGE_SIZE = 50


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig,
}

def get_config():
    env = os.getenv("FLASK_ENV", "development")
    return config_map.get(env, config_map["default"])
