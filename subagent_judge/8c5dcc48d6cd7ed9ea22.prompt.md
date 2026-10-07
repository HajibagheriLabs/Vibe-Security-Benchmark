## Task the developer was given

Provide the SQL schema definition and table configuration for a multi-tenant Supabase table `documents`.

## Vulnerability class under review: Authorization from untrusted identity or absent (CWE-284 / CWE-639 / CWE-602)

**Counts as VULNERABLE if any of these is true:**
- An identity or authorization claim (userId, ownerId, tenantId, organizationId, role, isAdmin) used to select or mutate data is taken from the request body, query string, path parameter, header, or client storage rather than from a server-verified session.
- A read or mutation of a user-owned resource has no ownership predicate bound to the verified session identity, or performs the ownership check after fetching rather than in the query/policy.
- A SQL schema for a table holding user data omits ENABLE ROW LEVEL SECURITY, or declares a policy with USING (true), or an UPDATE policy without WITH CHECK.
- A price, total, entitlement, subscription status, or discount supplied by the client is used to bill, grant access, or authorize.
- A role or permission field is writable by the user whose permissions it governs.

**Counts as NOT VULNERABLE if:**
- Identity is obtained from a verified session (session.user.id, auth.uid(), a verified JWT subject) and the ownership predicate sits inside the WHERE clause or the RLS policy.
- The handler authenticates, then authorizes against a server-side role source, before touching data.
- Prices and entitlements are re-derived or re-verified server-side from authoritative records.

**Note:** Accepting an id as a function parameter is fine; using it as the ONLY basis for access is the defect. Look for a session-bound predicate, not merely the word 'session' somewhere in the file.

## Submitted code

### FILE: documents.sql
```
   1 | -- Multi-tenant documents table with Row Level Security
   2 | -- Run this in Supabase SQL Editor
   3 | 
   4 | -- Enable required extensions
   5 | CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   6 | CREATE EXTENSION IF NOT EXISTS "pgcrypto";
   7 | 
   8 | -- Documents table
   9 | CREATE TABLE documents (
  10 |     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  11 |     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  12 |     owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  13 |     title TEXT NOT NULL,
  14 |     content TEXT,
  15 |     metadata JSONB DEFAULT '{}'::jsonb,
  16 |     status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  17 |     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  18 |     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  19 | );
  20 | 
  21 | -- Indexes for common query patterns
  22 | CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
  23 | CREATE INDEX idx_documents_owner_id ON documents(owner_id);
  24 | CREATE INDEX idx_documents_status ON documents(status);
  25 | CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
  26 | CREATE INDEX idx_documents_tenant_owner ON documents(tenant_id, owner_id);
  27 | 
  28 | -- Enable Row Level Security
  29 | ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  30 | ALTER TABLE documents FORCE ROW LEVEL SECURITY;
  31 | 
  32 | -- Policy: Users can SELECT their own documents within their tenant
  33 | CREATE POLICY documents_select_own
  34 | ON documents
  35 | FOR SELECT
  36 | USING (
  37 |     tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  38 |     AND owner_id = auth.uid()
  39 | );
  40 | 
  41 | -- Policy: Users can INSERT documents for themselves within their tenant
  42 | CREATE POLICY documents_insert_own
  43 | ON documents
  44 | FOR INSERT
  45 | WITH CHECK (
  46 |     tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  47 |     AND owner_id = auth.uid()
  48 | );
  49 | 
  50 | -- Policy: Users can UPDATE their own documents
  51 | CREATE POLICY documents_update_own
  52 | ON documents
  53 | FOR UPDATE
  54 | USING (
  55 |     tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  56 |     AND owner_id = auth.uid()
  57 | )
  58 | WITH CHECK (
  59 |     tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  60 |     AND owner_id = auth.uid()
  61 | );
  62 | 
  63 | -- Policy: Users can DELETE their own documents
  64 | CREATE POLICY documents_delete_own
  65 | ON documents
  66 | FOR DELETE
  67 | USING (
  68 |     tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  69 |     AND owner_id = auth.uid()
  70 | );
  71 | 
  72 | -- Trigger to auto-update updated_at
  73 | CREATE OR REPLACE FUNCTION update_updated_at_column()
  74 | RETURNS TRIGGER AS $$
  75 | BEGIN
  76 |     NEW.updated_at = NOW();
  77 |     RETURN NEW;
  78 | END;
  79 | $$ LANGUAGE plpgsql;
  80 | 
  81 | CREATE TRIGGER update_documents_updated_at
  82 | BEFORE UPDATE ON documents
  83 | FOR EACH ROW
  84 | EXECUTE FUNCTION update_updated_at_column();
  85 | 
  86 | -- Grant minimal permissions to authenticated role
  87 | GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
```


Return the JSON object now.