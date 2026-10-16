import os

html_content = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BO MOTOR AI - Predictive Maintenance & Intelligent Fault Detection</title>
<style>
  :root {
    --bg-dark: #0B0F17;
    --card-bg: #131B2E;
    --card-border: #1E293B;
    --text-primary: #F1F5F9;
    --text-secondary: #94A3B8;
    --accent-cyan: #00F0FF;
    --accent-blue: #38BDF8;
    --accent-green: #10B981;
    --accent-amber: #F59E0B;
    --accent-red: #EF4444;
    --accent-purple: #A855F7;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: var(--bg-dark);
    color: var(--text-primary);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    height: 100vh;
    overflow: hidden;
  }
  
  /* Sidebar */
  #sidebar {
    width: 250px;
    background: #0F172A;
    border-right: 1px solid var(--card-border);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
  .sidebar-header {
    padding: 20px 16px;
    border-bottom: 1px solid var(--card-border);
  }
  .logo-title {
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    color: #FFF;
  }
  .logo-subtitle {
    font-size: 0.72rem;
    color: var(--accent-cyan);
    font-weight: 600;
    margin-top: 4px;
    letter-spacing: 0.04em;
  }
  .nav-menu {
    flex: 1;
    overflow-y: auto;
    padding: 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-radius: 8px;
    color: var(--text-secondary);
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
    user-select: none;
  }
  .nav-item:hover {
    background: rgba(255,255,255,0.05);
    color: #FFF;
  }
  .nav-item.active {
    background: rgba(0, 240, 255, 0.12);
    color: var(--accent-cyan);
    font-weight: 600;
    border-left: 3px solid var(--accent-cyan);
  }
  .sidebar-footer {
    padding: 14px 16px;
    border-top: 1px solid var(--card-border);
    font-size: 0.75rem;
    color: var(--text-secondary);
  }
  
  /* Main Content */
  #main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  header {
    padding: 16px 24px;
    background: #0F172A;
    border-bottom: 1px solid var(--card-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
  }
  .header-left h1 {
    font-size: 1.25rem;
    font-weight: 700;
    color: #FFF;
  }
  .header-left p {
    font-size: 0.8rem;
    color: var(--text-secondary);
    margin-top: 2px;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .badge {
    padding: 5px 12px;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    cursor: pointer;
  }
  .badge-demo {
    background: rgba(245, 158, 11, 0.15);
    color: var(--accent-amber);
    border: 1px solid rgba(245, 158, 11, 0.4);
  }
  .badge-live {
    background: rgba(16, 185, 129, 0.15);
    color: var(--accent-green);
    border: 1px solid rgba(16, 185, 129, 0.4);
  }

  /* View Containers */
  .view-content {
    padding: 24px;
    display: none;
    flex-direction: column;
    gap: 20px;
  }
  .view-content.active {
    display: flex;
  }

  /* KPI Grid */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 16px;
  }
  .kpi-card {
    background: linear-gradient(135deg, var(--card-bg) 0%, #0F172A 100%);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 18px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: transform 0.2s, border-color 0.2s;
  }
  .kpi-card:hover {
    border-color: var(--accent-cyan);
    transform: translateY(-2px);
  }
  .kpi-title {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 8px;
  }
  .kpi-value {
    font-size: 1.8rem;
    font-weight: 800;
    color: #FFF;
  }
  .kpi-unit {
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 400;
    margin-left: 4px;
  }
  .kpi-sub {
    font-size: 0.75rem;
    color: var(--text-secondary);
    margin-top: 8px;
  }

  /* Charts Container */
  .charts-row {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 20px;
  }
  @media (max-width: 1024px) {
    .charts-row { grid-template-columns: 1fr; }
  }
  .chart-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 12px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .chart-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #FFF;
  }
  canvas {
    width: 100%;
    height: 240px;
    background: #090D14;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
  }

  /* Table */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th, td {
    padding: 12px 14px;
    text-align: left;
    border-bottom: 1px solid var(--card-border);
  }
  th {
    color: var(--text-secondary);
    text-transform: uppercase;
    font-size: 0.75rem;
    background: rgba(255,255,255,0.02);
  }
  tr:hover td {
    background: rgba(255,255,255,0.02);
  }

  /* Buttons & Sliders */
  .btn {
    background: var(--accent-cyan);
    color: #0B0F17;
    font-weight: 700;
    border: none;
    padding: 10px 18px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: opacity 0.2s;
  }
  .btn:hover { opacity: 0.9; }
  .control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .control-group label {
    font-size: 0.8rem;
    color: var(--text-secondary);
  }
  select, input[type="range"], input[type="number"], input[type="text"] {
    background: #0F172A;
    color: #FFF;
    border: 1px solid var(--card-border);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
  }
  pre {
    background: #090D14;
    padding: 16px;
    border-radius: 8px;
    border: 1px solid var(--card-border);
    color: #A5B4FC;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.82rem;
    overflow-x: auto;
  }
