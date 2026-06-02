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
    <div className="flex h-screen bg-gray-100">
      {/* Admin sidebar — narrower, higher contrast than user sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="p-5 border-b border-gray-700">
          <p className="text-xs uppercase tracking-widest text-gray-400">Admin Console</p>
          <p className="text-sm font-semibold text-white mt-1">IntraPlay</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems
            .filter((item) => item.show !== false)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-200 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-8">{children}</div>
    </div>
  );
}
