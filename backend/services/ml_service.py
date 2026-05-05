"""
ML Service — RandomForestClassifier (decision prediction) +
             IsolationForest (fraud / anomaly detection)
"""
from __future__ import annotations
import os
import numpy as np
import joblib
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Feature order must match training
FEATURE_COLUMNS = [
    "fat", "snf", "ph", "acidity", "temperature",
    "specific_gravity", "mbrt", "raw_milk_temp",
    "cob_test_num", "alcohol_test_num",
    "organoleptic_num", "sediment_test_num",
]

DECISION_LABELS = ["accept", "manual_check", "reject"]


class MLService:
    """
    Wrapper around trained joblib models.
    Falls back gracefully when models are not yet trained.
    """

    def __init__(self, models_path: str):
        self.models_path = models_path
        self.clf_path = os.path.join(models_path, "decision_model.pkl")
        self.iso_path = os.path.join(models_path, "fraud_model.pkl")
        self.scaler_path = os.path.join(models_path, "scaler.pkl")

        self.classifier = None
        self.isolator = None
        self.scaler = None
        self._load_models()

    # ── Load ──────────────────────────────────────────────────────────────

    def _load_models(self):
        try:
            if os.path.exists(self.clf_path):
                self.classifier = joblib.load(self.clf_path)
                logger.info("Decision model loaded.")
            if os.path.exists(self.iso_path):
                self.isolator = joblib.load(self.iso_path)
                logger.info("Fraud model loaded.")
            if os.path.exists(self.scaler_path):
                self.scaler = joblib.load(self.scaler_path)
                logger.info("Scaler loaded.")
        except Exception as e:
            logger.warning(f"Could not load ML models: {e}")

    # ── Predict Decision ──────────────────────────────────────────────────

    def predict_decision(self, features: dict) -> tuple[str, float]:
        """
        Returns (label, confidence).
        Falls back to 'unknown' if model not loaded.
        """
        if self.classifier is None:
            return "unknown", 0.0

        try:
            X = self._build_feature_vector(features)
            if self.scaler:
                X = self.scaler.transform(X)
            probs = self.classifier.predict_proba(X)[0]
            idx = int(np.argmax(probs))
            label = DECISION_LABELS[idx]
            confidence = float(probs[idx])
            return label, confidence
        except Exception as e:
            logger.warning(f"Prediction failed: {e}")
            return "unknown", 0.0

    # ── Fraud Score ───────────────────────────────────────────────────────

    def fraud_score(self, features: dict) -> float:
        """
        Returns anomaly score (higher = more anomalous).
        IsolationForest score_samples returns negative values;
        we negate so higher = worse.
        """
        if self.isolator is None:
            return 0.0
        try:
            X = self._build_feature_vector(features)
            score = float(-self.isolator.score_samples(X)[0])
            # Normalise roughly to 0–1
            score = min(max((score + 0.5) / 1.0, 0.0), 1.0)
            return round(score, 4)
        except Exception as e:
            logger.warning(f"Fraud score failed: {e}")
            return 0.0

    # ── Helpers ───────────────────────────────────────────────────────────

    def _build_feature_vector(self, features: dict) -> np.ndarray:
        row = []
        for col in FEATURE_COLUMNS:
            row.append(float(features.get(col) or 0.0))
        return np.array(row).reshape(1, -1)

    @staticmethod
    def encode_categorical(sample: dict) -> dict:
        """Convert categorical fields to numeric for ML."""
        out = dict(sample)
        out["cob_test_num"] = 1.0 if str(sample.get("cob_test", "")).lower() == "positive" else 0.0
        out["alcohol_test_num"] = 1.0 if str(sample.get("alcohol_test", "")).lower() == "positive" else 0.0
        out["organoleptic_num"] = 1.0 if str(sample.get("organoleptic", "")).lower() == "abnormal" else 0.0
        out["sediment_test_num"] = 1.0 if str(sample.get("sediment_test", "")).lower() == "dirty" else 0.0
        return out

    def models_ready(self) -> bool:
        return self.classifier is not None and self.isolator is not None
