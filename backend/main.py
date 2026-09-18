import asyncio
import json
import math
import os
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from database import init_db, get_db_connection
from feature_engineering import FeatureExtractor
from ml_engine import ml_engine, FAULT_CLASSES, ANOMALY_FEATURES, FAULT_FEATURES
from synthetic_generator import generate_bo_motor_dataset

# Initialize database
init_db()

app = FastAPI(
    title="BO MOTOR AI - Predictive Maintenance & Intelligent Fault Detection",
    description="IoT + AI Based Early Fault Detection using Vibration and Temperature Analysis",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global runtime state
feature_extractor = FeatureExtractor(window_size=10, nominal_rpm=200.0)
last_real_data_time: Optional[float] = None
active_connections: List[WebSocket] = []
simulator_running = True
simulator_task = None

# Pydantic Ingest Schema per specification
class SensorIngestPayload(BaseModel):
    motor_id: str = Field(default="BO_MOTOR_01")
    temperature: float = Field(..., description="Temperature in Celsius")
    ax: float = Field(..., description="X-axis acceleration (g)")
    ay: float = Field(..., description="Y-axis acceleration (g)")
    az: float = Field(..., description="Z-axis acceleration (g)")
    gyro_x: float = Field(default=0.0, description="Gyro X (rad/s or deg/s)")
    gyro_y: float = Field(default=0.0, description="Gyro Y (rad/s or deg/s)")
    gyro_z: float = Field(default=0.0, description="Gyro Z (rad/s or deg/s)")
    pwm_duty: float = Field(default=80.0, description="PWM duty cycle percentage (0-100%)")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp")
    source: Optional[str] = Field(default="real", description="'real' or 'synthetic'")

class SettingsPayload(BaseModel):
    temp_normal_max: Optional[float] = 45.0
    temp_warning_max: Optional[float] = 60.0
    anomaly_warning_threshold: Optional[float] = 0.50
    anomaly_critical_threshold: Optional[float] = 0.75
    health_weights: Optional[Dict[str, float]] = None
    vibration_rolling_window_sec: Optional[float] = 2.0
    data_polling_interval_ms: Optional[int] = 2000
    motor_nominal_rpm: Optional[float] = 200.0

def get_setting(key: str, default: Any) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value_json FROM system_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["value_json"])
        except:
            return default
    return default

def save_setting(key: str, val: Any):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO system_settings VALUES (?, ?)", (key, json.dumps(val)))
    conn.commit()
    conn.close()

async def broadcast_ws(data: Dict[str, Any]):
    dead = []
    for ws in active_connections:
        try:
            await ws.send_json(data)
        except Exception:
            dead.append(ws)
    for ws in dead:
        if ws in active_connections:
            active_connections.remove(ws)

