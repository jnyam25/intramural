"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminNavProps {
  schoolSlug: string;
  roles: string[];
  sportIds?: string[];
}

export function AdminNav({ schoolSlug, roles, sportIds = [] }: AdminNavProps) {
  const pathname = usePathname();

  const isPlatformAdmin = roles.includes("platform_admin");
  const isSchoolAdmin   = roles.includes("school_admin");
  const isSportsAdmin   = roles.includes("sports_admin");
  const isLeagueAdmin   = roles.includes("league_admin");

  // Sports admin sees a sport-specific panel; school/platform admin sees the full school panel
  const isSportsAdminOnly = isSportsAdmin && !isSchoolAdmin && !isPlatformAdmin;
  const primarySportId    = sportIds[0] ?? "";

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  // ── School / platform admin nav ──────────────────────────────────────────
  const schoolItems = [
    { label: "Overview",            href: `/${schoolSlug}`,           exact: true, show: !isSportsAdminOnly && !!schoolSlug },
    { label: "Leagues",             href: `/${schoolSlug}/leagues`,               show: !!schoolSlug },
    { label: "Teams",               href: `/${schoolSlug}/teams`,                 show: (isLeagueAdmin || isPlatformAdmin || isSchoolAdmin) && !!schoolSlug },
    { label: "Matches",             href: `/${schoolSlug}/matches`,               show: (isLeagueAdmin || isPlatformAdmin || isSchoolAdmin || isSportsAdmin) && !!schoolSlug },
    { label: "Disputes",            href: `/${schoolSlug}/disputes`,              show: (isLeagueAdmin || isPlatformAdmin || isSchoolAdmin || isSportsAdmin) && !!schoolSlug },
    { label: "Officials",           href: `/${schoolSlug}/officials`,             show: (isSportsAdmin || isPlatformAdmin || isSchoolAdmin) && !!schoolSlug },
    { label: "Waivers",             href: `/${schoolSlug}/waivers`,               show: (isSchoolAdmin || isLeagueAdmin || isPlatformAdmin || isSportsAdmin) && !!schoolSlug },
    { label: "Roles",               href: `/${schoolSlug}/roles`,                 show: (isSchoolAdmin || isPlatformAdmin) && !!schoolSlug },
    { label: "Reports & Analytics", href: `/${schoolSlug}/reports`,               show: (isSchoolAdmin || isPlatformAdmin) && !!schoolSlug },
    { label: "SSO",                 href: `/${schoolSlug}/sso`,                   show: (isSchoolAdmin || isPlatformAdmin) && !!schoolSlug },
    { label: "Settings",            href: `/${schoolSlug}/settings`,              show: (isSchoolAdmin || isPlatformAdmin) && !!schoolSlug },
  ];

  // ── Sports admin nav (shown instead of full school nav) ──────────────────
  const sportItems = [
    { label: "Sport Overview", href: `/${schoolSlug}/sports/${primarySportId}`,           exact: true, show: isSportsAdminOnly && !!primarySportId },
    { label: "Leagues",        href: `/${schoolSlug}/leagues`,                                         show: isSportsAdminOnly && !!schoolSlug },
    { label: "Teams",          href: `/${schoolSlug}/teams`,                                           show: isSportsAdminOnly && !!schoolSlug },
    { label: "Matches",        href: `/${schoolSlug}/matches`,                                         show: isSportsAdminOnly && !!schoolSlug },
    { label: "Disputes",       href: `/${schoolSlug}/disputes`,                                        show: isSportsAdminOnly && !!schoolSlug },
    { label: "Officials",      href: `/${schoolSlug}/officials`,                                       show: isSportsAdminOnly && !!schoolSlug },
    { label: "Waivers",        href: `/${schoolSlug}/waivers`,                                         show: isSportsAdminOnly && !!schoolSlug },
  ];

  const platformItems = [
    { label: "Overview",     href: "/admin",                exact: true, show: isPlatformAdmin },
    { label: "Audit Logs",   href: "/admin/audit-logs",                  show: isPlatformAdmin },
    { label: "Schedule",     href: "/admin/schedule",                    show: isPlatformAdmin },
    { label: "Eligibility",  href: "/admin/eligibility",                 show: isPlatformAdmin },
  ];

  const visibleItems   = isSportsAdminOnly
    ? sportItems.filter(i => i.show)
    : schoolItems.filter(i => i.show);
  const visiblePlatform = platformItems.filter(i => i.show);

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {isSportsAdminOnly && primarySportId && (
        <div className="pb-2 px-3">
          <p className="text-xs uppercase tracking-widest text-gray-600">Sport Console</p>
        </div>
      )}

      {visibleItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={isActive(item.href, item.exact) ? "nav-link-active text-sm" : "nav-link text-sm"}
        >
          {item.label}
        </Link>
      ))}

      {visiblePlatform.length > 0 && (
        <>
          <div className="pt-4 pb-1 px-3">
            <p className="text-xs uppercase tracking-widest text-gray-600">Platform</p>
          </div>
          {visiblePlatform.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href, item.exact) ? "nav-link-active text-sm" : "nav-link text-sm"}
            >
              {item.label}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
