import { getSession } from "@/lib/auth";
import { getSchoolId } from "@/lib/db/school-context";
import { getScopedDb } from "@/lib/db/scoped";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function WaiversPage() {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const schoolId = getSchoolId(session);
  if (!schoolId) redirect("/login");

  const db = await getScopedDb(schoolId);

  // Get all active waiver templates
  const waiverTemplates = await db
    .collection("waiver_templates")
    .find({ school_id: schoolId, is_active: true })
    .toArray();

  // Get user's signed waivers
  const signedWaivers = await db
    .collection("waiver_signatures")
    .find({ user_id: session.user.id })
    .toArray();

  // Get leagues that require waivers
  const leaguesWithWaivers = await db
    .collection("leagues")
    .find({ school_id: schoolId.toString(), status: { $in: ["registration", "active"] } })
    .toArray();

  // Build waiver status for each league
  const waiverStatus = await Promise.all(
    leaguesWithWaivers.map(async (league: any) => {
      const template = waiverTemplates[0]; // Assuming one active template per school for MVP
      const signature = signedWaivers.find(
        (s: any) =>
          s.waiver_template_id === template?._id.toString() &&
          s.league_id === league._id.toString()
      );

      return {
        leagueId: league._id.toString(),
        leagueName: league.name,
        leagueSport: league.sport,
        waiverTitle: template?.title || "Liability Waiver",
        signed: !!signature,
        signedAt: signature?.signed_at,
        signatureHash: signature?.signature_hash,
      };
    })
  );

  const pendingCount = waiverStatus.filter((w) => !w.signed).length;
  const completedCount = waiverStatus.filter((w) => w.signed).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-md text-white">My Waivers</h1>
          <p className="text-body mt-1">
            {pendingCount > 0
              ? `${pendingCount} waiver${pendingCount === 1 ? "" : "s"} pending`
              : "All waivers completed"}
          </p>
        </div>
        <div className="flex gap-2">
          {pendingCount > 0 && (
            <span className="badge-warning">{pendingCount} Pending</span>
          )}
          {completedCount > 0 && (
            <span className="badge-success">{completedCount} Signed</span>
          )}
        </div>
      </div>

      {/* Pending Waivers */}
      {pendingCount > 0 && (
        <div className="space-y-4">
          <h2 className="heading-sm text-white">Action Required</h2>
          {waiverStatus
            .filter((w) => !w.signed)
            .map((waiver) => (
              <div
                key={waiver.leagueId}
                className="card p-6 border-l-4 border-l-hyper"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-hyper/10 flex items-center justify-center text-hyper">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" x2="8" y1="13" y2="13" />
                        <line x1="16" x2="8" y1="17" y2="17" />
                        <line x1="10" x2="8" y1="9" y2="9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white">
                        {waiver.waiverTitle}
                      </h3>
                      <p className="text-body mt-1">
                        Required for{" "}
                        <Link
                          href={`/leagues/${waiver.leagueId}`}
                          className="text-volt hover:underline"
                        >
                          {waiver.leagueName}
                        </Link>
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Digital signature with cryptographic verification required
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/leagues/${waiver.leagueId}`}
                    className="btn-primary"
                  >
                    Sign Now
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h14" />
                      <path d="m12 5 7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Completed Waivers */}
      {completedCount > 0 && (
        <div className="space-y-4">
          <h2 className="heading-sm text-white">Completed Waivers</h2>
          {waiverStatus
            .filter((w) => w.signed)
            .map((waiver) => (
              <div
                key={waiver.leagueId}
                className="card p-6 border-l-4 border-l-volt"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-volt/10 flex items-center justify-center text-volt">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-white">
                      {waiver.waiverTitle}
                    </h3>
                    <p className="text-body mt-1">{waiver.leagueName}</p>
                    <div className="mt-3 p-3 bg-surface rounded-xl">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Signed</span>
                        <span className="text-gray-300">
                          {new Date(waiver.signedAt!).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mt-2">
                        <span className="text-gray-500">Hash</span>
                        <span className="text-gray-300 font-mono">
                          {waiver.signatureHash?.slice(0, 16)}...
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {waiverStatus.length === 0 && (
        <div className="card p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface flex items-center justify-center text-gray-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Waivers Required</h3>
          <p className="text-caption mb-6">
            You don&apos;t have any pending waivers at this time.
          </p>
          <Link href="/leagues" className="btn-primary">
            Browse Leagues
          </Link>
        </div>
      )}
    </div>
  );
}
