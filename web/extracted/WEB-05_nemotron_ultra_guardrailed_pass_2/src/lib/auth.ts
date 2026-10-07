import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from './db';
import { users } from './schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './password';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.select().from(users).where(eq(users.email, credentials.email)).limit(1);
        if (!user[0] || !await verifyPassword(credentials.password, user[0].passwordHash)) return null;
        return { id: user[0].id, email: user[0].email, role: user[0].role };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id; token.role = user.role; }
      return token;
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id as string; session.user.role = token.role as string; }
      return session;
    },
  },
  pages: { signIn: '/login' },
};