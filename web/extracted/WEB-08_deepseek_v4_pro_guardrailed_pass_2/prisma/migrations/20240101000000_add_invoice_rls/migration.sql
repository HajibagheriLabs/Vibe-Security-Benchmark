-- prisma/migrations/20240101000000_add_invoice_rls/migration.sql
-- Enable Row Level Security on Invoice table
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" FORCE ROW LEVEL SECURITY;

-- Policy for SELECT: Users can only read their own invoices
CREATE POLICY "Users can read own invoices"
ON "Invoice"
FOR SELECT
USING (auth.uid() = "ownerId");

-- Policy for INSERT: Users can only create invoices they own
CREATE POLICY "Users can create own invoices"
ON "Invoice"
FOR INSERT
WITH CHECK (auth.uid() = "ownerId");

-- Policy for UPDATE: Users can only update their own invoices
CREATE POLICY "Users can update own invoices"
ON "Invoice"
FOR UPDATE
USING (auth.uid() = "ownerId")
WITH CHECK (auth.uid() = "ownerId");

-- Policy for DELETE: Users can only delete their own invoices
CREATE POLICY "Users can delete own invoices"
ON "Invoice"
FOR DELETE
USING (auth.uid() = "ownerId");