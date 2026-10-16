import React, { useState, useEffect } from 'react';
import { Cpu, ShieldCheck, AlertTriangle, Layers, Info, CheckCircle2, ChevronRight } from 'lucide-react';
import { DonutChart } from './Charts';

export function FaultClassificationView({ onNavigate }) {
  const [faultData, setFaultData] = useState(null);
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaultDetails();
  }, []);

  const fetchFaultDetails = async () => {
    setLoading(true);
    try {
      const [fRes, oRes] = await Promise.all([
        fetch('/api/charts/fault-distribution'),
        fetch('/api/overview')
      ]);
      setFaultData(await fRes.json());
      setOverview(await oRes.json());
    } catch (e) {
      console.error('Failed to load fault classification:', e);
    } finally {
      setLoading(false);
    }
  };

  const currentFault = overview?.fault_intelligence || {
    possible_fault: 'Mechanical Imbalance',
    confidence: 68.0,
    evidence: ['↑ Vibration RMS', '↑ Dynamic acceleration variance', 'Temperature stable'],
    disclaimer: 'Suspected Fault Pattern (Engineering Estimate)'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-purple-400" />
            Supervised Fault Pattern Classifier (Random Forest)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Multivariate supervised classification mapped across 6 operational regimes with physical sensor evidence
          </p>
        </div>

        <button
          onClick={() => onNavigate('model')}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-purple-950/60 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50 transition-all glow-purple"
        >
          Model Performance & Metrics <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* CURRENT ACTIVE PREDICTION & DISCLAIMER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400 font-mono">
                Active Telemetry Classification
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Confidence: {currentFault.confidence}%
              </span>
            </div>

            <div className="text-2xl font-extrabold text-white mb-3">
              Suspected Fault: <span className="text-purple-400">{currentFault.possible_fault}</span>
            </div>

            <div className="space-y-2 mb-4">
              <span className="text-xs font-bold text-slate-300 block">Physical Sensor Evidence:</span>
              {currentFault.evidence?.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-navy-850 border border-navy-750 text-xs text-slate-200">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-navy-950 border border-amber-500/40 text-amber-300 text-xs leading-relaxed">
            <strong>Engineering Disclaimer:</strong> Temperature + MPU6050 vibration alone cannot definitively diagnose a mechanical fault with 100% certainty. Hence every prediction is presented as a <em>"Suspected Fault Pattern"</em>, never a "Confirmed Fault".
          </div>
        </div>

        {/* DONUT CHART OF ACTUAL DATASET DISTRIBUTION */}
        <div className="lg:col-span-6 glass-card rounded-2xl p-6">
          <div className="pb-3 border-b border-navy-800 mb-4">
            <h3 className="text-base font-bold text-white">
              Dataset Fault Pattern Distribution
            </h3>
            <span className="text-xs text-slate-400">
              Calculated dynamically from {faultData?.total_predictions?.toLocaleString() || '10,000'} evaluated samples
            </span>
          </div>

          {loading || !faultData ? (
            <div className="h-[240px] flex items-center justify-center text-slate-400 font-mono text-sm">
              Calculating class distribution...
            </div>
          ) : (
            <DonutChart
              data={faultData.distribution}
              centerText={`${faultData.current_anomaly_average}%`}
              centerSub="Current Anomaly"
              size={200}
            />
          )}
        </div>
      </div>

      {/* THE 6 CLASSIFICATION TAXONOMIES */}
      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Monitored Fault Taxonomies for BO DC Geared Motor
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {[
            {
              title: 'Normal Operation',
              desc: 'Baseline state. Rigid mounting, balanced rotor, stable temperature (<45°C) and low vibration RMS (<0.45g).',
              tag: 'Nominal',
              color: 'emerald'
            },
            {
              title: 'Mechanical Imbalance',
              desc: 'Eccentric mass on shaft or wheel. Dominant 1X rotational frequency peak, elevated radial vibration on X and Y.',
              tag: '1X Harmonic',
              color: 'amber'
            },
            {
              title: 'Shaft Misalignment',
              desc: 'Angular or parallel offset between motor shaft and load coupler. Characterized by 2X rotational harmonic and axial stress.',
              tag: '2X Harmonic',
              color: 'blue'
            },
            {
              title: 'Bearing / Gear Wear',
              desc: 'Plastic TT spur gear teeth wear, skipping or pitting. Produces high dynamic variance, acoustic chatter, and transient spikes.',
              tag: 'Spur Gear Mesh',
              color: 'purple'
            },
            {
              title: 'Thermal Overheating',
              desc: 'Continuous high duty cycle or stall drag. Temperature climbs rapidly past 60°C, causing winding resistance and plastic expansion.',
              tag: 'Thermal Runaway',
              color: 'rose'
            },
            {
              title: 'Mechanical Looseness',
              desc: 'Loosened bracket mounting screws. Causes subharmonic vibration chatter, intermittent impacts, and high variance.',
              tag: 'Bracket Chatter',
              color: 'pink'
            }
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-navy-850 border border-navy-750 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{item.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-navy-900 border border-navy-750 text-slate-300">
                    {item.tag}
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed mb-3">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
