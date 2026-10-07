// src/lib/auth-options.ts
import { NextAuthOptions } from "next-auth";
// Placeholder — replace with your actual auth provider configuration
// Session identity must come from a verified server-side session.
export const authOptions: NextAuthOptions = {
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};