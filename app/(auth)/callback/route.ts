import { redirect } from "next/navigation";

// Post-SSO landing point. NextAuth has already set the session cookie by
// the time the browser arrives here; send the user to their dashboard.
export async function GET() {
  redirect("/dashboard");
}
