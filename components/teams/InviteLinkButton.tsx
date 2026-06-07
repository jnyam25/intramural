"use client";
import { useState } from "react";

export function InviteLinkButton({ inviteCode, inviteUrl }: { inviteCode: string; inviteUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3">
      <code className="flex-1 font-mono text-lg font-bold text-volt tracking-wider bg-surface rounded-xl px-4 py-2">
        {inviteCode}
      </code>
      <button onClick={handleCopy} className="btn-primary shrink-0">
        {copied ? "Copied!" : "Copy Link"}
      </button>
    </div>
  );
}
