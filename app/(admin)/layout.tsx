import { getSessionWithRoles } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { AdminNav } from "@/components/layout/AdminNav";

const ADMIN_ROLES = ["platform_admin", "school_admin", "sports_admin", "league_admin"] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  const isAdmin = session.roles.some((r) =>
    ADMIN_ROLES.includes(r as (typeof ADMIN_ROLES)[number])
  );
  if (!isAdmin) redirect("/dashboard");

  const schoolSlug = session.schoolId ?? "";

  return (
    <div className="flex h-screen bg-void">
      <aside className="w-56 bg-void border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs uppercase tracking-widest text-gray-500">Admin Console</p>
          <p className="text-lg font-display font-semibold text-gradient mt-1">IntraPlay</p>
        </div>

        <AdminNav schoolSlug={schoolSlug} roles={session.roles} sportIds={session.sportIds} />

        <div className="p-4 border-t border-gray-800">
          <Link href="/dashboard" className="btn-ghost text-xs w-full">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-8 bg-void">{children}</div>
    </div>
  );
}
