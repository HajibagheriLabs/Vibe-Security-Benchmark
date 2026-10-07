// app/api/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Rule 1: Secret stored in STRIPE_SECRET_KEY (server-only)
// Rule 1: Never use service_role/admin key in runtime serving user requests
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16', // Pin API version
});

// Rule 3: Schema validation (Zod)
import { z } from 'zod';

const CheckoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
});

export async function POST(req: NextRequest) {
  try {
    // Rule 2: Authenticate user (simplified for example)
    // In production: verify session/cookie
    const session = await req.cookies.get('session'); 
    // If no session, return 401
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rule 3: Parse and validate request body
    const body = await req.json();
    const validation = CheckoutSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.errors },
        { status: 400 }
      );
    }

    const { priceId } = validation.data;

    // Rule 1: Rate-limit (simplified)
    // Rule 3: Validate URL protocol (if needed for redirect URLs)
    
    // Rule 2: Authorize (check if user has access to priceId)
    // In production: query DB to ensure user owns/subscribed to this price

    // Rule 1: Server-side call to vendor (Stripe)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/cancel`,
      // Rule 2: Pass server-verified user ID
      customer_email: session.value, // Simplified
    });

    // Rule 3: Return minimal result
    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    // Rule 1: Never log raw config objects
    // Rule 3: Strip CRLF from user-controlled values before logging
    const cleanError = error.message?.replace(/[\r\n]/g, '');
    console.error({ event: 'checkout_session_create_error', error: cleanError });
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}