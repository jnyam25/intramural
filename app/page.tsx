import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/options";
import { redirect } from "next/navigation";

// Root "/" — just a routing shim. The real content lives at /dashboard.
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
