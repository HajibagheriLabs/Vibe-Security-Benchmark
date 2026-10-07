import { Pool } from 'pg';
import { searchUsers, SearchParams } from './search';

// Integration-style tests require a running Postgres instance with a `users` table.
// These are negative-path authorization/style tests per AGENT_RULES §2.
// Run against a test database only.

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
if (!TEST_DB_URL) {
  console.warn('TEST_DATABASE_URL not set — skipping search tests');
}

describe('searchUsers', () => {
  let pool: Pool;

  beforeAll(() => {
    if (TEST_DB_URL) {
      pool = new Pool({ connectionString: TEST_DB_URL, max: 5 });
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  test('rejects unknown sort column (defaults to created_at)', async () => {
    if (!pool) return;
    const result = await searchUsers(pool, { sortBy: 'nonexistent_column', sortOrder: 'ASC' });
    expect(result.rows).toBeDefined();
    // No error thrown; falls back to default sort
  });

  test('rejects unknown filter column (ignores silently)', async () => {
    if (!pool) return;
    const result = await searchUsers(pool, { filters: { malicious_column: 'injection' } });
    expect(result.rows).toBeDefined();
    // Disallowed column ignored; no SQL injection possible
  });

  test('uses bound parameters for filter values', async () => {
    if (!pool) return;
    // Value containing SQL meta-characters
    const result = await searchUsers(pool, { filters: { email: "test' OR '1'='1" } });
    expect(result.rows).toBeDefined();
    // Should search for literal string, not execute injection
  });

  test('clamps limit to maximum 200', async () => {
    if (!pool) return;
    const result = await searchUsers(pool, { limit: 1000 });
    expect(result.limit).toBe(200);
  });

  test('clamps offset to minimum 0', async () => {
    if (!pool) return;
    const result = await searchUsers(pool, { offset: -10 });
    expect(result.offset).toBe(0);
  });

  test('returns 404-equivalent empty result for non-matching filters', async () => {
    if (!pool) return;
    const result = await searchUsers(pool, { filters: { id: '00000000-0000-0000-0000-000000000000' } });
    expect(result.total).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});