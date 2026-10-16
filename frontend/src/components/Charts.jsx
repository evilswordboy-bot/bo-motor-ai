import React, { useState, useRef, useEffect } from 'react';

// 1. Radial Circular Health Indicator
export function RadialHealthGauge({ value = 75, tier = 'Good', tierColor = 'cyan', size = 160 }) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const validValue = Math.max(0, Math.min(100, Number(value) || 0));
  const strokeDashoffset = circumference - (validValue / 100) * circumference;

  const colorMap = {
    emerald: '#10B981',
    cyan: '#06B6D4',
    amber: '#F59E0B',
    orange: '#F97316',
    rose: '#EF4444'
  };

  const activeColor = colorMap[tierColor] || '#06B6D4';

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E2D4A"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={activeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.8s ease-in-out, stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tracking-tight text-white">{Math.round(validValue)}%</span>
        <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5"
              style={{ backgroundColor: `${activeColor}22`, color: activeColor }}>
          {tier}
        </span>
      </div>
    </div>
  );
}

// 2. Interactive SVG Time Series Chart
export function TimeSeriesChart({
  data = [],
  lines = [{ key: 'vibration_rms', label: 'Vibration RMS (g)', color: '#06B6D4' }],
  thresholds = [],
  height = 300,
  yLabel = '',
  timeFormat = 'time',
  showGrid = true,
  zones = null // Optional background zones e.g. { normal: 45, warning: 60 }
}) {
  const containerRef = useRef(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Use fixed virtual viewBox dimensions (900x300) so SVG scales to any screen without JS layout dependency
  const V_WIDTH = 900;
  const V_HEIGHT = 300;
  const padding = { top: 25, right: 35, bottom: 40, left: 60 };
  const chartWidth = V_WIDTH - padding.left - padding.right;
  const chartHeight = V_HEIGHT - padding.top - padding.bottom;

  // Safe fallback if data is empty or pending
  const safeData = (data && data.length > 0) ? data : [
    { timestamp: new Date(Date.now() - 60000).toISOString(), [lines[0]?.key || 'val']: 0.3 },
    { timestamp: new Date().toISOString(), [lines[0]?.key || 'val']: 0.35 }
  ];

  // Compute min and max across all lines and thresholds
  let minY = Infinity;
  let maxY = -Infinity;

  safeData.forEach(item => {
    lines.forEach(l => {
      const val = Number(item[l.key]);
      if (!isNaN(val) && val !== null) {
        if (val < minY) minY = val;
        if (val > maxY) maxY = val;
      }
    });
  });

  thresholds.forEach(t => {
    const val = Number(t.value);
    if (!isNaN(val)) {
      if (val < minY) minY = val;
      if (val > maxY) maxY = val;
    }
  });

  if (minY === Infinity || maxY === -Infinity) {
    minY = 0;
    maxY = 1.0;
  }
  const ySpan = maxY - minY;
  const yBuffer = ySpan > 0 ? ySpan * 0.15 : 0.2;
  minY = Math.max(0, minY - yBuffer);
  maxY = maxY + yBuffer;

  const getX = index => padding.left + (index / Math.max(1, safeData.length - 1)) * chartWidth;
  const getY = val => padding.top + chartHeight - ((val - minY) / Math.max(0.001, maxY - minY)) * chartHeight;

  // Generate SVG path for a line
  const generatePath = key => {
    let path = '';
    let started = false;
    safeData.forEach((curr, idx) => {
      const val = Number(curr[key]);
      if (isNaN(val) || val === null) return;
      const x = getX(idx);
      const y = getY(val);
      if (!started) {
        path = `M ${x.toFixed(1)},${y.toFixed(1)}`;
        started = true;
      } else {
        path += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
      }
    });
    return path;
  };

  // Generate filled area path for gradient
  const generateAreaPath = key => {
    let path = '';
    let started = false;
    let firstX = padding.left;
    let lastX = padding.left;
    const bottomY = padding.top + chartHeight;

    safeData.forEach((curr, idx) => {
      const val = Number(curr[key]);
      if (isNaN(val) || val === null) return;
      const x = getX(idx);
      const y = getY(val);
      if (!started) {
        firstX = x;
        path = `M ${x.toFixed(1)},${bottomY} L ${x.toFixed(1)},${y.toFixed(1)}`;
        started = true;
      } else {
        path += ` L ${x.toFixed(1)},${y.toFixed(1)}`;
        lastX = x;
      }
    });

    if (started) {
      path += ` L ${lastX.toFixed(1)},${bottomY} Z`;
    }
    return path;
  };

  const handleMouseMove = e => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    // Map mouseX from screen px to virtual coordinate space
    const virtualX = (mouseX / rect.width) * V_WIDTH;
    const chartX = virtualX - padding.left;
    const ratio = Math.max(0, Math.min(1, chartX / chartWidth));
    const index = Math.round(ratio * (safeData.length - 1));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => setHoverIndex(null);

  const hoveredItem = hoverIndex !== null && safeData[hoverIndex] ? safeData[hoverIndex] : null;

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}>
      <svg
        viewBox={`0 0 ${V_WIDTH} ${V_HEIGHT}`}
        className="w-full h-full block cursor-crosshair overflow-visible"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {lines.map((line, i) => (
            <linearGradient key={`grad-${i}`} id={`area-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={line.color} stopOpacity="0.0" />
            </linearGradient>
          ))}
        </defs>

        {/* Background chart frame */}
        <rect
          x={padding.left}
          y={padding.top}
          width={chartWidth}
          height={chartHeight}
          fill="#070A12"
          stroke="#151F33"
          strokeWidth="1"
          rx="4"
        />

        {/* Colored threshold zones (if enabled) */}
        {zones && zones.warning && (
          <>
            {/* Warning zone */}
            {getY(zones.warning) > padding.top && (
              <rect
                x={padding.left}
                y={Math.max(padding.top, getY(zones.critical || 60))}
                width={chartWidth}
                height={Math.max(0, getY(zones.warning) - Math.max(padding.top, getY(zones.critical || 60)))}
                fill="rgba(245, 158, 11, 0.08)"
              />
            )}
            {/* Critical zone */}
            {zones.critical && getY(zones.critical) > padding.top && (
              <rect
                x={padding.left}
                y={padding.top}
                width={chartWidth}
                height={Math.max(0, getY(zones.critical) - padding.top)}
                fill="rgba(239, 68, 68, 0.12)"
              />
            )}
          </>
        )}

        {/* Y Grid lines & tick numbers */}
        {showGrid && [0, 0.25, 0.5, 0.75, 1.0].map((pct, i) => {
          const val = minY + pct * (maxY - minY);
          const y = getY(val);
          return (
            <g key={`grid-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#1E2D4A"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                fill="#94A3B8"
                fontSize="11"
                textAnchor="end"
                fontFamily="JetBrains Mono"
                fontWeight="500"
              >
                {val.toFixed(val >= 10 ? 1 : 2)}
              </text>
            </g>
          );
        })}

        {/* Threshold lines */}
        {thresholds.map((th, i) => {
          const y = getY(th.value);
          if (y < padding.top || y > padding.top + chartHeight) return null;
          return (
            <g key={`th-${i}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke={th.color || '#EF4444'}
                strokeDasharray="5 5"
                strokeWidth="1.5"
                opacity="0.85"
              />
              <text
                x={padding.left + chartWidth - 8}
                y={y - 5}
                fill={th.color || '#EF4444'}
                fontSize="11"
                textAnchor="end"
                fontFamily="JetBrains Mono"
                fontWeight="700"
              >
                {th.label}: {th.value}
              </text>
            </g>
          );
        })}

        {/* Filled Area Gradients */}
        {lines.map((line, i) => (
          <path
            key={`area-${i}`}
            d={generateAreaPath(line.key)}
            fill={`url(#area-grad-${i})`}
            opacity="0.9"
          />
        ))}

        {/* Stroke Curves */}
        {lines.map((line, i) => (
          <path
            key={`line-${i}`}
            d={generatePath(line.key)}
            fill="none"
            stroke={line.color}
            strokeWidth={line.width || 2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-300"
          />
        ))}

        {/* Hover Crosshair */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#E2E8F0"
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
            {lines.map((line, i) => {
              const val = Number(safeData[hoverIndex][line.key]);
              if (isNaN(val)) return null;
              return (
                <circle
                  key={`dot-${i}`}
                  cx={getX(hoverIndex)}
                  cy={getY(val)}
                  r="5"
                  fill={line.color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* X Axis Time Labels */}
        {[0, Math.floor(safeData.length / 4), Math.floor(safeData.length / 2), Math.floor((3 * safeData.length) / 4), safeData.length - 1].map((idx, i) => {
          if (!safeData[idx]) return null;
          const x = getX(idx);
          const t = new Date(safeData[idx].timestamp);
          const timeStr = isNaN(t.getTime()) ? `${idx}` : t.toLocaleTimeString();
          return (
            <text
              key={`x-lbl-${i}`}
              x={x}
              y={V_HEIGHT - 12}
              fill="#94A3B8"
              fontSize="11"
              textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
              fontFamily="JetBrains Mono"
              fontWeight="500"
            >
              {timeStr}
            </text>
          );
        })}
      </svg>

      {/* Floating Detailed Tooltip */}
      {hoveredItem && (
        <div
          className="absolute z-20 pointer-events-none bg-navy-900/95 border border-cyan-500/50 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs font-mono"
          style={{
            top: 10,
            left: Math.min(600, Math.max(10, ((getX(hoverIndex) / V_WIDTH) * 100) + '%'))
          }}
        >
          <div className="text-cyan-400 font-bold border-b border-navy-750 pb-1 mb-1.5 flex justify-between gap-4">
            <span>{hoveredItem.timestamp ? new Date(hoveredItem.timestamp).toLocaleTimeString() : 'Current'}</span>
            <span className={`px-1.5 py-0.2 rounded font-sans font-bold text-[10px] ${
              hoveredItem.status === 'Critical' ? 'bg-rose-500/20 text-rose-400' :
              hoveredItem.status === 'Warning' ? 'bg-amber-500/20 text-amber-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {hoveredItem.status || 'Normal'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
            {lines.map((l, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span style={{ color: l.color }}>{l.label}:</span>
                <span className="font-bold text-white">{Number(hoveredItem[l.key] || 0).toFixed(2)}</span>
              </div>
            ))}
            {hoveredItem.temperature_c !== undefined && (
              <div className="flex justify-between gap-2">
                <span className="text-amber-400">Temp:</span>
                <span className="font-bold text-amber-300">{Number(hoveredItem.temperature_c).toFixed(1)} °C</span>
              </div>
            )}
            {hoveredItem.health_score !== undefined && (
              <div className="flex justify-between gap-2">
                <span className="text-emerald-400">Health:</span>
                <span className="font-bold text-emerald-300">{Math.round(hoveredItem.health_score)}%</span>
              </div>
            )}
            {hoveredItem.anomaly_score !== undefined && (
              <div className="flex justify-between gap-2">
                <span className="text-purple-400">Anomaly:</span>
                <span className="font-bold text-purple-300">{Number(hoveredItem.anomaly_score).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 3. Interactive Donut Chart for Fault Distribution
export function DonutChart({ data = [], centerText = '72%', centerSub = 'Current Anomaly', size = 220 }) {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const total = data.reduce((acc, curr) => acc + (curr.count || 0), 0) || 1;
  let accumulatedAngle = 0;

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6 justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {data.map((item, i) => {
            const pct = (item.count || 0) / total;
            const strokeDash = pct * circumference;
            const offset = circumference - strokeDash;
            const rotate = accumulatedAngle * 360;
            accumulatedAngle += pct;

            const isHovered = hoveredSlice === i;

            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke={item.color || '#3B82F6'}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
                strokeDashoffset={0}
                fill="transparent"
                style={{
                  transformOrigin: 'center',
                  transform: `rotate(${rotate}deg)`,
                  transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                  opacity: hoveredSlice !== null && !isHovered ? 0.45 : 1.0,
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredSlice(i)}
                onMouseLeave={() => setHoveredSlice(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          <span className="text-2xl font-extrabold text-white tracking-tight">
            {hoveredSlice !== null ? `${data[hoveredSlice]?.percentage}%` : centerText}
          </span>
          <span className="text-[11px] text-slate-400 font-medium line-clamp-1">
            {hoveredSlice !== null ? data[hoveredSlice]?.fault_type : centerSub}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5 w-full max-w-xs text-xs">
        {data.map((item, i) => (
          <div
            key={i}
            onMouseEnter={() => setHoveredSlice(i)}
            onMouseLeave={() => setHoveredSlice(null)}
            className={`flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer transition-colors ${
              hoveredSlice === i ? 'bg-navy-700/80' : 'hover:bg-navy-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-slate-300 font-medium">{item.fault_type}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">{item.count}</span>
              <span className="text-white font-bold">{item.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. Interactive Scatter Plot (Temperature vs Vibration RMS)
export function ScatterPlot({ points = [], height = 320 }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) setWidth(containerRef.current.clientWidth || 600);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (!points || points.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-slate-500 text-sm font-mono">
        Loading scatter plot points...
      </div>
    );
  }

  const padding = { top: 20, right: 30, bottom: 45, left: 60 };
  const plotWidth = Math.max(200, width - padding.left - padding.right);
  const plotHeight = Math.max(100, height - padding.top - padding.bottom);

  // X is Temperature (approx 20C to 75C)
  const minX = 20;
  const maxX = 75;

  // Y is Vibration RMS (approx 0.0g to 1.6g)
  const minY = 0.0;
  const maxY = 1.6;

  const getX = temp => padding.left + ((temp - minX) / (maxX - minX)) * plotWidth;
  const getY = vib => padding.top + plotHeight - ((vib - minY) / (maxY - minY)) * plotHeight;

  return (
    <div ref={containerRef} className="relative w-full select-none" style={{ height }}>
      <svg width={width} height={height} className="overflow-visible">
        {/* Axes and Grid */}
        {[0, 0.4, 0.8, 1.2, 1.6].map((vibVal, i) => {
          const y = getY(vibVal);
          return (
            <g key={`y-${i}`}>
              <line x1={padding.left} y1={y} x2={padding.left + plotWidth} y2={y} stroke="#1E2D4A" strokeDasharray="3 3" />
              <text x={padding.left - 8} y={y + 4} fill="#64748B" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono">
                {vibVal.toFixed(1)}g
              </text>
            </g>
          );
        })}

        {[25, 35, 45, 55, 65, 75].map((tempVal, i) => {
          const x = getX(tempVal);
          return (
            <g key={`x-${i}`}>
              <line x1={x} y1={padding.top} x2={x} y2={padding.top + plotHeight} stroke="#1E2D4A" strokeDasharray="3 3" />
              <text x={x} y={height - 15} fill="#64748B" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono">
                {tempVal}°C
              </text>
            </g>
          );
        })}

        {/* Critical boundary zones */}
        {/* Warning temp line */}
        <line x1={getX(45)} y1={padding.top} x2={getX(45)} y2={padding.top + plotHeight} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        {/* Critical temp line */}
        <line x1={getX(60)} y1={padding.top} x2={getX(60)} y2={padding.top + plotHeight} stroke="#EF4444" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        {/* Warning vib line */}
        <line x1={padding.left} y1={getY(0.6)} x2={padding.left + plotWidth} y2={getY(0.6)} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />
        {/* Critical vib line */}
        <line x1={padding.left} y1={getY(1.0)} x2={padding.left + plotWidth} y2={getY(1.0)} stroke="#EF4444" strokeDasharray="4 4" strokeWidth="1" opacity="0.6" />

        {/* Data points */}
        {points.map((pt, idx) => {
          const cx = getX(pt.temperature);
          const cy = getY(pt.vibration_rms);
          const isHovered = hoveredPoint?.id === pt.id;

          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={isHovered ? 6 : 3.5}
              fill={pt.color || '#06B6D4'}
              opacity={isHovered ? 1.0 : 0.75}
              stroke={isHovered ? '#FFFFFF' : 'transparent'}
              strokeWidth={isHovered ? 2 : 0}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredPoint(pt)}
              onMouseLeave={() => setHoveredPoint(null)}
            />
          );
        })}

        {/* Axis Titles */}
        <text x={padding.left + plotWidth / 2} y={height - 2} fill="#94A3B8" fontSize="11" textAnchor="middle" fontWeight="500">
          Temperature (°C)
        </text>
        <text
          x={14}
          y={padding.top + plotHeight / 2}
          fill="#94A3B8"
          fontSize="11"
          textAnchor="middle"
          fontWeight="500"
          transform={`rotate(-90 14 ${padding.top + plotHeight / 2})`}
        >
          Vibration RMS (g)
        </text>
      </svg>

      {/* Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="absolute z-20 pointer-events-none bg-navy-900/95 border border-cyan-500/50 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs font-mono"
          style={{
            top: 15,
            right: 20
          }}
        >
          <div className="font-bold text-cyan-400 border-b border-navy-700 pb-1 mb-1">
            Sample #{hoveredPoint.id} | {hoveredPoint.status}
          </div>
          <div className="space-y-0.5 text-slate-300">
            <div>Temp: <span className="font-bold text-amber-400">{hoveredPoint.temperature}°C</span></div>
            <div>Vibration: <span className="font-bold text-cyan-400">{hoveredPoint.vibration_rms} g</span></div>
            <div>Health: <span className="font-bold text-emerald-400">{hoveredPoint.health}%</span></div>
            <div>Anomaly Score: <span className="font-bold text-purple-400">{hoveredPoint.anomaly_score}</span></div>
            <div>Pattern: <span className="font-bold text-white">{hoveredPoint.fault_pattern}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// 5. High-Speed Oscilloscope Canvas for Raw MPU6050 3-Axis Accel
export function OscilloscopeCanvas({ ax = 0, ay = 0, az = 1.0, amag = 1.0, height = 200 }) {
  const canvasRef = useRef(null);
  const currentValues = useRef({ ax, ay, az, amag });
  const phaseRef = useRef(0);
  const bufferRef = useRef([]);

  useEffect(() => {
    currentValues.current = { ax, ay, az, amag };
  }, [ax, ay, az, amag]);

  // Pre-seed buffer so canvas is active immediately
  useEffect(() => {
    const initialBuf = [];
    const pts = 120;
    for (let i = 0; i < pts; i++) {
      const p = (i / pts) * Math.PI * 6;
      const curAx = Number(ax) || 0.05;
      const curAy = Number(ay) || 0.08;
      const curAz = Number(az) || 0.98;
      const curMag = Number(amag) || 1.0;
      initialBuf.push({
        ax: curAx + Math.sin(p) * 0.15,
        ay: curAy + Math.cos(p) * 0.15,
        az: curAz + Math.sin(p * 2) * 0.05,
        amag: curMag + Math.sin(p) * 0.08
      });
    }
    bufferRef.current = initialBuf;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;

      // Dark background
      ctx.fillStyle = '#070A12';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = '#151F33';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = '#1E2D4A';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Advance dynamic motor oscillation phase
      phaseRef.current += 0.12;
      const phase = phaseRef.current;
      const cur = currentValues.current;

      const dynamicAmp = Math.max(0.08, Math.abs(cur.amag - 1.0) * 0.8 + 0.06);

      // Append real-time physical point to buffer
      bufferRef.current.push({
        ax: cur.ax + Math.sin(phase * 1.8) * dynamicAmp + (Math.random() - 0.5) * 0.02,
        ay: cur.ay + Math.cos(phase * 1.8) * dynamicAmp + (Math.random() - 0.5) * 0.02,
        az: cur.az + Math.sin(phase * 3.6) * (dynamicAmp * 0.4) + (Math.random() - 0.5) * 0.02,
        amag: cur.amag + Math.sin(phase * 1.8) * (dynamicAmp * 0.6)
      });

      if (bufferRef.current.length > 120) {
        bufferRef.current.shift();
      }

      const buf = bufferRef.current;
      if (buf.length < 2) {
        animId = requestAnimationFrame(render);
        return;
      }

      // Scale: +/- 2.5g maps to height
      const scale = h / 4.5;
      const centerY = h / 2;

      const drawTrace = (key, color, lineWidth = 1.8) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        buf.forEach((pt, i) => {
          const x = (i / (buf.length - 1)) * w;
          const y = centerY - pt[key] * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      };

      drawTrace('ax', '#EF4444', 1.6); // Red for X
      drawTrace('ay', '#10B981', 1.6); // Green for Y
      drawTrace('az', '#3B82F6', 1.6); // Blue for Z
      drawTrace('amag', '#F59E0B', 2.2); // Amber for Resultant Magnitude

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-slate-800 shadow-inner" style={{ height }}>
      <canvas ref={canvasRef} width={700} height={height} className="w-full h-full block" />
      <div className="absolute top-2 left-3 flex flex-wrap gap-2 text-[10px] font-mono font-bold bg-navy-900/90 px-2.5 py-1 rounded backdrop-blur border border-navy-750">
        <span className="text-red-400">● Ax: {(Number(ax) || 0).toFixed(2)}g</span>
        <span className="text-emerald-400">● Ay: {(Number(ay) || 0).toFixed(2)}g</span>
        <span className="text-blue-400">● Az: {(Number(az) || 0).toFixed(2)}g</span>
        <span className="text-amber-400">● Magnitude: {(Number(amag) || 0).toFixed(2)}g</span>
      </div>
    </div>
  );
}
