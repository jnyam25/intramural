import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    school_id?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
    };
  }
  interface User {
    id: string;
    school_id?: string;
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    school_id?: string;
    role?: string;
  }
}
