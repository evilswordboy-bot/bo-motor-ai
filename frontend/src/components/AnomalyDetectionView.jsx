import React, { useState, useEffect } from 'react';
import { ShieldAlert, Activity, AlertTriangle, Layers, Info, CheckCircle2 } from 'lucide-react';
import { TimeSeriesChart } from './Charts';

export function AnomalyDetectionView() {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnomalyData();
  }, []);

  const fetchAnomalyData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/charts/vibration?range=6H');
      const json = await res.json();
      setChartData(json.data || []);
    } catch (e) {
      console.error('Failed to load anomaly data:', e);
    } finally {
      setLoading(false);
    }
  };

  const latest = chartData[chartData.length - 1] || {};
  const anomalyScore = latest.anomaly_score || 0.15;
  const status = latest.status || 'Normal';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-purple-400" />
            AI Anomaly Detection Pipeline (Isolation Forest)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Unsupervised novelty detection trained exclusively on normal baseline operation data
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase border ${
            status === 'Critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 glow-rose' :
            status === 'Warning' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 glow-amber' :
            'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 glow-emerald'
          }`}>
            Anomaly Status: {status}
          </span>
        </div>
      </div>

      {/* METRIC CALLOUT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Current Anomaly Score</span>
          <div className="text-3xl font-extrabold text-purple-400 mt-1 font-mono">
            {Number(anomalyScore).toFixed(3)}
          </div>
          <span className="text-[11px] text-slate-400">Range: [0.00 – 1.00]</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Warning Boundary</span>
          <div className="text-3xl font-extrabold text-amber-400 mt-1 font-mono">0.500</div>
          <span className="text-[11px] text-slate-400">Elevated outlier decision threshold</span>
        </div>

        <div className="glass-card rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Critical Boundary</span>
          <div className="text-3xl font-extrabold text-rose-400 mt-1 font-mono">0.750</div>
          <span className="text-[11px] text-slate-400">Extreme anomaly trigger threshold</span>
        </div>
      </div>

      {/* PRIMARY ANOMALY SCORE TIMELINE */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-800 gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Continuous Anomaly Score Trajectory
            </h3>
            <span className="text-xs text-slate-400">
              Computed in Python via Scikit-Learn IsolationForest.decision_function mapped via sigmoid
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-purple-400">
              <span className="w-2.5 h-0.5 bg-purple-400 inline-block" /> Anomaly Score
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 border-t border-dashed inline-block" /> Warning (0.50)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-400 border-t border-dashed inline-block" /> Critical (0.75)
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-slate-400 font-mono text-sm">
            Processing isolation forest metrics...
          </div>
        ) : (
          <TimeSeriesChart
            data={chartData}
            lines={[
              { key: 'anomaly_score', label: 'Anomaly Score', color: '#A855F7', width: 2.5 }
            ]}
            thresholds={[
              { value: 0.50, label: 'Warning', color: '#F59E0B' },
              { value: 0.75, label: 'Critical', color: '#EF4444' }
            ]}
            height={300}
            yLabel="Score"
          />
        )}
      </div>

      {/* MODEL ARCHITECTURE & FEATURE WEIGHTING */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Input Feature Vector (6 Dimensions)
          </h4>
          <div className="space-y-2 text-xs font-mono">
            {[
              { name: 'vibration_rms', desc: 'Rolling Root-Mean-Square vibration acceleration' },
              { name: 'temperature_c', desc: 'Real-time motor casing temperature' },
              { name: 'vibration_peak', desc: 'Maximum transient acceleration peak in window' },
              { name: 'vibration_variance', desc: 'Variance of acceleration magnitude vector' },
              { name: 'temperature_rate', desc: 'Thermal rate of climb (deg C / minute)' },
              { name: 'vibration_rate', desc: 'Vibration rate of change (g / minute)' },
            ].map((f, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-navy-850 border border-navy-750">
                <span className="text-cyan-400 font-bold">{f.name}</span>
                <span className="text-slate-400 text-[11px] font-sans">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-purple-400" />
              Machine Learning Architecture Rationale
            </h4>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Unsupervised Isolation Forest:</strong> In industrial practice, normal operating data is abundant while catastrophic failure data is rare. Isolation Forest isolates anomalous points by constructing random decision trees. Normal instances require many splits, whereas structural anomalies are isolated near the root.
              </p>
              <p>
                <strong>Contamination Rate:</strong> Configured at 0.03 (3% baseline anomaly expectation) with 100 estimators, standardized using Scikit-Learn’s <code>StandardScaler</code>.
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-navy-950 border border-purple-500/30 text-[11px] text-purple-300">
            * Important Engineering Disclaimer: Configurable demo thresholds (0.50 / 0.75) are set for BO DC geared motor rig demonstration, not universal ISO standards.
          </div>
        </div>
      </div>
    </div>
  );
}
