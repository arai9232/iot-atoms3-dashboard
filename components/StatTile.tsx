type StatTileProps = {
  label: string;
  value: string;
  unit: string;
  accent: string;
};

export default function StatTile({ label, value, unit, accent }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <span className="text-4xl font-semibold tabular-nums" style={{ color: accent }}>
        {value}
        <span className="ml-1 text-xl font-normal text-zinc-400">{unit}</span>
      </span>
    </div>
  );
}
