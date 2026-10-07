// lib/auth.ts
import { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';

// Security: Auth configuration with secure session settings
export const authOptions: NextAuthOptions = {
  providers: [
    // Configure your auth provider here (e.g., Auth0, GitHub, etc.)
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
};

export { getServerSession };