// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  priceId: z.string().uuid(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

  // Ownership/price validation inside WHERE clause
  const price = await db.price.findFirst({
    where: { id: parsed.data.priceId, active: true },
    include: { product: true },
  });
  if (!price) return NextResponse.json({ error: 'Price not found' }, { status: 404 });

  const checkout = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: price.stripePriceId, quantity: 1 }],
    success_url: parsed.data.successUrl,
    cancel_url: parsed.data.cancelUrl,
    client_reference_id: session.user.id,
    metadata: { userId: session.user.id, priceId: price.id },
  });

  return NextResponse.json({ sessionId: checkout.id });
}