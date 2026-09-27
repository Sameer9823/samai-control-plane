import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const useDatabase = !!process.env.DATABASE_URL;

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar user={{ name: user?.name ?? "Guest", role: user?.role ?? "VIEWER" }} showSignOut={useDatabase} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 px-6 py-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
