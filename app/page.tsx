"use client";

import { useEffect, useState } from "react";
import StatTile from "@/components/StatTile";
import HistoryChart from "@/components/HistoryChart";
import type { Reading } from "@/lib/db";

const POLL_INTERVAL_MS = 10_000;
const POINT_OPTIONS = [50, 200, 500] as const;

function formatUpdatedAt(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString("ja-JP");
}

export default function Home() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [limit, setLimit] = useState<(typeof POINT_OPTIONS)[number]>(200);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/readings?limit=${limit}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setReadings(json.readings);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("データの取得に失敗しました");
      }
    }

    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [limit]);

  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          AtomS3 + ENV.IV 環境モニター
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {latest
            ? `最終更新: ${formatUpdatedAt(latest.recorded_at)} (${latest.device_id})`
            : "データを待機中..."}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <StatTile
          label="気温"
          value={latest ? latest.temperature.toFixed(1) : "--"}
          unit="°C"
          accent="#DC5F00"
        />
        <StatTile
          label="湿度"
          value={latest ? latest.humidity.toFixed(1) : "--"}
          unit="%"
          accent="#2563EB"
        />
      </div>

      <div className="flex items-center justify-end gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span>表示件数:</span>
        {POINT_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setLimit(opt)}
            className={`rounded-full px-3 py-1 ${
              limit === opt
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>

      <HistoryChart readings={readings} />
    </div>
  );
}