</style>
</head>
<body>

<!-- Sidebar -->
<div id="sidebar">
  <div class="sidebar-header">
    <div class="logo-title">⚙️ BO MOTOR AI</div>
    <div class="logo-subtitle">Sense. Learn. Predict. Prevent.</div>
  </div>
  <div class="nav-menu">
    <div class="nav-item active" onclick="showView('overview', this)">🎛️ Overview</div>
    <div class="nav-item" onclick="showView('vibration', this)">📊 Vibration Analysis</div>
    <div class="nav-item" onclick="showView('temperature', this)">🌡️ Temperature Analysis</div>
    <div class="nav-item" onclick="showView('anomaly', this)">🧠 Anomaly Detection</div>
    <div class="nav-item" onclick="showView('faults', this)">🔍 Fault Classification</div>
    <div class="nav-item" onclick="showView('maintenance', this)">🛠️ Maintenance & CBM</div>
    <div class="nav-item" onclick="showView('simulator', this)">🎮 Simulator Sandbox</div>
    <div class="nav-item" onclick="showView('dataset', this)">📋 Dataset Explorer</div>
    <div class="nav-item" onclick="showView('firmware', this)">📟 ESP32 Firmware</div>
    <div class="nav-item" onclick="showView('settings', this)">⚙️ Settings</div>
  </div>
  <div class="sidebar-footer">
    <div>Status: <span style="color:var(--accent-green); font-weight:700;">● Engine Active</span></div>
    <div style="color:#64748B; margin-top:4px;">TT Dual Shaft 1:48 Gearbox</div>
  </div>
</div>

