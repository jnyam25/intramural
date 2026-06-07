"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevokeRoleButton({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/roles", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-xs text-gray-500 hover:text-hyper transition-colors"
      >
        Revoke
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400">Sure?</span>
      <button
        onClick={handleRevoke}
        disabled={loading}
        className="text-xs font-medium text-hyper hover:text-hyper/80 transition-colors disabled:opacity-50"
      >
        {loading ? "…" : "Yes, revoke"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}
