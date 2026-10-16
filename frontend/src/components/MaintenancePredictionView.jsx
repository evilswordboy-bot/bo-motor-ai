import React from 'react';
import { Wrench, AlertTriangle, CheckCircle2, ShieldAlert, FileText, Info, HelpCircle } from 'lucide-react';

export function MaintenancePredictionView({ overviewData }) {
  const maint = overviewData?.maintenance_intelligence || {
    risk_level: 'Elevated',
    condition_summary: 'Vibration and temperature are increasing compared with the learned normal operating pattern.',
    checklist: [
      'Inspect BO motor mounting bracket and tighten loose fasteners',
      'Check TT gearbox for gear tooth chatter or spur gear mesh wear',
      'Verify output shaft and wheel coupler alignment',
      'Inspect for abnormal mechanical noise or commutator sparking',
      'Check motor casing temperature with external infrared probe',
      'Continue monitoring vibration RMS telemetry'
    ]
  };

  const riskColor = maint.risk_level === 'Critical' ? 'bg-rose-500/20 text-rose-400 border-rose-500/50 glow-rose' :
                    maint.risk_level === 'Elevated' ? 'bg-amber-500/20 text-amber-400 border-amber-500/50 glow-amber' :
                    maint.risk_level === 'Moderate' ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 glow-emerald';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-400" />
            Maintenance Intelligence & Prescriptive Protocol
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic Condition-Based Maintenance (CBM) decision framework
          </p>
        </div>

        <div className={`px-4 py-1.5 rounded-full text-xs font-mono font-extrabold uppercase border ${riskColor}`}>
          Maintenance Risk: {maint.risk_level}
        </div>
      </div>

      {/* CONDITION EVALUATION PANEL */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">Potential Abnormal Condition Assessment</h3>
        </div>
        <p className="text-sm text-slate-200 p-4 rounded-xl bg-navy-850 border border-navy-750 leading-relaxed font-mono">
          "{maint.condition_summary}"
        </p>
      </div>

      {/* ACTIONABLE PROTOCOL CHECKLIST */}
      <div className="glass-card rounded-2xl p-6">
        <div className="pb-3 border-b border-navy-800 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-4 text-cyan-400" />
            Recommended Physical Inspection Actions
          </h3>
          <span className="text-xs text-slate-400">
            Field engineer verification protocol prior to resuming full-speed test cycles
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {maint.checklist.map((task, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-navy-850 border border-navy-750 text-xs">
              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 font-mono font-bold text-[10px]">
                {i + 1}
              </div>
              <div className="text-slate-300 font-medium leading-normal">{task}</div>
            </div>
          ))}
        </div>
      </div>

      {/* SCIENTIFIC INTEGRITY: WHY NO FABRICATED RUL */}
      <div className="glass-card rounded-2xl p-6 border-l-4 border-l-purple-500">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white">Scientific Integrity & RUL Modeling Note</h3>
        </div>
        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            <strong>Why we do NOT output "Motor will fail in 3 days" or "RUL = 47 hours":</strong>
          </p>
          <p className="text-slate-400">
            In genuine predictive engineering, Remaining Useful Life (RUL) estimation requires run-to-failure fatigue data under accelerated life testing (ALT) across hundreds of identical motors with precise cycle-counting. Fabricating an arbitrary RUL countdown on a small BO motor without empirical historical degradation curves is misleading.
          </p>
          <p className="text-slate-400">
            Instead, BO MOTOR AI utilizes a deterministic Condition-Based Maintenance (CBM) risk classification: <strong>Low, Moderate, Elevated, and Critical</strong> based on statistical excursion from baseline vibration spectra and thermal equilibria.
          </p>
        </div>
      </div>
    </div>
  );
}