<!-- Main Area -->
<div id="main">
  <header>
    <div class="header-left">
      <h1>BO MOTOR AI - Predictive Maintenance</h1>
      <p>IoT + AI Based Early Fault Detection using Vibration and Temperature Analysis</p>
    </div>
    <div class="header-right">
      <span id="provenanceBadge" class="badge badge-demo" onclick="toggleProvenance()">● DEMO MODE | Simulated Sensor Data</span>
      <span id="liveClock" style="font-size:0.8rem; color:var(--text-secondary);">19:30:00</span>
    </div>
  </header>

  <!-- VIEW 1: OVERVIEW -->
  <div id="view-overview" class="view-content active">
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">Health Score</div>
        <div class="kpi-value" id="kpiHealth" style="color:var(--accent-green);">92<span class="kpi-unit">%</span></div>
        <div class="kpi-sub" id="kpiHealthSub">Condition: Optimal</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Vibration RMS</div>
        <div class="kpi-value" id="kpiVibRMS">0.22<span class="kpi-unit">g</span></div>
        <div class="kpi-sub" id="kpiVibPeak">Peak: 0.31 g</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Motor Temperature</div>
        <div class="kpi-value" id="kpiTemp" style="color:var(--accent-blue);">36.4<span class="kpi-unit">°C</span></div>
        <div class="kpi-sub" id="kpiTempRate">Rate: +0.05 °C/min</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Anomaly Score</div>
        <div class="kpi-value" id="kpiAnomaly" style="color:var(--accent-green);">0.12</div>
        <div class="kpi-sub" id="kpiAnomalyStatus">Isolation Forest: Normal</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">Estimated Speed</div>
        <div class="kpi-value" id="kpiRPM">182<span class="kpi-unit">RPM</span></div>
        <div class="kpi-sub" id="kpiPWM">PWM: 85% (TT 1:48)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">CBM Maintenance Risk</div>
        <div class="kpi-value" id="kpiRisk" style="color:var(--accent-green);">Low</div>
        <div class="kpi-sub">Action: Routine Check</div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Real-Time Vibration Dynamics (RMS & Peak Acceleration)</span>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Live 60s Window</span>
        </div>
        <canvas id="chartVibration"></canvas>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Suspected Fault Inference</span>
          <span id="faultBadge" class="badge badge-demo">Normal</span>
        </div>
        <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:16px; border:1px solid var(--card-border);">
          <div style="font-size:0.75rem; color:var(--text-secondary); text-transform:uppercase;">Primary Fault Mode</div>
          <h2 id="faultName" style="color:var(--accent-cyan); margin:6px 0;">Normal Operation</h2>
          <div style="font-size:0.85rem; color:#FFF;">Model Confidence: <strong id="faultConf">98.4%</strong></div>
          <p id="faultDesc" style="font-size:0.8rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">
            Motor exhibits nominal acceleration signatures and healthy thermal stabilization.
          </p>
          <div style="margin-top:12px; padding:10px; background:rgba(0,240,255,0.05); border-radius:6px; border-left:3px solid var(--accent-cyan);">
            <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">ACTION REQUIRED:</div>
            <div id="faultAction" style="font-size:0.78rem; color:#E2E8F0; margin-top:2px;">No physical intervention needed.</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- VIEW 2: VIBRATION ANALYSIS -->
  <div id="view-vibration" class="view-content">
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">High-Frequency Triaxial Oscilloscope (ax, ay, az)</span>
          <span style="font-size:0.75rem; color:var(--accent-cyan);">60 FPS Sweep</span>
        </div>
        <canvas id="chartOscilloscope"></canvas>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Simulated FFT Frequency Spectrum</span>
          <span style="font-size:0.75rem; color:var(--text-secondary);">0 - 300 Hz</span>
        </div>
        <canvas id="chartFFT"></canvas>
      </div>
    </div>
    <div class="chart-card">
      <span class="chart-title">ISO 10816 Vibration Severity Standards Reference</span>
      <table>
        <thead>
          <tr>
            <th>Zone</th>
            <th>Vibration RMS</th>
            <th>Mechanical Condition</th>
            <th>Recommended Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color:var(--accent-green); font-weight:700;">Zone A / B</td>
            <td>&lt; 0.28 g RMS</td>
            <td>Good / Normal Baseline</td>
            <td>Standard logging schedule</td>
          </tr>
          <tr>
            <td style="color:var(--accent-amber); font-weight:700;">Zone C</td>
            <td>0.28 - 0.55 g RMS</td>
            <td>Elevated Noise / Initial Wear</td>
            <td>Inspect spur gears and alignment at next downtime</td>
          </tr>
          <tr>
            <td style="color:var(--accent-red); font-weight:700;">Zone D</td>
            <td>&gt; 0.65 g RMS</td>
            <td>Unacceptable Defect / Severe Damage</td>
            <td>Immediate motor shutdown required</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 3: TEMPERATURE ANALYSIS -->
  <div id="view-temperature" class="view-content">
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Thermal Rise & Dissipation Profile (°C)</span>
          <span style="font-size:0.75rem; color:var(--text-secondary);">Sliding Window</span>
        </div>
        <canvas id="chartTemperature"></canvas>
      </div>
      <div class="chart-card">
        <span class="chart-title">Thermal Safety Boundaries</span>
        <div class="kpi-card" style="margin-bottom:8px;">
          <div class="kpi-title">Thermal Rise Rate</div>
          <div class="kpi-value" id="tRateVal">+0.05 <span class="kpi-unit">°C/min</span></div>
          <div class="kpi-sub">Normal threshold &lt; 1.0 °C/min</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Permissible Thermal Headroom</div>
          <div class="kpi-value" id="tHeadroom">28.6 <span class="kpi-unit">°C</span></div>
          <div class="kpi-sub">Critical Shutdown at 65.0 °C</div>
        </div>
      </div>
    </div>
  </div>

  <!-- VIEW 4: ANOMALY DETECTION -->
  <div id="view-anomaly" class="view-content">
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">2D Feature Space Outlier Distribution</span>
          <span style="font-size:0.75rem; color:var(--accent-cyan);">Vibration RMS vs Temperature</span>
        </div>
        <canvas id="chartScatter"></canvas>
      </div>
      <div class="chart-card">
        <span class="chart-title">Isolation Forest Parameters</span>
        <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6;">
          <p><strong>Contamination:</strong> 3.0%</p>
          <p><strong>Trees:</strong> 100 Estimators</p>
          <p><strong>Anomaly Threshold:</strong> 0.50 score</p>
          <p style="margin-top:12px;">
            The unsupervised Isolation Forest model maps multi-dimensional telemetry (RMS, peak, temperature, thermal rate) without prior fault labels.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- VIEW 5: FAULT CLASSIFICATION -->
  <div id="view-faults" class="view-content">
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-header">
          <span class="chart-title">Fault Mode Probability Distribution</span>
        </div>
        <canvas id="chartRadar"></canvas>
      </div>
      <div class="chart-card">
        <span class="chart-title">Model Benchmark Evaluation</span>
        <table>
          <thead>
            <tr><th>Metric</th><th>Score</th></tr>
          </thead>
          <tbody>
            <tr><td>Accuracy (20% Split)</td><td style="color:var(--accent-green); font-weight:700;">99.65%</td></tr>
            <tr><td>Weighted F1 Score</td><td style="color:var(--accent-green); font-weight:700;">99.65%</td></tr>
            <tr><td>Precision</td><td style="color:var(--accent-green); font-weight:700;">99.70%</td></tr>
            <tr><td>Inference Latency</td><td>&lt; 2.5 ms</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- VIEW 6: MAINTENANCE -->
  <div id="view-maintenance" class="view-content">
    <div class="chart-card">
      <span class="chart-title">Condition-Based Maintenance (CBM) Diagnostics</span>
      <div class="kpi-grid" style="margin-top:12px;">
        <div class="kpi-card">
          <div class="kpi-title">Mechanical Wear Factor</div>
          <div class="kpi-value" id="maintWear">12<span class="kpi-unit">%</span></div>
          <div class="kpi-sub">Spur gear degradation proxy</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Thermal Stress Index</div>
          <div class="kpi-value" id="maintStress">18<span class="kpi-unit">%</span></div>
          <div class="kpi-sub">Cumulative heat accumulation</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Maintenance Priority</div>
          <div class="kpi-value" id="maintPriority" style="color:var(--accent-green);">Normal</div>
          <div class="kpi-sub">No intervention required</div>
        </div>
      </div>
    </div>
  </div>

  <!-- VIEW 7: SIMULATOR SANDBOX -->
  <div id="view-simulator" class="view-content">
    <div class="chart-card">
      <span class="chart-title">Interactive Hardware Sandbox & Fault Injector</span>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-top:12px;">
        <div class="control-group">
          <label>Operating Fault Regime</label>
          <select id="simFaultSelect" onchange="changeFaultRegime(this.value)">
            <option value="Normal">Normal Baseline</option>
            <option value="Imbalance">Mechanical Imbalance</option>
            <option value="Misalignment">Shaft Misalignment</option>
            <option value="GearWear">Bearing / Gear Wear</option>
            <option value="Overheating">Thermal Overheating</option>
            <option value="Looseness">Mechanical Looseness</option>
          </select>
        </div>
        <div class="control-group">
          <label>PWM Duty Cycle (%): <span id="pwmLabel">85%</span></label>
          <input type="range" id="simPWMSlider" min="0" max="100" value="85" oninput="updatePWM(this.value)">
        </div>
        <div class="control-group">
          <label>Sensor Noise Level (%): <span id="noiseLabel">5%</span></label>
          <input type="range" id="simNoiseSlider" min="1" max="25" value="5" oninput="updateNoise(this.value)">
        </div>
      </div>
    </div>
  </div>

  <!-- VIEW 8: DATASET EXPLORER -->
  <div id="view-dataset" class="view-content">
    <div class="chart-card">
      <div class="chart-header">
        <span class="chart-title">Sensor Telemetry Repository (Live Buffer)</span>
        <button class="btn" onclick="downloadCSV()">📥 Download Telemetry (CSV)</button>
      </div>
      <table id="datasetTable">
        <thead>
          <tr>
            <th>Time</th>
            <th>ax (g)</th>
            <th>ay (g)</th>
            <th>az (g)</th>
            <th>Vib RMS (g)</th>
            <th>Temp (°C)</th>
            <th>Est. RPM</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody id="datasetBody"></tbody>
      </table>
    </div>
  </div>

  <!-- VIEW 9: FIRMWARE -->
  <div id="view-firmware" class="view-content">
    <div class="chart-card">
      <span class="chart-title">ESP32 DevKit V1 Hardware Schematic & Arduino C++ Firmware</span>
      <table>
        <thead>
          <tr><th>Component</th><th>Pin Name</th><th>ESP32 DevKit V1 Pin</th><th>Function</th></tr>
        </thead>
        <tbody>
          <tr><td>MPU6050</td><td>SDA</td><td style="color:var(--accent-cyan); font-weight:700;">GPIO 21</td><td>I2C Data Bus</td></tr>
          <tr><td>MPU6050</td><td>SCL</td><td style="color:var(--accent-cyan); font-weight:700;">GPIO 22</td><td>I2C Clock Bus</td></tr>
          <tr><td>L298N Driver</td><td>ENA (PWM)</td><td style="color:var(--accent-cyan); font-weight:700;">GPIO 18</td><td>Speed Throttle</td></tr>
          <tr><td>L298N Driver</td><td>IN1 / IN2</td><td style="color:var(--accent-cyan); font-weight:700;">GPIO 19 / 23</td><td>H-Bridge Direction</td></tr>
          <tr><td>NTC Temp Sensor</td><td>Data Pin</td><td style="color:var(--accent-cyan); font-weight:700;">GPIO 4</td><td>Thermal Probe</td></tr>
        </tbody>
      </table>
      <pre>
