"use client";

import { useEffect, useState } from "react";
import DeviceCard from "@/components/DeviceCard";
import { logout } from "@/app/actions/auth";
import { RANGE_OPTIONS, rangeMs } from "@/lib/time-range";
import type { Reading } from "@/lib/db";

const POLL_INTERVAL_MS = 10_000;

type DeviceReadings = { device_id: string; readings: Reading[] };

export default function Home() {
  const [devices, setDevices] = useState<DeviceReadings[]>([]);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("1d");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/readings?range=${range}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setDevices(json.devices);
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
  }, [range]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          AtomS3 + ENV.IV 環境モニター
        </h1>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
          >
            ログアウト
          </button>
        </form>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <span>表示期間:</span>
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={`rounded-full px-3 py-1 ${
              range === opt.value
                ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                : "bg-zinc-100 dark:bg-zinc-800"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">デバイスからのデータを待機中...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {devices.map((d) => (
            <DeviceCard
              key={d.device_id}
              deviceId={d.device_id}
              readings={d.readings}
              rangeMs={rangeMs(range)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
