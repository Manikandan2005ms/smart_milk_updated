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
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", 3306))
    DB_NAME = os.getenv("DB_NAME", "smart_milk_db")
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    _encoded_user = quote_plus(DB_USER)
    _encoded_password = quote_plus(DB_PASSWORD)
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
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-milk-secret-2024-yR7&nQ")
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
