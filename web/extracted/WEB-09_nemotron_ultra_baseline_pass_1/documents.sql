-- Multi-tenant documents table for Supabase (PostgreSQL)
-- Requires: pgcrypto for gen_random_uuid, pgjwt for auth.uid()

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Custom types
CREATE TYPE document_status AS ENUM ('draft', 'published', 'archived', 'deleted');
CREATE TYPE document_visibility AS ENUM ('private', 'team', 'public');

-- Main documents table
CREATE TABLE documents (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Document metadata
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '{}',
    content_text TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(content) = 'object' THEN content->>'text'
            ELSE NULL
        END
    ) STORED,
    
    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id UUID REFERENCES documents(id),
    is_latest_version BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Status and visibility
    status document_status NOT NULL DEFAULT 'draft',
    visibility document_visibility NOT NULL DEFAULT 'private',
    
    -- Ownership and collaboration
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    collaborators UUID[] NOT NULL DEFAULT '{}',
    
    -- Categorization
    tags TEXT[] NOT NULL DEFAULT '{}',
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
    
    -- Search and indexing
    search_vector TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(content_text, '')), 'C') ||
        setweight(to_tsvector('english', array_to_string(tags, ' ')), 'D')
    ) STORED,
    
    -- File attachments metadata
    attachments JSONB NOT NULL DEFAULT '[]',
    
    -- Settings
    settings JSONB NOT NULL DEFAULT '{
        "allow_comments": true,
        "track_changes": false,
        "auto_save": true,
        "export_formats": ["pdf", "md", "html"]
    }',
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    
    -- Soft delete support
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT documents_tenant_slug_unique UNIQUE (tenant_id, slug),
    CONSTRAINT documents_version_positive CHECK (version > 0),
    CONSTRAINT documents_collaborators_no_owner CHECK (owner_id != ALL(collaborators)),
    CONSTRAINT documents_deleted_at_consistency CHECK (
        (is_deleted AND deleted_at IS NOT NULL) OR 
        (NOT is_deleted AND deleted_at IS NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_documents_tenant_id ON documents(tenant_id);
CREATE INDEX idx_documents_owner_id ON documents(owner_id);
CREATE INDEX idx_documents_status ON documents(status) WHERE status != 'deleted';
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_category_id ON documents(category_id);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);
CREATE INDEX idx_documents_tags_gin ON documents USING GIN(tags);
CREATE INDEX idx_documents_collaborators_gin ON documents USING GIN(collaborators);
CREATE INDEX idx_documents_search_vector ON documents USING GIN(search_vector);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);
CREATE INDEX idx_documents_updated_at ON documents(updated_at DESC);
CREATE INDEX idx_documents_published_at ON documents(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX idx_documents_is_latest_version ON documents(is_latest_version) WHERE is_latest_version = TRUE;
CREATE INDEX idx_documents_tenant_status ON documents(tenant_id, status);
CREATE INDEX idx_documents_tenant_visibility ON documents(tenant_id, visibility);

-- Partial indexes for common queries
CREATE INDEX idx_documents_active ON documents(tenant_id, updated_at DESC) 
    WHERE is_deleted = FALSE AND status != 'deleted';
CREATE INDEX idx_documents_team_visible ON documents(tenant_id, updated_at DESC) 
    WHERE visibility IN ('team', 'public') AND is_deleted = FALSE;

-- Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Tenant isolation: users can only access documents in their tenant
CREATE POLICY documents_tenant_isolation ON documents
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Owner full access
CREATE POLICY documents_owner_all ON documents
    FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Collaborators can read and update
CREATE POLICY documents_collaborator_read ON documents
    FOR SELECT
    USING (auth.uid() = ANY(collaborators));

CREATE POLICY documents_collaborator_update ON documents
    FOR UPDATE
    USING (auth.uid() = ANY(collaborators))
    WITH CHECK (auth.uid() = ANY(collaborators));

-- Team visibility: tenant members can read team documents
CREATE POLICY documents_team_read ON documents
    FOR SELECT
    USING (
        visibility = 'team' 
        AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND is_deleted = FALSE
    );

-- Public visibility: anyone in tenant can read public documents
CREATE POLICY documents_public_read ON documents
    FOR SELECT
    USING (
        visibility = 'public' 
        AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND is_deleted = FALSE
    );

-- Admins can manage all documents in tenant
CREATE POLICY documents_admin_all ON documents
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND tenant_id = documents.tenant_id 
            AND role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND tenant_id = documents.tenant_id 
            AND role IN ('admin', 'owner')
        )
    );

-- Triggers
-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Published at trigger
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND OLD.status != 'published' THEN
        NEW.published_at = NOW();
    ELSIF NEW.status != 'published' AND OLD.status = 'published' THEN
        NEW.published_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_documents_published_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION set_published_at();

-- Soft delete trigger
CREATE OR REPLACE FUNCTION soft_delete_document()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_deleted = FALSE AND NEW.is_deleted = TRUE THEN
        NEW.deleted_at = NOW();
        NEW.status = 'deleted';
    ELSIF OLD.is_deleted = TRUE AND NEW.is_deleted = FALSE THEN
        NEW.deleted_at = NULL;
        NEW.status = 'draft';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soft_delete_documents
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_document();

