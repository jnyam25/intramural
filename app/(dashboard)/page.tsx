import { redirect } from "next/navigation";

// "/" resolves here inside the (dashboard) group, but app/page.tsx handles "/" first.
// This redirect is a safety net for any direct navigation to this segment.
export default function DashboardRootPage() {
  redirect("/dashboard");
}
