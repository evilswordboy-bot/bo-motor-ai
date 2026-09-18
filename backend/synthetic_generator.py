import math
import random
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Tuple

FAULT_CLASSES = [
    "Normal",
    "Mechanical Imbalance",
    "Shaft Misalignment",
    "Bearing / Gear Wear",
    "Thermal Overheating",
    "Mechanical Looseness"
]

def generate_bo_motor_dataset(total_records: int = 10000, start_time: datetime = None) -> List[Dict]:
    if start_time is None:
        start_time = datetime.now() - timedelta(hours=6)

    records = []
    
    # Sequence of experimental regimes:
    # 0 to 4500: Normal operation baseline (good running motor)
    # 4500 to 5800: Controlled Mechanical Imbalance (small eccentric mass added to wheel/shaft)
    # 5800 to 7000: Controlled Shaft Misalignment (angular & parallel offset on gearbox coupler)
    # 7000 to 8100: Bearing / Gear Wear (worn spur gear simulation, plastic gear skipping)
    # 8100 to 9100: Thermal Overheating (continuous high-duty cycle, restricted thermal dissipation)
    # 9100 to 10000: Mechanical Looseness (loosened mounting screws on motor bracket)

    regimes = [
        ("Normal", int(total_records * 0.45)),
        ("Mechanical Imbalance", int(total_records * 0.13)),
        ("Shaft Misalignment", int(total_records * 0.12)),
        ("Bearing / Gear Wear", int(total_records * 0.11)),
        ("Thermal Overheating", int(total_records * 0.10)),
        ("Mechanical Looseness", total_records - (int(total_records * 0.45) + int(total_records * 0.13) + int(total_records * 0.12) + int(total_records * 0.11) + int(total_records * 0.10)))
    ]

    current_time = start_time
    time_step_sec = 2.0  # 2-second telemetry intervals

    # Persistent thermal and motor states
    ambient_temp = 26.5
    current_temp = 28.0
    rolling_rms_window = []
    window_size = 8

    rec_idx = 0
    for fault_label, count in regimes:
        # Fault target parameters
        for i in range(count):
            timestamp_str = current_time.isoformat()
            t_sec = rec_idx * time_step_sec

            # Base PWM duty cycle (typical 70-90% for standard robotics operation)
            pwm_duty = 80.0 + 5.0 * math.sin(t_sec / 300.0) + random.uniform(-1.5, 1.5)
            pwm_duty = max(50.0, min(100.0, pwm_duty))

            # Motor rotational frequency (nominal TT gear motor: ~150-200 RPM -> shaft 2.5-3.3 Hz, DC motor 120-160 Hz)
            f_rot = (pwm_duty / 100.0) * 3.1  # shaft rotation Hz

            # Baseline gravity vector on MPU6050 (Z ≈ 0.98g, slight mount tilt on X, Y)
            base_ax = 0.05
            base_ay = 0.08
            base_az = 0.98

            # Sensor electrical noise
            noise_x = random.gauss(0, 0.015)
            noise_y = random.gauss(0, 0.015)
            noise_z = random.gauss(0, 0.020)

            gyro_base = [random.gauss(0, 0.008), random.gauss(0, 0.008), random.gauss(0, 0.012)]

            if fault_label == "Normal":
                target_temp = 36.0 + 4.0 * (pwm_duty / 100.0) + random.uniform(-0.5, 0.5)
                # Normal low vibration
                vib_amplitude = 0.12 + 0.03 * (pwm_duty / 100.0)
                vib_x = vib_amplitude * math.sin(2 * math.pi * f_rot * t_sec) + noise_x
                vib_y = vib_amplitude * math.cos(2 * math.pi * f_rot * t_sec) + noise_y
                vib_z = 0.08 * math.sin(4 * math.pi * f_rot * t_sec) + noise_z
                nominal_anomaly = random.uniform(0.05, 0.28)
                status = "Normal"
                confidence = round(random.uniform(91.0, 98.5), 1)

            elif fault_label == "Mechanical Imbalance":
                target_temp = 39.5 + random.uniform(-0.8, 0.8)
                # Strong 1X rotational vibration on radial axes X & Y
                vib_amplitude = 0.65 + 0.15 * math.sin(t_sec / 40.0)
                vib_x = vib_amplitude * math.sin(2 * math.pi * f_rot * t_sec) + noise_x * 2.0
                vib_y = vib_amplitude * 0.9 * math.cos(2 * math.pi * f_rot * t_sec) + noise_y * 2.0
                vib_z = 0.22 * math.sin(2 * math.pi * f_rot * t_sec) + noise_z
                gyro_base[0] += 0.06 * math.sin(2 * math.pi * f_rot * t_sec)
                gyro_base[1] += 0.05 * math.cos(2 * math.pi * f_rot * t_sec)
                nominal_anomaly = random.uniform(0.60, 0.88)
                status = "Warning" if nominal_anomaly < 0.75 else "Critical"
                confidence = round(random.uniform(78.0, 92.0), 1)

            elif fault_label == "Shaft Misalignment":
                target_temp = 44.0 + random.uniform(-0.6, 0.8)
                # Strong 2X harmonic and axial vibration
                vib_amplitude_1x = 0.40
                vib_amplitude_2x = 0.55
                vib_x = (vib_amplitude_1x * math.sin(2 * math.pi * f_rot * t_sec) +
                         vib_amplitude_2x * math.sin(4 * math.pi * f_rot * t_sec)) + noise_x * 2.0
                vib_y = (vib_amplitude_1x * math.cos(2 * math.pi * f_rot * t_sec) +
                         vib_amplitude_2x * math.cos(4 * math.pi * f_rot * t_sec)) + noise_y * 2.0
                vib_z = 0.38 * math.sin(4 * math.pi * f_rot * t_sec) + noise_z * 2.0
                nominal_anomaly = random.uniform(0.62, 0.85)
                status = "Warning" if nominal_anomaly < 0.75 else "Critical"
                confidence = round(random.uniform(74.0, 89.0), 1)

            elif fault_label == "Bearing / Gear Wear":
                target_temp = 46.5 + random.uniform(-1.0, 1.0)
                # High-frequency chatter, gear-mesh impacts, random spikes
                chatter = 0.45 * math.sin(2 * math.pi * (f_rot * 16.0) * t_sec)  # 16 teeth gear mesh
                spike = 0.75 if random.random() < 0.06 else 0.0
                vib_x = chatter * 0.7 + noise_x * 4.0 + (spike if random.random() < 0.5 else 0)
                vib_y = chatter * 0.6 + noise_y * 4.0 + (spike if random.random() < 0.5 else 0)
                vib_z = chatter * 0.9 + noise_z * 4.0 + spike
                nominal_anomaly = random.uniform(0.68, 0.92)
                status = "Warning" if nominal_anomaly < 0.75 else "Critical"
                confidence = round(random.uniform(70.0, 88.0), 1)

            elif fault_label == "Thermal Overheating":
                # High continuous temperature rise up to 68C
                target_temp = 63.5 + 4.0 * math.sin(i / 100.0) + random.uniform(-0.5, 0.5)
                vib_amplitude = 0.42 + 0.10 * math.sin(t_sec / 25.0)
                vib_x = vib_amplitude * math.sin(2 * math.pi * f_rot * t_sec) + noise_x * 2.5
                vib_y = vib_amplitude * math.cos(2 * math.pi * f_rot * t_sec) + noise_y * 2.5
                vib_z = 0.25 * math.sin(2 * math.pi * f_rot * t_sec) + noise_z * 2.5
                nominal_anomaly = random.uniform(0.72, 0.96)
                status = "Critical" if target_temp > 60.0 or nominal_anomaly > 0.75 else "Warning"
                confidence = round(random.uniform(82.0, 96.0), 1)

            elif fault_label == "Mechanical Looseness":
                target_temp = 43.0 + random.uniform(-1.0, 1.0)
                # Sub-harmonic impacts, severe rattling
                impact = 1.10 if random.random() < 0.12 else 0.0
                vib_x = 0.60 * math.sin(math.pi * f_rot * t_sec) + noise_x * 5.0 + impact * 0.7
                vib_y = 0.55 * math.cos(math.pi * f_rot * t_sec) + noise_y * 5.0 + impact * 0.6
                vib_z = 0.70 * math.sin(2 * math.pi * f_rot * t_sec) + noise_z * 5.0 + impact
                gyro_base[0] += 0.12 * math.sin(t_sec * 3.0)
                gyro_base[1] += 0.15 * math.cos(t_sec * 3.0)
                nominal_anomaly = random.uniform(0.74, 0.98)
                status = "Critical" if nominal_anomaly > 0.75 else "Warning"
                confidence = round(random.uniform(75.0, 91.0), 1)

            # Thermal inertia: first-order lag filter (tau ~ 60 steps)
            current_temp += (target_temp - current_temp) * 0.04

            # Sensor readings
            ax = base_ax + vib_x
            ay = base_ay + vib_y
            az = base_az + vib_z
            amag = math.sqrt(ax * ax + ay * ay + az * az)

            # Maintain rolling window for RMS
            rolling_rms_window.append(amag)
            if len(rolling_rms_window) > window_size:
                rolling_rms_window.pop(0)

            # Compute features
            window_arr = np.array(rolling_rms_window)
            dyn_offset = np.abs(window_arr - 1.0)
            vibration_rms = float(np.sqrt(np.mean(dyn_offset ** 2)))
            if vibration_rms < 0.06:
                vibration_rms = float(np.std(window_arr)) if np.std(window_arr) > 0.02 else 0.08
            
            vibration_peak = float(np.max(dyn_offset)) if len(dyn_offset) > 0 else vibration_rms * 1.414
            vibration_variance = float(np.var(window_arr))

            # Temperature and vibration rates
            temp_rate = (target_temp - current_temp) * 0.35 + random.gauss(0, 0.05)
            vib_rate = random.gauss(0, 0.02)

            # Estimated RPM:
            base_rpm = 200.0 * (pwm_duty / 100.0)
            friction_drag = min(0.25, vibration_rms * 0.09 + (current_temp - 25.0) * 0.001)
            rpm_estimated = round(base_rpm * (1.0 - friction_drag), 1)

            # Transparent health score calculation
            # Health = 100 - (0.30 * VibRisk + 0.25 * TempRisk + 0.20 * TrendRisk + 0.25 * AnomalyRisk)
            vib_risk = min(100.0, max(0.0, (vibration_rms - 0.25) / (1.20 - 0.25) * 100.0))
            temp_risk = min(100.0, max(0.0, (current_temp - 35.0) / (65.0 - 35.0) * 100.0))
            trend_risk = min(100.0, max(0.0, abs(temp_rate) * 20.0 + max(0.0, vib_rate) * 50.0))
            anomaly_risk = nominal_anomaly * 100.0

            weighted_risk = (0.30 * vib_risk + 0.25 * temp_risk + 0.20 * trend_risk + 0.25 * anomaly_risk)
            health_score = round(max(5.0, min(100.0, 100.0 - weighted_risk)), 1)

            rec = {
                "timestamp": timestamp_str,
                "motor_id": "BO_MOTOR_01",
                "source": "synthetic",
                "pwm_duty": round(pwm_duty, 1),
                "ax": round(ax, 4),
                "ay": round(ay, 4),
                "az": round(az, 4),
                "gyro_x": round(gyro_base[0], 4),
                "gyro_y": round(gyro_base[1], 4),
                "gyro_z": round(gyro_base[2], 4),
                "accel_magnitude": round(amag, 4),
                "vibration_rms": round(vibration_rms, 4),
                "vibration_peak": round(vibration_peak, 4),
                "vibration_variance": round(vibration_variance, 6),
                "temperature_c": round(current_temp, 2),
                "temperature_rate": round(temp_rate, 3),
                "vibration_rate": round(vib_rate, 4),
                "rpm_estimated": rpm_estimated,
                "health_score": health_score,
                "anomaly_score": round(nominal_anomaly, 3),
                "status": status,
                "fault_type": fault_label,
                "confidence": confidence,
                "vibration_risk": round(vib_risk, 1),
                "temp_risk": round(temp_risk, 1),
                "trend_risk": round(trend_risk, 1),
                "anomaly_risk": round(anomaly_risk, 1)
            }
            records.append(rec)
            rec_idx += 1
            current_time += timedelta(seconds=time_step_sec)

    return records
