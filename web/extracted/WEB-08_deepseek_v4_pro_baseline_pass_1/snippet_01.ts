// app/api/invoices/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getInvoiceById } from '@/lib/db/invoices';
import { Invoice } from '@/types/invoice';

type RouteContext = {
  params: {
    id: string;
  };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { id } = context.params;

  // Validate that the ID is a positive integer
  const invoiceId = Number(id);
  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return NextResponse.json(
      { error: 'Invalid invoice ID. Must be a positive integer.' },
      { status: 400 }
    );
  }

  try {
    const invoice: Invoice | null = await getInvoiceById(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    );
  }
}