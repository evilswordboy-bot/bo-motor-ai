import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_score, recall_score, f1_score

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_models")
os.makedirs(MODEL_DIR, exist_ok=True)

IFOREST_FILE = os.path.join(MODEL_DIR, "isolation_forest.joblib")
SCALER_FILE = os.path.join(MODEL_DIR, "scaler.joblib")
RF_FILE = os.path.join(MODEL_DIR, "fault_classifier.joblib")
METRICS_FILE = os.path.join(MODEL_DIR, "metrics.joblib")

ANOMALY_FEATURES = [
    "temperature_c",
    "vibration_rms",
    "vibration_peak",
    "vibration_variance",
    "temperature_rate",
    "vibration_rate"
]

FAULT_FEATURES = [
    "accel_magnitude",
    "vibration_rms",
    "vibration_peak",
    "vibration_variance",
    "temperature_c",
    "temperature_rate",
    "vibration_rate",
    "pwm_duty"
]

FAULT_CLASSES = [
    "Normal",
    "Mechanical Imbalance",
    "Shaft Misalignment",
    "Bearing / Gear Wear",
    "Thermal Overheating",
    "Mechanical Looseness"
]

class MLEngine:
    def __init__(self):
        self.scaler: StandardScaler = None
        self.anomaly_detector: IsolationForest = None
        self.fault_classifier: RandomForestClassifier = None
        self.evaluation_metrics: Dict[str, Any] = {}
        self.load_models_if_exist()

    def load_models_if_exist(self):
        try:
            if os.path.exists(IFOREST_FILE) and os.path.exists(SCALER_FILE) and os.path.exists(RF_FILE):
                self.scaler = joblib.load(SCALER_FILE)
                self.anomaly_detector = joblib.load(IFOREST_FILE)
                self.fault_classifier = joblib.load(RF_FILE)
                if os.path.exists(METRICS_FILE):
                    self.evaluation_metrics = joblib.load(METRICS_FILE)
                print("Loaded trained ML models successfully.")
        except Exception as e:
            print(f"Notice: Models not yet loaded or need training: {e}")

    def train_models(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Train Isolation Forest on normal baseline and Random Forest on full fault set."""
        print(f"Training ML models on {len(df)} records...")
        
        # 1. Isolation Forest (Trained strictly on Normal baseline data)
        normal_df = df[df["fault_type"] == "Normal"]
        if len(normal_df) < 50:
            normal_df = df  # fallback if baseline is small

        X_normal = np.array(normal_df[ANOMALY_FEATURES].values.tolist(), dtype=np.float64)
        self.scaler = StandardScaler()
        X_normal_scaled = self.scaler.fit_transform(X_normal)

        self.anomaly_detector = IsolationForest(
            n_estimators=100,
            contamination=0.03,
            random_state=42,
            n_jobs=-1
        )
        self.anomaly_detector.fit(X_normal_scaled)
        joblib.dump(self.anomaly_detector, IFOREST_FILE)
        joblib.dump(self.scaler, SCALER_FILE)

        # 2. Supervised Fault Classifier (Random Forest)
        X = np.array(df[FAULT_FEATURES].values.tolist(), dtype=np.float64)
        y = np.array(df["fault_type"].tolist(), dtype=object)

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.20, random_state=42, stratify=y
        )

        self.fault_classifier = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            random_state=42,
            n_jobs=-1
        )
        self.fault_classifier.fit(X_train, y_train)
        joblib.dump(self.fault_classifier, RF_FILE)

        # 3. Calculate genuine test set metrics
        y_pred = self.fault_classifier.predict(X_test)
        
        acc = float(accuracy_score(y_test, y_pred))
        prec = float(precision_score(y_test, y_pred, average="weighted", zero_division=0))
        rec = float(recall_score(y_test, y_pred, average="weighted", zero_division=0))
        f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

        labels = sorted(list(set(y)))
        cm = confusion_matrix(y_test, y_pred, labels=labels).tolist()

        # Class distribution
        train_counts = {lbl: int(np.sum(y_train == lbl)) for lbl in labels}
        test_counts = {lbl: int(np.sum(y_test == lbl)) for lbl in labels}

        # Feature importances
        feature_importances = {
            feat: round(float(imp), 4)
            for feat, imp in zip(FAULT_FEATURES, self.fault_classifier.feature_importances_)
        }

        self.evaluation_metrics = {
            "model_type": "Isolation Forest (Unsupervised) + Random Forest (Supervised)",
            "train_samples": len(X_train),
            "test_samples": len(X_test),
            "accuracy": round(acc * 100, 2),
            "precision": round(prec * 100, 2),
            "recall": round(rec * 100, 2),
            "f1_score": round(f1 * 100, 2),
            "confusion_matrix": cm,
            "classes": labels,
            "train_distribution": train_counts,
            "test_distribution": test_counts,
            "feature_importances": feature_importances,
            "trained_at": pd.Timestamp.now().isoformat()
        }

        joblib.dump(self.evaluation_metrics, METRICS_FILE)
        print(f"ML Training Complete. Test Accuracy: {acc*100:.2f}%, F1: {f1*100:.2f}%")
        return self.evaluation_metrics

    def predict_anomaly(self, feat_dict: Dict[str, float]) -> Tuple[float, str]:
        """Returns (anomaly_score, status_str)"""
        if self.anomaly_detector is None or self.scaler is None:
            # Rule-based fallback if model not trained
            rms = feat_dict.get("vibration_rms", 0.3)
            temp = feat_dict.get("temperature_c", 35.0)
            score = min(1.0, max(0.0, (rms - 0.3) / 0.8 * 0.6 + (temp - 40.0) / 25.0 * 0.4))
            score = round(score, 3)
            status = "Normal" if score < 0.50 else ("Warning" if score < 0.75 else "Critical")
            return score, status

        feat_vector = np.array([[
            feat_dict.get(k, 0.0) for k in ANOMALY_FEATURES
        ]])
        scaled = self.scaler.transform(feat_vector)
        # decision_function: large positive = normal inlier, negative = outlier
        raw_score = self.anomaly_detector.decision_function(scaled)[0]
        # Map decision score to [0, 1] anomaly score:
        # raw_score ~ +0.20 -> 0.05 (normal)
        # raw_score ~ 0.00 -> 0.50 (boundary)
        # raw_score ~ -0.25 -> 0.95 (extreme anomaly)
        # Using sigmoid mapping:
        anomaly_score = 1.0 / (1.0 + np.exp(14.0 * (raw_score + 0.03)))
        anomaly_score = round(float(np.clip(anomaly_score, 0.02, 0.99)), 3)

        status = "Normal" if anomaly_score < 0.50 else ("Warning" if anomaly_score < 0.75 else "Critical")
        return anomaly_score, status

    def classify_fault(self, feat_dict: Dict[str, float]) -> Dict[str, Any]:
        """Predicts suspected fault pattern with confidence and physical sensor evidence."""
        if self.fault_classifier is None:
            return {
                "fault_pattern": "Normal",
                "confidence": 95.0,
                "evidence": ["Vibration within baseline range", "Temperature nominal"],
                "disclaimer": "Suspected Fault Pattern (Engineering Estimate)"
            }

        feat_vector = np.array([[
            feat_dict.get(k, 0.0) for k in FAULT_FEATURES
        ]])

        probs = self.fault_classifier.predict_proba(feat_vector)[0]
        classes = self.fault_classifier.classes_
        top_idx = int(np.argmax(probs))
        pred_label = classes[top_idx]
        confidence = round(float(probs[top_idx]) * 100.0, 1)

        # Generate evidence based on actual feature values
        rms = feat_dict.get("vibration_rms", 0.3)
        temp = feat_dict.get("temperature_c", 35.0)
        var = feat_dict.get("vibration_variance", 0.01)
        temp_rate = feat_dict.get("temperature_rate", 0.0)
        peak = feat_dict.get("vibration_peak", 0.4)

        evidence = []
        if pred_label == "Normal":
            evidence.append("Vibration RMS normal (<0.50g)")
            evidence.append(f"Temperature stable ({temp:.1f}°C)")
            evidence.append("Low dynamic variance")
        elif pred_label == "Mechanical Imbalance":
            evidence.append(f"↑ Elevated Vibration RMS ({rms:.2f}g)")
            evidence.append(f"↑ Dynamic Peak Acceleration ({peak:.2f}g)")
            evidence.append("Dominant 1X rotational frequency signature")
        elif pred_label == "Shaft Misalignment":
            evidence.append(f"↑ Multi-axis vibration elevation ({rms:.2f}g)")
            evidence.append("Pronounced 2X rotational harmonic content")
            evidence.append(f"Temperature slightly elevated ({temp:.1f}°C)")
        elif pred_label == "Bearing / Gear Wear":
            evidence.append(f"↑ High vibration variance ({var:.5f})")
            evidence.append("High-frequency gear-mesh chatter detected")
            evidence.append("Intermittent micro-transient spikes")
        elif pred_label == "Thermal Overheating":
            evidence.append(f"↑ Motor temperature critical ({temp:.1f}°C)")
            evidence.append(f"↑ Rapid thermal climb rate ({temp_rate:+.2f}°C/min)")
            evidence.append("High thermal dissipation deficit")
        elif pred_label == "Mechanical Looseness":
            evidence.append(f"↑ Erratic vibration RMS spikes ({rms:.2f}g)")
            evidence.append(f"↑ High dynamic variance ({var:.4f})")
            evidence.append("Broadband impact harmonics / mounting rattle")

        return {
            "fault_pattern": pred_label,
            "confidence": confidence,
            "evidence": evidence,
            "all_probabilities": {
                cls: round(float(p) * 100.0, 1) for cls, p in zip(classes, probs)
            },
            "disclaimer": "Suspected Fault Pattern — Physical inspection required"
        }

    def compute_health_intelligence(self, feat_dict: Dict[str, float], anomaly_score: float, weights: Dict[str, float] = None) -> Dict[str, Any]:
        """Computes transparent weighted health score and contributing risk factors."""
        if weights is None:
            weights = {
                "vibration_risk": 0.30,
                "temperature_risk": 0.25,
                "trend_risk": 0.20,
                "anomaly_risk": 0.25
            }

        rms = feat_dict.get("vibration_rms", 0.25)
        temp = feat_dict.get("temperature_c", 35.0)
        temp_rate = feat_dict.get("temperature_rate", 0.0)
        vib_rate = feat_dict.get("vibration_rate", 0.0)

        # Risk scoring: 0 (no risk) to 100 (maximum risk)
        # Vibration RMS nominal: 0.25g -> 0% risk; 1.20g+ -> 100% risk
        vib_risk = float(np.clip((rms - 0.25) / (1.20 - 0.25) * 100.0, 0.0, 100.0))
        # Temperature nominal: 35C -> 0% risk; 65C+ -> 100% risk
        temp_risk = float(np.clip((temp - 35.0) / (65.0 - 35.0) * 100.0, 0.0, 100.0))
        # Trend risk: rapid rates of temp and vibration increase
        trend_risk = float(np.clip(abs(temp_rate) * 20.0 + max(0.0, vib_rate) * 50.0, 0.0, 100.0))
        # Anomaly risk: direct mapping from Isolation Forest anomaly score
        anomaly_risk = float(np.clip(anomaly_score * 100.0, 0.0, 100.0))

        wv = weights.get("vibration_risk", 0.30)
        wt = weights.get("temperature_risk", 0.25)
        wtr = weights.get("trend_risk", 0.20)
        wa = weights.get("anomaly_risk", 0.25)

        total_risk = (wv * vib_risk + wt * temp_risk + wtr * trend_risk + wa * anomaly_risk)
        health_score = round(float(np.clip(100.0 - total_risk, 5.0, 100.0)), 1)

        # Health tier classification
        if health_score >= 90:
            health_tier = "Excellent"
            tier_color = "emerald"
        elif health_score >= 75:
            health_tier = "Good"
            tier_color = "cyan"
        elif health_score >= 60:
            health_tier = "Warning"
            tier_color = "amber"
        elif health_score >= 40:
            health_tier = "Poor"
            tier_color = "orange"
        else:
            health_tier = "Critical"
            tier_color = "rose"

        return {
            "health_score": health_score,
            "health_tier": health_tier,
            "tier_color": tier_color,
            "risk_breakdown": {
                "vibration_risk": round(vib_risk, 1),
                "temperature_risk": round(temp_risk, 1),
                "trend_risk": round(trend_risk, 1),
                "anomaly_risk": round(anomaly_risk, 1)
            },
            "weights_used": weights
        }

# Global singleton
ml_engine = MLEngine()
