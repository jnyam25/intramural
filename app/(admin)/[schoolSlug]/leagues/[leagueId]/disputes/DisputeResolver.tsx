"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisputeResolver({ matchId }: { matchId: string }) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  const resolve = async (decision: "approve" | "dispute") => {
    setSubmitting(true);
    setResult(null);

    const res = await fetch(`/api/admin/matches/${matchId}/score`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision, dispute_notes: notes }),
    });
    const data = await res.json();

    if (res.ok) {
      router.refresh();
    } else {
      setResult(data.error ?? "Something went wrong.");
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3 mt-2">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Resolution Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optionally explain the decision..."
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {result && (
        <p className="text-sm text-red-700">{result}</p>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => resolve("approve")}
          disabled={submitting}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          Approve Last Submission
        </button>
        <button
          onClick={() => resolve("dispute")}
          disabled={submitting}
          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors"
        >
          Escalate / Keep Disputed
        </button>
      </div>
    </div>
  );
}
