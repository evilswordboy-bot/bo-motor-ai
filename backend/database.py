import sqlite3
import os
import json
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "bo_motor.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS motors (
        motor_id TEXT PRIMARY KEY,
        name TEXT,
        motor_type TEXT,
        controller TEXT,
        microcontroller TEXT,
        vibration_sensor TEXT,
        temperature_sensor TEXT,
        status TEXT,
        created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        motor_id TEXT NOT NULL,
        source TEXT NOT NULL,  -- 'real' or 'synthetic'
        pwm_duty REAL NOT NULL,
        ax REAL NOT NULL,
        ay REAL NOT NULL,
        az REAL NOT NULL,
        gyro_x REAL NOT NULL,
        gyro_y REAL NOT NULL,
        gyro_z REAL NOT NULL,
        temperature_c REAL NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sensor_readings_time ON sensor_readings(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sensor_readings_source ON sensor_readings(source);

    CREATE TABLE IF NOT EXISTS features (
        reading_id INTEGER PRIMARY KEY,
        timestamp TEXT NOT NULL,
        motor_id TEXT NOT NULL,
        accel_magnitude REAL NOT NULL,
        vibration_rms REAL NOT NULL,
        vibration_peak REAL NOT NULL,
        vibration_variance REAL NOT NULL,
        temperature_c REAL NOT NULL,
        temperature_rate REAL NOT NULL,
        vibration_rate REAL NOT NULL,
        rpm_estimated REAL NOT NULL,
        FOREIGN KEY (reading_id) REFERENCES sensor_readings(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_features_time ON features(timestamp);

    CREATE TABLE IF NOT EXISTS anomalies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER,
        timestamp TEXT NOT NULL,
        motor_id TEXT NOT NULL,
        anomaly_score REAL NOT NULL,
        is_anomaly INTEGER NOT NULL,
        severity TEXT NOT NULL, -- 'Normal', 'Warning', 'Critical'
        features_json TEXT,
        FOREIGN KEY (reading_id) REFERENCES sensor_readings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fault_predictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER,
        timestamp TEXT NOT NULL,
        motor_id TEXT NOT NULL,
        fault_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        evidence_json TEXT,
        FOREIGN KEY (reading_id) REFERENCES sensor_readings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS health_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reading_id INTEGER,
        timestamp TEXT NOT NULL,
        health_score REAL NOT NULL,
        vibration_risk REAL NOT NULL,
        temperature_risk REAL NOT NULL,
        trend_risk REAL NOT NULL,
        anomaly_risk REAL NOT NULL,
        FOREIGN KEY (reading_id) REFERENCES sensor_readings(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        motor_id TEXT NOT NULL,
        severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        sensor_evidence TEXT,
        action_recommended TEXT,
        acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL
    );
    """)

    # Seed default motor if missing
    cursor.execute("SELECT COUNT(*) FROM motors WHERE motor_id = 'BO_MOTOR_01'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO motors VALUES (
            'BO_MOTOR_01',
            'BO DC Geared Test Rig #1',
            'BO DC Geared Motor (TT Gearbox 1:48)',
            'L298N Dual H-Bridge Driver',
            'ESP32 DevKit V1 (38-pin)',
            'MPU6050 6-DOF IMU (I2C 0x68)',
            'DS18B20 / MPU6050 Die Temp',
            'Running',
            ?
        )
        """, (datetime.now().isoformat(),))

    # Seed default system settings if missing
    default_settings = {
        "temp_normal_max": 45.0,
        "temp_warning_max": 60.0,
        "anomaly_warning_threshold": 0.50,
        "anomaly_critical_threshold": 0.75,
        "health_weights": {
            "vibration_risk": 0.30,
            "temperature_risk": 0.25,
            "trend_risk": 0.20,
            "anomaly_risk": 0.25
        },
        "health_thresholds": {
            "excellent": 90,
            "good": 75,
            "warning": 60,
            "poor": 40
        },
        "vibration_rolling_window_sec": 2.0,
        "data_polling_interval_ms": 2000,
        "motor_nominal_rpm": 200,
        "motor_rated_voltage": 6.0
    }

    for k, v in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO system_settings VALUES (?, ?)", (k, json.dumps(v)))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized at:", DB_PATH)
