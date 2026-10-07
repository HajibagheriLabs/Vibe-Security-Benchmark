README.md
# Secure Chat Application

Next.js 14 chat app with server-side OpenAI streaming, authentication, and rate limiting.

## Security Features
- No secrets in client bundle
- Server-side OpenAI proxy with auth, validation, rate limiting
- RLS-ready Prisma schema
- CSP headers, secure cookies, HttpOnly sessions
- Structured logging with redaction

## Setup
1. Copy `.env.example` to `.env` and fill values
2. `npm install`
3. `npx prisma migrate dev`
4. `npm run dev`

## Required Environment Variables
- `OPENAI_API_KEY` - OpenAI API key (server-only)
- `OPENAI_MODEL` - Model to use (default: gpt-4o-mini)
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random 32+ char string
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL for rate limiting
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 60000)
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window (default: 30)