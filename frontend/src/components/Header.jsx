import React, { useState, useEffect } from 'react';
import { Menu, Wifi, Send, Play, Pause, AlertTriangle } from 'lucide-react';

export function Header({
  connectionState = 'demo',
  isEsp32Connected = false,
  motorId = 'BO_MOTOR_01',
  lastUpdated,
  onToggleSidebar,
  onInjectSample,
  simulatorActive,
  onToggleSimulator
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

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

  return (
    <header className="h-20 bg-navy-900/90 border-b border-navy-800 backdrop-blur-md px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
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
      <div className="flex items-center gap-3 lg:gap-5">
        {/* Quick Demo Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          className={`hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all border ${
            simulatorActive
              ? 'bg-purple-950/40 border-purple-500/50 text-purple-300 hover:bg-purple-900/40'
              : 'bg-navy-800 border-navy-700 text-slate-400 hover:bg-navy-750'
          }`}
          title="Toggle automatic telemetry streaming generator"
        >
          {simulatorActive ? <Pause className="w-3.5 h-3.5 text-purple-400" /> : <Play className="w-3.5 h-3.5 text-slate-400" />}
          <span>{simulatorActive ? 'Telemetry Stream: Active' : 'Telemetry Stream: Paused'}</span>
        </button>

        {/* Test Ingest Button */}
        <button
          onClick={onInjectSample}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-cyan-950/50 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/40 hover:border-cyan-400 transition-all shadow-sm glow-cyan"
          title="Simulate immediate incoming ESP32 packet over POST /api/ingest"
        >
          <Send className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Inject ESP32 Reading</span>
          <span className="sm:hidden">Inject</span>
        </button>

        {/* Motor Tag */}
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Motor Unit</span>
          <span className="text-xs font-mono font-bold text-cyan-300 px-2 py-0.5 rounded bg-navy-800 border border-navy-700">
            {motorId}
          </span>
        </div>

        {/* Connection Status Badge */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Connection</span>
          {isEsp32Connected ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold shadow-sm glow-emerald">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE DATA</span>
              <span className="hidden md:inline text-[10px] text-emerald-400 font-mono">| ESP32 Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/50 text-amber-300 text-xs font-semibold shadow-sm glow-amber">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>DEMO MODE</span>
              <span className="hidden md:inline text-[10px] text-amber-400 font-mono">| Simulated Sensor Data</span>
            </div>
          )}
        </div>

        {/* Dynamic Last Updated Clock */}
        <div className="hidden lg:flex flex-col items-end pl-2 border-l border-navy-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Last Updated</span>
          <span className="text-xs font-mono text-slate-200">{formatDate(currentTime)}</span>
        </div>
      </div>
    </header>
  );
}
