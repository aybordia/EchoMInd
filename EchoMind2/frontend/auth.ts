import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyUser } from "@/lib/server/user-store";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await verifyUser(email, password);
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.email.split("@")[0],
        };
      },
    }),
  ],
  pages: {
    signIn: "/auth",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.echoMindUserId = user.id;
      } else if (!token.echoMindUserId && token.sub) {
        const existingUser = token.email ? await findUserByEmail(String(token.email)) : null;
        token.echoMindUserId = existingUser?.id ?? token.sub;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.echoMindUserId === "string" ? token.echoMindUserId : token.sub ?? "";
      }
      return session;
    },
  },
});
