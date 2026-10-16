import React, { useState, useEffect } from 'react';
import { Activity, Radio, Thermometer, Send, Wifi, Terminal, RefreshCw, Layers } from 'lucide-react';
import { OscilloscopeCanvas, TimeSeriesChart } from './Charts';

export function LiveMonitoringView({
  liveReading,
  onInjectSample,
  isEsp32Connected,
  simulatorActive,
  onToggleSimulator
}) {
  const [streamHistory, setStreamHistory] = useState([]);
  const [packetCount, setPacketCount] = useState(0);

  useEffect(() => {
    if (liveReading) {
      setPacketCount(c => c + 1);
      setStreamHistory(prev => {
        const next = [...prev, {
          timestamp: liveReading.timestamp,
          vibration_rms: liveReading.features?.vibration_rms || 0.3,
          temperature_c: liveReading.raw?.temperature_c || 38.0,
          accel_magnitude: liveReading.features?.accel_magnitude || 1.0,
          anomaly_score: liveReading.anomaly?.score || 0.1,
          status: liveReading.anomaly?.status || 'Normal'
        }];
        return next.slice(-60); // keep last 60 points in live window
      });
    }
  }, [liveReading]);

  const raw = liveReading?.raw || {
    ax: 0.05,
    ay: 0.08,
    az: 0.98,
    gyro_x: 0.0,
    gyro_y: 0.0,
    gyro_z: 0.0,
    temperature_c: 38.5,
    pwm_duty: 80.0
  };

  const features = liveReading?.features || {
    vibration_rms: 0.32,
    accel_magnitude: 1.01,
    vibration_peak: 0.42,
    rpm_estimated: 180
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Telemetry Gateway Status */}
      <div className="glass-card rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-400" />
              Live Telemetry Stream & Gateway Inspector
            </h2>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              WebSocket Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Zero-latency telemetry ingestion pipeline from ESP32 DevKit V1 over REST API / WebSockets
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onInjectSample}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 text-navy-950 transition-all shadow-md glow-cyan"
          >
            <Send className="w-3.5 h-3.5" />
            Send Test Packet
          </button>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Packets Received</span>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1 font-mono">{packetCount}</div>
          <span className="text-[10px] text-slate-400">Current session</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Sampling Frequency</span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1 font-mono">~50 Hz / 1 Hz</div>
          <span className="text-[10px] text-slate-400">MPU6050 / HTTP</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Current PWM Duty</span>
          <div className="text-2xl font-extrabold text-purple-400 mt-1 font-mono">{raw.pwm_duty?.toFixed(0)}%</div>
          <span className="text-[10px] text-slate-400">L298N Channel 0</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Estimated RPM</span>
          <div className="text-2xl font-extrabold text-white mt-1 font-mono">{Math.round(features.rpm_estimated || 180)}</div>
          <span className="text-[10px] text-slate-400">Estimated proxy</span>
        </div>
      </div>

      {/* HIGH-SPEED OSCILLOSCOPE */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-cyan-400" />
              Real-Time High-Speed Acceleration Oscilloscope (MPU6050)
            </h3>
            <span className="text-xs text-slate-400">Continuous 60 FPS Canvas rendering</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-red-400">● Ax: {raw.ax?.toFixed(2)}g</span>
            <span className="text-emerald-400">● Ay: {raw.ay?.toFixed(2)}g</span>
            <span className="text-blue-400">● Az: {raw.az?.toFixed(2)}g</span>
            <span className="text-amber-400">● Mag: {features.accel_magnitude?.toFixed(2)}g</span>
          </div>
        </div>

        <OscilloscopeCanvas
          ax={raw.ax}
          ay={raw.ay}
          az={raw.az}
          amag={features.accel_magnitude}
          height={240}
        />
      </div>

      {/* LIVE ROLLING TIME SERIES CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rolling Vibration RMS */}
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Live Rolling Vibration RMS (g)
          </h4>
          <TimeSeriesChart
            data={streamHistory}
            lines={[{ key: 'vibration_rms', label: 'Vibration RMS', color: '#06B6D4', width: 2 }]}
            thresholds={[{ value: 0.80, label: 'Warning', color: '#F59E0B' }]}
            height={220}
            showGrid={true}
          />
        </div>

        {/* Rolling Temperature */}
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-400" />
            Live Rolling Temperature (°C)
          </h4>
          <TimeSeriesChart
            data={streamHistory}
            lines={[{ key: 'temperature_c', label: 'Temperature', color: '#F59E0B', width: 2 }]}
            thresholds={[{ value: 45.0, label: 'Normal Max', color: '#F59E0B' }]}
            height={220}
            showGrid={true}
          />
        </div>
      </div>

      {/* RAW TELEMETRY PACKET INSPECTOR */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-purple-400" />
            Latest Ingested Payload (POST /api/ingest)
          </h3>
          <span className="text-xs font-mono text-slate-400">JSON Ingest Protocol</span>
        </div>
        <pre className="p-4 rounded-xl bg-navy-950 border border-navy-850 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
          {JSON.stringify(liveReading || {
            motor_id: "BO_MOTOR_01",
            temperature: 42.5,
            ax: 0.21,
            ay: 0.34,
            az: 1.08,
            gyro_x: 0.01,
            gyro_y: 0.02,
            gyro_z: 0.03,
            pwm_duty: 80.0,
            source: "real"
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
