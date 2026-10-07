import { Pool, PoolClient, QueryResult } from 'pg';

// Allowlist of sortable columns to prevent SQL injection via ORDER BY
const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'email',
  'created_at',
  'updated_at',
  'last_login_at',
]);

// Allowlist of filterable columns with their expected types
const ALLOWED_FILTER_COLUMNS = new Set([
  'id',
  'email',
  'status',
  'role',
  'created_at',
  'updated_at',
]);

export interface SearchParams {
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserRow {
  id: string;
  email: string;
  status: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

/**
 * Builds a parameterized WHERE clause from filter criteria.
 * Only allows columns in ALLOWED_FILTER_COLUMNS.
 * Returns { clause: string, params: unknown[] }.
 */
function buildWhereClause(filters: Record<string, unknown>): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const [column, value] of Object.entries(filters)) {
    if (!ALLOWED_FILTER_COLUMNS.has(column)) {
      continue; // Silently ignore disallowed columns
    }

    if (value === null || value === undefined) {
      conditions.push(`${column} IS NULL`);
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        conditions.push('FALSE'); // Empty array matches nothing
        continue;
      }
      const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`${column} IN (${placeholders})`);
      params.push(...value);
      continue;
    }

    // Default equality match
    conditions.push(`${column} = $${paramIndex++}`);
    params.push(value);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

/**
 * Validates and normalizes sort parameters.
 */
function normalizeSort(sortBy?: string, sortOrder?: 'ASC' | 'DESC'): { column: string; order: 'ASC' | 'DESC' } {
  const column = sortBy && ALLOWED_SORT_COLUMNS.has(sortBy) ? sortBy : 'created_at';
  const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
  return { column, order };
}

/**
 * Executes a search query with dynamic filters and sorting.
 * Uses bound parameters exclusively — no string interpolation of values.
 * Sort column and direction resolved through allowlists.
 */
export async function searchUsers(
  pool: Pool,
  params: SearchParams
): Promise<SearchResult<UserRow>> {
  const { filters = {}, sortBy, sortOrder, limit = 50, offset = 0 } = params;

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);
  const { column: sortColumn, order: sortOrderNorm } = normalizeSort(sortBy, sortOrder);

  // Clamp limit/offset to safe ranges
  const safeLimit = Math.min(Math.max(1, limit), 200);
  const safeOffset = Math.max(0, offset);

  const countSql = `SELECT COUNT(*) FROM users ${whereClause}`;
  const dataSql = `
    SELECT id, email, status, role, created_at, updated_at, last_login_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortOrderNorm}
    LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
  `;

  const client: PoolClient = await pool.connect();
  try {
    const countResult: QueryResult<{ count: string }> = await client.query(countSql, whereParams);
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const dataParams = [...whereParams, safeLimit, safeOffset];
    const dataResult: QueryResult<UserRow> = await client.query(dataSql, dataParams);

    return {
      rows: dataResult.rows,
      total,
      limit: safeLimit,
      offset: safeOffset,
    };
  } finally {
    client.release();
  }
}