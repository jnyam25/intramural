import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "hello@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        if (credentials.password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        // Sprint 1: single pilot school. Sprint 5 replaces this with
        // email-domain → school lookup and per-school SSO enforcement.
        const schoolId = process.env.PILOT_SCHOOL_ID;
        if (!schoolId) {
          throw new Error("PILOT_SCHOOL_ID is not configured.");
        }
        return {
          id: credentials.email,
          name: credentials.email.split("@")[0],
          email: credentials.email,
          school_id: schoolId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.school_id) {
        token.school_id = user.school_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.school_id) {
        session.school_id = token.school_id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/signin",
  },
  debug: process.env.NEXTAUTH_DEBUG === "true",
};