# Core processing function for both real ingest and simulated stream
def process_sensor_reading(payload: SensorIngestPayload) -> Dict[str, Any]:
    global last_real_data_time
    now_ts = time.time()
    iso_time = payload.timestamp or datetime.now().isoformat()
    source_type = payload.source if payload.source in ["real", "synthetic"] else "real"

    if source_type == "real":
        last_real_data_time = now_ts

    # 1. Feature Engineering
    features = feature_extractor.add_reading(
        ax=payload.ax,
        ay=payload.ay,
        az=payload.az,
        temp=payload.temperature,
        pwm_duty=payload.pwm_duty,
        timestamp=now_ts
    )
    features["pwm_duty"] = payload.pwm_duty

    # 2. AI Anomaly Detection (Isolation Forest)
    anomaly_score, status = ml_engine.predict_anomaly(features)

    # 3. Supervised Fault Classification (Random Forest)
    fault_result = ml_engine.classify_fault(features)

    # 4. Motor Health Intelligence
    health_weights = get_setting("health_weights", {
        "vibration_risk": 0.30,
        "temperature_risk": 0.25,
        "trend_risk": 0.20,
        "anomaly_risk": 0.25
    })
    health_intel = ml_engine.compute_health_intelligence(features, anomaly_score, health_weights)

    # 5. Database persistence
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    INSERT INTO sensor_readings (
        timestamp, motor_id, source, pwm_duty, ax, ay, az, gyro_x, gyro_y, gyro_z, temperature_c
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        iso_time,
        payload.motor_id,
        source_type,
        payload.pwm_duty,
        payload.ax,
        payload.ay,
        payload.az,
        payload.gyro_x,
        payload.gyro_y,
        payload.gyro_z,
        payload.temperature
    ))
    reading_id = cursor.lastrowid

    cursor.execute("""
    INSERT INTO features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        reading_id,
        iso_time,
        payload.motor_id,
        features["accel_magnitude"],
        features["vibration_rms"],
        features["vibration_peak"],
        features["vibration_variance"],
        features["temperature_c"],
        features["temperature_rate"],
        features["vibration_rate"],
        features["rpm_estimated"]
    ))

    cursor.execute("""
    INSERT INTO anomalies (reading_id, timestamp, motor_id, anomaly_score, is_anomaly, severity, features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        reading_id,
        iso_time,
        payload.motor_id,
        anomaly_score,
        1 if status != "Normal" else 0,
        status,
        json.dumps(features)
    ))

    cursor.execute("""
    INSERT INTO fault_predictions (reading_id, timestamp, motor_id, fault_type, confidence, evidence_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        reading_id,
        iso_time,
        payload.motor_id,
        fault_result["fault_pattern"],
        fault_result["confidence"],
        json.dumps(fault_result["evidence"])
    ))

    cursor.execute("""
    INSERT INTO health_logs (reading_id, timestamp, health_score, vibration_risk, temperature_risk, trend_risk, anomaly_risk)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        reading_id,
        iso_time,
        health_intel["health_score"],
        health_intel["risk_breakdown"]["vibration_risk"],
        health_intel["risk_breakdown"]["temperature_risk"],
        health_intel["risk_breakdown"]["trend_risk"],
        health_intel["risk_breakdown"]["anomaly_risk"]
    ))

    # 6. Automatic Alert Generation
    temp_warn = get_setting("temp_normal_max", 45.0)
    temp_crit = get_setting("temp_warning_max", 60.0)

    if status == "Critical" or payload.temperature >= temp_crit:
        cursor.execute("""
        INSERT INTO alerts (timestamp, motor_id, severity, title, message, sensor_evidence, action_recommended)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            iso_time,
            payload.motor_id,
            "critical",
            "CRITICAL FAULT DETECTED",
            f"Anomaly score {anomaly_score:.2f} or temperature {payload.temperature:.1f}°C exceeded critical boundary.",
            f"Vib RMS: {features['vibration_rms']}g, Suspected: {fault_result['fault_pattern']} ({fault_result['confidence']}%)",
            "Immediately stop motor or reduce PWM duty. Inspect gearbox and mounting."
        ))
    elif status == "Warning" or payload.temperature >= temp_warn:
        cursor.execute("""
        INSERT INTO alerts (timestamp, motor_id, severity, title, message, sensor_evidence, action_recommended)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            iso_time,
            payload.motor_id,
            "warning",
            "ELEVATED VIBRATION / THERMAL PATTERN",
            f"Vibration RMS or temperature trending into warning zone ({status}).",
            f"Vib RMS: {features['vibration_rms']}g, Temp: {payload.temperature:.1f}°C",
            "Schedule preventive mechanical check on motor bracket and coupler."
        ))

    conn.commit()
    conn.close()

    result = {
        "reading_id": reading_id,
        "timestamp": iso_time,
        "motor_id": payload.motor_id,
        "source": source_type,
        "raw": {
            "ax": payload.ax,
            "ay": payload.ay,
            "az": payload.az,
            "gyro_x": payload.gyro_x,
            "gyro_y": payload.gyro_y,
            "gyro_z": payload.gyro_z,
            "temperature_c": payload.temperature,
            "pwm_duty": payload.pwm_duty
        },
        "features": features,
        "anomaly": {
            "score": anomaly_score,
            "status": status,
            "is_anomaly": status != "Normal"
        },
        "fault_classification": fault_result,
        "health_intelligence": health_intel
    }
    return result

# ----------------- REST Endpoints -----------------

