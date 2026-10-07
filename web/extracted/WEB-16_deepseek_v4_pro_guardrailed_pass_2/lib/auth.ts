// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';

// This should be configured with your actual auth provider
export const authOptions: NextAuthOptions = {
  providers: [
    // Add your auth providers here (e.g., GitHub, Google, Credentials)
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};

export { getServerSession };