import React, { useState, useEffect } from 'react';
import { Database, Download, Upload, Play, Trash2, Search, ArrowUpDown, ChevronLeft, ChevronRight, RefreshCw, Cpu } from 'lucide-react';

export function DatasetView({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [readings, setReadings] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchReadings();
  }, [page, sourceFilter, statusFilter, search]);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dataset/stats');
      setStats(await res.json());
    } catch (e) {
      console.error('Failed to load dataset stats:', e);
    }
  };

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const url = `/api/readings?page=${page}&limit=20&source=${sourceFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`;
      const res = await fetch(url);
      const json = await res.json();
      setReadings(json.data || []);
      setTotalPages(json.pages || 1);
      setTotalCount(json.total || 0);
    } catch (e) {
      console.error('Failed to fetch readings table:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setActionMessage('Generating 10,000 realistic BO motor records...');
    try {
      await fetch('/api/dataset/generate?count=10000', { method: 'POST' });
      setActionMessage('Dataset generation complete.');
      fetchStats();
      fetchReadings();
    } catch (e) {
      setActionMessage('Error generating dataset.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleClear = async () => {
    if (!confirm('Clear all synthetic demo records?')) return;
    setActionMessage('Clearing synthetic records...');
    try {
      await fetch('/api/dataset/clear', { method: 'POST' });
      setActionMessage('Synthetic records cleared.');
      fetchStats();
      fetchReadings();
    } catch (e) {
      setActionMessage('Error clearing dataset.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  const handleTrain = async () => {
    setActionMessage('Training Isolation Forest & Random Forest models...');
    try {
      const res = await fetch('/api/model/train', { method: 'POST' });
      const json = await res.json();
      setActionMessage(`Model trained! Test Accuracy: ${json.metrics?.accuracy}%`);
      if (onNavigate) onNavigate('model');
    } catch (e) {
      setActionMessage('Training error. Check database records.');
    }
    setTimeout(() => setActionMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="glass-card rounded-2xl p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <Database className="w-6 h-6 text-cyan-400" />
            Sensor Dataset & Ingestion Repository
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Data provenance tracking, CSV exports, batch synthetic generation, and ML model training
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleTrain}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md glow-purple transition-all"
          >
            <Cpu className="w-4 h-4" /> Train Models
          </button>

          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-navy-800 hover:bg-navy-750 text-cyan-300 border border-cyan-500/40 transition-all"
          >
            <Play className="w-3.5 h-3.5 text-cyan-400" /> Generate 10k Dataset
          </button>

          <a
            href="/api/export/csv"
            download
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-navy-800 hover:bg-navy-750 text-slate-300 border border-navy-700 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> Download CSV
          </a>

          <button
            onClick={handleClear}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-navy-800 transition-all"
            title="Clear Synthetic Records"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-500/50 text-purple-200 text-xs font-mono flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* DATASET METRIC STATS */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">TOTAL RECORDS</span>
            <span className="text-lg font-extrabold text-white mt-0.5 block">{stats.total_records?.toLocaleString()}</span>
          </div>

          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">REAL (ESP32)</span>
            <span className="text-lg font-extrabold text-emerald-400 mt-0.5 block">{stats.real_records?.toLocaleString()}</span>
          </div>

          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">SYNTHETIC (DEMO)</span>
            <span className="text-lg font-extrabold text-purple-400 mt-0.5 block">{stats.synthetic_records?.toLocaleString()}</span>
          </div>

          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">AVG / MAX TEMP</span>
            <span className="text-lg font-extrabold text-amber-400 mt-0.5 block">{stats.average_temperature}° / {stats.maximum_temperature}°C</span>
          </div>

          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">AVG / MAX VIB RMS</span>
            <span className="text-lg font-extrabold text-cyan-400 mt-0.5 block">{stats.average_vibration}g / {stats.maximum_vibration}g</span>
          </div>

          <div className="glass-card rounded-xl p-3.5">
            <span className="text-slate-400 block text-[10px]">NORM / WARN / CRIT</span>
            <span className="text-xs font-bold text-white mt-1 block">
              <span className="text-emerald-400">{stats.normal_records}</span> / <span className="text-amber-400">{stats.warning_records}</span> / <span className="text-rose-400">{stats.critical_records}</span>
            </span>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS & TABLE */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-navy-800 mb-4">
          {/* Source filters */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 font-mono">Source:</span>
            {['all', 'real', 'synthetic'].map((s) => (
              <button
                key={s}
                onClick={() => { setSourceFilter(s); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all ${
                  sourceFilter === s
                    ? 'bg-cyan-500 text-navy-950 font-extrabold shadow-sm'
                    : 'bg-navy-850 text-slate-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}

            <span className="text-xs font-bold text-slate-400 font-mono ml-3">Status:</span>
            {['all', 'Normal', 'Warning', 'Critical'].map((st) => (
              <button
                key={st}
                onClick={() => { setStatusFilter(st); setPage(1); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-purple-600 text-white font-extrabold'
                    : 'bg-navy-850 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search timestamp / fault..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-navy-850 border border-navy-750 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Paginated Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-navy-800 text-slate-400 uppercase text-[10px]">
                <th className="pb-2.5">ID</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Source</th>
                <th className="pb-2.5">PWM</th>
                <th className="pb-2.5">Temp (°C)</th>
                <th className="pb-2.5">Vib RMS (g)</th>
                <th className="pb-2.5">Health</th>
                <th className="pb-2.5">Anomaly</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5">Suspected Fault</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-800/60">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-mono">
                    Loading telemetry records...
                  </td>
                </tr>
              ) : readings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 font-mono">
                    No records found matching filters.
                  </td>
                </tr>
              ) : (
                readings.map((r) => (
                  <tr key={r.id} className="hover:bg-navy-850/50 transition-colors">
                    <td className="py-2.5 text-slate-400">#{r.id}</td>
                    <td className="py-2.5 text-slate-300">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        r.source === 'real' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {r.source}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{r.pwm_duty?.toFixed(0)}%</td>
                    <td className="py-2.5 text-amber-400 font-bold">{r.temperature_c?.toFixed(1)}</td>
                    <td className="py-2.5 text-cyan-400 font-bold">{r.vibration_rms ? r.vibration_rms.toFixed(3) : '-'}</td>
                    <td className="py-2.5 text-emerald-400 font-bold">{Math.round(r.health_score || 0)}%</td>
                    <td className="py-2.5 text-purple-400">{r.anomaly_score ? r.anomaly_score.toFixed(2) : '-'}</td>
                    <td className="py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
                        r.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {r.status || 'Normal'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-200">{r.fault_type || 'Normal'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-navy-800 text-xs font-mono text-slate-400">
          <div>
            Showing page <span className="font-bold text-white">{page}</span> of <span className="font-bold text-white">{totalPages}</span> ({totalCount.toLocaleString()} total rows)
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-750 disabled:opacity-40 disabled:pointer-events-none text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