@app.post("/api/ingest")
async def ingest_sensor_data(payload: SensorIngestPayload):
    """
    Ingest live reading from ESP32 DevKit V1 or external client.
    Computes physics features, evaluates ML models, logs data, generates alerts, broadcasts over WebSocket.
    """
    try:
        result = process_sensor_reading(payload)
        # Broadcast to any active UI dashboards
        await broadcast_ws({"type": "live_reading", "data": result})
        return {
            "status": "success",
            "message": "Telemetry processed and stored",
            "prediction": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/status")
def get_system_status():
    global last_real_data_time
    now = time.time()
    is_live = False
    if last_real_data_time and (now - last_real_data_time) < 25.0:
        is_live = True

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'real'")
    real_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'synthetic'")
    synthetic_count = cursor.fetchone()[0]

    cursor.execute("SELECT timestamp FROM sensor_readings ORDER BY id DESC LIMIT 1")
    last_row = cursor.fetchone()
    last_updated = last_row["timestamp"] if last_row else datetime.now().isoformat()
    conn.close()

    return {
        "connection_state": "live" if is_live else "demo",
        "connection_label": "● LIVE DATA | ESP32 Connected" if is_live else "● DEMO MODE | Simulated Sensor Data",
        "is_esp32_connected": is_live,
        "simulator_active": simulator_running,
        "last_updated": last_updated,
        "real_records_count": real_count,
        "synthetic_records_count": synthetic_count,
        "total_records_count": real_count + synthetic_count,
        "motor_id": "BO_MOTOR_01"
    }

@app.get("/api/overview")
def get_overview_dashboard():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Latest reading with features, anomaly, fault, health
    cursor.execute("""
    SELECT r.*, f.accel_magnitude, f.vibration_rms, f.vibration_peak, f.vibration_variance,
           f.temperature_rate, f.vibration_rate, f.rpm_estimated,
           a.anomaly_score, a.severity as anomaly_status,
           fp.fault_type, fp.confidence, fp.evidence_json,
           h.health_score, h.vibration_risk, h.temperature_risk, h.trend_risk, h.anomaly_risk
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    ORDER BY r.id DESC LIMIT 2
    """)
    rows = cursor.fetchall()

    if not rows:
        conn.close()
        raise HTTPException(status_code=404, detail="No sensor data found. Run /api/dataset/generate first.")

    latest = dict(rows[0])
    previous = dict(rows[1]) if len(rows) > 1 else latest

    # Deltas
    temp_delta = round(latest["temperature_c"] - previous["temperature_c"], 2)
    vib_delta = round((latest["vibration_rms"] or 0.3) - (previous["vibration_rms"] or 0.3), 3)
    health_delta = round((latest["health_score"] or 85.0) - (previous["health_score"] or 85.0), 1)

    # Health category
    h_score = latest["health_score"] or 85.0
    if h_score >= 90:
        h_tier = "Excellent"
        h_color = "emerald"
    elif h_score >= 75:
        h_tier = "Good"
        h_color = "cyan"
    elif h_score >= 60:
        h_tier = "Warning"
        h_color = "amber"
    elif h_score >= 40:
        h_tier = "Poor"
        h_color = "orange"
    else:
        h_tier = "Critical"
        h_color = "rose"

    # Maintenance Risk interpretation
    anom_score = latest["anomaly_score"] or 0.15
    if h_score < 40 or anom_score > 0.75:
        maint_risk = "Critical"
        maint_desc = "High vibration and thermal abnormalities detected. Imminent mechanical disruption probable if continued under load."
    elif h_score < 65 or anom_score > 0.50:
        maint_risk = "Elevated"
        maint_desc = "Vibration and temperature are increasing compared with the learned normal operating pattern."
    elif h_score < 80:
        maint_risk = "Moderate"
        maint_desc = "Slight variance observed in vibration harmonics. Normal operational fatigue within acceptable envelope."
    else:
        maint_risk = "Low"
        maint_desc = "Motor operating within baseline parameters. Commutator brush and gear mesh conditions nominal."

    # Parse evidence
    evidence = []
    if latest.get("evidence_json"):
        try:
            ev = json.loads(latest["evidence_json"])
            if isinstance(ev, list):
                evidence = ev
            elif isinstance(ev, dict) and "evidence" in ev:
                evidence = [ev["evidence"]]
        except:
            evidence = ["Elevated dynamic acceleration spectrum"]

    # Recent alerts
    cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 5")
    alerts = [dict(a) for a in cursor.fetchall()]

    # Recent 10 readings
    cursor.execute("""
    SELECT r.id, r.timestamp, r.source, r.temperature_c, f.vibration_rms,
           h.health_score, a.anomaly_score, a.severity as status, fp.fault_type
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    ORDER BY r.id DESC LIMIT 10
    """)
    recent_table = [dict(row) for row in cursor.fetchall()]

    # Counts
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'real'")
    real_cnt = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'synthetic'")
    syn_cnt = cursor.fetchone()[0]

    # Motor device metadata
    cursor.execute("SELECT * FROM motors WHERE motor_id = 'BO_MOTOR_01'")
    motor_row = cursor.fetchone()
    motor_info = dict(motor_row) if motor_row else {}

    conn.close()

    return {
        "kpis": {
            "temperature": {
                "value": latest["temperature_c"],
                "unit": "°C",
                "delta": temp_delta,
                "delta_label": f"{'↑' if temp_delta >= 0 else '↓'} {abs(temp_delta)} °C",
                "status": "Critical" if latest["temperature_c"] >= 60 else ("Warning" if latest["temperature_c"] >= 45 else "Normal")
            },
            "vibration_rms": {
                "value": round(latest["vibration_rms"] or 0.3, 3),
                "unit": "g",
                "delta": vib_delta,
                "delta_label": f"{'↑' if vib_delta >= 0 else '↓'} {abs(vib_delta):.3f} g",
                "status": "Critical" if (latest["vibration_rms"] or 0) > 1.0 else ("Warning" if (latest["vibration_rms"] or 0) > 0.6 else "Normal")
            },
            "motor_health": {
                "value": latest["health_score"] or 85.0,
                "tier": h_tier,
                "tier_color": h_color,
                "previous_value": previous["health_score"] or 85.0,
                "delta": health_delta,
                "delta_label": f"{'+' if health_delta >= 0 else ''}{health_delta}%",
                "risk_breakdown": {
                    "vibration_risk": latest.get("vibration_risk", 15.0),
                    "temperature_risk": latest.get("temperature_risk", 18.0),
                    "trend_risk": latest.get("trend_risk", 10.0),
                    "anomaly_risk": latest.get("anomaly_risk", 12.0)
                }
            },
            "anomaly": {
                "status": latest.get("anomaly_status", "Normal"),
                "score": round(latest.get("anomaly_score", 0.12), 3),
                "color": "rose" if latest.get("anomaly_status") == "Critical" else ("amber" if latest.get("anomaly_status") == "Warning" else "emerald")
            },
            "speed": {
                "estimated_rpm": latest.get("rpm_estimated", 180.0),
                "label": "Estimated / Simulated RPM",
                "disclaimer": "Estimated proxy derived from PWM duty & load drag. No physical optical/hall encoder attached to BO motor."
            }
        },
        "fault_intelligence": {
            "possible_fault": latest.get("fault_type", "Normal"),
            "confidence": latest.get("confidence", 95.0),
            "evidence": evidence,
            "disclaimer": "Suspected Fault Pattern (Engineering Estimate — Not Confirmed)"
        },
        "maintenance_intelligence": {
            "risk_level": maint_risk,
            "condition_summary": maint_desc,
            "checklist": [
                "Inspect BO motor mounting bracket for loosened fasteners",
                "Check gearbox for gear tooth chatter or plastic spur gear wear",
                "Verify output shaft and wheel coupler alignment",
                "Listen for abnormal acoustic noise / commutator sparking",
                "Measure motor casing temperature with external probe",
                "Continue vibration RMS telemetry logging"
            ]
        },
        "device": motor_info,
        "provenance": {
            "real_samples": real_cnt,
            "synthetic_samples": syn_cnt,
            "total_samples": real_cnt + syn_cnt,
            "fault_conditions_count": len(FAULT_CLASSES),
            "models_in_use": "Isolation Forest (Anomaly) + Random Forest (Fault Classification)"
        },
        "recent_alerts": alerts,
        "recent_readings": recent_table
    }

@app.get("/api/charts/vibration")
def get_vibration_chart(time_range: str = Query("1H", alias="range")):
    """Returns sampled vibration RMS, raw 3-axis accel, peak, variance."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Determine limit based on range
    limit_map = {"1H": 180, "6H": 360, "12H": 500, "24H": 720, "7D": 1000}
    limit = limit_map.get(time_range, 200)

    cursor.execute(f"""
    SELECT r.id, r.timestamp, r.ax, r.ay, r.az,
           f.accel_magnitude, f.vibration_rms, f.vibration_peak, f.vibration_variance,
           f.temperature_c, h.health_score, a.anomaly_score, a.severity as status
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    ORDER BY r.id DESC LIMIT {limit}
    """)
    rows = cursor.fetchall()
    conn.close()

    data = [dict(r) for r in reversed(rows)]
    return {
        "range": time_range,
        "count": len(data),
        "data": data,
        "thresholds": {
            "rms_normal": 0.50,
            "rms_warning": 0.80,
            "rms_critical": 1.10
        }
    }

@app.get("/api/charts/temperature")
def get_temperature_chart(time_range: str = Query("1H", alias="range")):
    """Returns motor temperature trend with configurable zones and detected patterns."""
    conn = get_db_connection()
    cursor = conn.cursor()

    limit_map = {"1H": 180, "6H": 360, "12H": 500, "24H": 720, "7D": 1000}
    limit = limit_map.get(time_range, 200)

    cursor.execute(f"""
    SELECT r.id, r.timestamp, r.temperature_c, f.temperature_rate,
           a.anomaly_score, a.severity as status
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    ORDER BY r.id DESC LIMIT {limit}
    """)
    rows = cursor.fetchall()
    conn.close()

    data = [dict(r) for r in reversed(rows)]

    temp_normal = get_setting("temp_normal_max", 45.0)
    temp_warning = get_setting("temp_warning_max", 60.0)

    # Detect thermal patterns
    recent_temps = [d["temperature_c"] for d in data[-30:]] if len(data) >= 30 else [d["temperature_c"] for d in data]
    gradual_rise = False
    sudden_rise = False
    persistent_high = False

    if len(recent_temps) > 5:
        if (recent_temps[-1] - recent_temps[0]) > 6.0:
            gradual_rise = True
        if max(recent_temps) - min(recent_temps) > 12.0:
            sudden_rise = True
        if sum(1 for t in recent_temps if t >= temp_warning) > len(recent_temps) * 0.4:
            persistent_high = True

    return {
        "range": time_range,
        "count": len(data),
        "data": data,
        "zones": {
            "normal_max": temp_normal,
            "warning_max": temp_warning,
            "critical_min": temp_warning
        },
        "patterns_detected": {
            "gradual_rise": gradual_rise,
            "sudden_rise": sudden_rise,
            "persistent_high": persistent_high,
            "abnormal_rate": any(abs(d.get("temperature_rate") or 0) > 1.8 for d in data[-20:])
        }
    }

@app.get("/api/charts/scatter")
def get_temperature_vs_vibration_scatter(sample_size: int = 500):
    """Generates scatter plot of Temperature vs Vibration RMS color-coded by status."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"""
    SELECT r.id, r.timestamp, r.temperature_c, f.vibration_rms,
           h.health_score, a.anomaly_score, a.severity as status,
           fp.fault_type
    FROM sensor_readings r
    JOIN features f ON r.id = f.reading_id
    JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    ORDER BY r.id DESC LIMIT {sample_size}
    """)
    rows = cursor.fetchall()
    conn.close()

    points = []
    for r in rows:
        status = r["status"]
        color = "#10B981" if status == "Normal" else ("#F59E0B" if status == "Warning" else "#EF4444")
        points.append({
            "id": r["id"],
            "timestamp": r["timestamp"],
            "temperature": r["temperature_c"],
            "vibration_rms": round(r["vibration_rms"], 4),
            "health": r["health_score"],
            "anomaly_score": round(r["anomaly_score"], 3),
            "status": status,
            "fault_pattern": r["fault_type"] or "Unknown",
            "color": color
        })

    return {
        "count": len(points),
        "points": points
    }

@app.get("/api/charts/fault-distribution")
def get_fault_distribution():
    """Calculates genuine fault classification distribution across all dataset predictions."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT fault_type, COUNT(*) as count
    FROM fault_predictions
    GROUP BY fault_type
    """)
    rows = cursor.fetchall()

    cursor.execute("SELECT AVG(anomaly_score) FROM anomalies")
    avg_anomaly = cursor.fetchone()[0] or 0.25

    conn.close()

    total = sum(r["count"] for r in rows)
    distribution = []
    colors = {
        "Normal": "#10B981",
        "Mechanical Imbalance": "#F59E0B",
        "Shaft Misalignment": "#3B82F6",
        "Bearing / Gear Wear": "#8B5CF6",
        "Thermal Overheating": "#EF4444",
        "Mechanical Looseness": "#EC4899"
    }

    for r in rows:
        cnt = r["count"]
        pct = round((cnt / total * 100.0), 1) if total > 0 else 0
        distribution.append({
            "fault_type": r["fault_type"],
            "count": cnt,
            "percentage": pct,
            "color": colors.get(r["fault_type"], "#94A3B8")
        })

    return {
        "total_predictions": total,
        "distribution": distribution,
        "current_anomaly_average": round(avg_anomaly * 100, 1)
    }

@app.get("/api/readings")
def get_readings_table(
    page: int = 1,
    limit: int = 25,
    search: Optional[str] = None,
    source: Optional[str] = "all",
    status: Optional[str] = "all",
    sort_by: Optional[str] = "id",
    order: Optional[str] = "desc"
):
    """Paginated, searchable, and filterable table of sensor readings."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if source and source != "all":
        conditions.append("r.source = ?")
        params.append(source)

    if status and status != "all":
        conditions.append("a.severity = ?")
        params.append(status)

    if search:
        conditions.append("(r.motor_id LIKE ? OR fp.fault_type LIKE ? OR r.timestamp LIKE ?)")
        params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    valid_sorts = {"id": "r.id", "timestamp": "r.timestamp", "temperature_c": "r.temperature_c",
                   "vibration_rms": "f.vibration_rms", "health_score": "h.health_score", "anomaly_score": "a.anomaly_score"}
    sort_column = valid_sorts.get(sort_by, "r.id")
    sort_dir = "ASC" if order.lower() == "asc" else "DESC"

    cursor.execute(f"""
    SELECT COUNT(*) FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    {where_clause}
    """, params)
    total = cursor.fetchone()[0]

    offset = (page - 1) * limit
    cursor.execute(f"""
    SELECT r.id, r.timestamp, r.motor_id, r.source, r.pwm_duty, r.temperature_c,
           f.accel_magnitude, f.vibration_rms, f.vibration_peak, f.vibration_variance, f.rpm_estimated,
           a.anomaly_score, a.severity as status,
           fp.fault_type, fp.confidence,
           h.health_score
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    {where_clause}
    ORDER BY {sort_column} {sort_dir}
    LIMIT ? OFFSET ?
    """, params + [limit, offset])

    rows = cursor.fetchall()
    conn.close()

    return {
        "page": page,
        "limit": limit,
        "total": total,
        "pages": math.ceil(total / limit) if total > 0 else 1,
        "data": [dict(r) for r in rows]
    }

@app.get("/api/export/csv")
def export_readings_csv(source: Optional[str] = "all", status: Optional[str] = "all", limit: int = 5000):
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []
    if source and source != "all":
        conditions.append("r.source = ?")
        params.append(source)
    if status and status != "all":
        conditions.append("a.severity = ?")
        params.append(status)

    where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

    cursor.execute(f"""
    SELECT r.timestamp, r.motor_id, r.source, r.pwm_duty, r.ax, r.ay, r.az,
           r.gyro_x, r.gyro_y, r.gyro_z, r.temperature_c,
           f.accel_magnitude, f.vibration_rms, f.vibration_peak, f.vibration_variance,
           f.temperature_rate, f.vibration_rate, f.rpm_estimated,
           h.health_score, a.anomaly_score, a.severity as status,
           fp.fault_type, fp.confidence
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    LEFT JOIN anomalies a ON r.id = a.reading_id
    LEFT JOIN fault_predictions fp ON r.id = fp.reading_id
    LEFT JOIN health_logs h ON r.id = h.reading_id
    {where_clause}
    ORDER BY r.id DESC LIMIT ?
    """, params + [limit])
    rows = cursor.fetchall()
    conn.close()

    def iter_csv():
        headers = [
            "timestamp", "motor_id", "source", "pwm_duty", "ax", "ay", "az",
            "gyro_x", "gyro_y", "gyro_z", "temperature_c", "accel_magnitude",
            "vibration_rms", "vibration_peak", "vibration_variance",
            "temperature_rate", "vibration_rate", "rpm_estimated",
            "health_score", "anomaly_score", "status", "fault_type", "confidence"
        ]
        yield ",".join(headers) + "\n"
        for row in rows:
            line = [str(row[h] if row[h] is not None else "") for h in headers]
            yield ",".join(line) + "\n"

    return StreamingResponse(
        iter_csv(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=bo_motor_telemetry_export.csv"}
    )

@app.get("/api/alerts")
def get_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts ORDER BY id DESC LIMIT 50")
    alerts = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"alerts": alerts}

@app.post("/api/alerts/acknowledge/{alert_id}")
def acknowledge_alert(alert_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "alert_id": alert_id}

@app.get("/api/model/performance")
def get_model_performance():
    """Returns actual calculated evaluation metrics from scikit-learn held-out test split."""
    if ml_engine.evaluation_metrics:
        return ml_engine.evaluation_metrics
    # If not yet trained, train on current dataset
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.pwm_duty, f.accel_magnitude, f.vibration_rms, f.vibration_peak,
           f.vibration_variance, f.temperature_c, f.temperature_rate, f.vibration_rate,
           fp.fault_type
    FROM sensor_readings r
    JOIN features f ON r.id = f.reading_id
    JOIN fault_predictions fp ON r.id = fp.reading_id
    LIMIT 10000
    """)
    rows = cursor.fetchall()
    conn.close()

    import pandas as pd
    df = pd.DataFrame([dict(r) for r in rows])
    if len(df) > 100:
        metrics = ml_engine.train_models(df)
        return metrics

    return {
        "status": "Models not yet evaluated. Generate dataset and train models."
    }

@app.post("/api/model/train")
def train_models_endpoint():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT r.pwm_duty, f.accel_magnitude, f.vibration_rms, f.vibration_peak,
           f.vibration_variance, f.temperature_c, f.temperature_rate, f.vibration_rate,
           fp.fault_type
    FROM sensor_readings r
    JOIN features f ON r.id = f.reading_id
    JOIN fault_predictions fp ON r.id = fp.reading_id
    LIMIT 10000
    """)
    rows = cursor.fetchall()
    conn.close()

    import pandas as pd
    df = pd.DataFrame([dict(r) for r in rows])
    if len(df) < 50:
        raise HTTPException(status_code=400, detail="Insufficient records to train models. Generate dataset first.")

    metrics = ml_engine.train_models(df)
    return {"status": "success", "metrics": metrics}

