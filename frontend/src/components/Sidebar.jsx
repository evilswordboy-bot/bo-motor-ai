import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Radio,
  Thermometer,
  ShieldAlert,
  Cpu,
  Wrench,
  Clock,
  Database,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'live', label: 'Live Monitoring', icon: Activity },
  { id: 'vibration', label: 'Vibration Analysis', icon: Radio },
  { id: 'temperature', label: 'Temperature Analysis', icon: Thermometer },
  { id: 'anomaly', label: 'Anomaly Detection', icon: ShieldAlert },
  { id: 'fault', label: 'Fault Classification', icon: Cpu },
  { id: 'maintenance', label: 'Maintenance Prediction', icon: Wrench },
  { id: 'historical', label: 'Historical Analysis', icon: Clock },
  { id: 'dataset', label: 'Dataset', icon: Database },
  { id: 'model', label: 'Model Performance', icon: BarChart3 },
  { id: 'settings', label: 'System Settings', icon: Settings },
];

export function Sidebar({ currentView, setView, isCollapsed, setIsCollapsed, connectionState }) {
  return (
    <aside
      className={`fixed lg:static top-0 left-0 z-40 h-screen transition-all duration-300 flex flex-col bg-navy-900 border-r border-navy-800 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-navy-800">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center text-white shadow-lg glow-cyan">
              <Zap className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <div className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                BO MOTOR AI
              </div>
              <div className="text-[10px] text-slate-400 font-mono tracking-tighter">
                PRECISION PREDICTIVE AI
              </div>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center text-white shadow-lg glow-cyan">
            <Zap className="w-5 h-5 text-cyan-200" />
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition-colors hidden lg:block"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/60'
              }`}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 glow-cyan" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Status Card */}
      <div className="p-3 border-t border-navy-800">
        <div className="p-3 rounded-xl bg-navy-850 border border-navy-750 flex items-center gap-3">
          <div className="relative">
            <span
              className={`block w-2.5 h-2.5 rounded-full ${
                connectionState === 'live' ? 'bg-emerald-400 glow-emerald' : 'bg-amber-400 glow-amber'
              } animate-pulse`}
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div className="text-[11px] font-bold text-slate-300 truncate">System Status</div>
              <div className="text-[10px] text-slate-400 font-mono truncate">
                {connectionState === 'live' ? 'Online / Live ESP32' : 'Online / Demo Mode'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
