"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Action = "approve" | "reject" | "disband";

const ACTION_META: Record<Action, { label: string; confirm: string; className: string }> = {
  approve: {
    label: "Approve",
    confirm: "Approve this team?",
    className: "text-xs font-medium text-volt hover:text-volt/80 transition-colors",
  },
  reject: {
    label: "Reject",
    confirm: "Reject this team?",
    className: "text-xs font-medium text-hyper hover:text-hyper/80 transition-colors",
  },
  disband: {
    label: "Disband",
    confirm: "Disband and archive this team?",
    className: "text-xs text-gray-500 hover:text-hyper transition-colors",
  },
};

export function TeamActions({ teamId, currentStatus }: { teamId: string; currentStatus: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Action | null>(null);
  const [loading, setLoading] = useState(false);

  const execute = async (action: Action) => {
    setLoading(true);
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setLoading(false);
    setPending(null);
    if (res.ok) router.refresh();
  };

  if (pending) {
    const meta = ACTION_META[pending];
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400">{meta.confirm}</span>
        <button
          onClick={() => execute(pending)}
          disabled={loading}
          className="text-xs font-medium text-hyper hover:text-hyper/80 disabled:opacity-50"
        >
          {loading ? "…" : "Confirm"}
        </button>
        <button
          onClick={() => setPending(null)}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {currentStatus !== "approved" && (
        <button onClick={() => setPending("approve")} className={ACTION_META.approve.className}>
          Approve
        </button>
      )}
      {currentStatus !== "rejected" && (
        <button onClick={() => setPending("reject")} className={ACTION_META.reject.className}>
          Reject
        </button>
      )}
      {currentStatus !== "archived" && (
        <button onClick={() => setPending("disband")} className={ACTION_META.disband.className}>
          Disband
        </button>
      )}
    </div>
  );
}
