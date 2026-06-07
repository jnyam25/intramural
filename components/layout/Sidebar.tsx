"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Role { role: string; scope?: { league_id?: string; team_id?: string; sport_id?: string } }

function getPrimaryRole(userRoles: Role[]): string {
  const roleStrings = userRoles.map(r => r.role);
  // Participant roles take precedence — an admin who also plays sees the player nav
  for (const role of ["referee", "coach", "captain", "participant"]) {
    if (roleStrings.includes(role)) return role;
  }
  // Admin-only users (no player role assigned)
  for (const role of ["school_admin", "sports_admin", "league_admin", "platform_admin"]) {
    if (roleStrings.includes(role)) return role;
  }
  return "participant";
}

function getNavItems(
  primaryRole: string,
  schoolSlug: string,
  isAdmin: boolean,
  sportIds: string[]
) {
  // For school_admin and platform_admin the only destination is the Admin Console.
  if (primaryRole === "school_admin" || primaryRole === "platform_admin") {
    return schoolSlug
      ? [
          { label: "My Profile",     href: "/profile" },
          { label: "Admin Console",  href: `/${schoolSlug}` },
        ]
      : [{ label: "My Profile", href: "/profile" }];
  }

  // Sports admin goes straight to their sport command center.
  if (primaryRole === "sports_admin") {
    const sportHref = schoolSlug && sportIds[0]
      ? `/${schoolSlug}/sports/${sportIds[0]}`
      : schoolSlug
      ? `/${schoolSlug}`
      : null;
    return [
      { label: "My Profile",     href: "/profile" },
      ...(sportHref ? [{ label: "Admin Console", href: sportHref }] : []),
    ];
  }

  const adminItem = isAdmin && schoolSlug
    ? [{ label: "Admin Console", href: `/${schoolSlug}` }]
    : [];

  switch (primaryRole) {
    case "referee":
      return [
        { label: "Dashboard",          href: "/dashboard" },
        { label: "My Assignments",     href: "/assignments" },
        { label: "Incident Reporting", href: "/incidents/new" },
        { label: "My Profile",         href: "/profile" },
        ...adminItem,
      ];
    case "coach":
      return [
        { label: "Dashboard",           href: "/dashboard" },
        { label: "My Teams",            href: "/teams" },
        { label: "Leagues & Schedules", href: "/leagues" },
        { label: "Communications",      href: "/communications" },
        { label: "My Profile",          href: "/profile" },
        ...adminItem,
      ];
    case "captain":
      return [
        { label: "Dashboard",           href: "/dashboard" },
        { label: "My Teams",            href: "/teams" },
        { label: "Leagues & Schedules", href: "/leagues" },
        { label: "Communications",      href: "/communications" },
        { label: "My Profile",          href: "/profile" },
        ...adminItem,
      ];
    case "league_admin":
      return [
        { label: "Dashboard",           href: "/dashboard" },
        { label: "Leagues & Schedules", href: "/leagues" },
        { label: "My Profile",          href: "/profile" },
        ...adminItem,
      ];
    case "participant":
    default:
      return [
        { label: "Dashboard",           href: "/dashboard" },
        { label: "My Teams",            href: "/teams" },
        { label: "Leagues & Schedules", href: "/leagues" },
        { label: "My Profile",          href: "/profile" },
        ...adminItem,
      ];
  }
}

export function Sidebar({
  userRoles,
  schoolSlug,
  sportIds = [],
}: {
  userRoles: Role[];
  schoolSlug: string;
  sportIds?: string[];
}) {
  const pathname = usePathname();

  const isAdmin = userRoles.some(r =>
    ["platform_admin", "school_admin", "sports_admin", "league_admin"].includes(r.role)
  );

  const primaryRole = getPrimaryRole(userRoles);
  const navItems = getNavItems(primaryRole, schoolSlug, isAdmin, sportIds);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="w-64 bg-void border-r border-gray-800 flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <span className="text-xl font-display font-bold text-gradient">IntraPlay</span>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "nav-link-active" : "nav-link"}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
