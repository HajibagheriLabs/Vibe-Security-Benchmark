import { db } from '@/lib/db';
import { invoices, invoiceItems, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  clientAddress: string | null;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  items: InvoiceItem[];
  createdAt: Date;
  updatedAt: Date;
}

export async function getInvoiceById(id: number): Promise<Invoice | null> {
  const result = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientEmail: clients.email,
      clientAddress: clients.address,
      status: invoices.status,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      subtotal: invoices.subtotal,
      taxRate: invoices.taxRate,
      taxAmount: invoices.taxAmount,
      total: invoices.total,
      notes: invoices.notes,
      createdAt: invoices.createdAt,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(eq(invoices.id, id))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const invoice = result[0];

  const items = await db
    .select({
      id: invoiceItems.id,
      description: invoiceItems.description,
      quantity: invoiceItems.quantity,
      unitPrice: invoiceItems.unitPrice,
      total: invoiceItems.total,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id));

  return {
    ...invoice,
    items,
  };
}