import React, { useState } from 'react';
import {
  Thermometer,
  Radio,
  Activity,
  AlertTriangle,
  Gauge,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  Layers,
  Wrench,
  ExternalLink,
  Upload,
  RefreshCw,
  Edit3,
  Trash2,
  Database,
  Play,
  Sparkles
} from 'lucide-react';
import { RadialHealthGauge, DonutChart } from './Charts';

export function OverviewView({
  overviewData,
  faultDistribution,
  onNavigate,
  onAcknowledgeAlert
}) {
  if (!overviewData) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400 font-mono">
        Loading engineering dashboard telemetry...
      </div>
    );
  }

  const { kpis, fault_intelligence, maintenance_intelligence, device, provenance, recent_alerts, recent_readings } = overviewData;

  const tempStatusColor = kpis.temperature.status === 'Critical' ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' :
                          kpis.temperature.status === 'Warning' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                          'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  const vibStatusColor = kpis.vibration_rms.status === 'Critical' ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' :
                         kpis.vibration_rms.status === 'Warning' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                         'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  const anomColor = kpis.anomaly.status === 'Critical' ? 'text-rose-400 border-rose-500/50 bg-rose-500/20 glow-rose' :
                    kpis.anomaly.status === 'Warning' ? 'text-amber-400 border-amber-500/50 bg-amber-500/20 glow-amber' :
                    'text-emerald-400 border-emerald-500/50 bg-emerald-500/20 glow-emerald';

  const maintRiskColor = maintenance_intelligence.risk_level === 'Critical' ? 'text-rose-400 bg-rose-500/20 border-rose-500/40' :
                         maintenance_intelligence.risk_level === 'Elevated' ? 'text-amber-400 bg-amber-500/20 border-amber-500/40' :
                         maintenance_intelligence.risk_level === 'Moderate' ? 'text-blue-400 bg-blue-500/20 border-blue-500/40' :
                         'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';

  return (
    <div className="space-y-6">
      {/* INITIAL EMPTY STATE HERO BANNER OR ACTIVE DATASET CONTROLS */}
      {overviewData.is_empty ? (
        <div className="glass-card rounded-2xl p-6 border-2 border-dashed border-amber-500/50 bg-amber-950/20 text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">System Initialized in Clean / Empty State</h2>
              <p className="text-sm text-slate-300 mt-1">
                The engine is currently waiting for CSV telemetry. Whenever <code className="text-cyan-300 bg-navy-900 px-1.5 py-0.5 rounded border border-navy-700">DOC-20261012-WA0014.csv</code> is updated or saved, the system will automatically detect the change and begin processing live data from Row 1.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={async () => {
                  await fetch('/api/csv/reload', { method: 'POST' });
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Run with DOC-20261012-WA0014.csv</span>
              </button>
              <button
                onClick={() => onNavigate && onNavigate('csv_studio')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 border border-cyan-500/40 text-cyan-300 font-semibold text-xs transition-all"
              >
                <Edit3 className="w-4 h-4 text-cyan-400" />
                <span>Upload & Edit in CSV Studio</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl px-4 py-3 border border-cyan-500/30 bg-cyan-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-slate-200">Active Telemetry Source:</span>
            <span className="font-mono text-cyan-300 bg-navy-900 px-2 py-0.5 rounded border border-cyan-500/30">
              {overviewData.provenance?.active_file || 'DOC-20261012-WA0014.csv'}
            </span>
            <span className="text-slate-400 hidden md:inline">• Auto-runs on file update</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('csv_studio')}
              className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-amber-300 border border-amber-500/40 font-mono font-semibold flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>Edit Telemetry</span>
            </button>
            <button
              onClick={async () => {
                await fetch('/api/csv/reload', { method: 'POST' });
                window.location.reload();
              }}
              className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-emerald-300 border border-emerald-500/40 font-mono font-semibold flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reload</span>
            </button>
            <button
              onClick={async () => {
                if (confirm('Reset to initial empty state?')) {
                  await fetch('/api/csv/empty', { method: 'POST' });
                  window.location.reload();
                }
              }}
              className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-rose-300 border border-rose-500/40 font-mono font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Empty State</span>
            </button>
          </div>
        </div>
      )}

      {/* 5 TOP KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* CARD 1: MOTOR TEMPERATURE */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Motor Temp</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Thermometer className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">{kpis.temperature.value.toFixed(1)}</span>
            <span className="text-sm font-semibold text-slate-400 font-mono">°C</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-navy-800 text-xs">
            <span className={`px-2 py-0.5 rounded font-bold border ${tempStatusColor}`}>
              {kpis.temperature.status}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {kpis.temperature.delta_label} vs prev
            </span>
          </div>
        </div>

        {/* CARD 2: VIBRATION RMS */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Vibration RMS</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">{kpis.vibration_rms.value.toFixed(2)}</span>
            <span className="text-sm font-semibold text-slate-400 font-mono">g</span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-navy-800 text-xs">
            <span className={`px-2 py-0.5 rounded font-bold border ${vibStatusColor}`}>
              {kpis.vibration_rms.status}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              {kpis.vibration_rms.delta_label} vs prev
            </span>
          </div>
        </div>

        {/* CARD 3: MOTOR HEALTH */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Motor Health</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between my-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white tracking-tight">{Math.round(kpis.motor_health.value)}</span>
              <span className="text-sm font-semibold text-slate-400 font-mono">%</span>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-xs uppercase ${
              kpis.motor_health.tier_color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
              kpis.motor_health.tier_color === 'cyan' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' :
              kpis.motor_health.tier_color === 'amber' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
              'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {kpis.motor_health.tier}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-navy-800 text-xs">
            <span className="text-slate-400">Prev: {Math.round(kpis.motor_health.previous_value)}%</span>
            <span className={`font-mono font-bold ${kpis.motor_health.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {kpis.motor_health.delta_label}
            </span>
          </div>
        </div>

        {/* CARD 4: ANOMALY STATUS */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Anomaly Status</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <span className={`inline-block px-2.5 py-1 rounded-lg text-sm font-extrabold tracking-wide uppercase border ${anomColor}`}>
              {kpis.anomaly.status}
            </span>
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-navy-800 text-xs">
            <span className="text-slate-400">Score:</span>
            <span className="font-mono font-extrabold text-white text-sm">
              {kpis.anomaly.score.toFixed(2)}
            </span>
          </div>
        </div>

        {/* CARD 5: MOTOR SPEED */}
        <div className="glass-card rounded-2xl p-4 flex flex-col justify-between transition-all glass-card-hover">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Motor Speed</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Gauge className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 my-1">
            <span className="text-3xl font-extrabold text-white tracking-tight">{Math.round(kpis.speed.estimated_rpm)}</span>
            <span className="text-sm font-semibold text-slate-400 font-mono">RPM</span>
          </div>
          <div className="mt-2 pt-2 border-t border-navy-800 text-[10px] text-slate-400 leading-tight">
            <div className="font-bold text-cyan-400 font-mono">Estimated / Simulated RPM</div>
            <div className="truncate text-slate-500" title={kpis.speed.disclaimer}>No encoder attached</div>
          </div>
        </div>
      </div>

      {/* MOTOR HEALTH INTELLIGENCE & FAULT CLASSIFICATION ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MOTOR HEALTH INTELLIGENCE (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-navy-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                Motor Health Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Transparent multi-variate risk assessment model (vibration, thermal, trend & anomaly scores)
              </p>
            </div>
            <button
              onClick={() => onNavigate('settings')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              Configure Weights
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-6 items-center">
            {/* Radial Gauge (5 cols) */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <RadialHealthGauge
                value={kpis.motor_health.value}
                tier={kpis.motor_health.tier}
                tierColor={kpis.motor_health.tier_color}
                size={170}
              />
              <div className="mt-3 text-center">
                <span className="text-xs text-slate-400">Previous Period: </span>
                <span className="text-xs font-mono font-bold text-slate-200">{Math.round(kpis.motor_health.previous_value)}%</span>
                <span className={`ml-2 text-xs font-mono font-bold ${kpis.motor_health.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({kpis.motor_health.delta_label})
                </span>
              </div>
            </div>

            {/* Risk Breakdown Bars (7 cols) */}
            <div className="md:col-span-7 space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Vibration Risk (RMS & Peak)</span>
                  <span className="font-mono text-cyan-400 font-bold">{Math.round(kpis.motor_health.risk_breakdown.vibration_risk)}%</span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.motor_health.risk_breakdown.vibration_risk)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Temperature Risk (Thermal Envelope)</span>
                  <span className="font-mono text-amber-400 font-bold">{Math.round(kpis.motor_health.risk_breakdown.temperature_risk)}%</span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.motor_health.risk_breakdown.temperature_risk)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Trend Risk (Rate of Change)</span>
                  <span className="font-mono text-blue-400 font-bold">{Math.round(kpis.motor_health.risk_breakdown.trend_risk)}%</span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.motor_health.risk_breakdown.trend_risk)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-300">Anomaly Risk (Isolation Forest)</span>
                  <span className="font-mono text-purple-400 font-bold">{Math.round(kpis.motor_health.risk_breakdown.anomaly_risk)}%</span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, kpis.motor_health.risk_breakdown.anomaly_risk)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 pt-3 border-t border-navy-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>Formula: 100 - (30% VibRisk + 25% TempRisk + 20% TrendRisk + 25% AnomalyRisk)</span>
            <button
              onClick={() => onNavigate('anomaly')}
              className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              Inspect Anomaly Pipeline <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* FAULT CLASSIFICATION DONUT & CURRENT PREDICTION (5 cols) */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-navy-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                Fault Pattern Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Supervised Random Forest fault classifier
              </p>
            </div>
            <button
              onClick={() => onNavigate('fault')}
              className="text-xs font-mono text-purple-400 hover:text-purple-300 underline"
            >
              Model Details
            </button>
          </div>

          {/* Current Suspected Fault Highlight Card */}
          <div className="my-4 p-4 rounded-xl bg-navy-850 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-purple-400 tracking-wider">
                Suspected Fault Pattern
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/40">
                Confidence: {fault_intelligence.confidence}%
              </span>
            </div>
            <div className="text-lg font-extrabold text-white mb-2">
              {fault_intelligence.possible_fault}
            </div>
            <div className="space-y-1 text-xs text-slate-300">
              {fault_intelligence.evidence?.map((ev, i) => (
                <div key={i} className="flex items-center gap-1.5 text-slate-300">
                  <span className="text-purple-400 font-bold">›</span>
                  <span>{ev}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-2 border-t border-navy-750 text-[10px] text-slate-400 italic">
              * Engineering disclaimer: Temperature + MPU6050 vibration alone cannot definitively confirm mechanical wear without physical inspection.
            </div>
          </div>

          {/* Fault Distribution Donut */}
          {faultDistribution && (
            <div className="pt-2">
              <DonutChart
                data={faultDistribution.distribution}
                centerText={`${Math.round(kpis.anomaly.score * 100)}%`}
                centerSub="Current Anomaly"
                size={180}
              />
            </div>
          )}
        </div>
      </div>

      {/* MAINTENANCE INTELLIGENCE & DATA PROVENANCE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* MAINTENANCE INTELLIGENCE (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-navy-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                Maintenance Intelligence
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Condition-based maintenance advisory & actionable physical inspection protocol
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full border text-xs font-bold font-mono uppercase ${maintRiskColor}`}>
              Maintenance Risk: {maintenance_intelligence.risk_level}
            </div>
          </div>

          <div className="my-4 p-4 rounded-xl bg-navy-850 border border-navy-750">
            <div className="text-sm font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Potential Operational Condition:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "{maintenance_intelligence.condition_summary}"
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              Recommended Engineering Actions:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {maintenance_intelligence.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg bg-navy-900 border border-navy-800">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-navy-800 text-[11px] text-slate-400 italic">
            Note: Without an empirical run-to-failure fatigue dataset under controlled continuous load, estimating an exact "Remaining Useful Life (RUL = X hours)" would be unscientific. This system operates on deterministic condition-based risk scoring.
          </div>
        </div>

        {/* TECHNICAL DEVICE & DATA PROVENANCE (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* TECHNICAL DEVICE SPECS */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                BO Motor Device Specifications
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
                Online
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px]">MOTOR ID</span>
                <span className="text-white font-bold">{device.motor_id || 'BO_MOTOR_01'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MOTOR TYPE</span>
                <span className="text-slate-200">DC Geared (1:48 TT)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MOTOR DRIVER</span>
                <span className="text-slate-200">L298N Dual H-Bridge</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MICROCONTROLLER</span>
                <span className="text-slate-200">ESP32 DevKit V1</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">VIBRATION SENSOR</span>
                <span className="text-cyan-400">MPU6050 (I2C 0x68)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TEMPERATURE</span>
                <span className="text-amber-400">DS18B20 / Die Temp</span>
              </div>
            </div>
          </div>

          {/* DATA PROVENANCE CARD */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-navy-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-purple-400" />
                Data Provenance & Model Audit
              </h3>
              <button
                onClick={() => onNavigate('dataset')}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
              >
                Inspect Dataset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-3">
              <div className="p-3 rounded-xl bg-navy-850 border border-navy-750">
                <span className="text-slate-400 block text-[10px]">REAL SAMPLES</span>
                <span className="text-xl font-bold text-emerald-400">{provenance.real_samples.toLocaleString()}</span>
              </div>
              <div className="p-3 rounded-xl bg-navy-850 border border-navy-750">
                <span className="text-slate-400 block text-[10px]">SYNTHETIC SAMPLES</span>
                <span className="text-xl font-bold text-purple-400">{provenance.synthetic_samples.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Fault Regimes Modeled:</span>
                <span className="text-slate-200 font-bold font-mono">{provenance.fault_conditions_count} Classes</span>
              </div>
              <div className="flex justify-between">
                <span>Active Model Stack:</span>
                <span className="text-slate-200 font-mono text-[10px]">IsoForest + RandForest</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT ALERTS & SENSOR READINGS TABLE ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* RECENT ALERTS (5 cols) */}
        <div className="lg:col-span-5 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Intelligent Alert Center
            </h2>
            <span className="text-xs font-mono text-slate-400">{recent_alerts.length} Events</span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {recent_alerts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-mono">
                No active anomaly alerts logged.
              </div>
            ) : (
              recent_alerts.map(alert => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    alert.severity === 'critical'
                      ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                      : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold tracking-tight uppercase flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${alert.severity === 'critical' ? 'bg-rose-400' : 'bg-amber-400'}`} />
                      {alert.title}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug my-1">
                    {alert.message}
                  </p>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    <span className="font-bold text-cyan-400">Evidence: </span>
                    {alert.sensor_evidence}
                  </div>
                  {alert.action_recommended && (
                    <div className="text-[11px] text-slate-300 mt-1.5 p-2 rounded bg-navy-900/80 border border-navy-800">
                      <span className="font-bold text-amber-400">Action: </span>
                      {alert.action_recommended}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* RECENT READINGS (7 cols) */}
        <div className="lg:col-span-7 glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between pb-4 border-b border-navy-800 mb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Recent Telemetry Stream
            </h2>
            <button
              onClick={() => onNavigate('dataset')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 underline"
            >
              Full Telemetry Table →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-navy-800 text-slate-400 uppercase text-[10px]">
                  <th className="pb-2">Time</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Temp (°C)</th>
                  <th className="pb-2">Vib RMS (g)</th>
                  <th className="pb-2">Health</th>
                  <th className="pb-2">Anomaly</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/60">
                {recent_readings.map(row => (
                  <tr key={row.id} className="hover:bg-navy-850/50 transition-colors">
                    <td className="py-2.5 text-slate-400">
                      {new Date(row.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.source === 'real' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {row.source}
                      </span>
                    </td>
                    <td className="py-2.5 text-white font-bold">{row.temperature_c.toFixed(1)}</td>
                    <td className="py-2.5 text-cyan-400 font-bold">{row.vibration_rms ? row.vibration_rms.toFixed(3) : '-'}</td>
                    <td className="py-2.5 text-emerald-400 font-bold">{Math.round(row.health_score || 0)}%</td>
                    <td className="py-2.5 text-purple-400">{row.anomaly_score ? row.anomaly_score.toFixed(2) : '-'}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        row.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                        row.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {row.status || 'Normal'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
