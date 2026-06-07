import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import { WaiversTable } from "@/components/admin/WaiversTable";
import { CreateTemplateForm } from "./CreateTemplateForm";

export default async function WaiversManagementPage({
  params,
}: {
  params: { schoolSlug: string };
}) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:manage_settings")) {
    redirect("/dashboard");
  }

  const db = await getScopedDb(session.schoolId);

  const templates = await db
    .collection("waiver_templates")
    .find({})
    .sort({ version: -1 })
    .toArray();

  const templatesWithCounts = await Promise.all(
    templates.map(async (t: any) => {
      const signatureCount = await db
        .collection("waiver_signatures")
        .countDocuments({ waiver_template_id: t._id.toString() });
      return { ...t, _id: t._id.toString(), signatureCount };
    })
  );

  const activeTemplate = templatesWithCounts.find((t) => t.is_active);
  const pastTemplates = templatesWithCounts.filter((t) => !t.is_active);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Waivers</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage waiver templates and review compliance signatures. Signatures are immutable once created.
        </p>
      </div>

      {/* Active template */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Active Template</h2>
        {activeTemplate ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-white font-medium">{activeTemplate.title}</span>
              <span className="px-2 py-0.5 bg-green-900/40 text-green-400 text-xs rounded-full font-medium">
                v{activeTemplate.version} — Active
              </span>
              <span className="text-xs text-gray-500">{activeTemplate.signatureCount} signatures</span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">
              {activeTemplate.body_html.replace(/<[^>]+>/g, " ").slice(0, 200)}...
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No active waiver template. Create one below.</p>
        )}
      </div>

      {/* Signatures table */}
      {activeTemplate && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Signatures</h2>
          <WaiversTable />
        </div>
      )}

      {/* Create new version */}
      <div className="card p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Create New Version</h2>
          <p className="text-sm text-gray-400 mt-1">
            Creating a new version archives the current template. Existing signatures remain valid and linked to their original template.
          </p>
        </div>
        <CreateTemplateForm schoolSlug={params.schoolSlug} />
      </div>

      {/* Version history */}
      {pastTemplates.length > 0 && (
        <div className="card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Version History</h2>
          <div className="space-y-3">
            {pastTemplates.map((t) => (
              <details key={t._id} className="border border-gray-800 rounded-lg">
                <summary className="px-4 py-3 cursor-pointer flex items-center justify-between text-sm text-gray-300 hover:bg-gray-800/50 rounded-lg">
                  <span>
                    v{t.version} — {t.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {t.signatureCount} signatures ·{" "}
                    {new Date(t.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </summary>
                <pre className="px-4 pb-4 pt-2 text-xs text-gray-400 whitespace-pre-wrap font-mono overflow-auto max-h-64">
                  {t.body_html}
                </pre>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
