// app/api/stripe-key/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

  if (!publishableKey) {
    return NextResponse.json(
      { message: 'Stripe publishable key not configured' },
      { status: 500 }
    );
  }

  // Return only the publishable key; secret key stays server-side
  return NextResponse.json({ publishableKey });
}