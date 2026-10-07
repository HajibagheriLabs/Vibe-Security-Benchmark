import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: 'Session ID required' }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    });

    const isComplete = session.payment_status === 'paid' && session.status === 'complete';

    return NextResponse.json({
      success: isComplete,
      session: {
        id: session.id,
        paymentStatus: session.payment_status,
        status: session.status,
        customerEmail: session.customer_details?.email,
        subscriptionId: typeof session.subscription === 'object' ? session.subscription.id : session.subscription,
      },
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify session' }, { status: 500 });
  }
}