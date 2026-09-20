import StatTile from "@/components/StatTile";
import HistoryChart from "@/components/HistoryChart";
import type { Reading } from "@/lib/db";

function formatUpdatedAt(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString("ja-JP");
}

export default function DeviceCard({
  deviceId,
  readings,
}: {
  deviceId: string;
  readings: Reading[];
}) {
  const latest = readings.length > 0 ? readings[readings.length - 1] : undefined;

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-950/50">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{deviceId}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {latest ? `最終更新: ${formatUpdatedAt(latest.recorded_at)}` : "データを待機中..."}
        </p>
      </header>

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

      <HistoryChart readings={readings} />
    </section>
  );
}
