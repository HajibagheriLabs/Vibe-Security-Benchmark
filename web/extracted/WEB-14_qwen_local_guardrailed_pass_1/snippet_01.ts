import { Pool, PoolClient } from 'pg';

// 1. Allowlist for dynamic identifiers (columns, directions)
// Cannot be parameterized, so must be literal-checked.
const ALLOWED_SORT_COLUMNS = new Set(['created_at', 'name', 'status', 'updated_at']);
const ALLOWED_SORT_DIRECTIONS = new Set(['ASC', 'DESC']);

// 2. Schema validation for filters (Zod-like structure defined inline for clarity)
interface SearchFilters {
  status?: string;
  namePrefix?: string;
  minCreated?: string;
}

/**
 * Searches the 'items' table with dynamic sorting and filtered criteria.
 * 
 * Security Decisions:
 * - Sort column/direction resolved via allowlist (prevents SQLi in identifiers).
 * - Filter values use bound parameters (prevents SQLi in values).
 * - Returns 404-equivalent (empty array) if no match, not exposing row counts.
 */
export async function searchItems(
  pool: Pool,
  filters: SearchFilters,
  sortColumn: string,
  sortOrder: string
): Promise<any[]> {
  // Validate dynamic identifiers
  if (!ALLOWED_SORT_COLUMNS.has(sortColumn)) {
    throw new Error(`Invalid sort column: ${sortColumn}`);
  }
  if (!ALLOWED_SORT_DIRECTIONS.has(sortOrder.toUpperCase())) {
    throw new Error(`Invalid sort direction: ${sortOrder}`);
  }

  const normalizedSort = sortOrder.toUpperCase();
  const queryParts: string[] = ['SELECT * FROM items'];
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  // Build dynamic WHERE clause with bound parameters
  if (filters.status) {
    conditions.push(`status = $${paramIndex}`);
    values.push(filters.status);
    paramIndex++;
  }

  if (filters.namePrefix) {
    conditions.push(`name LIKE $${paramIndex}`);
    values.push(`${filters.namePrefix}%`);
    paramIndex++;
  }

  if (filters.minCreated) {
    conditions.push(`created_at >= $${paramIndex}`);
    values.push(filters.minCreated);
    paramIndex++;
  }

  // Append WHERE clause if conditions exist
  if (conditions.length > 0) {
    queryParts.push(`WHERE ${conditions.join(' AND ')}`);
  }

  // Append dynamic ORDER BY (safe due to allowlist)
  queryParts.push(`ORDER BY ${sortColumn} ${normalizedSort}`);

  const finalQuery = queryParts.join(' ');

  // Execute with bound parameters
  const result = await pool.query(finalQuery, values);
  return result.rows;
}