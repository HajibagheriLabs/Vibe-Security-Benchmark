// types/invoice.ts
export interface Invoice {
  id: number;
  invoiceNumber: string;
  customerId: number;
  issueDate: Date;
  dueDate: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}