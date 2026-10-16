import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

// Views
import { OverviewView } from './components/OverviewView';
import { LiveMonitoringView } from './components/LiveMonitoringView';
import { VibrationAnalysisView } from './components/VibrationAnalysisView';
import { TemperatureAnalysisView } from './components/TemperatureAnalysisView';
import { ScatterPlotView } from './components/ScatterPlotView';
import { AnomalyDetectionView } from './components/AnomalyDetectionView';
import { FaultClassificationView } from './components/FaultClassificationView';
import { MaintenancePredictionView } from './components/MaintenancePredictionView';
import { HistoricalAnalysisView } from './components/HistoricalAnalysisView';
import { CsvStudioView } from './components/CsvStudioView';
import { DatasetView } from './components/DatasetView';
import { ModelPerformanceView } from './components/ModelPerformanceView';
import { SettingsView } from './components/SettingsView';

export function App() {
  const [currentView, setCurrentView] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Telemetry & State
  const [statusData, setStatusData] = useState({
    connection_state: 'demo',
    is_esp32_connected: false,
    simulator_active: true,
    motor_id: 'BO_MOTOR_01',
    last_updated: new Date().toISOString()
  });

  const [overviewData, setOverviewData] = useState(null);
  const [faultDistribution, setFaultDistribution] = useState(null);
  const [liveReading, setLiveReading] = useState(null);

  const wsRef = useRef(null);

  // Poll overview and status
  const loadOverview = async () => {
    try {
      const [oRes, sRes, fRes] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/status'),
        fetch('/api/charts/fault-distribution')
      ]);
      if (oRes.ok) setOverviewData(await oRes.json());
      if (sRes.ok) setStatusData(await sRes.json());
      if (fRes.ok) setFaultDistribution(await fRes.json());
    } catch (e) {
      console.error('Error fetching dashboard status:', e);
    }
  };

  useEffect(() => {
    loadOverview();
    const interval = setInterval(loadOverview, 4000);
    return () => clearInterval(interval);
  }, []);

  // WebSocket connection for real-time live telemetry streaming
  useEffect(() => {
    let reconnectTimer;
    const connectWs = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws/live`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] Connected to BO MOTOR AI live stream');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'live_reading') {
            setLiveReading(msg.data);
            // Quick update status
            setStatusData(prev => ({
              ...prev,
              last_updated: msg.data.timestamp,
              is_esp32_connected: msg.data.source === 'real',
              connection_state: msg.data.source === 'real' ? 'live' : prev.connection_state
            }));
          }
        } catch (e) {}
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWs, 3000);
      };

      wsRef.current = ws;
    };

    connectWs();
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  // Inject real ESP32 reading via POST /api/ingest
  const handleInjectSample = async () => {
    try {
      const testPacket = {
        motor_id: 'BO_MOTOR_01',
        temperature: 42.5 + Math.sin(Date.now() / 10000) * 4.0,
        ax: 0.15 + (Math.random() - 0.5) * 0.4,
        ay: 0.20 + (Math.random() - 0.5) * 0.4,
        az: 0.98 + (Math.random() - 0.5) * 0.2,
        gyro_x: 0.01,
        gyro_y: 0.02,
        gyro_z: 0.03,
        pwm_duty: 80.0,
        source: 'real'
      };

      const res = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPacket)
      });
      const data = await res.json();
      if (data.prediction) {
        setLiveReading(data.prediction);
        loadOverview();
      }
    } catch (e) {
      console.error('Error injecting sample:', e);
    }
  };

  const handleToggleSimulator = async () => {
    try {
      const res = await fetch('/api/simulator/toggle', { method: 'POST' });
      const json = await res.json();
      setStatusData(prev => ({ ...prev, simulator_active: json.simulator_active }));
    } catch (e) {
      console.error('Error toggling simulator:', e);
    }
  };

  return (
    <div className="flex min-h-screen bg-navy-950 text-slate-100 antialiased">
      {/* Sidebar navigation */}
      <Sidebar
        currentView={currentView}
        setView={(v) => { setCurrentView(v); setIsMobileMenuOpen(false); }}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        connectionState={statusData.connection_state}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          connectionState={statusData.connection_state}
          isEsp32Connected={statusData.is_esp32_connected}
          motorId={statusData.motor_id}
          lastUpdated={statusData.last_updated}
          onToggleSidebar={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onInjectSample={handleInjectSample}
          simulatorActive={statusData.simulator_active}
          onToggleSimulator={handleToggleSimulator}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'overview' && (
            <OverviewView
              overviewData={overviewData}
              faultDistribution={faultDistribution}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'live' && (
            <LiveMonitoringView
              liveReading={liveReading}
              onInjectSample={handleInjectSample}
              isEsp32Connected={statusData.is_esp32_connected}
              simulatorActive={statusData.simulator_active}
              onToggleSimulator={handleToggleSimulator}
            />
          )}

          {currentView === 'vibration' && (
            <VibrationAnalysisView liveReading={liveReading} />
          )}

          {currentView === 'temperature' && (
            <TemperatureAnalysisView liveReading={liveReading} />
          )}

          {currentView === 'anomaly' && <AnomalyDetectionView />}

          {currentView === 'fault' && (
            <FaultClassificationView onNavigate={setCurrentView} />
          )}

          {currentView === 'maintenance' && (
            <MaintenancePredictionView overviewData={overviewData} />
          )}

          {currentView === 'historical' && <HistoricalAnalysisView />}

          {currentView === 'csv_studio' && <CsvStudioView />}

          {currentView === 'dataset' && (
            <DatasetView onNavigate={setCurrentView} />
          )}

          {currentView === 'model' && <ModelPerformanceView />}

          {currentView === 'settings' && (
            <SettingsView onSettingsSaved={loadOverview} />
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}

export default App;