@app.get("/api/dataset/stats")
def get_dataset_stats():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM sensor_readings")
    total = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'real'")
    real_cnt = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'synthetic'")
    syn_cnt = cursor.fetchone()[0]

    cursor.execute("""
    SELECT 
        AVG(r.temperature_c) as avg_temp,
        MAX(r.temperature_c) as max_temp,
        AVG(f.vibration_rms) as avg_vib,
        MAX(f.vibration_rms) as max_vib
    FROM sensor_readings r
    LEFT JOIN features f ON r.id = f.reading_id
    """)
    stats_row = cursor.fetchone()

    cursor.execute("SELECT severity, COUNT(*) as cnt FROM anomalies GROUP BY severity")
    status_counts = {r["severity"]: r["cnt"] for r in cursor.fetchall()}

    conn.close()

    return {
        "total_records": total,
        "real_records": real_cnt,
        "synthetic_records": syn_cnt,
        "normal_records": status_counts.get("Normal", 0),
        "warning_records": status_counts.get("Warning", 0),
        "critical_records": status_counts.get("Critical", 0),
        "average_temperature": round(stats_row["avg_temp"] or 0, 2),
        "maximum_temperature": round(stats_row["max_temp"] or 0, 2),
        "average_vibration": round(stats_row["avg_vib"] or 0, 3),
        "maximum_vibration": round(stats_row["max_vib"] or 0, 3)
    }

