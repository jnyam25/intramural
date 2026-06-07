"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Step = "details" | "password" | "submitting" | "done";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const EMPTY: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

function PasswordRule({ met, label }: { met: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? "text-volt" : "text-gray-500"}`}>
      <span>{met ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/></svg>
      )}</span>
      {label}
    </li>
  );
}

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const colors = ["", "bg-hyper", "bg-hyper/70", "bg-volt/70", "bg-volt"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const textColors = ["", "text-hyper", "text-hyper/70", "text-volt/70", "text-volt"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              score >= i ? colors[score] : "bg-gray-700"
            }`}
          />
        ))}
      </div>
      {password && (
        <p className={`text-xs font-medium ${textColors[score]}`}>
          {labels[score]}
        </p>
      )}
    </div>
  );
}

export default function SignUpPage() {
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormData>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const router = useRouter();

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [field]: undefined }));
    setError(null);
  };

  // ── Step 1 validation ─────────────────────────────────────────────
  const validateDetails = () => {
    const errs: typeof fieldErrors = {};
    if (!form.firstName.trim()) errs.firstName = "Required";
    if (!form.lastName.trim()) errs.lastName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    if (Object.keys(errs).length) { setFieldErrors(errs); return false; }
    return true;
  };

  // ── Step 2 validation ─────────────────────────────────────────────
  const validatePassword = () => {
    const errs: typeof fieldErrors = {};
    if (form.password.length < 8) errs.password = "At least 8 characters";
    else if (!/[A-Z]/.test(form.password)) errs.password = "Include an uppercase letter";
    else if (!/[0-9]/.test(form.password)) errs.password = "Include a number";
    if (form.password !== form.confirmPassword) errs.confirmPassword = "Passwords do not match";
    if (Object.keys(errs).length) { setFieldErrors(errs); return false; }
    return true;
  };

  const handleNext = () => {
    if (validateDetails()) setStep("password");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setStep("submitting");
    setError(null);

    // 1. Create account
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setStep("password");
      return;
    }

    // 2. Auto sign-in
    const result = await signIn("credentials", {
      redirect: false,
      email: form.email.trim(),
      password: form.password,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Account created but sign-in failed. Please sign in manually.");
      setStep("done");
      return;
    }

    setStep("done");
    router.push("/dashboard");
  };

  // ── Success screen ─────────────────────────────────────────────────
  if (step === "done") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-void bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-850 via-void to-void">
        <div className="w-full max-w-md p-8 text-center space-y-6 animate-slide-up">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-volt/10 border border-volt/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 className="heading-sm text-white">You're all set!</h1>
          <p className="text-body">Taking you to your dashboard...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-void bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-850 via-void to-void py-12">
      <div className="w-full max-w-md p-8 space-y-8 animate-slide-up">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-volt/10 border border-volt/20 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <h1 className="heading-lg text-white">Create your account</h1>
          <p className="text-body">Join your school sports community</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-1">
          {(["details", "password"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-volt text-void"
                    : (step === "password" && s === "details") || step === "submitting"
                    ? "bg-volt/50 text-white"
                    : "bg-surface text-gray-500 border border-gray-700"
                }`}
              >
                {(step === "password" && s === "details") || step === "submitting" ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs font-medium ${step === s ? "text-white" : "text-gray-500"}`}>
                {s === "details" ? "Your info" : "Security"}
              </span>
              {i === 0 && <div className="flex-1 h-px bg-gray-700 mx-1" />}
            </div>
          ))}
        </div>

        <div className="card p-8 space-y-6">
          {error && (
            <div className="p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
              {error}
            </div>
          )}

          {/* ── Step 1: Personal details ── */}
          {step === "details" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field
                  label="First name"
                  value={form.firstName}
                  onChange={set("firstName")}
                  error={fieldErrors.firstName}
                  autoFocus
                />
                <Field
                  label="Last name"
                  value={form.lastName}
                  onChange={set("lastName")}
                  error={fieldErrors.lastName}
                />
              </div>
              <Field
                label="Email address"
                type="email"
                value={form.email}
                onChange={set("email")}
                error={fieldErrors.email}
                placeholder="you@school.edu"
              />
              <button
                onClick={handleNext}
                className="btn-primary w-full"
              >
                Continue
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </button>
            </div>
          )}

          {/* ── Step 2: Password ── */}
          {(step === "password" || step === "submitting") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Field
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={set("password")}
                  error={fieldErrors.password}
                  autoFocus
                />
                {form.password && (
                  <div className="space-y-2 mt-3">
                    <StrengthBar password={form.password} />
                    <ul className="space-y-1.5">
                      <PasswordRule met={form.password.length >= 8} label="At least 8 characters" />
                      <PasswordRule met={/[A-Z]/.test(form.password)} label="Uppercase letter" />
                      <PasswordRule met={/[0-9]/.test(form.password)} label="Number" />
                      <PasswordRule met={/[^A-Za-z0-9]/.test(form.password)} label="Special character (bonus)" />
                    </ul>
                  </div>
                )}
              </div>

              <Field
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                error={fieldErrors.confirmPassword}
              />

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setStep("details")}
                  className="flex-1 btn-secondary"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={step === "submitting"}
                  className="flex-1 btn-primary disabled:opacity-60"
                >
                  {step === "submitting" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-volt hover:text-volt-glow hover:underline font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

// Reusable field component
function Field({
  label,
  type = "text",
  value,
  onChange,
  error,
  placeholder,
  autoFocus,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full bg-surface border rounded-xl px-4 py-3 text-sm text-white outline-none transition-all focus:border-volt focus:ring-1 focus:ring-volt ${
          error ? "border-hyper" : "border-gray-600"
        }`}
      />
      {error && <p className="text-xs text-hyper">{error}</p>}
    </div>
  );
}
