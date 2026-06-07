import { getSessionWithRoles } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_ROLES = ["school_admin", "sports_admin", "league_admin"] as const;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  const isAdmin = session.roles.some((r) => ADMIN_ROLES.includes(r as (typeof ADMIN_ROLES)[number]));
  if (!isAdmin) redirect("/dashboard");

  // Derive schoolSlug from the first schoolId — Sprint 5 will resolve this via middleware
  const schoolSlug = session.schoolId;

  const navItems = [
    { label: "Overview", href: `/${schoolSlug}/admin` },
    { label: "Roles", href: `/${schoolSlug}/admin/roles`, show: session.roles.includes("school_admin") },
    { label: "Leagues", href: `/${schoolSlug}/admin/leagues` },
    { label: "Waivers", href: `/${schoolSlug}/admin/waivers` },
  ];

  return (
    <div className="flex h-screen bg-void">
      {/* Admin sidebar — narrower, higher contrast than user sidebar */}
      <aside className="w-56 bg-void border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <p className="text-xs uppercase tracking-widest text-gray-500">Admin Console</p>
          <p className="text-lg font-display font-semibold text-gradient mt-1">IntraPlay</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => item.show !== false)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="nav-link text-sm"
              >
                {item.label}
              </Link>
            ))}
        </nav>
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
