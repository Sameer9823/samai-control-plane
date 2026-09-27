"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from "recharts";

const tooltipStyle = {
  background: "hsl(220 14% 10%)",
  border: "1px solid hsl(220 12% 20%)",
  borderRadius: 6,
  fontSize: 12,
  color: "hsl(220 20% 92%)",
  padding: "6px 10px",
};

// Chart components render inside client components, so formatting is done
// with a plain string enum instead of a passed-in function — functions
// can't cross the server/client boundary when these charts are rendered
// from a Server Component page.
export type ChartFormat = "number" | "currency" | "ms" | "raw";

function formatValue(v: number, format: ChartFormat = "raw"): string {
  switch (format) {
    case "number":
      if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
      if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
      return String(v);
    case "currency":
      return `$${v}`;
    case "ms":
      return v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;
    default:
      return String(v);
  }
}

export function TrendChart({
  data,
  dataKey,
  color = "hsl(238 84% 67%)",
  height = 220,
  format = "raw",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color?: string;
  height?: number;
  format?: ChartFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="hsl(220 12% 16%)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "hsl(220 8% 40%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "hsl(220 12% 16%)" }}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(5)}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "hsl(220 8% 40%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => formatValue(v, format)}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: "hsl(220 9% 62%)", marginBottom: 4 }}
          formatter={(v: number) => [formatValue(v, format), ""]}
        />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.75} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendBarChart({
  data,
  dataKey,
  color = "hsl(238 84% 67%)",
  height = 220,
  format = "raw",
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  color?: string;
  height?: number;
  format?: ChartFormat;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke="hsl(220 12% 16%)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "hsl(220 8% 40%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "hsl(220 12% 16%)" }}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(5)}
          minTickGap={24}
        />
        <YAxis
          tick={{ fill: "hsl(220 8% 40%)", fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={false}
          tickLine={false}
          width={40}
          tickFormatter={(v: number) => formatValue(v, format)}
        />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(220 9% 62%)", marginBottom: 4 }} formatter={(v: number) => [formatValue(v, format), ""]} />
        <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
