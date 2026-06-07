"use client";

import { useState, useRef, useEffect } from "react";

interface WaiverTemplate {
  id: string;
  title: string;
  body_html: string;
  version: number;
}

interface WaiverSignerProps {
  template: WaiverTemplate;
  leagueId: string;
  onSuccess?: () => void;
}

export function WaiverSigner({ template, leagueId, onSuccess }: WaiverSignerProps) {
  const [canSign, setCanSign] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to detect when user has scrolled to the bottom
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
        threshold: 1.0, // Entire sentinel must be visible
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
      const res = await fetch("/api/waivers/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waiverTemplateId: template.id,
          leagueId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign waiver");
      }

      setSigned(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSigning(false);
    }
  };

  if (signed) {
    return (
      <div className="card p-8 text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-volt/10 flex items-center justify-center text-volt">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>
        <h3 className="heading-sm text-white mb-2">Waiver Signed!</h3>
        <p className="text-body">Your digital signature has been recorded with cryptographic verification.</p>
        <div className="mt-4 p-3 bg-surface rounded-xl">
          <p className="text-xs text-gray-500">Timestamp: {new Date().toLocaleString()}</p>
          <p className="text-xs text-gray-500">Hash: SHA-256</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800">
        <h2 className="heading-sm text-white">{template.title}</h2>
        <p className="text-caption mt-1">Version {template.version} • Please read carefully</p>
      </div>

      {/* Scrollable Waiver Text */}
      <div
        ref={scrollContainerRef}
        className="px-6 py-4 h-96 overflow-y-auto bg-surface/50 prose prose-invert prose-sm max-w-none"
      >
        <div dangerouslySetInnerHTML={{ __html: template.body_html }} />
        {/* Sentinel element at the bottom - when this becomes visible, user can sign */}
        <div ref={sentinelRef} className="h-1" />
      </div>

      {/* Progress Indicator */}
      <div className="px-6 py-2 bg-surface border-y border-gray-800">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                canSign ? "bg-volt w-full" : "bg-gray-500 w-1/3"
              }`}
            />
          </div>
          <span className={`text-xs ${canSign ? "text-volt" : "text-gray-500"}`}>
            {canSign ? "Ready to sign" : "Scroll to read"}
          </span>
        </div>
      </div>

      {/* Action Area */}
      <div className="px-6 py-4 space-y-4">
        {error && (
          <div className="p-3 bg-hyper/10 border border-hyper/20 rounded-xl text-sm text-hyper">
            {error}
          </div>
        )}

        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="agree"
            checked={canSign}
            onChange={() => {}} // Controlled by scroll
            disabled={!canSign}
            className="mt-1 w-4 h-4 rounded border-gray-600 bg-surface checked:bg-volt focus:ring-volt"
          />
          <label htmlFor="agree" className="text-sm text-gray-300">
            I have read and understood this waiver agreement. I agree to the terms and conditions 
            outlined above and acknowledge that this digital signature constitutes a legally binding 
            electronic signature under the ESIGN Act.
          </label>
        </div>

        <button
          onClick={handleSign}
          disabled={!canSign || isSigning}
          className="btn-primary w-full disabled:opacity-50"
        >
          {isSigning ? (
            <>
              <div className="w-4 h-4 border-2 border-void/30 border-t-void rounded-full animate-spin" />
              Recording Signature...
            </>
          ) : canSign ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2H2v10h10V2z"/><path d="M12 12h10v10H12V12z"/><path d="M12 2h10v10H12V2z"/><path d="M2 12h10v10H2V12z"/>
              </svg>
              Sign Waiver with Digital Signature
            </>
          ) : (
            "Scroll to Bottom to Enable Signing"
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Your signature will be recorded with IP address, timestamp, and cryptographic hash 
          for legal compliance. This action cannot be undone.
        </p>
      </div>
    </div>
  );
}
