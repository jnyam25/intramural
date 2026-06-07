import { getSessionWithRoles } from "@/lib/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import { ObjectId } from "mongodb";

export default async function SSOSettingsPage({ params }: { params: { schoolSlug: string } }) {
  const session = await getSessionWithRoles();
  if (!session) redirect("/login");

  if (!hasPermission(session.assignments, "school:manage_settings")) {
    redirect(`/dashboard`);
  }

  const db = await getDb();
  const school = await db.collection("schools").findOne({ _id: new ObjectId(session.schoolId) });
  const ssoConfig = school?.sso_config;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">SSO Configuration</h1>
          <p className="text-body mt-1">Configure Google Workspace, Azure AD, or Okta for school-wide login.</p>
        </div>
        {ssoConfig?.is_enabled ? <span className="badge-success">Enabled</span> : <span className="badge-neutral">Disabled</span>}
      </div>

      <form action="/api/admin/sso" method="post" className="card p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-gray-300">Provider</span>
            <select name="provider" defaultValue={ssoConfig?.provider ?? "google"} className="input">
              <option value="google">Google Workspace</option>
              <option value="azure_ad">Azure AD</option>
              <option value="okta">Okta</option>
            </select>
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-gray-300">Email domain</span>
            <input name="domain" defaultValue={ssoConfig?.domain ?? school?.domain ?? ""} placeholder="school.edu" className="input" />
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-gray-300">Client ID</span>
            <input name="client_id" defaultValue={ssoConfig?.client_id ?? ""} className="input" />
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-gray-300">Client secret</span>
            <input name="client_secret" defaultValue={ssoConfig?.client_secret ?? ""} type="password" className="input" />
          </label>

          <label className="space-y-1.5 block">
            <span className="block text-sm font-medium text-gray-300">Tenant ID (Azure AD)</span>
            <input name="tenant_id" defaultValue={ssoConfig?.tenant_id ?? ""} placeholder="Optional for Azure AD" className="input" />
          </label>

          <label className="flex items-center gap-3 pt-6">
            <input name="is_enabled" type="checkbox" defaultChecked={ssoConfig?.is_enabled ?? false} className="w-5 h-5 rounded border-gray-600 bg-surface text-volt focus:ring-volt" />
            <span className="text-sm font-medium text-gray-300">Enable SSO for this school</span>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-800">
          <button type="submit" className="btn-primary">Save configuration</button>
        </div>
      </form>

      <div className="card p-6 border-l-4 border-l-cyber">
        <h3 className="heading-sm text-white mb-2">Setup notes</h3>
        <ul className="list-disc list-inside text-caption space-y-1">
          <li>Ensure the callback URL matches your environment.</li>
          <li>For Google Workspace, create an OAuth 2.0 client ID in the Google Cloud Console.</li>
          <li>For Azure AD, register an app in Entra ID and grant delegated permissions.</li>
          <li>Users with matching email domains will be routed to your SSO provider on login.</li>
        </ul>
      </div>
    </div>
  );
}
