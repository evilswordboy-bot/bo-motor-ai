import os
import math
import sqlite3
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "bo_motor.db")
CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "esp32_hardware_telemetry.csv")

def ingest_real_csv():
    print(f"Reading real telemetry from: {CSV_PATH}")
    df = pd.read_csv(CSV_PATH)
    print(f"Total rows in CSV: {len(df)}")
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if real records already exist, if so clear old real ones to avoid duplicates
    cursor.execute("SELECT COUNT(*) FROM sensor_readings WHERE source = 'real'")
    old_real_count = cursor.fetchone()[0]
    if old_real_count > 0:
        print(f"Removing {old_real_count} old real records to perform clean update...")
        cursor.execute("SELECT id FROM sensor_readings WHERE source = 'real'")
        real_ids = [r[0] for r in cursor.fetchall()]
        if real_ids:
            cursor.execute("DELETE FROM sensor_readings WHERE source = 'real'")
            cursor.execute(f"DELETE FROM features WHERE reading_id IN ({','.join(['?']*len(real_ids))})", real_ids)
            cursor.execute(f"DELETE FROM anomalies WHERE reading_id IN ({','.join(['?']*len(real_ids))})", real_ids)
            cursor.execute(f"DELETE FROM fault_predictions WHERE reading_id IN ({','.join(['?']*len(real_ids))})", real_ids)
            cursor.execute(f"DELETE FROM health_logs WHERE reading_id IN ({','.join(['?']*len(real_ids))})", real_ids)
        conn.commit()

    base_time = datetime.now() - timedelta(minutes=len(df) // 60 + 5)
    
    inserted = 0
    anomalies_count = 0
    
    # Rolling buffer for rate and variance calculations
    window_readings = []
    
    for idx, row in df.iterrows():
        # Handle zero or calibration readings
        temp_c = float(row['Temperature_C']) if float(row['Temperature_C']) > 0 else 27.5
        ax = float(row['Acceleration_X'])
        ay = float(row['Acceleration_Y'])
        az = float(row['Acceleration_Z'])
        vib_g = float(row['Vibration_g'])
        pwm_val = float(row['Motor_PWM'])
        motor_pct = float(row['Motor_Percent']) if 'Motor_Percent' in row else (pwm_val / 255.0 * 100.0)
        device_health = float(row['Health_Score']) if 'Health_Score' in row else 100.0
        status = str(row['Status']).strip().upper()
        
        # Calculate timestamp offset
        ts_ms = int(row['Timestamp_ms'])
        row_time = base_time + timedelta(milliseconds=ts_ms)
        ts_str = row_time.isoformat()
        
        # Insert sensor reading
        cursor.execute("""
        INSERT INTO sensor_readings (timestamp, motor_id, source, pwm_duty, ax, ay, az, gyro_x, gyro_y, gyro_z, temperature_c)
        VALUES (?, 'BO_MOTOR_01', 'real', ?, ?, ?, ?, 0.0, 0.0, 0.0, ?)
        """, (ts_str, motor_pct, ax, ay, az, temp_c))
        reading_id = cursor.lastrowid
        
        # Physics calculations
        amag = math.sqrt(ax * ax + ay * ay + az * az)
        window_readings.append({"amag": amag, "temp": temp_c, "time": row_time, "vib_g": vib_g})
        if len(window_readings) > 10:
            window_readings.pop(0)
            
        recent_amags = [w["amag"] for w in window_readings]
        recent_dyn = [abs(a - 1.0) for a in recent_amags]
        
        # Calculate RMS: Use higher of accelerometer dynamic RMS or sensor vibration_g
        calc_rms = float(np.sqrt(np.mean(np.array(recent_dyn) ** 2))) if recent_dyn else 0.05
        effective_rms = round(max(calc_rms, vib_g), 4)
        if effective_rms < 0.02:
            effective_rms = 0.05
            
        vib_peak = round(max(effective_rms * 1.45, max(recent_dyn) if recent_dyn else effective_rms), 4)
        vib_var = round(float(np.var(recent_amags)), 6)
        
        # Temperature rate
        if len(window_readings) >= 2:
            dt = (window_readings[-1]["time"] - window_readings[0]["time"]).total_seconds()
            t_rate = round((window_readings[-1]["temp"] - window_readings[0]["temp"]) / (dt / 60.0), 3) if dt > 0.5 else 0.0
        else:
            t_rate = 0.0
            
        # Estimated RPM based on actual motor duty and mechanical drag
        drag = min(0.20, effective_rms * 0.08)
        rpm_est = round((motor_pct / 100.0) * 200.0 * (1.0 - drag), 1)
        
        # Insert features
        cursor.execute("""
        INSERT INTO features (reading_id, timestamp, motor_id, accel_magnitude, vibration_rms, vibration_peak, vibration_variance, temperature_c, temperature_rate, vibration_rate, rpm_estimated)
        VALUES (?, ?, 'BO_MOTOR_01', ?, ?, ?, ?, ?, ?, 0.005, ?)
        """, (reading_id, ts_str, round(amag, 4), effective_rms, vib_peak, vib_var, temp_c, t_rate, rpm_est))
        
        # Determine Anomaly & Fault mode from real hardware Ground Truth
        is_anom = 1 if status in ['WARNING', 'CRITICAL'] else 0
        if status == 'CRITICAL':
            severity = 'Critical'
            anomaly_score = round(min(1.0, 0.70 + effective_rms * 0.25), 3)
            fault_mode = "Bearing / Gear Wear" if vib_g > 0.5 else "Mechanical Imbalance"
            conf = 96.5
        elif status == 'WARNING':
            severity = 'Warning'
            anomaly_score = round(min(0.68, 0.45 + effective_rms * 0.20), 3)
            fault_mode = "Shaft Misalignment" if ax > 0.2 else "Mechanical Imbalance"
            conf = 88.0
        else:
            severity = 'Normal'
            anomaly_score = round(max(0.02, min(0.35, effective_rms * 0.8)), 3)
            fault_mode = "Normal"
            conf = 98.2
            
        if is_anom:
            anomalies_count += 1
            
        cursor.execute("""
        INSERT INTO anomalies (reading_id, timestamp, motor_id, anomaly_score, is_anomaly, severity, features_json)
        VALUES (?, ?, 'BO_MOTOR_01', ?, ?, ?, '{"source":"real_esp32"}')
        """, (reading_id, ts_str, anomaly_score, is_anom, severity))
        
        cursor.execute("""
        INSERT INTO fault_predictions (reading_id, timestamp, motor_id, fault_type, confidence, evidence_json)
        VALUES (?, ?, 'BO_MOTOR_01', ?, ?, '{"sensor_status":"' || ? || '"}')
        """, (reading_id, ts_str, fault_mode, conf, status))
        
        # Health log
        vib_risk = min(100.0, effective_rms * 120.0)
        temp_risk = max(0.0, (temp_c - 25.0) * 2.5)
        h_score = device_health if device_health < 100 else round(max(10.0, min(100.0, 100.0 - (vib_risk * 0.6 + temp_risk * 0.4))), 1)
        
        cursor.execute("""
        INSERT INTO health_logs (reading_id, timestamp, health_score, vibration_risk, temperature_risk, trend_risk, anomaly_risk)
        VALUES (?, ?, ?, ?, ?, 0.05, ?)
        """, (reading_id, ts_str, h_score, round(vib_risk, 2), round(temp_risk, 2), anomaly_score))
        
        inserted += 1

    conn.commit()
    conn.close()
    print(f"Successfully ingested {inserted} REAL sensor records from CSV into SQLite database!")
    print(f"Recorded {anomalies_count} ground-truth hardware anomalies (Warnings & Critical).")

if __name__ == "__main__":
    ingest_real_csv()
