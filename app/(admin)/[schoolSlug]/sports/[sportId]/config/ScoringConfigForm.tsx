"use client";
import { useState } from "react";

export function ScoringConfigForm({ sportId }: { sportId: string }) {
  const [name, setName] = useState("");
  const [win, setWin] = useState(3);
  const [tie, setTie] = useState(1);
  const [loss, setLoss] = useState(0);
  const [forfeitLoss, setForfeitLoss] = useState(-1);
  const [allowsTies, setAllowsTies] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; success: boolean } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/admin/scoring-systems`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sportId,
        name,
        points: { win, tie, loss, forfeit_loss: forfeitLoss },
        tiebreakers: ["head_to_head", "point_differential"],
        allows_ties: allowsTies,
        uses_sets: false,
      }),
    });
    const data = await res.json();
    setResult({ message: data.message ?? data.error, success: res.ok });
    if (res.ok) setName("");
    setSubmitting(false);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold text-gray-900 mb-4">Add Scoring System</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Standard 3-1-0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Win pts", value: win, set: setWin },
            { label: "Tie pts", value: tie, set: setTie },
            { label: "Loss pts", value: loss, set: setLoss },
            { label: "Forfeit pts", value: forfeitLoss, set: setForfeitLoss },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="number"
                value={value}
                onChange={(e) => set(+e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
              />
            </div>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={allowsTies}
            onChange={(e) => setAllowsTies(e.target.checked)}
            className="rounded"
          />
          Allows ties
        </label>

        {result && (
          <div className={`p-3 rounded text-sm ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting ? "Saving..." : "Save Scoring System"}
        </button>
      </form>
    </div>
  );
}