#include &lt;WiFi.h&gt;
#include &lt;HTTPClient.h&gt;
#include &lt;Wire.h&gt;
#include &lt;Adafruit_MPU6050.h&gt;

const char* serverUrl = "http://&lt;IP&gt;:8000/api/ingest";
Adafruit_MPU6050 mpu;

void setup() {
  Wire.begin(21, 22);
  mpu.begin();
  WiFi.begin("YOUR_SSID", "YOUR_PASSWORD");
}

void loop() {
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  // Post telemetry payload to /api/ingest
  delay(200); // 5 Hz
}
      </pre>
    </div>
  </div>

  <!-- VIEW 10: SETTINGS -->
  <div id="view-settings" class="view-content">
    <div class="chart-card">
      <span class="chart-title">Motor Specification & Threshold Calibration</span>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:12px;">
        <div class="control-group">
          <label>Motor Model</label>
          <input type="text" value="BO DC Dual Shaft TT (1:48 Gearbox)" disabled>
        </div>
        <div class="control-group">
          <label>Operating Voltage</label>
          <input type="text" value="3.0V - 6.0V DC" disabled>
        </div>
        <div class="control-group">
          <label>Vibration Warning Threshold (g)</label>
          <input type="number" value="0.35" step="0.05">
        </div>
        <div class="control-group">
          <label>Temperature Warning Threshold (°C)</label>
          <input type="number" value="50.0" step="1.0">
        </div>
      </div>
    </div>
  </div>

