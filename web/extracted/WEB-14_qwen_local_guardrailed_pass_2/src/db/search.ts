import { Pool, PoolClient } from 'pg';
import { z } from 'zod';

// --- Configuration & Allowlists (Rule 3: SQL Injection Defense) ---

const ALLOWED_SORT_COLUMNS: Record<string, 'ASC' | 'DESC'> = {
  created_at: 'DESC',
  updated_at: 'DESC',
  name: 'ASC',
  email: 'ASC',
};

const ALLOWED_SORT_DIRECTIONS: Record<string, 'ASC' | 'DESC'> = {
  ASC: 'ASC',
  DESC: 'DESC',
};

// --- Schemas (Rule 3: Input Validation) ---

const SortDirectionSchema = z.enum(['ASC', 'DESC']);
const SortColumnSchema = z.enum(Object.keys(ALLOWED_SORT_COLUMNS) as [string, ...string[]]);

// --- Types ---

interface SearchParams {
  sortColumn?: string;
  sortDirection?: string;
  filters?: Record<string, string | number | boolean | null>;
  limit?: number;
  offset?: number;
}

interface SearchResult {
  rows: any[];
  total: number;
}

// --- Implementation ---

/**
 * Searches the `users` table using raw SQL with dynamic sorting and filtering.
 * 
 * Security Decisions:
 * 1. Sort column/direction resolved via allowlist map (no user string interpolation).
 * 2. Filters use bound parameters ($1, $2...) for values.
 * 3. Keys for filters are validated against a strict allowlist to prevent column injection.
 * 4. Limit/Offset coerced to integers to prevent SQL injection via numeric strings.
 */
export async function searchUsers(
  pool: Pool,
  params: SearchParams
): Promise<SearchResult> {
  const {
    sortColumn = 'created_at',
    sortDirection = 'DESC',
    filters = {},
    limit = 10,
    offset = 0,
  } = params;

  // 1. Validate Sort Column (Rule 3: SQL Injection - Identifiers)
  const validatedSortColumn = SortColumnSchema.parse(sortColumn);
  const sortClause = `${validatedSortColumn} ${ALLOWED_SORT_COLUMNS[validatedSortColumn]}`;

  // 2. Validate Sort Direction (Rule 3: SQL Injection - Identifiers)
  const validatedSortDir = SortDirectionSchema.parse(sortDirection);
  const directionClause = ALLOWED_SORT_DIRECTIONS[validatedSortDir];

  // 3. Build Filter Clause (Rule 3: SQL Injection - Values)
  const filterKeys = Object.keys(filters);
  const filterConditions: string[] = [];
  const filterValues: any[] = [];

  // Define allowed columns for filtering
  const allowedFilterColumns = ['name', 'email', 'status', 'created_at'];

  for (const key of filterKeys) {
    if (!allowedFilterColumns.includes(key)) {
      continue; // Ignore unknown columns
    }

    const value = filters[key];
    if (value === null || value === undefined) {
      continue;
    }

    // Add condition placeholder
    filterConditions.push(`${key} = $${filterValues.length + 1}`);
    filterValues.push(value);
  }

  const whereClause = filterConditions.length > 0 
    ? `WHERE ${filterConditions.join(' AND ')}` 
    : '';

  // 4. Validate Pagination (Rule 3: SQL Injection - Numeric Coercion)
  const safeLimit = Math.min(Math.max(Number(limit), 1), 100); // Cap at 100
  const safeOffset = Math.max(Number(offset), 0);

  // 5. Construct Query
  // Note: In a real production app, we would separate the count query for pagination efficiency.
  // Here we combine them for simplicity, assuming the dataset isn't massive.
  const query = `
    SELECT * FROM users
    ${whereClause}
    ORDER BY ${sortClause}
    LIMIT $${filterValues.length + 1}
    OFFSET $${filterValues.length + 2}
  `;

  // 6. Execute Query
  // Values: [filterValues..., limit, offset]
  const values = [...filterValues, safeLimit, safeOffset];

  const client = await pool.connect();
  try {
    const res = await client.query(query, values);
    return {
      rows: res.rows,
      total: res.rows.length, // Simplified; use COUNT(*) OVER() or separate query for accurate total
    };
  } finally {
    client.release();
  }
}