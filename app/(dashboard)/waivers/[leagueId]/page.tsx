import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { WaiverSigner } from "@/components/WaiverSigner";
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
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-xl font-bold text-green-900 mb-2">Waiver Already Signed</h1>
          <p className="text-sm text-green-700 mb-6">
            You signed the waiver for <strong>{(league as any).name}</strong> on{" "}
            {new Date((existingSignature as any).signed_at).toLocaleDateString()}.
          </p>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8">
          <h1 className="text-xl font-bold text-yellow-900 mb-2">No Waiver Template Found</h1>
          <p className="text-sm text-yellow-700">
            Contact your school admin — no active waiver template has been configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sign Waiver</h1>
        <p className="text-gray-500 text-sm">
          Required to participate in <strong>{(league as any).name}</strong>
        </p>
      </div>
      <WaiverSigner
        template={{
          _id: (template as any)._id.toString(),
          version: (template as any).version,
          title: (template as any).title,
          body_html: (template as any).body_html,
        }}
        leagueId={params.leagueId}
      />
    </div>
  );
}
