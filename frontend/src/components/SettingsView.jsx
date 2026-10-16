import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Check, RefreshCw } from 'lucide-react';

export function SettingsView({ onSettingsSaved }) {
  const [settings, setSettings] = useState({
    temp_normal_max: 45.0,
    temp_warning_max: 60.0,
    anomaly_warning_threshold: 0.50,
    anomaly_critical_threshold: 0.75,
    health_weights: {
      vibration_risk: 0.30,
      temperature_risk: 0.25,
      trend_risk: 0.20,
      anomaly_risk: 0.25
    },
    vibration_rolling_window_sec: 2.0,
    data_polling_interval_ms: 2000,
    motor_nominal_rpm: 200.0
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data) setSettings(prev => ({ ...prev, ...data }));
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSuccessMsg('Settings updated successfully!');
        if (onSettingsSaved) onSettingsSaved();
      }
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setSaving(false);
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  };

  const updateWeight = (key, val) => {
    setSettings(prev => ({
      ...prev,
      health_weights: {
        ...prev.health_weights,
        [key]: parseFloat(val) || 0
      }
    }));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="glass-card rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-cyan-400" />
            System Configuration & Engineering Thresholds
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Customize multi-variate risk weights, trigger thresholds, and hardware operating bounds
          </p>
        </div>

        <div className="flex items-center gap-2">
          {successMsg && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> {successMsg}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 text-navy-950 shadow-md glow-cyan transition-all disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TEMPERATURE THRESHOLDS */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-navy-800">
            Thermal Zones Configuration (°C)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-mono">Normal / Warning Boundary (°C)</label>
              <input
                type="number"
                step="0.5"
                value={settings.temp_normal_max}
                onChange={e => setSettings({ ...settings, temp_normal_max: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 font-mono text-white focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: &lt;45°C Normal</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono">Warning / Critical Boundary (°C)</label>
              <input
                type="number"
                step="0.5"
                value={settings.temp_warning_max}
                onChange={e => setSettings({ ...settings, temp_warning_max: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 font-mono text-white focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: &gt;60°C Critical</span>
            </div>
          </div>
        </div>

        {/* ANOMALY DETECTION THRESHOLDS */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-navy-800">
            AI Anomaly Decision Boundaries [0.00 – 1.00]
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-mono">Warning Threshold (Isolation Forest)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="0.9"
                value={settings.anomaly_warning_threshold}
                onChange={e => setSettings({ ...settings, anomaly_warning_threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 font-mono text-white focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 0.50</span>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-mono">Critical Threshold (Isolation Forest)</label>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1.0"
                value={settings.anomaly_critical_threshold}
                onChange={e => setSettings({ ...settings, anomaly_critical_threshold: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 font-mono text-white focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Default: 0.75</span>
            </div>
          </div>
        </div>

        {/* MOTOR HEALTH WEIGHTS */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-1">
            Motor Health Scoring Weights (Must sum to ~1.00)
          </h3>
          <p className="text-xs text-slate-400 mb-4 pb-2 border-b border-navy-800">
            Formula: Health = 100 - (Wv · VibRisk + Wt · TempRisk + Wtr · TrendRisk + Wa · AnomalyRisk)
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <label className="block text-cyan-400 mb-1 font-bold">Vibration Risk (Wv)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.health_weights?.vibration_risk || 0.30}
                onChange={e => updateWeight('vibration_risk', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white font-mono focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-amber-400 mb-1 font-bold">Temperature Risk (Wt)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.health_weights?.temperature_risk || 0.25}
                onChange={e => updateWeight('temperature_risk', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white font-mono focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-blue-400 mb-1 font-bold">Trend Rate Risk (Wtr)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.health_weights?.trend_risk || 0.20}
                onChange={e => updateWeight('trend_risk', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white font-mono focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-purple-400 mb-1 font-bold">AI Anomaly Risk (Wa)</label>
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={settings.health_weights?.anomaly_risk || 0.25}
                onChange={e => updateWeight('anomaly_risk', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white font-mono focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* MOTOR HARDWARE PARAMETERS */}
        <div className="glass-card rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 pb-2 border-b border-navy-800">
            Hardware Operating Specifications
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Rolling RMS Window (seconds)</label>
              <input
                type="number"
                step="0.5"
                value={settings.vibration_rolling_window_sec}
                onChange={e => setSettings({ ...settings, vibration_rolling_window_sec: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Nominal No-Load RPM @ 6V</label>
              <input
                type="number"
                step="10"
                value={settings.motor_nominal_rpm}
                onChange={e => setSettings({ ...settings, motor_nominal_rpm: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Data Polling Interval (ms)</label>
              <input
                type="number"
                step="500"
                value={settings.data_polling_interval_ms}
                onChange={e => setSettings({ ...settings, data_polling_interval_ms: parseInt(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-navy-850 border border-navy-750 text-white"
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
