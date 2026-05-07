"""
ML Training Script
==================
Run once to generate synthetic training data and train:
  1. RandomForestClassifier  → decision_model.pkl
  2. IsolationForest         → fraud_model.pkl
  3. StandardScaler          → scaler.pkl

Usage:
    cd backend
    python ml/train_models.py
"""
from __future__ import annotations
import os
import sys
import numpy as np
import joblib
import logging

from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(message)s")
log = logging.getLogger(__name__)

SAVE_PATH = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(SAVE_PATH, exist_ok=True)

FEATURE_COLS = [
    "fat", "snf", "ph", "acidity", "temperature",
    "specific_gravity", "mbrt", "cob_test_num",
]

rng = np.random.default_rng(42)


# ── Synthetic data generators ──────────────────────────────────────────────────

def make_accept_sample():
    return {
        "fat": rng.uniform(3.2, 3.5),
        "snf": rng.uniform(8.3, 8.5),
        "ph": rng.uniform(6.5, 6.8),
        "acidity": rng.uniform(0.10, 0.15),
        "temperature": rng.uniform(4, 10),
        "specific_gravity": rng.uniform(1.028, 1.032),
        "mbrt": rng.uniform(3.5, 6.0),
        "raw_milk_temp": rng.uniform(25, 37),
        "cob_test_num": 0,
        "alcohol_test_num": 0,
        "organoleptic_num": 0,
        "sediment_test_num": 0,
    }


def make_reject_sample():
    s = make_accept_sample()
    choice = rng.integers(0, 8)
    if choice == 0:
        s["cob_test_num"] = 1
    elif choice == 1:
        s["mbrt"] = rng.uniform(0.5, 1.9)
    elif choice == 2:
        s["fat"] = rng.choice([rng.uniform(1.0, 3.1), rng.uniform(3.6, 6.0)])
    elif choice == 3:
        s["snf"] = rng.choice([rng.uniform(5.0, 8.2), rng.uniform(8.6, 10.0)])
    elif choice == 4:
        s["ph"] = rng.choice([rng.uniform(5.0, 6.4), rng.uniform(6.9, 8.0)])
    elif choice == 5:
        s["temperature"] = rng.uniform(15.1, 30.0)
    elif choice == 6:
        s["acidity"] = rng.choice([rng.uniform(0.01, 0.09), rng.uniform(0.16, 0.30)])
    else:
        s["specific_gravity"] = rng.choice([rng.uniform(1.000, 1.027), rng.uniform(1.033, 1.050)])
    return s


def generate_dataset(n_per_class: int = 2000):
    X, y = [], []
    generators = [
        (make_accept_sample, 0),
        (make_reject_sample, 1),
    ]
    for gen, label in generators:
        for _ in range(n_per_class):
            s = gen()
            X.append([s[c] for c in FEATURE_COLS])
            y.append(label)
    return np.array(X, dtype=float), np.array(y)


# ── Train ──────────────────────────────────────────────────────────────────────

def train():
    log.info("Generating synthetic training data …")
    X, y = generate_dataset(n_per_class=2000)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    log.info("Fitting StandardScaler …")
    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc = scaler.transform(X_test)

    log.info("Training RandomForestClassifier …")
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    clf.fit(X_train_sc, y_train)
    preds = clf.predict(X_test_sc)
    log.info("\n" + classification_report(
        y_test, preds, target_names=["accept", "reject"]
    ))

    log.info("Training IsolationForest …")
    # Train only on 'accept' samples for anomaly detection
    X_normal = X_train_sc[y_train == 0]
    iso = IsolationForest(
        n_estimators=200,
        contamination=0.05,
        random_state=42,
        n_jobs=-1,
    )
    iso.fit(X_normal)

    log.info("Saving models …")
    joblib.dump(clf, os.path.join(SAVE_PATH, "decision_model.pkl"), compress=3)
    joblib.dump(iso, os.path.join(SAVE_PATH, "fraud_model.pkl"), compress=3)
    joblib.dump(scaler, os.path.join(SAVE_PATH, "scaler.pkl"), compress=3)
    log.info(f"✓ Models saved to {SAVE_PATH}")


if __name__ == "__main__":
    train()
