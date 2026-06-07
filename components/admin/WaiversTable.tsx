"use client";

import { useState, useEffect } from "react";

interface WaiverSignature {
  _id: string;
  user_name: string;
  user_email: string;
  signed_at: string;
  ip_address: string;
  user_agent: string;
  is_parent_signature: boolean;
  signature_hash: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export function WaiversTable() {
  const [signatures, setSignatures] = useState<WaiverSignature[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSignatures(currentPage);
  }, [currentPage]);

  const fetchSignatures = async (page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/waivers?page=${page}&limit=20`);
      const data = await response.json();
      setSignatures(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch signatures:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="heading-sm text-white">Waiver Signatures</h2>
        <p className="text-caption mt-1">
          Immutable compliance records with cryptographic audit trails
        </p>
      </div>

      {loading ? (
        <SkeletonTable />
      ) : signatures.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
          </div>
          <p className="text-caption">No signatures found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Signed At</th>
                  <th>IP Address</th>
                  <th>Parent Signature</th>
                  <th>Hash (First 8 chars)</th>
                </tr>
              </thead>
              <tbody>
                {signatures.map((sig) => (
                  <tr key={sig._id}>
                    <td className="whitespace-nowrap">
                      <div className="font-medium text-gray-200">{sig.user_name}</div>
                      <div className="text-gray-500">{sig.user_email}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      {new Date(sig.signed_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap font-mono text-gray-500">
                      {sig.ip_address}
                    </td>
                    <td className="whitespace-nowrap">
                      {sig.is_parent_signature ? (
                        <span className="badge-success">Yes</span>
                      ) : (
                        <span className="badge-neutral">No</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap font-mono text-gray-500">
                      {sig.signature_hash.substring(0, 8)}...
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Page {pagination.page} of {pagination.totalPages} • {pagination.totalCount} total signatures
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary py-2 px-4 text-xs disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="btn-secondary py-2 px-4 text-xs disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="p-6 space-y-4">
      {/* Header skeleton */}
      <div className="flex gap-4 pb-4 border-b border-gray-800">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-1">
            <div className="skeleton h-4 w-20" />
          </div>
        ))}
      </div>
      {/* Row skeletons */}
      {[...Array(5)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-32" />
            <div className="skeleton h-3 w-40" />
          </div>
          <div className="flex-1">
            <div className="skeleton h-4 w-32" />
          </div>
          <div className="flex-1">
            <div className="skeleton h-4 w-24" />
          </div>
          <div className="flex-1">
            <div className="skeleton h-6 w-16 rounded-full" />
          </div>
          <div className="flex-1">
            <div className="skeleton h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}
