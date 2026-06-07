import { getSession, getSessionWithRoles } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/login");

  const sessionWithRoles = await getSessionWithRoles();
  if (!sessionWithRoles) redirect("/login");

  // Look up school name and slug for the shell UI.
  // schoolId may be an ObjectId string or a slug depending on how it was seeded.
  const db = await getDb();
  let school: any = null;
  if (ObjectId.isValid(sessionWithRoles.schoolId)) {
    school = await db
      .collection("schools")
      .findOne({ _id: new ObjectId(sessionWithRoles.schoolId) } as any);
  }
  if (!school) {
    school = await db
      .collection("schools")
      .findOne({ slug: sessionWithRoles.schoolId } as any);
  }

  const schoolSlug = school?.slug ?? sessionWithRoles.schoolId;
  const schoolName = school?.name ?? "IntraPlay";

  return (
    <div className="flex h-screen bg-void">
      <Sidebar userRoles={sessionWithRoles.assignments} schoolSlug={schoolSlug} sportIds={sessionWithRoles.sportIds} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={session.user} schoolName={schoolName} />
        <main className="flex-1 overflow-y-auto p-6 bg-void">{children}</main>
      </div>
    </div>
  );
}
