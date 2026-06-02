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
    <li className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-gray-400"}`}>
      <span>{met ? "✓" : "○"}</span>
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

  const colors = ["", "bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const labels = ["", "Weak", "Fair", "Good", "Strong"];

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              score >= i ? colors[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      {password && (
        <p className={`text-xs font-medium ${score <= 1 ? "text-red-500" : score <= 2 ? "text-orange-500" : score <= 3 ? "text-yellow-600" : "text-green-600"}`}>
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
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-xl font-bold text-gray-900">You're all set!</h1>
          <p className="text-sm text-gray-500">Taking you to your dashboard…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 py-12">
      <div className="w-full max-w-sm">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 px-1">
          {(["details", "password"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : (step === "password" && s === "details") || step === "submitting"
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {(step === "password" && s === "details") || step === "submitting" ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === s ? "text-gray-900" : "text-gray-400"}`}>
                {s === "details" ? "Your info" : "Security"}
              </span>
              {i === 0 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
            <p className="text-sm text-slate-500 mt-1">
              {step === "details" ? "Tell us who you are." : "Choose a strong password."}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
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
                className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue
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
                  <div className="space-y-2 mt-2">
                    <StrengthBar password={form.password} />
                    <ul className="space-y-1">
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
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={step === "submitting"}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {step === "submitting" ? "Creating account…" : "Create account"}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
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
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={`w-full border rounded-lg px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-blue-500 ${
          error ? "border-red-400 bg-red-50" : "border-gray-300"
        }`}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