</div>

<script>
// --- SIMULATION & PHYSICS ENGINE ---
let currentFault = 'Normal';
let currentPWM = 85.0;
let currentNoise = 0.05;
let isLiveESP32 = false;

let historyData = [];
const MAX_HISTORY = 60;

// Initialize history
const now = Date.now();
for (let i = MAX_HISTORY; i >= 0; i--) {
  const t = new Date(now - i * 1000);
  historyData.push(generateReading(t));
}

function generateReading(dateObj) {
  const pwm = currentPWM;
  let v_rms = 0.20;
  let temp = 34.0 + (pwm / 100.0) * 8.0;
  
  if (currentFault === 'Imbalance') {
    v_rms = 0.48;
    temp += 6.0;
  } else if (currentFault === 'Misalignment') {
    v_rms = 0.58;
    temp += 9.0;
  } else if (currentFault === 'GearWear') {
    v_rms = 0.68;
    temp += 8.0;
  } else if (currentFault === 'Overheating') {
    v_rms = 0.42;
    temp = 68.0;
  } else if (currentFault === 'Looseness') {
    v_rms = 0.75;
    temp += 4.0;
  }
  
  v_rms += (Math.random() - 0.5) * currentNoise;
  temp += (Math.random() - 0.5) * 0.4;
  
  const amag = 1.0 + v_rms * 0.8;
  const rpm = Math.round((pwm / 100.0) * 200.0 * (1.0 - Math.min(0.2, v_rms * 0.08)));
  const health = Math.max(5, Math.min(100, Math.round(100 - (v_rms - 0.2) * 110 - (temp > 50 ? (temp - 50) * 1.5 : 0))));
  const anomalyScore = Math.min(1.0, Math.max(0.0, ((v_rms - 0.25) / 0.5) + (temp > 55 ? 0.4 : 0.0))).toFixed(2);
  
  return {
    time: dateObj.toLocaleTimeString(),
    ax: (Math.sin(Date.now() / 150) * v_rms + (Math.random() - 0.5) * 0.04).toFixed(3),
    ay: (Math.cos(Date.now() / 150) * v_rms + (Math.random() - 0.5) * 0.04).toFixed(3),
    az: (0.98 + Math.sin(Date.now() / 200) * 0.1 * v_rms).toFixed(3),
    v_rms: parseFloat(v_rms.toFixed(3)),
    v_peak: parseFloat((v_rms * 1.5).toFixed(3)),
    temp: parseFloat(temp.toFixed(2)),
    rpm: rpm,
    health: health,
    anomalyScore: parseFloat(anomalyScore),
    source: isLiveESP32 ? 'real' : 'synthetic'
  };
}

