"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface WaiverTemplate {
  _id: string;
  version: number;
  title: string;
  body_html: string;
}

interface WaiverSignerProps {
  template: WaiverTemplate;
  leagueId: string;
}

export function WaiverSigner({ template, leagueId }: WaiverSignerProps) {
  const [canSign, setCanSign] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!sentinelRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCanSign(true);
            observer.disconnect();
          }
        });
      },
      {
        root: scrollContainerRef.current,
        threshold: 1.0,
      }
    );

    observer.observe(sentinelRef.current);

    return () => observer.disconnect();
  }, []);

  const handleSign = async () => {
    if (!canSign || isSigning) return;

    setIsSigning(true);
    setError(null);

    try {
      const response = await fetch("/api/waivers/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waiverTemplateId: template._id,
          leagueId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sign waiver");
      }

      router.push(`/leagues/${leagueId}/confirmation`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsSigning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold mb-4">{template.title}</h1>
      <p className="text-sm text-gray-600 mb-4">
        Version {template.version} • Please read the entire document before signing
      </p>

      <div
        ref={scrollContainerRef}
        className="h-96 overflow-y-auto border border-gray-300 rounded p-4 mb-4 bg-gray-50"
      >
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: template.body_html }}
        />
        <div ref={sentinelRef} className="h-1" />
      </div>

      {!canSign && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⬇️ Please scroll to the bottom of the waiver to enable signing
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          ❌ {error}
        </div>
      )}

      <button
        onClick={handleSign}
        disabled={!canSign || isSigning}
        className={`w-full py-3 px-6 rounded font-semibold transition-colors ${
          canSign && !isSigning
            ? "bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {isSigning ? "Signing..." : canSign ? "I Agree & Sign" : "Scroll to Sign"}
      </button>

      <p className="mt-4 text-xs text-gray-500 text-center">
        By signing, you acknowledge that you have read and agree to the terms above.
        Your signature will be recorded with timestamp and IP address for legal compliance.
      </p>
    </div>
  );
}
