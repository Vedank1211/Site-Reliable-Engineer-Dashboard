import { useMemo } from "react";

interface LineChartProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  gradientId?: string;
  threshold?: number;
  showThreshold?: boolean;
  unit?: string;
  label?: string;
}

export default function LineChart({
  data,
  width = 400,
  height = 120,
  color = "#22ff88",
  gradientId = "chartGrad",
  threshold,
  showThreshold = false,
  unit = "",
  label = "",
}: LineChartProps) {
  const { path, areaPath, thresholdY, min, max } = useMemo(() => {
    if (!data.length) return { path: "", areaPath: "", thresholdY: 0, min: 0, max: 100 };

    const pad = 8;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const minV = Math.min(...data, threshold ?? Infinity) * 0.9;
    const maxV = Math.max(...data, threshold ?? -Infinity) * 1.1;
    const range = maxV - minV || 1;

    const points = data.map((v, i) => {
      const x = pad + (i / (data.length - 1 || 1)) * w;
      const y = pad + h - ((v - minV) / range) * h;
      return { x, y };
    });

    const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const area =
      line +
      ` L ${points[points.length - 1].x} ${height - pad} L ${points[0].x} ${height - pad} Z`;

    const tY =
      threshold !== undefined
        ? pad + h - ((threshold - minV) / range) * h
        : 0;

    return { path: line, areaPath: area, thresholdY: tY, min: minV, max: maxV };
  }, [data, width, height, threshold]);

  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-slate-500 text-sm" style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {showThreshold && threshold !== undefined && (
        <>
          <line
            x1={8}
            y1={thresholdY}
            x2={width - 8}
            y2={thresholdY}
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <text x={width - 60} y={thresholdY - 4} fill="#ef4444" fontSize={9} opacity={0.8}>
            threshold {threshold}{unit}
          </text>
        </>
      )}

      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {label && (
        <text x={8} y={14} fill="#94a3b8" fontSize={10}>
          {label} ({min.toFixed(1)}–{max.toFixed(1)}{unit})
        </text>
      )}
    </svg>
  );
}
