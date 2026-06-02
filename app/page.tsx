import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";

export default async function Home() {
  const session = await getServerSession(authOptions);

  return (
    <main style={{ padding: "4rem", maxWidth: 760, margin: "0 auto" }}>
      <h1>Intramural MVP</h1>
      <p>This app is initialized with Next.js App Router, MongoDB Atlas, and NextAuth.</p>
      <div style={{ marginTop: "2rem" }}>
        {session ? (
          <>
            <p>Signed in as <strong>{session.user?.email ?? session.user?.name}</strong>.</p>
            <form action="/api/auth/signout" method="post" style={{ marginTop: "1rem" }}>
              <button type="submit" style={{ padding: "0.75rem 1rem" }}>
                Sign out
              </button>
            </form>
          </>
        ) : (
          <>
            <p>You are not signed in yet.</p>
            <Link href="/auth/signin">Sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}
