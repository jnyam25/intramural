"use client";

import { useState, useEffect } from "react";

interface AuditLog {
  id: string;
  timestamp: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: any;
  ip_address: string;
}

const actionColors: Record<string, string> = {
  USER_REGISTERED: "text-cyber",
  TEAM_CREATED: "text-volt",
  ROSTER_APPROVED: "text-volt",
  ROSTER_JOINED: "text-gray-400",
  WAIVER_SIGNED: "text-cyber",
  SCORE_SUBMITTED: "text-hyper",
  SCHEDULE_GENERATED: "text-gray-400",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        if (page === 1) {
          setLogs(data.logs);
        } else {
          setLogs((prev) => [...prev, ...data.logs]);
        }
        setHasMore(data.logs.length === 50);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  const handleExport = () => {
    // Export to CSV
    const csv = [
      ["Timestamp", "Action", "Actor", "Entity Type", "Entity ID", "IP Address", "Metadata"],
      ...logs.map((log) => [
        log.timestamp,
        log.action,
        log.actor_user_id,
        log.entity_type,
        log.entity_id,
        log.ip_address,
        JSON.stringify(log.metadata),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">Audit Logs</h1>
          <p className="text-body mt-1">SOC2-compliant activity tracking</p>
        </div>
        <button onClick={handleExport} className="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      {/* Filter */}
      <div className="card p-4">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Filter by action or user..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="input flex-1"
          />
          <select
            aria-label="Filter by action type"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="input w-48"
          >
            <option value="">All Actions</option>
            <option value="USER_REGISTERED">User Registration</option>
            <option value="TEAM_CREATED">Team Created</option>
            <option value="ROSTER_APPROVED">Roster Approved</option>
            <option value="WAIVER_SIGNED">Waiver Signed</option>
            <option value="SCORE_SUBMITTED">Score Submitted</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>IP Address</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="whitespace-nowrap text-gray-400">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td>
                  <span className={`font-medium ${actionColors[log.action] || "text-gray-400"}`}>
                    {log.action}
                  </span>
                </td>
                <td className="font-mono text-xs text-gray-500">
                  {log.actor_user_id.slice(0, 8)}...
                </td>
                <td>
                  <span className="text-gray-400">{log.entity_type}</span>
                  <span className="text-gray-600 ml-2 font-mono text-xs">
                    {log.entity_id.slice(0, 8)}...
                  </span>
                </td>
                <td className="font-mono text-xs text-gray-500">
                  {log.ip_address}
                </td>
                <td>
                  {log.metadata && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-gray-500 hover:text-gray-300">
                        View
                      </summary>
                      <pre className="mt-2 p-2 bg-surface rounded text-gray-400 overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="p-8 text-center">
            <div className="skeleton h-4 w-32 mx-auto" />
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-caption">No audit logs found</p>
          </div>
        )}

        {hasMore && !loading && (
          <div className="p-4 border-t border-gray-800 text-center">
            <button
              onClick={() => setPage(page + 1)}
              className="btn-secondary text-sm"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
