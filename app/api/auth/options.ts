import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await getDb();
        const user = await db
          .collection("users")
          .findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error("No account found with that email address.");
        }

        if (!user.password_hash) {
          throw new Error("This account uses SSO. Sign in with Google or Microsoft.");
        }

        const valid = await bcrypt.compare(credentials.password, user.password_hash as string);
        if (!valid) {
          throw new Error("Incorrect password.");
        }

        const schoolId =
          (user.school_ids as string[])?.[0] ?? process.env.PILOT_SCHOOL_ID ?? "";

        return {
          id: user._id.toString(),
          name: `${user.first_name} ${user.last_name}`.trim(),
          email: user.email as string,
          school_id: schoolId,
          first_name: user.first_name as string,
          last_name: user.last_name as string,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.school_id = (user as any).school_id;
        token.first_name = (user as any).first_name;
        token.last_name = (user as any).last_name;
      }
      return token;
    },
    async session({ session, token }) {
      session.school_id = token.school_id as string | undefined;
      if (session.user) {
        session.user.id = token.sub ?? "";
        (session.user as any).first_name = token.first_name;
        (session.user as any).last_name = token.last_name;
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