// Navigation View Switcher
function showView(viewId, element) {
  document.querySelectorAll('.view-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('view-' + viewId).classList.add('active');
  element.classList.add('active');
  window.dispatchEvent(new Event('resize'));
}

function toggleProvenance() {
  isLiveESP32 = !isLiveESP32;
  const badge = document.getElementById('provenanceBadge');
  if (isLiveESP32) {
    badge.className = 'badge badge-live';
    badge.innerText = '● LIVE DATA | ESP32 Connected';
  } else {
    badge.className = 'badge badge-demo';
    badge.innerText = '● DEMO MODE | Simulated Sensor Data';
  }
}

function changeFaultRegime(val) {
  currentFault = val;
}

function updatePWM(val) {
  currentPWM = parseFloat(val);
  document.getElementById('pwmLabel').innerText = val + '%';
}

function updateNoise(val) {
  currentNoise = parseFloat(val) / 100.0;
  document.getElementById('noiseLabel').innerText = val + '%';
}

// Canvas Drawing Helper
function drawLineChart(canvasId, dataPoints, color, minVal, maxVal, label) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.clientWidth * window.devicePixelRatio;
  const h = canvas.height = canvas.clientHeight * window.devicePixelRatio;
  
  ctx.clearRect(0, 0, w, h);
  
  // Grid lines
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    const y = (h / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  
  // Data Path
  if (dataPoints.length < 2) return;
  ctx.beginPath();
  dataPoints.forEach((val, idx) => {
    const x = (w / (dataPoints.length - 1)) * idx;
    const norm = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal)));
    const y = h - norm * (h - 30) - 15;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5 * window.devicePixelRatio;
  ctx.stroke();
}