-- Version management trigger
CREATE OR REPLACE FUNCTION manage_document_versions()
RETURNS TRIGGER AS $$
DECLARE
    latest_version INTEGER;
BEGIN
    -- On insert, ensure is_latest_version is true for new documents
    IF TG_OP = 'INSERT' THEN
        -- Mark previous latest as not latest if same slug
        UPDATE documents 
        SET is_latest_version = FALSE 
        WHERE tenant_id = NEW.tenant_id 
        AND slug = NEW.slug 
        AND is_latest_version = TRUE
        AND id != NEW.id;
        
        NEW.is_latest_version = TRUE;
        NEW.version = 1;
        RETURN NEW;
    END IF;
    
    -- On update, handle versioning for significant changes
    IF TG_OP = 'UPDATE' THEN
        -- Check if content or title changed significantly
        IF OLD.content IS DISTINCT FROM NEW.content 
           OR OLD.title IS DISTINCT FROM NEW.title THEN
            
            -- Create new version
            INSERT INTO documents (
                tenant_id, title, slug, description, content,
                version, previous_version_id, is_latest_version,
                status, visibility, owner_id, collaborators,
                tags, category_id, folder_id, attachments, settings
            ) VALUES (
                NEW.tenant_id, NEW.title, NEW.slug, NEW.description, NEW.content,
                OLD.version + 1, OLD.id, TRUE,
                'draft', NEW.visibility, NEW.owner_id, NEW.collaborators,
                NEW.tags, NEW.category_id, NEW.folder_id, NEW.attachments, NEW.settings
            );
            
            -- Mark old version as not latest
            NEW.is_latest_version = FALSE;
            NEW.version = OLD.version + 1;
            NEW.previous_version_id = OLD.id;
        END IF;
        RETURN NEW;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER manage_documents_versions
    BEFORE INSERT OR UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION manage_document_versions();

-- Helper functions
-- Get document with all versions
CREATE OR REPLACE FUNCTION get_document_versions(p_document_id UUID)
RETURNS TABLE (
    id UUID,
    version INTEGER,
    title TEXT,
    status document_status,
    created_at TIMESTAMPTZ,
    is_latest_version BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH RECURSIVE version_chain AS (
        SELECT id, version, title, status, created_at, is_latest_version, previous_version_id
        FROM documents
        WHERE id = p_document_id
        
        UNION ALL
        
        SELECT d.id, d.version, d.title, d.status, d.created_at, d.is_latest_version, d.previous_version_id
        FROM documents d
        INNER JOIN version_chain vc ON d.id = vc.previous_version_id
    )
    SELECT id, version, title, status, created_at, is_latest_version
    FROM version_chain
    ORDER BY version DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search documents
CREATE OR REPLACE FUNCTION search_documents(
    p_tenant_id UUID,
    p_query TEXT,
    p_status document_status[] DEFAULT NULL,
    p_visibility document_visibility[] DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_folder_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    slug TEXT,
    description TEXT,
    status document_status,
    visibility document_visibility,
    tags TEXT[],
    category_id UUID,
    folder_id UUID,
    owner_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id, d.title, d.slug, d.description, d.status, d.visibility,
        d.tags, d.category_id, d.folder_id, d.owner_id,
        d.created_at, d.updated_at,
        ts_rank_cd(d.search_vector, plainto_tsquery('english', p_query)) AS rank
    FROM documents d
    WHERE d.tenant_id = p_tenant_id
    AND d.is_deleted = FALSE
    AND d.is_latest_version = TRUE
    AND d.search_vector @@ plainto_tsquery('english', p_query)
    AND (p_status IS NULL OR d.status = ANY(p_status))
    AND (p_visibility IS NULL OR d.visibility = ANY(p_visibility))
    AND (p_tags IS NULL OR d.tags && p_tags)
    AND (p_category_id IS NULL OR d.category_id = p_category_id)
    AND (p_folder_id IS NULL OR d.folder_id = p_folder_id)
    ORDER BY rank DESC, d.updated_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON documents TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION get_document_versions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION search_documents(UUID, TEXT, document_status[], document_visibility[], TEXT[], UUID, UUID, INTEGER, INTEGER) TO authenticated;

-- Comments
COMMENT ON TABLE documents IS 'Multi-tenant documents with versioning, collaboration, and full-text search';
COMMENT ON COLUMN documents.content IS 'Structured document content (ProseMirror JSON, Markdown, etc.)';
COMMENT ON COLUMN documents.content_text IS 'Extracted plain text for search indexing';
COMMENT ON COLUMN documents.search_vector IS 'Full-text search vector for PostgreSQL text search';
COMMENT ON COLUMN documents.collaborators IS 'Array of user IDs with edit access';
COMMENT ON COLUMN documents.settings IS 'Document-specific settings (comments, tracking, exports)';
COMMENT ON COLUMN documents.attachments IS 'Array of attachment metadata objects';