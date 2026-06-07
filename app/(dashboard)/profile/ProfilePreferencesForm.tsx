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

  return (
    <section className="bg-white rounded-lg shadow divide-y divide-gray-100">
      <div className="px-6 py-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Preferences</h2>
      </div>
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input
            type="text"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Leave blank to use your account name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Email Notifications</p>
          <div className="space-y-2">
            {(
              [
                ["email_match_reminders", "Match reminders"],
                ["email_score_updates", "Score updates"],
                ["email_roster_changes", "Roster changes"],
              ] as [keyof Prefs, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[key] ?? false}
                  onChange={() => toggle(key)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {result && (
          <div
            className={`p-3 rounded-lg text-sm ${
              result.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : "Save Preferences"}
        </button>
      </form>
    </section>
  );
}