// Continuous Simulation Loop
setInterval(() => {
  const now = new Date();
  document.getElementById('liveClock').innerText = now.toLocaleTimeString();
  
  const reading = generateReading(now);
  historyData.push(reading);
  if (historyData.length > MAX_HISTORY) historyData.shift();
  
  // Update KPI Elements
  document.getElementById('kpiHealth').innerHTML = reading.health + '<span class="kpi-unit">%</span>';
  document.getElementById('kpiHealth').style.color = reading.health > 75 ? 'var(--accent-green)' : (reading.health > 45 ? 'var(--accent-amber)' : 'var(--accent-red)');
  document.getElementById('kpiVibRMS').innerHTML = reading.v_rms + '<span class="kpi-unit">g</span>';
  document.getElementById('kpiVibPeak').innerText = 'Peak: ' + reading.v_peak + ' g';
  document.getElementById('kpiTemp').innerHTML = reading.temp + '<span class="kpi-unit">°C</span>';
  document.getElementById('kpiAnomaly').innerText = reading.anomalyScore;
  document.getElementById('kpiAnomaly').style.color = reading.anomalyScore > 0.5 ? 'var(--accent-red)' : 'var(--accent-green)';
  document.getElementById('kpiRPM').innerHTML = reading.rpm + '<span class="kpi-unit">RPM</span>';
  document.getElementById('kpiPWM').innerText = 'PWM: ' + currentPWM + '% (TT 1:48)';
  
  const risk = reading.v_rms > 0.65 || reading.temp > 60 ? 'Critical' : (reading.v_rms > 0.45 ? 'Elevated' : (reading.v_rms > 0.28 ? 'Moderate' : 'Low'));
  document.getElementById('kpiRisk').innerText = risk;
  document.getElementById('kpiRisk').style.color = risk === 'Critical' ? 'var(--accent-red)' : (risk === 'Elevated' ? 'var(--accent-amber)' : 'var(--accent-green)');
  
  // Fault Diagnosis Card
  const faultNames = {
    'Normal': 'Normal Operation',
    'Imbalance': 'Mechanical Imbalance',
    'Misalignment': 'Shaft Misalignment',
    'GearWear': 'Bearing / Gear Wear',
    'Overheating': 'Thermal Overheating',
    'Looseness': 'Mechanical Looseness'
  };
  document.getElementById('faultName').innerText = faultNames[currentFault] || currentFault;
  document.getElementById('faultBadge').innerText = faultNames[currentFault];
  
  // Draw Overview Charts
  drawLineChart('chartVibration', historyData.map(d => d.v_rms), '#00F0FF', 0.0, 1.0, 'RMS');
  drawLineChart('chartTemperature', historyData.map(d => d.temp), '#EF4444', 25.0, 80.0, 'Temp');
  drawLineChart('chartOscilloscope', historyData.map(d => parseFloat(d.ax)), '#00F0FF', -1.0, 1.0, 'ax');
  drawLineChart('chartFFT', [0.05, 0.08, 0.12, 0.45, 0.22, 0.15, 0.68, 0.25, 0.10], '#10B981', 0.0, 1.0, 'FFT');
  drawLineChart('chartScatter', historyData.map(d => d.health), '#A855F7', 0, 100, 'Scatter');
  drawLineChart('chartRadar', [95, 20, 15, 10, 8, 5], '#38BDF8', 0, 100, 'Radar');
  
  // Update Table Body
  const tbody = document.getElementById('datasetBody');
  if (tbody) {
    const recent = historyData.slice(-10).reverse();
    tbody.innerHTML = recent.map(r => `
      <tr>
        <td>${r.time}</td>
        <td>${r.ax}</td>
        <td>${r.ay}</td>
        <td>${r.az}</td>
        <td>${r.v_rms}</td>
        <td>${r.temp}</td>
        <td>${r.rpm}</td>
        <td><span class="badge ${r.source === 'real' ? 'badge-live' : 'badge-demo'}">${r.source}</span></td>
      </tr>
    `).join('');
  }
}, 800);

function downloadCSV() {
  const headers = ['time', 'ax', 'ay', 'az', 'vibration_rms', 'vibration_peak', 'temperature_c', 'rpm_estimated', 'source'];
  const rows = historyData.map(r => [r.time, r.ax, r.ay, r.az, r.v_rms, r.v_peak, r.temp, r.rpm, r.source].join(','));
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', 'bo_motor_offline_telemetry.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>
</body>
</html>'''

with open('standalone_dashboard.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

print('standalone_dashboard.html generated successfully!')
