import React, { useState, useEffect } from 'react';
import { Clock, Filter, Eye, Check } from 'lucide-react';
import { TimeSeriesChart } from './Charts';

export function HistoricalAnalysisView() {
  const [range, setRange] = useState('24H');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [metrics, setMetrics] = useState({
    vibration_rms: true,
    temperature_c: true,
    health_score: true,
    anomaly_score: false
  });

  useEffect(() => {
    fetchHistorical(range);
  }, [range]);

  const fetchHistorical = async (r) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/charts/vibration?range=${r}`);
      const json = await res.json();
      setChartData(json.data || []);
    } catch (e) {
      console.error('Failed to load historical data:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleMetric = (k) => {
    setMetrics(prev => ({ ...prev, [k]: !prev[k] }));
  };

  const linesToRender = [];
  if (metrics.vibration_rms) linesToRender.push({ key: 'vibration_rms', label: 'Vibration RMS (g)', color: '#06B6D4', width: 2 });
  if (metrics.temperature_c) linesToRender.push({ key: 'temperature_c', label: 'Temperature (°C)', color: '#F59E0B', width: 2 });
  if (metrics.health_score) linesToRender.push({ key: 'health_score', label: 'Health Score (%)', color: '#10B981', width: 2 });
  if (metrics.anomaly_score) linesToRender.push({ key: 'anomaly_score', label: 'Anomaly Score', color: '#A855F7', width: 2 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-cyan-400" />
            Historical Comparative Telemetry Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Correlate multiple telemetry dimensions over macro operational timeframes
          </p>
        </div>

        {/* Range selectors */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-navy-850 border border-navy-750 self-start sm:self-auto">
          {['1H', '6H', '12H', '24H', '7D'].map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                range === r
                  ? 'bg-cyan-500 text-navy-950 shadow-md glow-cyan'
                  : 'text-slate-400 hover:text-white hover:bg-navy-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* METRIC TOGGLES */}
      <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center gap-3">
        <span className="text-xs font-bold text-slate-300 mr-2 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-cyan-400" /> Active Metric Layers:
        </span>

        <button
          onClick={() => toggleMetric('vibration_rms')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            metrics.vibration_rms
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 glow-cyan'
              : 'bg-navy-850 text-slate-500 border-navy-750 hover:text-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          Vibration RMS (g)
        </button>

        <button
          onClick={() => toggleMetric('temperature_c')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            metrics.temperature_c
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 glow-amber'
              : 'bg-navy-850 text-slate-500 border-navy-750 hover:text-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Temperature (°C)
        </button>

        <button
          onClick={() => toggleMetric('health_score')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            metrics.health_score
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 glow-emerald'
              : 'bg-navy-850 text-slate-500 border-navy-750 hover:text-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Health Score (%)
        </button>

        <button
          onClick={() => toggleMetric('anomaly_score')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            metrics.anomaly_score
              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 glow-purple'
              : 'bg-navy-850 text-slate-500 border-navy-750 hover:text-slate-300'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          Anomaly Score
        </button>
      </div>

      {/* MULTI-METRIC OVERLAY CHART */}
      <div className="glass-card rounded-2xl p-6">
        <div className="pb-3 border-b border-navy-800 mb-4">
          <h3 className="text-base font-bold text-white">Synchronized Multi-Variate Trajectory</h3>
          <span className="text-xs text-slate-400">
            Compare trends across all enabled dimensions
          </span>
        </div>

        {loading ? (
          <div className="h-[320px] flex items-center justify-center text-slate-400 font-mono text-sm">
            Fetching comparative records...
          </div>
        ) : (
          <TimeSeriesChart
            data={chartData}
            lines={linesToRender}
            height={340}
          />
        )}
      </div>
    </div>
  );
}
