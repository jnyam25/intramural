import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type GoogleProfile = {
  given_name?: string;
  family_name?: string;
};

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      }
    }),
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google" && user.email) {
        const db = await getDb();
        const schoolId = process.env.PILOT_SCHOOL_ID!;
        
        // Check if user exists
        let existingUser = await db.collection("users").findOne({ email: user.email.toLowerCase() });
        
        if (!existingUser) {
          // Create new user from Google profile
          const names = user.name?.split(" ") || ["", ""];
          const googleProfile = profile as GoogleProfile | undefined;
          const newUser = {
            _id: new ObjectId(),
            email: user.email.toLowerCase(),
            first_name: googleProfile?.given_name || names[0] || "",
            last_name: googleProfile?.family_name || names.slice(1).join(" ") || "",
            name: user.name || user.email,
            sso_provider: "google" as const,
            sso_id: user.id,
            emailVerified: new Date(),
            school_ids: [schoolId],
            is_minor: false,
            role: "student",
            image: user.image,
            created_at: new Date(),
            updated_at: new Date(),
          };
          
          await db.collection("users").insertOne(newUser);
          
          // Auto-grant participant role
          await db.collection("role_assignments").insertOne({
            _id: new ObjectId(),
            user_id: newUser._id.toString(),
            school_id: schoolId,
            role: "participant",
            scope: {},
            granted_by_user_id: newUser._id.toString(),
            granted_at: new Date(),
          });
          
          // Log audit
          await db.collection("audit_logs").insertOne({
            school_id: schoolId,
            timestamp: new Date(),
            actor_user_id: newUser._id.toString(),
            action: "USER_REGISTERED",
            entity_type: "user",
            entity_id: newUser._id.toString(),
            metadata: { email: user.email.toLowerCase(), method: "sso", provider: "google" },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        // For SSO users, fetch from DB to get school_id
        if (account?.provider === "google") {
          const db = await getDb();
          const dbUser = await db.collection("users").findOne({ email: user.email?.toLowerCase() });
          if (dbUser) {
            token.school_id = dbUser.school_ids?.[0] ?? process.env.PILOT_SCHOOL_ID ?? "";
            token.first_name = dbUser.first_name;
            token.last_name = dbUser.last_name;
            token.sub = dbUser._id.toString();
          }
        } else {
          token.school_id = (user as any).school_id;
          token.first_name = (user as any).first_name;
          token.last_name = (user as any).last_name;
        }
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
