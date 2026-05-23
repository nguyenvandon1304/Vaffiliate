"use client";

import { useMemo } from "react";

export interface BarPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarPoint[];
  /** Format giá trị hiển thị trên tooltip / max line. */
  formatValue?: (n: number) => string;
  /** Tone cam mặc định khớp brand. */
  color?: string;
  height?: number;
  className?: string;
}

/**
 * Biểu đồ cột SVG đơn giản, không phụ thuộc thư viện ngoài.
 *
 * - Tự scale theo giá trị max.
 * - Hiển thị value trên đỉnh khi hover (qua title element — native tooltip).
 * - Hỗ trợ light/dark mode qua Tailwind class.
 */
export function BarChart({
  data,
  formatValue = (n) => n.toLocaleString("vi-VN"),
  color = "#fb923c",
  height = 180,
  className,
}: BarChartProps) {
  const { width, barW, gap, padX, padY, max, ticks } = useMemo(() => {
    const padX = 24;
    const padY = 16;
    const gap = 6;
    const barW = 28;
    const width = padX * 2 + data.length * (barW + gap) - gap;
    const max = Math.max(1, ...data.map((d) => d.value));
    // 4 đường lưới ngang
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
    return { width, barW, gap, padX, padY, max, ticks };
  }, [data]);

  const innerH = height - padY * 2;
  const baselineY = height - padY;

  if (data.length === 0) {
    return (
      <div className={className}>
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-8">Chưa có dữ liệu.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className="block"
          aria-label="Biểu đồ cột"
        >
          {/* Grid + label trục Y */}
          {ticks.map((t, i) => {
            const y = baselineY - (innerH * (t / max));
            return (
              <g key={i}>
                <line
                  x1={padX}
                  x2={width - padX}
                  y1={y}
                  y2={y}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeDasharray="2 2"
                />
                <text
                  x={padX - 4}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="9"
                  className="fill-gray-400 dark:fill-zinc-500"
                >
                  {formatValue(t)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((d, i) => {
            const h = (innerH * d.value) / max;
            const x = padX + i * (barW + gap);
            const y = baselineY - h;
            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={3}
                  fill={color}
                  className="transition-opacity hover:opacity-80"
                >
                  <title>
                    {d.label}: {formatValue(d.value)}
                  </title>
                </rect>
                <text
                  x={x + barW / 2}
                  y={baselineY + 12}
                  textAnchor="middle"
                  fontSize="9"
                  className="fill-gray-500 dark:fill-zinc-400"
                >
                  {d.label}
                </text>
                {d.value > 0 && (
                  <text
                    x={x + barW / 2}
                    y={y - 3}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    className="fill-gray-700 dark:fill-zinc-200"
                  >
                    {formatValue(d.value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
