import Dashboard from "@/components/Dashboard";
import { getSessionRole } from "@/lib/session";

export default async function Home() {
  const role = await getSessionRole();
  // proxy.ts already guarantees a session exists for this path; role is non-null here.
  return <Dashboard role={role ?? "viewer"} />;
}
