// src/app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; // Assuming a Prisma or Drizzle client instance
import { eq } from 'drizzle-orm'; // Assuming Drizzle ORM for type safety, adjust if using Prisma/other

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Validate ID format if necessary (e.g., ensure it's a number or UUID)
  if (!id) {
    return NextResponse.json(
      { error: 'Invoice ID is required' },
      { status: 400 }
    );
  }

  try {
    // Fetch invoice from database
    // Note: Adjust the query syntax based on your specific ORM (Prisma, Mongoose, etc.)
    const invoice = await db.invoice.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}