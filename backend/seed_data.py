import json
import sqlite3
import pandas as pd
from datetime import datetime
from database import init_db, get_db_connection
from synthetic_generator import generate_bo_motor_dataset
from ml_engine import ml_engine

def seed_database(num_records: int = 10000):
    print(f"Initializing database and seeding {num_records} BO motor records...")
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing synthetic records if any
    cursor.execute("DELETE FROM sensor_readings WHERE source = 'synthetic'")
    cursor.execute("DELETE FROM features WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM anomalies WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM fault_predictions WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM health_logs WHERE reading_id NOT IN (SELECT id FROM sensor_readings)")
    cursor.execute("DELETE FROM alerts")
    conn.commit()

    records = generate_bo_motor_dataset(num_records)
    print(f"Generated {len(records)} realistic records. Inserting into SQLite...")

    # Batch insert into sensor_readings
    readings_data = [
        (
            r["timestamp"],
            r["motor_id"],
            r["source"],
            r["pwm_duty"],
            r["ax"],
            r["ay"],
            r["az"],
            r["gyro_x"],
            r["gyro_y"],
            r["gyro_z"],
            r["temperature_c"]
        )
        for r in records
    ]

    cursor.executemany("""
    INSERT INTO sensor_readings (
        timestamp, motor_id, source, pwm_duty, ax, ay, az, gyro_x, gyro_y, gyro_z, temperature_c
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, readings_data)
    conn.commit()

    # Retrieve inserted IDs
    cursor.execute("SELECT id, timestamp FROM sensor_readings WHERE source = 'synthetic' ORDER BY id ASC")
    rows = cursor.fetchall()
    
    features_data = []
    anomalies_data = []
    faults_data = []
    health_data = []

    for row, r in zip(rows, records):
        rid = row["id"]
        features_data.append((
            rid,
            r["timestamp"],
            r["motor_id"],
            r["accel_magnitude"],
            r["vibration_rms"],
            r["vibration_peak"],
            r["vibration_variance"],
            r["temperature_c"],
            r["temperature_rate"],
            r["vibration_rate"],
            r["rpm_estimated"]
        ))
        anomalies_data.append((
            rid,
            r["timestamp"],
            r["motor_id"],
            r["anomaly_score"],
            1 if r["status"] != "Normal" else 0,
            r["status"],
            json.dumps({"vib_rms": r["vibration_rms"], "temp": r["temperature_c"]})
        ))
        faults_data.append((
            rid,
            r["timestamp"],
            r["motor_id"],
            r["fault_type"],
            r["confidence"],
            json.dumps({"evidence": f"Vib RMS: {r['vibration_rms']}g, Temp: {r['temperature_c']}C"})
        ))
        health_data.append((
            rid,
            r["timestamp"],
            r["health_score"],
            r["vibration_risk"],
            r["temp_risk"],
            r["trend_risk"],
            r["anomaly_risk"]
        ))

    cursor.executemany("""
    INSERT INTO features VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, features_data)

    cursor.executemany("""
    INSERT INTO anomalies (reading_id, timestamp, motor_id, anomaly_score, is_anomaly, severity, features_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, anomalies_data)

    cursor.executemany("""
    INSERT INTO fault_predictions (reading_id, timestamp, motor_id, fault_type, confidence, evidence_json)
    VALUES (?, ?, ?, ?, ?, ?)
    """, faults_data)

    cursor.executemany("""
    INSERT INTO health_logs (reading_id, timestamp, health_score, vibration_risk, temperature_risk, trend_risk, anomaly_risk)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, health_data)

    # Insert representative realistic engineering alerts
    sample_alerts = [
        (
            records[-50]["timestamp"],
            "BO_MOTOR_01",
            "warning",
            "INCREASED VIBRATION",
            "Vibration RMS increased 35% above learned normal operating baseline.",
            "Vibration RMS reached 0.84g (Baseline: 0.28g). Elevated 1X rotational frequency.",
            "Inspect motor mounting bracket and tighten fasteners.",
            0
        ),
        (
            records[-20]["timestamp"],
            "BO_MOTOR_01",
            "warning",
            "TEMPERATURE RISE DETECTED",
            "Motor casing temperature is climbing faster than recent thermal equilibrium.",
            "Temperature reached 48.2°C with rate +1.4°C/min under 82% PWM duty cycle.",
            "Check gearbox for gear tooth friction and verify L298N driver heatsink airflow.",
            0
        ),
        (
            records[-5]["timestamp"],
            "BO_MOTOR_01",
            "critical",
            "ANOMALOUS VIBRATION & THERMAL COMBINATION",
            "Vibration RMS and temperature simultaneously exceeded learned normal operating envelope.",
            "Anomaly Score: 0.81 | Vibration RMS: 0.89g | Temperature: 52.4°C",
            "Reduce PWM duty cycle immediately, inspect spur gears for wear or mechanical binding.",
            0
        )
    ]

    cursor.executemany("""
    INSERT INTO alerts (timestamp, motor_id, severity, title, message, sensor_evidence, action_recommended, acknowledged)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, sample_alerts)

    conn.commit()
    conn.close()
    print("Database seeding completed successfully.")

    # Train ML models
    df = pd.DataFrame(records)
    ml_engine.train_models(df)
    print("ML Engine trained on seeded dataset.")

if __name__ == "__main__":
    seed_database(10000)
