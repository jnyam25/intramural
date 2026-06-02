"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Role { role: string; scope?: { league_id?: string; team_id?: string } }

export function Sidebar({ userRoles, schoolSlug }: { userRoles: Role[], schoolSlug: string }) {
  const pathname = usePathname();

  const hasRole = (role: string) => userRoles.some(r => r.role === role);
  const isCaptain = hasRole("captain");
  const isParticipant = hasRole("participant");

  // Dashboard routes live at /dashboard, /teams, /leagues (no school-slug prefix).
  // Only the admin console keeps the slug in the URL.
  const navItems = [
    { label: "Dashboard", href: "/dashboard", show: true },
    { label: "My Teams", href: "/teams", show: isCaptain || isParticipant },
    { label: "Leagues & Standings", href: "/leagues", show: true },
    { label: "Admin Console", href: `/${schoolSlug}/admin`, show: hasRole("school_admin") || hasRole("sports_admin") || hasRole("league_admin") },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col">
      <div className="p-6 text-xl font-bold border-b border-slate-700">IntraPlay</div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.filter(item => item.show).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block px-4 py-2 rounded-lg transition-colors ${
              pathname === item.href ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
