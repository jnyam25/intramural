"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const initialForm = {
  schoolName: "",
  slug: "",
  domain: "",
  schoolType: "college",
  timezone: "America/New_York",
  contactEmail: "",
  adminFirstName: "",
  adminLastName: "",
  adminEmail: "",
};

export default function SchoolOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value;
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "schoolName" && !current.slug
        ? { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") }
        : {}),
    }));
    setError(null);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/schools/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not onboard school.");
      return;
    }
    router.push(`/${data.slug}/admin`);
  };

  return (
    <main className="min-h-screen bg-void bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-850 via-void to-void py-12">
      <div className="max-w-3xl mx-auto px-6 space-y-8 animate-slide-up">
        <header className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-volt/10 border border-volt/20 text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 18 0"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/></svg>
          </div>
          <h1 className="heading-lg text-white">Onboard your school</h1>
          <p className="text-body">Create a tenant, invite the school admin, and prepare SSO settings.</p>
        </header>

        <div className="flex gap-2">
          {["School", "Admin", "Review"].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-2 rounded-full ${step >= i ? "bg-volt" : "bg-surface"}`} />
              <p className={`text-xs mt-2 ${step === i ? "text-white" : "text-gray-500"}`}>{label}</p>
            </div>
          ))}
        </div>

        <section className="card p-8 space-y-5">
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="School name" value={form.schoolName} onChange={set("schoolName")} />
              <Field label="URL slug" value={form.slug} onChange={set("slug")} />
              <Field label="Email domain" value={form.domain} onChange={set("domain")} placeholder="school.edu" />
              <label className="space-y-1.5">
                <span className="block text-sm font-medium text-gray-300">School type</span>
                <select value={form.schoolType} onChange={set("schoolType")} className="input">
                  <option value="k12">K-12</option>
                  <option value="college">College</option>
                  <option value="university">University</option>
                </select>
              </label>
              <Field label="Timezone" value={form.timezone} onChange={set("timezone")} />
              <Field label="Contact email" value={form.contactEmail} onChange={set("contactEmail")} type="email" />
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Admin first name" value={form.adminFirstName} onChange={set("adminFirstName")} />
              <Field label="Admin last name" value={form.adminLastName} onChange={set("adminLastName")} />
              <div className="md:col-span-2">
                <Field label="Admin email" value={form.adminEmail} onChange={set("adminEmail")} type="email" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Review label="School" value={form.schoolName} />
                <Review label="Slug" value={form.slug} />
                <Review label="Domain" value={form.domain || "Not set"} />
                <Review label="Admin" value={`${form.adminFirstName} ${form.adminLastName}`} />
              </div>
              <p className="text-caption">After creation, configure Google Workspace or Azure AD from the admin SSO settings page.</p>
            </div>
          )}

          {error && <div className="p-3 rounded-xl bg-hyper/10 border border-hyper/20 text-sm text-hyper">{error}</div>}

          <div className="flex justify-between pt-2">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-secondary disabled:opacity-50">
              Back
            </button>
            {step < 2 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="btn-primary">
                Continue
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting} className="btn-primary disabled:opacity-50">
                {submitting ? "Creating..." : "Create school"}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; placeholder?: string }) {
  return (
    <label className="space-y-1.5 block">
      <span className="block text-sm font-medium text-gray-300">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} className="input" />
    </label>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-white mt-1">{value}</p>
    </div>
  );
}
