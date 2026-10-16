import os
import json
import pandas as pd

CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "esp32_hardware_telemetry.csv")
HTML_PATH = os.path.join(os.path.dirname(__file__), "standalone_dashboard.html")

print("Reading real telemetry CSV for standalone HTML...")
df = pd.read_csv(CSV_PATH)
df_clean = df[(df["Temperature_C"] > 0) | (df["Vibration_g"] > 0) | (df["Motor_PWM"] > 0)].reset_index(drop=True)

# Sample 120 points including the anomalies
anom_indices = df_clean[df_clean["Status"].isin(["WARNING", "CRITICAL"])].index.tolist()
sample_indices = sorted(list(set(list(range(0, len(df_clean), max(1, len(df_clean) // 100))) + anom_indices)))
df_sample = df_clean.iloc[sample_indices].reset_index(drop=True)

real_records = []
for idx, row in df_sample.iterrows():
    ax = float(row["Acceleration_X"])
    ay = float(row["Acceleration_Y"])
    az = float(row["Acceleration_Z"])
    vib_g = float(row["Vibration_g"])
    temp = float(row["Temperature_C"]) if float(row["Temperature_C"]) > 0 else 30.5
    pwm = float(row["Motor_PWM"]) / 255.0 * 100.0 if "Motor_PWM" in row else 80.0
    rpm = round((pwm / 100.0) * 200.0 * (1.0 - min(0.2, vib_g * 0.08)))
    st_val = str(row["Status"]).strip().upper()
    h_score = int(row["Health_Score"]) if "Health_Score" in row else 100
    
    anom_score = 0.85 if st_val == "CRITICAL" else (0.55 if st_val == "WARNING" else 0.12)
    
    real_records.append({
        "time": f"T+{int(row['Timestamp_ms']) // 1000}s",
        "ax": round(ax, 3),
        "ay": round(ay, 3),
        "az": round(az, 3),
        "v_rms": round(max(0.04, vib_g), 3),
        "v_peak": round(max(0.06, vib_g * 1.45), 3),
        "temp": round(temp, 1),
        "rpm": rpm,
        "health": h_score,
        "anomalyScore": anom_score,
        "status": st_val,
        "source": "real"
    })

json_data = json.dumps(real_records)

with open(HTML_PATH, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the initial history creation in standalone_dashboard.html
target_str = "// Initialize history"
replacement_str = f"""// Real ESP32 Dataset Pre-Loaded from DOC-20261012-WA0014.csv
const REAL_DATASET = {json_data};
let realDataIndex = 0;
// Initialize history from real dataset
for (let i = 0; i < Math.min(60, REAL_DATASET.length); i++) {{
  historyData.push(REAL_DATASET[i]);
}}
"""

if target_str in content:
    content = content.replace(target_str, replacement_str, 1)

# In continuous loop, use real dataset values
target_loop = "const reading = generateReading(now);"
replacement_loop = """let reading;
if (REAL_DATASET && REAL_DATASET.length > 0) {
  realDataIndex = (realDataIndex + 1) % REAL_DATASET.length;
  reading = Object.assign({}, REAL_DATASET[realDataIndex]);
  reading.time = now.toLocaleTimeString();
  currentFault = reading.status === 'CRITICAL' ? 'GearWear' : (reading.status === 'WARNING' ? 'Misalignment' : 'Normal');
} else {
  reading = generateReading(now);
}"""

if target_loop in content:
    content = content.replace(target_loop, replacement_loop, 1)

with open(HTML_PATH, "w", encoding="utf-8") as f:
    f.write(content)

print(f"Updated standalone_dashboard.html with {len(real_records)} real ESP32 telemetry events!")
