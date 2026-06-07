import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { WaiverSigner } from "@/components/waivers/WaiverSigner";
import { redirect, notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import Link from "next/link";

export default async function WaiverPage({ params }: { params: { leagueId: string } }) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);
  const userId = session.user.id;

  const [league, existingSignature, template] = await Promise.all([
    db.collection("leagues").findOne({ _id: new ObjectId(params.leagueId) }),
    db.collection("waiver_signatures").findOne({ user_id: userId, league_id: params.leagueId }),
    db.collection("waiver_templates").findOne({ is_active: true }),
  ]);

  if (!league) notFound();

  if (existingSignature) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="card p-8 border-l-4 border-l-volt text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-volt/10 flex items-center justify-center text-volt">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h1 className="heading-sm text-white mb-2">Waiver Already Signed</h1>
          <p className="text-body">
            You signed the waiver for{" "}
            <span className="text-white font-semibold">{(league as any).name}</span> on{" "}
            {new Date((existingSignature as any).signed_at).toLocaleDateString()}.
          </p>
          <div className="mt-4 p-3 bg-surface rounded-xl">
            <p className="text-xs text-gray-500 font-mono">
              Hash: {(existingSignature as any).signature_hash?.substring(0, 24)}…
            </p>
          </div>
          <Link href="/dashboard" className="btn-primary mt-6 inline-flex">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="card p-8 border-l-4 border-l-hyper text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-hyper/10 flex items-center justify-center text-hyper">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/>
            </svg>
          </div>
          <h1 className="heading-sm text-white mb-2">No Waiver Template Found</h1>
          <p className="text-body">
            Contact your school admin — no active waiver template has been configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="heading-md text-white">Sign Waiver</h1>
        <p className="text-body mt-1">
          Required to participate in{" "}
          <span className="text-white font-semibold">{(league as any).name}</span>
        </p>
      </div>
      <WaiverSigner
        template={{
          id: (template as any)._id.toString(),
          version: (template as any).version,
          title: (template as any).title,
          body_html: (template as any).body_html,
        }}
        leagueId={params.leagueId}
      />
    </div>
  );
}
