"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const VALID_TRANSITIONS: Record<string, string | null> = {
  draft: "registration",
  registration: "active",
  active: "completed",
  completed: "archived",
  archived: null,
};

type League = {
  _id: string;
  name: string;
  division?: string;
  max_roster_size: number;
  start_date?: string;
  end_date?: string;
  status: string;
};

export function EditLeagueForm({
  league,
  schoolSlug,
}: {
  league: League;
  schoolSlug: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: league.name,
    division: league.division ?? "",
    max_roster_size: league.max_roster_size,
    start_date: league.start_date ? league.start_date.slice(0, 16) : "",
    end_date: league.end_date ? league.end_date.slice(0, 16) : "",
  });

  const set = (field: string, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const patch = async (payload: Record<string, unknown>, successMsg: string) => {
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/leagues/${league._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed.");
        return;
      }
      setSuccess(successMsg);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    patch(
      {
        name: form.name,
        division: form.division || undefined,
        max_roster_size: Number(form.max_roster_size),
        start_date: form.start_date ? new Date(form.start_date).toISOString() : undefined,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : undefined,
      },
      "Settings saved."
    );
  };

  const nextStatus = VALID_TRANSITIONS[league.status];

  const STATUS_PIPELINE = ["draft", "registration", "active", "completed", "archived"];
  const currentIdx = STATUS_PIPELINE.indexOf(league.status);

  return (
    <div className="space-y-8">
      {/* Settings section */}
      <div className="card p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white">League Settings</h2>
        <form onSubmit={handleSaveSettings} className="space-y-6">
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
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Division <span className="text-gray-500 font-normal">(optional)</span></label>
              <input
                type="text"
                value={form.division}
                onChange={(e) => set("division", e.target.value)}
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
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => set("end_date", e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? "Saving..." : "Save Settings"}
          </button>
        </form>
      </div>

      {/* Status advancement section */}
      <div className="card p-8 space-y-6">
        <h2 className="text-lg font-semibold text-white">League Status</h2>

        {/* Pipeline visualization */}
        <div className="flex items-center gap-0">
          {STATUS_PIPELINE.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  i < currentIdx
                    ? "bg-gray-700 text-gray-400"
                    : i === currentIdx
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {s}
              </div>
              {i < STATUS_PIPELINE.length - 1 && (
                <div className={`w-6 h-0.5 ${i < currentIdx ? "bg-gray-600" : "bg-gray-800"}`} />
              )}
            </div>
          ))}
        </div>

        {nextStatus ? (
          <div>
            <p className="text-sm text-gray-400 mb-3">
              Advance this league to <span className="font-medium text-white capitalize">{nextStatus}</span>?
              This action is logged and cannot be undone without advancing further.
            </p>
            <button
              disabled={submitting}
              onClick={() => patch({ status: nextStatus }, `League advanced to "${nextStatus}".`)}
              className="btn-secondary disabled:opacity-50 capitalize"
            >
              {submitting ? "Updating..." : `Advance to ${nextStatus}`}
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">This league is archived and cannot be advanced further.</p>
        )}
      </div>

      {/* Feedback */}
      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-xl text-sm bg-green-500/10 text-green-400 border border-green-500/20">{success}</div>
      )}
    </div>
  );
}
