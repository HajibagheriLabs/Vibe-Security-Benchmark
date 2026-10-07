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
   2 | -- Requires: pgcrypto extension for gen_random_uuid()
   3 | 
   4 | -- Enable required extension
   5 | CREATE EXTENSION IF NOT EXISTS pgcrypto;
   6 | 
   7 | -- Documents table
   8 | CREATE TABLE documents (
   9 |     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  10 |     tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  11 |     owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  12 |     title TEXT NOT NULL,
  13 |     content TEXT,
  14 |     metadata JSONB DEFAULT '{}',
  15 |     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  16 |     updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  17 | );
  18 | 
  19 | -- Indexes for common query patterns
  20 | CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
  21 | CREATE INDEX idx_documents_owner_id ON documents(owner_id);
  22 | CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
  23 | 
  24 | -- Enable and force Row Level Security
  25 | ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  26 | ALTER TABLE documents FORCE ROW LEVEL SECURITY;
  27 | 
  28 | -- RLS Policies
  29 | -- SELECT: Users can read documents in their tenant
  30 | CREATE POLICY documents_select_tenant
  31 |     ON documents
  32 |     FOR SELECT
  33 |     USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  34 | 
  35 | -- INSERT: Users can create documents in their tenant, owner_id bound to session user
  36 | CREATE POLICY documents_insert_tenant
  37 |     ON documents
  38 |     FOR INSERT
  39 |     WITH CHECK (
  40 |         tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  41 |         AND owner_id = auth.uid()
  42 |     );
  43 | 
  44 | -- UPDATE: Users can update their own documents within their tenant
  45 | CREATE POLICY documents_update_own
  46 |     ON documents
  47 |     FOR UPDATE
  48 |     USING (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  49 |     WITH CHECK (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  50 | 
  51 | -- DELETE: Users can delete their own documents within their tenant
  52 | CREATE POLICY documents_delete_own
  53 |     ON documents
  54 |     FOR DELETE
  55 |     USING (owner_id = auth.uid() AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
  56 | 
  57 | -- Updated_at trigger
  58 | CREATE OR REPLACE FUNCTION update_updated_at_column()
  59 | RETURNS TRIGGER AS $$
  60 | BEGIN
  61 |     NEW.updated_at = now();
  62 |     RETURN NEW;
  63 | END;
  64 | $$ LANGUAGE plpgsql;
  65 | 
  66 | CREATE TRIGGER update_documents_updated_at
  67 |     BEFORE UPDATE ON documents
  68 |     FOR EACH ROW
  69 |     EXECUTE FUNCTION update_updated_at_column();
```


Return the JSON object now.