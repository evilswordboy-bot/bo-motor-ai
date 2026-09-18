import math
import numpy as np
from typing import List, Dict, Any

class FeatureExtractor:
    def __init__(self, window_size: int = 10, nominal_rpm: float = 200.0):
        self.window_size = window_size
        self.nominal_rpm = nominal_rpm
        # Buffer of recent readings: dict with keys ax, ay, az, amag, temp, timestamp
        self.history = []

    def add_reading(self, ax: float, ay: float, az: float, temp: float, pwm_duty: float, timestamp: float) -> Dict[str, float]:
        amag = math.sqrt(ax * ax + ay * ay + az * az)
        item = {
            "ax": ax,
            "ay": ay,
            "az": az,
            "amag": amag,
            "temp": temp,
            "pwm_duty": pwm_duty,
            "timestamp": timestamp
        }
        self.history.append(item)
        if len(self.history) > self.window_size * 3:
            self.history.pop(0)

        return self.compute_features()

    def compute_features(self) -> Dict[str, float]:
        if not self.history:
            return {
                "accel_magnitude": 1.0,
                "vibration_rms": 0.25,
                "vibration_peak": 0.35,
                "vibration_variance": 0.01,
                "temperature_c": 35.0,
                "temperature_rate": 0.0,
                "vibration_rate": 0.0,
                "rpm_estimated": 180.0
            }

        recent = self.history[-self.window_size:]
        latest = recent[-1]
        
        # 1. Acceleration magnitude
        accel_mag = latest["amag"]

        # 2. Dynamic component relative to static gravity (1.0g or mean)
        amags = np.array([r["amag"] for r in recent])
        
        # Dynamic acceleration offset from 1.0g baseline (in g)
        dyn_a = np.abs(amags - 1.0)
        
        # Vibration RMS = sqrt(mean(dyn_a^2))
        vib_rms = float(np.sqrt(np.mean(dyn_a ** 2)))
        if vib_rms < 0.05:
            vib_rms = float(np.std(amags)) if np.std(amags) > 0.02 else 0.08

        # 3. Peak vibration in window
        vib_peak = float(np.max(dyn_a)) if len(dyn_a) > 0 else vib_rms * 1.414

        # 4. Vibration variance
        vib_variance = float(np.var(amags))

        # 5. Temperature
        temp_c = latest["temp"]

        # 6. Temperature rate (deg C / minute)
        if len(self.history) >= 2:
            dt = (self.history[-1]["timestamp"] - self.history[0]["timestamp"])
            if dt > 0.1:
                temp_rate = float((self.history[-1]["temp"] - self.history[0]["temp"]) / (dt / 60.0))
            else:
                temp_rate = 0.0
        else:
            temp_rate = 0.0

        # 7. Vibration rate (g / minute)
        if len(self.history) >= 2:
            dt = (self.history[-1]["timestamp"] - self.history[0]["timestamp"])
            if dt > 0.1:
                first_rms = float(np.sqrt(np.mean(np.abs(np.array([r["amag"] for r in self.history[:min(len(self.history), self.window_size)]]) - 1.0) ** 2)))
                vib_rate = float((vib_rms - first_rms) / (dt / 60.0))
            else:
                vib_rate = 0.0
        else:
            vib_rate = 0.0

        # 8. Estimated RPM
        # BO TT DC geared motor: rated ~200 RPM at 6V (PWM 100%).
        # Note: Hardware does not have an optical/hall encoder.
        # Estimated based on PWM duty cycle (0-100%) and mechanical drag proxy from vibration & temperature.
        pwm = max(0.0, min(100.0, latest["pwm_duty"]))
        base_rpm = self.nominal_rpm * (pwm / 100.0)
        # Higher vibration/friction causes minor RPM slippage / drop
        friction_penalty = min(0.20, vib_rms * 0.08)
        rpm_est = round(base_rpm * (1.0 - friction_penalty), 1)

        return {
            "accel_magnitude": round(accel_mag, 4),
            "vibration_rms": round(vib_rms, 4),
            "vibration_peak": round(vib_peak, 4),
            "vibration_variance": round(vib_variance, 6),
            "temperature_c": round(temp_c, 2),
            "temperature_rate": round(temp_rate, 3),
            "vibration_rate": round(vib_rate, 4),
            "rpm_estimated": rpm_est
        }
