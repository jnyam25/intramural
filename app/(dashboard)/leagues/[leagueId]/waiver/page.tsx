import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { WaiverSigner } from "@/components/waivers/WaiverSigner";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WaiverPage({
  params,
}: {
  params: { leagueId: string };
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const schoolId = getSchoolId(session);
  if (!schoolId) {
    redirect("/login");
  }

  const db = await getScopedDb(schoolId);

  // Fetch the active waiver template for this school
  const waiverTemplate = await db
    .collection("waiver_templates")
    .findOne({ school_id: schoolId, is_active: true });

  if (!waiverTemplate) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-hyper/10 flex items-center justify-center text-hyper">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
          </div>
          <h1 className="heading-sm text-white mb-2">No Waiver Required</h1>
          <p className="text-body">This league does not require a liability waiver at this time.</p>
          <Link href={`/leagues/${params.leagueId}`} className="btn-primary mt-6">
            Back to League
          </Link>
        </div>
      </div>
    );
  }

  // Check if user already signed this waiver for this league
  const existingSignature = await db.collection("waiver_signatures").findOne({
    user_id: session.user.id,
    waiver_template_id: waiverTemplate._id.toString(),
    league_id: params.leagueId,
  });

  if (existingSignature) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="card p-8 text-center border-l-4 border-l-volt">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-volt/10 flex items-center justify-center text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="heading-sm text-white mb-2">Waiver Already Signed</h1>
          <p className="text-body">
            You have already signed this waiver on{" "}
            {new Date(existingSignature.signed_at).toLocaleDateString()}.
          </p>
          <div className="mt-4 p-3 bg-surface rounded-xl">
            <p className="text-xs text-gray-500">
              Signature Hash: {existingSignature.signature_hash.substring(0, 16)}...
            </p>
          </div>
          <Link href={`/leagues/${params.leagueId}`} className="btn-primary mt-6">
            Back to League
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 animate-fade-in">
      <WaiverSigner
        template={{
          id: waiverTemplate._id.toString(),
          version: waiverTemplate.version,
          title: waiverTemplate.title,
          body_html: waiverTemplate.body_html,
        }}
        leagueId={params.leagueId}
      />
    </div>
  );
}
