"use client";

export function WaiverStatusBadge({ signed }: { signed: boolean }) {
  return signed
    ? <span className="badge-success">Signed</span>
    : <span className="badge-warning">Missing</span>;
}