@app.post("/api/dataset/generate")
def generate_dataset_endpoint(count: int = 10000):
    from seed_data import seed_database
    seed_database(count)
    return {"status": "success", "message": f"Generated and seeded {count} records."}

@app.post("/api/dataset/clear")
def clear_synthetic_data():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sensor_readings WHERE source = 'synthetic'")
    cursor.execute("DELETE FROM features WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM anomalies WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM fault_predictions WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM health_logs WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    conn.commit()
    conn.close()
    return {"status": "success", "message": "Synthetic dataset cleared."}

@app.get("/api/settings")
def get_system_settings():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value_json FROM system_settings")
    rows = cursor.fetchall()
    conn.close()
    settings = {}
    for r in rows:
        try:
            settings[r["key"]] = json.loads(r["value_json"])
        except:
            settings[r["key"]] = r["value_json"]
    return settings

@app.put("/api/settings")
def update_system_settings(payload: SettingsPayload):
    if payload.temp_normal_max is not None:
        save_setting("temp_normal_max", payload.temp_normal_max)
    if payload.temp_warning_max is not None:
        save_setting("temp_warning_max", payload.temp_warning_max)
    if payload.anomaly_warning_threshold is not None:
        save_setting("anomaly_warning_threshold", payload.anomaly_warning_threshold)
    if payload.anomaly_critical_threshold is not None:
        save_setting("anomaly_critical_threshold", payload.anomaly_critical_threshold)
    if payload.health_weights is not None:
        save_setting("health_weights", payload.health_weights)
    if payload.vibration_rolling_window_sec is not None:
        save_setting("vibration_rolling_window_sec", payload.vibration_rolling_window_sec)
    if payload.data_polling_interval_ms is not None:
        save_setting("data_polling_interval_ms", payload.data_polling_interval_ms)
    if payload.motor_nominal_rpm is not None:
        save_setting("motor_nominal_rpm", payload.motor_nominal_rpm)
    return {"status": "success", "message": "Settings updated"}

@app.post("/api/simulator/toggle")
def toggle_simulator():
    global simulator_running
    simulator_running = not simulator_running
    return {"status": "success", "simulator_active": simulator_running}

# WebSocket for live dashboard streaming
@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep connection open and accept ping messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        if websocket in active_connections:
            active_connections.remove(websocket)

# Background realistic continuous live simulator task
async def live_simulation_loop():
    import random
    step = 0
    while True:
        await asyncio.sleep(2.0)
        # Only simulate if simulator_running is True and no real ESP32 stream has been ingested in last 10s
        now = time.time()
        is_real_active = (last_real_data_time is not None and (now - last_real_data_time) < 15.0)

        if simulator_running and not is_real_active and active_connections:
            step += 1
            # Realistic BO motor telemetry step
            pwm = 80.0 + 4.0 * math.sin(step / 30.0) + random.uniform(-1.0, 1.0)
            f_rot = (pwm / 100.0) * 3.1
            t_sec = step * 2.0

            # Normal baseline with occasional slight fluctuation
            ax = 0.05 + 0.15 * math.sin(2 * math.pi * f_rot * t_sec) + random.gauss(0, 0.02)
            ay = 0.08 + 0.15 * math.cos(2 * math.pi * f_rot * t_sec) + random.gauss(0, 0.02)
            az = 0.98 + 0.05 * math.sin(4 * math.pi * f_rot * t_sec) + random.gauss(0, 0.02)
            temp = 38.5 + 2.0 * math.sin(step / 60.0) + random.uniform(-0.2, 0.2)

            payload = SensorIngestPayload(
                motor_id="BO_MOTOR_01",
                temperature=round(temp, 2),
                ax=round(ax, 4),
                ay=round(ay, 4),
                az=round(az, 4),
                gyro_x=round(random.gauss(0, 0.01), 4),
                gyro_y=round(random.gauss(0, 0.01), 4),
                gyro_z=round(random.gauss(0, 0.01), 4),
                pwm_duty=round(pwm, 1),
                source="synthetic"
            )

            result = process_sensor_reading(payload)
            await broadcast_ws({"type": "live_reading", "data": result})

@app.on_event("startup")
async def startup_event():
    global simulator_task
    simulator_task = asyncio.create_task(live_simulation_loop())

# Static files for frontend build
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(os.path.join(frontend_dist, "index.html"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api") or full_path.startswith("ws"):
            raise HTTPException(status_code=404, detail="Endpoint not found")
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
