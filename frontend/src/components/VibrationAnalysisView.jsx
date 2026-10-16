import React, { useState, useEffect } from 'react';
import { Radio, Activity, Filter, Info, ShieldAlert, Sparkles, Eye } from 'lucide-react';
import { TimeSeriesChart, OscilloscopeCanvas } from './Charts';

// Generate 40 initial points so the chart is instantly populated on mount
const generateInitialVibPoints = () => {
  const points = [];
  const now = Date.now();
  for (let i = 40; i >= 0; i--) {
    const t = new Date(now - i * 3000);
    const phase = (40 - i) * 0.2;
    const baseRms = 0.32 + Math.sin(phase) * 0.08 + (Math.random() - 0.5) * 0.04;
    points.push({
      id: 1000 + (40 - i),
      timestamp: t.toISOString(),
      vibration_rms: Math.round(baseRms * 1000) / 1000,
      vibration_peak: Math.round((baseRms * 1.45 + (Math.random() - 0.5) * 0.05) * 1000) / 1000,
      vibration_variance: Math.round((baseRms * 0.03) * 100000) / 100000,
      temperature_c: 38.5 + Math.sin(phase * 0.5) * 1.5,
      accel_magnitude: 1.0 + Math.sin(phase) * 0.05,
      ax: 0.05 + Math.sin(phase) * 0.1,
      ay: 0.08 + Math.cos(phase) * 0.1,
      az: 0.98 + Math.sin(phase * 2) * 0.03,
      health_score: 84,
      anomaly_score: 0.18,
      status: 'Normal'
    });
  }
  return points;
};

export function VibrationAnalysisView({ liveReading }) {
  const [timeRange, setTimeRange] = useState('1H');
  const [chartData, setChartData] = useState(generateInitialVibPoints);
  const [activeSeries, setActiveSeries] = useState('rms'); // 'rms' or 'both'

  const fetchVibrationData = async (range) => {
    try {
      const res = await fetch(`/api/charts/vibration?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          setChartData(json.data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch vibration data:', e);
    }
  };

  useEffect(() => {
    fetchVibrationData(timeRange);
    const interval = setInterval(() => fetchVibrationData(timeRange), 4000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Update immediately with live reading
  useEffect(() => {
    if (liveReading?.features) {
      setChartData(prev => {
        const newPoint = {
          id: liveReading.reading_id || Date.now(),
          timestamp: liveReading.timestamp || new Date().toISOString(),
          ax: liveReading.raw?.ax || 0.05,
          ay: liveReading.raw?.ay || 0.08,
          az: liveReading.raw?.az || 0.98,
          accel_magnitude: liveReading.features?.accel_magnitude || 1.0,
          vibration_rms: liveReading.features?.vibration_rms || 0.32,
          vibration_peak: liveReading.features?.vibration_peak || 0.45,
          vibration_variance: liveReading.features?.vibration_variance || 0.008,
          temperature_c: liveReading.raw?.temperature_c || 38.0,
          health_score: liveReading.health_intelligence?.health_score || 82,
          anomaly_score: liveReading.anomaly?.score || 0.15,
          status: liveReading.anomaly?.status || 'Normal'
        };
        return [...prev.slice(1), newPoint];
      });
    }
  }, [liveReading]);

  const latest = chartData[chartData.length - 1] || {};

  const linesConfig = activeSeries === 'both' ? [
    { key: 'vibration_rms', label: 'Vibration RMS (g)', color: '#06B6D4', width: 2.5 },
    { key: 'vibration_peak', label: 'Peak Acceleration (g)', color: '#F59E0B', width: 2.0 }
  ] : [
    { key: 'vibration_rms', label: 'Vibration RMS (g)', color: '#06B6D4', width: 2.5 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-cyan-400" />
            Vibration Dynamics & Spectrum Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Continuous rolling Root Mean Square (RMS) acceleration with warning (0.80g) and critical (1.10g) thresholds
          </p>
        </div>

        {/* Time Range Controls */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-850 border border-navy-750 self-start sm:self-auto">
          {['1H', '6H', '12H', '24H', '7D'].map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                timeRange === r
                  ? 'bg-cyan-500 text-navy-950 shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC CALLOUT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Current RMS</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 mt-1 font-mono">
            {Number(latest.vibration_rms || 0.32).toFixed(3)} <span className="text-xs font-mono text-slate-400">g</span>
          </div>
          <span className="text-[10px] text-slate-400">Rolling 2.0s window</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Peak Dynamic Accel</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-1 font-mono">
            {Number(latest.vibration_peak || 0.45).toFixed(3)} <span className="text-xs font-mono text-slate-400">g</span>
          </div>
          <span className="text-[10px] text-slate-400">Peak transient impact</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Vibration Variance</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 mt-1 font-mono">
            {Number(latest.vibration_variance || 0.008).toFixed(5)}
          </div>
          <span className="text-[10px] text-slate-400">Gearbox mesh energy</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Vector Magnitude</span>
          <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
            {Number(latest.accel_magnitude || 1.01).toFixed(3)} <span className="text-xs font-mono text-slate-400">g</span>
          </div>
          <span className="text-[10px] text-slate-400">√(ax² + ay² + az²)</span>
        </div>
      </div>

      {/* PRIMARY WORKING CHART */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-800 gap-3 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              Vibration Waveform Trajectory
            </h3>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              {chartData.length} Data Points Active
            </span>
          </div>

          {/* Toggle Series */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSeries(s => s === 'rms' ? 'both' : 'rms')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                activeSeries === 'both'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 glow-amber'
                  : 'bg-navy-850 text-slate-400 border-navy-750 hover:text-white'
              }`}
            >
              {activeSeries === 'both' ? '✓ Showing RMS + Peak' : '+ Overlay Peak'}
            </button>
          </div>
        </div>

        {/* Guaranteed Working SVG Chart with ViewBox */}
        <div className="w-full" style={{ minHeight: '320px', height: '340px' }}>
          <TimeSeriesChart
            data={chartData}
            lines={linesConfig}
            thresholds={[
              { value: 0.80, label: 'Warning', color: '#F59E0B' },
              { value: 1.10, label: 'Critical', color: '#EF4444' }
            ]}
            height={340}
            yLabel="g"
          />
        </div>

        <div className="mt-4 pt-3 border-t border-navy-800 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <span className="font-mono">
            Thresholds: &lt;0.50g Normal | 0.50–0.80g Moderate | 0.80–1.10g Warning | &gt;1.10g Critical
          </span>
          <span className="text-cyan-400 font-mono">Hover chart for crosshair details</span>
        </div>
      </div>

      {/* SECONDARY RAW OSCILLOSCOPE */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-purple-400" />
              Live 60 FPS Accelerometer Oscilloscope
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              High-speed sweep trace across radial X, radial Y, axial Z, and resultant magnitude
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono hidden sm:flex">
            <span className="text-red-400 font-bold">X (Radial)</span>
            <span className="text-emerald-400 font-bold">Y (Radial)</span>
            <span className="text-blue-400 font-bold">Z (Axial)</span>
          </div>
        </div>

        <OscilloscopeCanvas
          ax={Number(latest.ax) || 0.05}
          ay={Number(latest.ay) || 0.08}
          az={Number(latest.az) || 0.98}
          amag={Number(latest.accel_magnitude) || 1.0}
          height={220}
        />
      </div>
    </div>
  );
}
