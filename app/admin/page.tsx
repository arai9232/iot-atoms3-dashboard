import Link from "next/link";
import { getAllDevices, getLoginEvents } from "@/lib/db";
import { updateDeviceSettingsAction } from "@/app/actions/admin";

// Reads the DB directly on every request - must not be statically prerendered
// (build-time prerendering would read the DB before Railway's volume is mounted,
// and would also bake in stale device/login data).
export const dynamic = "force-dynamic";

function formatDateTime(iso: string) {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  return d.toLocaleString("ja-JP");
}

function roleLabel(role: string | null, success: boolean) {
  if (!success) return "ログイン失敗";
  if (role === "admin") return "管理者";
  if (role === "viewer") return "閲覧者";
  return "-";
}

export default function AdminPage() {
  const devices = getAllDevices();
  const loginEvents = getLoginEvents(50);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">管理画面</h1>
        <Link
          href="/"
          className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
        >
          ダッシュボードへ戻る
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">デバイス管理</h2>
        {devices.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">まだデバイスがありません。</p>
        ) : (
          <div className="flex flex-col gap-4">
            {devices.map((d) => (
              <form
                key={d.device_id}
                action={updateDeviceSettingsAction}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <input type="hidden" name="device_id" value={d.device_id} />
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{d.device_id}</span>
                  <label className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    表示名:
                    <input
                      type="text"
                      name="display_name"
                      defaultValue={d.display_name ?? ""}
                      placeholder={d.device_id}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </label>
                  <label className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                    <input type="checkbox" name="hidden" defaultChecked={d.hidden} />
                    非表示にする
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-zinc-600 dark:text-zinc-400">
                  <span>気温しきい値(°C):</span>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_min"
                    defaultValue={d.temp_min ?? ""}
                    placeholder="下限"
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <span>〜</span>
                  <input
                    type="number"
                    step="0.1"
                    name="temp_max"
                    defaultValue={d.temp_max ?? ""}
                    placeholder="上限"
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />

                  <span className="ml-4">湿度しきい値(%):</span>
                  <input
                    type="number"
                    step="0.1"
                    name="humidity_min"
                    defaultValue={d.humidity_min ?? ""}
                    placeholder="下限"
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <span>〜</span>
                  <input
                    type="number"
                    step="0.1"
                    name="humidity_max"
                    defaultValue={d.humidity_max ?? ""}
                    placeholder="上限"
                    className="w-20 rounded-md border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                </div>

                <button
                  type="submit"
                  className="self-start rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
                >
                  保存
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">ログイン履歴</h2>
        {loginEvents.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">まだ記録がありません。</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr>
                  <th className="px-4 py-2 font-medium">日時</th>
                  <th className="px-4 py-2 font-medium">結果</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {loginEvents.map((ev) => (
                  <tr key={ev.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2 text-zinc-700 dark:text-zinc-300">
                      {formatDateTime(ev.created_at)}
                    </td>
                    <td
                      className={`px-4 py-2 font-medium ${
                        ev.success
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {roleLabel(ev.role, ev.success)}
                    </td>
                    <td className="px-4 py-2 text-zinc-500 dark:text-zinc-400">{ev.ip ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
