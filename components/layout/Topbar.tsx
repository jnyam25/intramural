"use client";
import { signOut } from "next-auth/react";

interface TopbarProps {
  user: { name?: string | null; email?: string | null };
  schoolName: string;
}

export function Topbar({ user, schoolName }: TopbarProps) {
  const displayName = user.name ?? user.email ?? "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-slate-850 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <span className="text-sm font-medium text-gray-400">{schoolName}</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="avatar-sm bg-volt/10 text-volt border-volt/30">
            {initials}
          </div>
          <span className="text-sm text-gray-300 hidden sm:block">{displayName}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-ghost text-xs py-2 px-4"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
