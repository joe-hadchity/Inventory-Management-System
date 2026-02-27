import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/authz";
import { AdminTabs } from "@/components/admin/AdminTabs";

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "admin") redirect("/inventory");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">
              Manage inventory operations, team access, and categories.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            {profile.email}
          </div>
        </div>
      </header>
      <AdminTabs />
      {children}
    </div>
  );
}
