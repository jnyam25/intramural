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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <span className="text-sm font-semibold text-gray-700">{schoolName}</span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <span className="text-sm text-gray-700 hidden sm:block">{displayName}</span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
