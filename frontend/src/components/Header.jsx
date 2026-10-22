import React, { useState, useEffect, useRef } from 'react';
import { Menu, Wifi, Send, Play, Pause, AlertTriangle, Upload, RefreshCw, Edit3, Trash2, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export function Header({
  connectionState = 'demo',
  isEsp32Connected = false,
  motorId = 'BO_MOTOR_01',
  lastUpdated,
  onToggleSidebar,
  onInjectSample,
  simulatorActive,
  onToggleSimulator,
  onNavigate,
  onRefresh,
  statusData = {}
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isReloading, setIsReloading] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = d => {
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    const secs = d.getSeconds().toString().padStart(2, '0');
    return `${day} ${month} ${year} | ${hours}:${mins}:${secs}`;
  };

  const handleReloadWatchedCsv = async () => {
    setIsReloading(true);
    try {
      const res = await fetch('/api/csv/reload', { method: 'POST' });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Error reloading CSV:', e);
    } finally {
      setIsReloading(false);
    }
  };

  const handleSetEmptyState = async () => {
    if (!confirm('Are you sure you want to reset the system to the Initial Empty State? (Readings will be cleared until a CSV is updated)')) {
      return;
    }
    setIsEmptying(true);
    try {
      const res = await fetch('/api/csv/empty', { method: 'POST' });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error('Error emptying state:', e);
    } finally {
      setIsEmptying(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/dataset/upload-csv?mode=replace', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const isEmpty = statusData.is_empty === true;

  return (
    <header className="h-20 bg-navy-900/95 border-b border-navy-800 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Title & Subtitle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2">
              BO MOTOR AI
              <span className="hidden sm:inline-block text-xs font-normal text-slate-400 font-mono">
                / Predictive Maintenance & Intelligent Fault Detection
              </span>
            </h1>
          </div>
          <p className="text-xs text-cyan-400/90 hidden md:block">
            IoT + AI Based Early Fault Detection using Vibration and Temperature Analysis
          </p>
        </div>
      </div>

      {/* Right: Telemetry metadata & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
        {/* Hidden File Input for Update CSV */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".csv"
          className="hidden"
        />

        {/* Action: Update CSV */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 transition-all shadow-sm"
          title="Upload or update a CSV file. The system will immediately ingest and start running."
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Update CSV</span>
        </button>

        {/* Action: Reload DOC-20261012-WA0014.csv */}
        <button
          onClick={handleReloadWatchedCsv}
          disabled={isReloading}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400 transition-all shadow-sm"
          title="Reload DOC-20261012-WA0014.csv and start auto-run from Row 1"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isReloading ? 'animate-spin' : ''}`} />
          <span>Run WA0014 CSV</span>
        </button>

        {/* Action: Edit Data (Jump to CSV Studio) */}
        <button
          onClick={() => onNavigate && onNavigate('csv_studio')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-amber-950/50 border border-amber-500/40 text-amber-300 hover:bg-amber-900/50 hover:border-amber-400 transition-all shadow-sm"
          title="Open CSV Studio & Data Editor to view, edit, add, or delete telemetry rows"
        >
          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Edit Data</span>
          <span className="sm:hidden">Edit</span>
        </button>

        {/* Action: Reset to Initial Empty State */}
        <button
          onClick={handleSetEmptyState}
          disabled={isEmptying}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
            isEmpty
              ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-sm'
              : 'bg-navy-800 border-navy-700 text-slate-400 hover:text-rose-300 hover:border-rose-500/50'
          }`}
          title="Reset the dashboard into the Initial Empty State (clears readings, waits for CSV update)"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden lg:inline">{isEmpty ? 'Initial Empty State' : 'Reset Empty'}</span>
        </button>

        {/* Status Badge */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
          {isEmpty ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/70 border border-amber-500/60 text-amber-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>EMPTY STANDBY</span>
            </div>
          ) : statusData.csv_filename ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>RUNNING CSV</span>
            </div>
          ) : isEsp32Connected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE ESP32</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-500/50 text-purple-300 text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
              <span>STREAM RUNNING</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
