"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-void bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-850 via-void to-void">
      <div className="w-full max-w-md p-8 space-y-8 animate-slide-up">
        {/* Logo & Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-volt/10 border border-volt/20 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h1 className="heading-lg text-white">IntraPlay</h1>
          <p className="text-body">Sign in with your school account</p>
        </div>

        {/* Login Card */}
        <div className="card p-8 space-y-6">
          <div className="space-y-3">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface border border-gray-600 rounded-xl text-sm font-medium text-gray-200 hover:bg-surface-elevated hover:border-gray-500 transition-all active:scale-[0.98]"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <button
              onClick={() => signIn("azure-ad", { callbackUrl: "/dashboard" })}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-surface border border-gray-600 rounded-xl text-sm font-medium text-gray-200 hover:bg-surface-elevated hover:border-gray-500 transition-all active:scale-[0.98]"
            >
              <MicrosoftIcon />
              Continue with Microsoft
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-500 uppercase tracking-widest">
              <span className="bg-slate-850 px-3">or</span>
            </div>
          </div>

          <Link
            href="/auth/signin"
            className="block w-full text-center px-4 py-3 text-sm font-medium text-gray-300 border border-gray-600 rounded-xl hover:bg-surface hover:border-gray-500 transition-all active:scale-[0.98]"
          >
            Sign in with email (dev)
          </Link>

          <p className="text-xs text-center text-gray-500">
            SSO is enforced by your school. Contact your admin if you need access.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          New student?{" "}
          <Link href="/signup" className="text-volt hover:text-volt-glow hover:underline font-medium transition-colors">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 21 21">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
