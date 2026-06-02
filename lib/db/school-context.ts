import { Session } from "next-auth";

export function getSchoolId(session: Session | null): string | null {
  return (session as (Session & { school_id?: string }) | null)?.school_id ?? null;
}
