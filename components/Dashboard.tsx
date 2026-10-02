"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import DeviceCard from "@/components/DeviceCard";
import { logout } from "@/app/actions/auth";
import { RANGE_OPTIONS, rangeMs } from "@/lib/time-range";
import type { DeviceMeta, Reading } from "@/lib/db";
import type { SessionRole } from "@/lib/auth-token";

const POLL_INTERVAL_MS = 10_000;
const SLIDER_DEBOUNCE_MS = 250;
const MIN_SLIDER_STEP_MS = 60_000;
const SLIDER_STEPS = 200;

type DeviceReadings = DeviceMeta & { readings: Reading[] };

function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard({ role }: { role: SessionRole }) {
  const [devices, setDevices] = useState<DeviceReadings[]>([]);
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]["value"]>("1d");
  const [error, setError] = useState<string | null>(null);

  const [earliestMs, setEarliestMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isLive, setIsLive] = useState(true);
  const [windowEnd, setWindowEnd] = useState(() => Date.now());
  const [sliderValue, setSliderValue] = useState(() => Date.now());
  const [displayUntil, setDisplayUntil] = useState(() => Date.now());
  const sliderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keeps the slider's right edge ("now") moving even while paused on a past window.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const until = isLive ? Date.now() : windowEnd;
      try {
        const res = await fetch(`/api/readings?range=${range}&until=${until}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (!cancelled) {
          setDevices(json.devices);
          setDisplayUntil(until);
          setEarliestMs(json.earliestRecordedAt ? new Date(json.earliestRecordedAt).getTime() : null);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("データの取得に失敗しました");
      }
    }

    load();
    const id = isLive ? setInterval(load, POLL_INTERVAL_MS) : undefined;
    return () => {
      cancelled = true;
      if (id) clearInterval(id);
    };
  }, [range, isLive, windowEnd]);

  function handleSliderChange(value: number) {
    setIsLive(false);
    setSliderValue(value);
    if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
    sliderTimeoutRef.current = setTimeout(() => setWindowEnd(value), SLIDER_DEBOUNCE_MS);
  }

  function goLive() {
    if (sliderTimeoutRef.current) clearTimeout(sliderTimeoutRef.current);
    setIsLive(true);
  }

  const currentRangeMs = rangeMs(range);
  const canScroll = earliestMs !== null && nowMs - earliestMs > currentRangeMs;
  const sliderMin = earliestMs ?? nowMs - currentRangeMs;
  const sliderStep = Math.max(MIN_SLIDER_STEP_MS, Math.floor(currentRangeMs / SLIDER_STEPS));
  const effectiveUntil = isLive ? nowMs : sliderValue;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          AtomS3 + ENV.IV 環境モニター
        </h1>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <Link
              href="/admin"
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              管理画面
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            >
              ログアウト
            </button>
          </form>
        </div>
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

      {canScroll && (
        <div className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              {formatDateTime(effectiveUntil - currentRangeMs)} 〜 {formatDateTime(effectiveUntil)}
            </span>
            {isLive ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                ライブ
              </span>
            ) : (
              <button
                onClick={goLive}
                className="rounded-full bg-zinc-900 px-3 py-1 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                ライブに戻る
              </button>
            )}
          </div>
          <input
            type="range"
            min={sliderMin}
            max={nowMs}
            step={sliderStep}
            value={isLive ? nowMs : sliderValue}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full accent-zinc-900 dark:accent-zinc-50"
          />
        </div>
      )}

      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">デバイスからのデータを待機中...</p>
      ) : (
        <div className="flex flex-col gap-6">
          {devices.map((d) => (
            <DeviceCard
              key={d.device_id}
              deviceId={d.device_id}
              displayName={d.display_name}
              readings={d.readings}
              rangeMs={currentRangeMs}
              until={displayUntil}
              thresholds={{
                tempMin: d.temp_min,
                tempMax: d.temp_max,
                humidityMin: d.humidity_min,
                humidityMax: d.humidity_max,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
