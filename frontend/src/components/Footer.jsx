import React from 'react';

export function Footer() {
  return (
    <footer className="mt-12 py-6 px-6 border-t border-navy-800 bg-navy-900/60 backdrop-blur text-xs text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3 font-mono">
      <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-2 gap-y-1 text-slate-400">
        <span className="text-cyan-400 font-bold">ESP32</span>
        <span>|</span>
        <span className="text-cyan-400 font-bold">MPU6050</span>
        <span>|</span>
        <span className="text-amber-400 font-bold">Temperature Sensor</span>
        <span>|</span>
        <span className="text-slate-300 font-bold">L298N</span>
        <span>|</span>
        <span className="text-purple-400 font-bold">Python ML</span>
        <span>|</span>
        <span className="text-emerald-400 font-bold">FastAPI</span>
        <span>|</span>
        <span className="text-cyan-300 font-bold">React</span>
        <span>|</span>
        <span className="text-slate-300 font-bold">Database</span>
      </div>

      <div className="text-cyan-300 font-semibold tracking-wider italic text-[11px]">
        "Sense. Learn. Predict. Prevent."
      </div>
    </footer>
  );
}
