# BO MOTOR AI: Predictive Maintenance & Intelligent Fault Detection

[![Open in Streamlit](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io/deploy?repository=evilswordboy-bot/bo-motor-ai&branch=main&mainModule=streamlit_app.py)

> **Tagline**: *"Sense. Learn. Predict. Prevent."*  
> **Subtitle**: *"IoT + AI Based Early Fault Detection using Vibration and Temperature Analysis"*

---

## 🛠️ System Overview
**BO MOTOR AI** is an industrial predictive maintenance system for yellow BO DC geared motors (dual shaft TT gearbox 1:48), driven by an L298N driver and monitored via an ESP32 DevKit V1 with an MPU6050 3-axis accelerometer/gyroscope and temperature sensor.

### Key Engineering Features:
- **Physical Sensor Feature Engineering**: Vector magnitude $a_{mag} = \sqrt{a_x^2 + a_y^2 + a_z^2}$, sliding window rolling RMS, peak acceleration, dynamic variance, thermal rise rate $\Delta T / \Delta t$, and estimated RPM.
- **Unsupervised Anomaly Detection**: Scikit-learn `IsolationForest` calibrated on healthy baseline telemetry ($[0.00, 1.00]$ anomaly score).
- **Supervised Fault Classification**: Multi-class `RandomForestClassifier` trained on 6 failure regimes:
  1. *Normal Operation*
  2. *Mechanical Imbalance*
  3. *Shaft Misalignment*
  4. *Bearing / Gear Wear*
  5. *Thermal Overheating*
  6. *Mechanical Looseness*
- **Data Provenance**: Transparent separation between real ESP32 packets (`source: 'real'`) and synthetic simulation (`source: 'synthetic'`).
- **Condition-Based Maintenance**: Actionable engineering recommendations based on ISO 10816 vibration severity guidelines.

---

## 🚀 Instant Streamlit Cloud Deployment
Click the badge above or navigate to:
**[https://share.streamlit.io/deploy?repository=evilswordboy-bot/bo-motor-ai&branch=main&mainModule=streamlit_app.py](https://share.streamlit.io/deploy?repository=evilswordboy-bot/bo-motor-ai&branch=main&mainModule=streamlit_app.py)**

---

## 💻 Local Execution
```bash
# 1. Clone repository
git clone https://github.com/evilswordboy-bot/bo-motor-ai.git
cd bo-motor-ai

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run Streamlit app
streamlit run streamlit_app.py
```
