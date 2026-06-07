"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateTemplateForm({ schoolSlug }: { schoolSlug: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/waiver-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body_html: bodyHtml }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create template.");
        return;
      }
      setSuccess(`Version ${data.version} created and set as active.`);
      setTitle("");
      setBodyHtml("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Intramural Participation Waiver — Fall 2026"
          className="input w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Body (HTML) *</label>
        <textarea
          required
          minLength={10}
          rows={12}
          value={bodyHtml}
          onChange={(e) => setBodyHtml(e.target.value)}
          placeholder="<p>By signing this waiver, I acknowledge...</p>"
          className="input w-full font-mono text-xs resize-y"
        />
        <p className="text-xs text-gray-500 mt-1">
          HTML is rendered to participants before signing. Previous version will be archived automatically.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-xl text-sm bg-green-500/10 text-green-400 border border-green-500/20">{success}</div>
      )}

      <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-50">
        {submitting ? "Creating..." : "Create New Version"}
      </button>
    </form>
  );
}
