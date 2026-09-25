"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Reading } from "@/lib/db";

const TEMP_COLOR = "#DC5F00";
const HUMIDITY_COLOR = "#2563EB";

function formatTime(ms: number) {
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TICK_COUNT = 6;

export default function HistoryChart({
  readings,
  rangeMs,
}: {
  readings: Reading[];
  rangeMs: number;
}) {
  const now = Date.now();
  const domainStart = now - rangeMs;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, i) => domainStart + (i * rangeMs) / TICK_COUNT);
  const data = readings.map((r) => ({
    time: new Date(r.recorded_at.endsWith("Z") ? r.recorded_at : `${r.recorded_at}Z`).getTime(),
    temperature: r.temperature,
    humidity: r.humidity,
  }));

  return (
    <div className="h-80 w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={[domainStart, now]}
            ticks={ticks}
            tickFormatter={formatTime}
            tick={{ fontSize: 12 }}
          />
          <YAxis yAxisId="temp" tick={{ fontSize: 12 }} width={40} />
          <YAxis yAxisId="humidity" orientation="right" tick={{ fontSize: 12 }} width={40} />
          <Tooltip
            contentStyle={{ borderRadius: 12, fontSize: 12 }}
            labelFormatter={(label) => formatTime(label as number)}
            formatter={(value, name) => {
              const num = typeof value === "number" ? value : Number(value);
              return name === "temperature" ? [`${num.toFixed(1)} °C`, "気温"] : [`${num.toFixed(1)} %`, "湿度"];
            }}
          />
          <Line
            yAxisId="temp"
            type="monotone"
            dataKey="temperature"
            stroke={TEMP_COLOR}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="humidity"
            type="monotone"
            dataKey="humidity"
            stroke={HUMIDITY_COLOR}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: TEMP_COLOR }} />
          気温
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: HUMIDITY_COLOR }} />
          湿度
        </span>
      </div>
    </div>
  );
}
