import React, { useState, useEffect } from 'react';
import { Layers, Info, Filter, ShieldCheck, AlertCircle } from 'lucide-react';
import { ScatterPlot } from './Charts';

export function ScatterPlotView() {
  const [points, setPoints] = useState([]);
  const [sampleSize, setSampleSize] = useState(500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScatterPoints(sampleSize);
  }, [sampleSize]);

  const fetchScatterPoints = async (size) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/charts/scatter?sample_size=${size}`);
      const json = await res.json();
      setPoints(json.points || []);
    } catch (e) {
      console.error('Failed to load scatter points:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-6">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-cyan-400" />
            Temperature vs. Vibration Bivariate Scatter Analysis
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Correlates thermal expansion state with dynamic vibrational RMS energy to isolate mechanical vs. electrical stress regimes
          </p>
        </div>

        {/* Sample Size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Samples:</span>
          <select
            value={sampleSize}
            onChange={(e) => setSampleSize(Number(e.target.value))}
            className="bg-navy-850 border border-navy-750 text-xs font-mono text-cyan-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
          >
            <option value={200}>200 Points</option>
            <option value={500}>500 Points</option>
            <option value={1000}>1,000 Points</option>
          </select>
        </div>
      </div>

      {/* PRIMARY SCATTER PLOT */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-navy-800 gap-2 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">
              Multi-Regime Operating Envelope
            </h3>
            <span className="text-xs text-slate-400">
              Hover individual data points for exact telemetry metrics and suspected fault pattern
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Normal Regime
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Warning Regime
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" /> Critical Regime
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-[340px] flex items-center justify-center text-slate-400 font-mono text-sm">
            Evaluating scatter distribution...
          </div>
        ) : (
          <ScatterPlot points={points} height={350} />
        )}
      </div>

      {/* CLUSTERING & BEHAVIORAL INTERPRETATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="glass-card rounded-xl p-4 border-l-4 border-l-emerald-500">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Nominal Cluster (&lt;45°C, &lt;0.5g)
          </div>
          <p className="text-slate-400 leading-relaxed">
            Motor mounted rigidly with balanced rotor. MPU6050 reads low vibration variance and standard convective heat balance.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border-l-4 border-l-amber-500">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Dynamic Mechanical Stress (Vib &gt; 0.6g)
          </div>
          <p className="text-slate-400 leading-relaxed">
            Occurs in Mechanical Imbalance, Shaft Misalignment, and Gear Wear regimes. High vibration occurs even before substantial casing heating.
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 border-l-4 border-l-rose-500">
          <div className="font-bold text-white mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Thermal Runaway / Stall (&gt;60°C)
          </div>
          <p className="text-slate-400 leading-relaxed">
            Associated with high PWM duty cycles or gear train mechanical binding. Causes plastic gear softening and motor stall risks.
          </p>
        </div>
      </div>
    </div>
  );
}
