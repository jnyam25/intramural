"use client";
import { useState } from "react";

type Prefs = {
  email_match_reminders?: boolean;
  email_score_updates?: boolean;
  email_roster_changes?: boolean;
};

export function ProfilePreferencesForm({
  currentDisplayName,
  preferences,
}: {
  currentDisplayName?: string;
  preferences: Prefs;
}) {
  const [displayName, setDisplayName] = useState(currentDisplayName ?? "");
  const [prefs, setPrefs] = useState<Prefs>({
    email_match_reminders: preferences.email_match_reminders ?? true,
    email_score_updates: preferences.email_score_updates ?? true,
    email_roster_changes: preferences.email_roster_changes ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName || undefined,
          notification_preferences: prefs,
        }),
      });
      const data = await res.json();
      setResult({ message: data.message ?? data.error, success: res.ok });
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const NOTIFICATION_OPTIONS: [keyof Prefs, string, string][] = [
    ["email_match_reminders", "Match Reminders", "Get notified before your upcoming matches"],
    ["email_score_updates", "Score Updates", "Receive alerts when match scores are submitted"],
    ["email_roster_changes", "Roster Changes", "Know when players join or leave your team"],
  ];

  return (
    <div className="card divide-y divide-gray-800">
      <div className="px-6 py-4">
        <h2 className="heading-sm text-white">Preferences</h2>
        <p className="text-caption mt-1">Manage your display name and notification settings.</p>
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
        {/* Display Name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">Display Name</label>
          <input
            type="text"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Leave blank to use your account name"
            className="input"
          />
        </div>

        {/* Email Notifications */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-300">Email Notifications</p>
          <div className="space-y-3">
            {NOTIFICATION_OPTIONS.map(([key, label, description]) => (
              <label
                key={key}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <div className="relative mt-0.5">
                  <input
                    type="checkbox"
                    checked={prefs[key] ?? false}
                    onChange={() => toggle(key)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-gray-700 peer-checked:bg-volt rounded-full transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {result && (
          <div
            className={`p-3 rounded-xl text-sm border ${
              result.success
                ? "bg-volt/10 text-volt border-volt/20"
                : "bg-hyper/10 text-hyper border-hyper/20"
            }`}
          >
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary disabled:opacity-50"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
              Saving…
            </>
          ) : (
            "Save Preferences"
          )}
        </button>
      </form>
    </div>
  );
}
