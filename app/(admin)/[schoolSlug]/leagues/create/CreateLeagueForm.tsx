"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Sport = { _id: string; name: string };
type ScoringSystem = { _id: string; name: string };

export function CreateLeagueForm({
  schoolSlug,
  sports,
  scoringSystems,
}: {
  schoolSlug: string;
  sports: Sport[];
  scoringSystems: ScoringSystem[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    sport_id: sports[0]?._id ?? "",
    scoring_system_id: scoringSystems[0]?._id ?? "",
    season: "",
    division: "",
    max_roster_size: 10,
    start_date: "",
    end_date: "",
  });

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.end_date && form.start_date && form.end_date <= form.start_date) {
      setError("End date must be after start date.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leagues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          division: form.division || undefined,
          max_roster_size: Number(form.max_roster_size),
          start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
          end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create league.");
        return;
      }

      router.push(`/${schoolSlug}/leagues/${data.leagueId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1">League Name *</label>
          <input
            type="text"
            required
            minLength={2}
            maxLength={100}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Fall Basketball League"
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Sport *</label>
          <select
            required
            value={form.sport_id}
            onChange={(e) => set("sport_id", e.target.value)}
            className="input w-full"
          >
            {sports.length === 0 ? (
              <option value="">No sports configured</option>
            ) : (
              sports.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Scoring System *</label>
          <select
            required
            value={form.scoring_system_id}
            onChange={(e) => set("scoring_system_id", e.target.value)}
            className="input w-full"
          >
            {scoringSystems.length === 0 ? (
              <option value="">No scoring systems configured</option>
            ) : (
              scoringSystems.map((ss) => (
                <option key={ss._id} value={ss._id}>
                  {ss.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Season *</label>
          <input
            type="text"
            required
            value={form.season}
            onChange={(e) => set("season", e.target.value)}
            placeholder="e.g. Fall 2026"
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Division <span className="text-gray-500 font-normal">(optional)</span></label>
          <input
            type="text"
            value={form.division}
            onChange={(e) => set("division", e.target.value)}
            placeholder="e.g. Varsity, JV, Recreational"
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Max Roster Size *</label>
          <input
            type="number"
            required
            min={1}
            max={50}
            value={form.max_roster_size}
            onChange={(e) => set("max_roster_size", parseInt(e.target.value))}
            className="input w-full"
          />
        </div>

        <div />

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Start Date *</label>
          <input
            type="datetime-local"
            required
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className="input w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">End Date *</label>
          <input
            type="datetime-local"
            required
            value={form.end_date}
            onChange={(e) => set("end_date", e.target.value)}
            className="input w-full"
          />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
          {submitting ? "Creating..." : "Create League"}
        </button>
        <a href={`/${schoolSlug}/leagues`} className="btn-ghost text-sm">
          Cancel
        </a>
      </div>
    </form>
  );
}
