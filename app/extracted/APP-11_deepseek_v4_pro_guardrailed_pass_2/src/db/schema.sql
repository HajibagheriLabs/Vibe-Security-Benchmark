-- Non-sensitive profile fields only.
-- Email and phone are stored encrypted in the secure_fields table (AES-256-GCM).
CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Encrypted PII: ciphertext + GCM auth tag + IV + key version.
-- Key material never touches SQLite; only ciphertext is persisted here.
CREATE TABLE IF NOT EXISTS secure_fields (
    profile_id INTEGER PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    email_ciphertext BLOB,
    email_iv BLOB,
    email_auth_tag BLOB,
    phone_ciphertext BLOB,
    phone_iv BLOB,
    phone_auth_tag BLOB,
    key_version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_profiles_uuid ON profiles(uuid);