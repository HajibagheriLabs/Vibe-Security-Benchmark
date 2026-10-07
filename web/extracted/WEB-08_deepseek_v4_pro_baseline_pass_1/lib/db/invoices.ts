// lib/db/invoices.ts
import { db } from '@/lib/db';
import { invoices } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Invoice } from '@/types/invoice';

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const result = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0] as Invoice;
}