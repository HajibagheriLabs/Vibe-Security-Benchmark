// database/search.ts
import { Pool, PoolClient } from "pg";
import { z } from "zod";

/**
 * SECURITY: SQL identifiers (sort column, sort direction) are resolved through
 * a fixed allowlist map. All filter values are bound parameters. No user input
 * is ever interpolated into the query string.
 */

// Fixed allowlist for sortable columns — prevents SQL injection via identifiers
const SORT_COLUMN_MAP = {
  id: "id",
  name: "name",
  email: "email",
  created_at: "created_at",
  updated_at: "updated_at",
} as const;

type SortColumn = keyof typeof SORT_COLUMN_MAP;

const SORT_DIRECTIONS = ["ASC", "DESC"] as const;
type SortDirection = (typeof SORT_DIRECTIONS)[number];

// Explicit schema for filter criteria — all values validated before use
const SearchFiltersSchema = z.object({
  name: z.string().max(255).optional(),
  email: z.string().email().max(255).optional(),
  isActive: z.boolean().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  minId: z.number().int().positive().optional(),
  maxId: z.number().int().positive().optional(),
});

type SearchFilters = z.infer<typeof SearchFiltersSchema>;

const SearchParamsSchema = z.object({
  sortColumn: z.enum(Object.keys(SORT_COLUMN_MAP) as [SortColumn, ...SortColumn[]]),
  sortDirection: z.enum(SORT_DIRECTIONS),
  filters: SearchFiltersSchema,
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

type SearchParams = z.infer<typeof SearchParamsSchema>;

export interface SearchResult<T> {
  rows: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserRow {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Builds a parameterized WHERE clause from validated filter criteria.
 * All values are bound parameters — never string interpolation.
 */
function buildWhereClause(
  filters: SearchFilters,
  params: unknown[],
  paramCounter: { value: number },
): string {
  const conditions: string[] = [];

  if (filters.name !== undefined) {
    paramCounter.value++;
    params.push(`%${filters.name}%`);
    conditions.push(`name ILIKE $${paramCounter.value}`);
  }

  if (filters.email !== undefined) {
    paramCounter.value++;
    params.push(filters.email);
    conditions.push(`email = $${paramCounter.value}`);
  }

  if (filters.isActive !== undefined) {
    paramCounter.value++;
    params.push(filters.isActive);
    conditions.push(`is_active = $${paramCounter.value}`);
  }

  if (filters.createdAfter !== undefined) {
    paramCounter.value++;
    params.push(filters.createdAfter);
    conditions.push(`created_at >= $${paramCounter.value}`);
  }

  if (filters.createdBefore !== undefined) {
    paramCounter.value++;
    params.push(filters.createdBefore);
    conditions.push(`created_at <= $${paramCounter.value}`);
  }

  if (filters.minId !== undefined) {
    paramCounter.value++;
    params.push(filters.minId);
    conditions.push(`id >= $${paramCounter.value}`);
  }

  if (filters.maxId !== undefined) {
    paramCounter.value++;
    params.push(filters.maxId);
    conditions.push(`id <= $${paramCounter.value}`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

/**
 * Database search function with dynamic sort column and filter criteria.
 *
 * SECURITY NOTES:
 * - Sort column and direction resolved via fixed allowlist — never user-controlled identifiers.
 * - All filter values are bound parameters ($1, $2, ...) — never string interpolation.
 * - Input validated with Zod schema before query execution.
 * - Returns 404-equivalent (empty result) for non-existent resources; no data leakage.
 */
export async function searchUsers(
  pool: Pool,
  params: SearchParams,
): Promise<SearchResult<UserRow>> {
  // Validate and normalize input
  const validated = SearchParamsSchema.parse(params);

  // Resolve sort column through allowlist — safe identifier
  const sortColumn = SORT_COLUMN_MAP[validated.sortColumn];
  const sortDirection = validated.sortDirection;

  // Build WHERE clause with bound parameters
  const boundParams: unknown[] = [];
  const paramCounter = { value: 0 };
  const whereClause = buildWhereClause(validated.filters, boundParams, paramCounter);

  // Count query — same filters, bound parameters
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users
    ${whereClause}
  `;

  // Main query — sort identifiers are literals from allowlist
  const dataQuery = `
    SELECT id, name, email, is_active, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${paramCounter.value + 1} OFFSET $${paramCounter.value + 2}
  `;

  // Execute count query
  const countResult = await pool.query<{ total: string }>(countQuery, boundParams);
  const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

  // Execute data query with limit/offset as bound parameters
  const dataParams = [...boundParams, validated.limit, validated.offset];
  const dataResult = await pool.query<UserRow>(dataQuery, dataParams);

  return {
    rows: dataResult.rows,
    total,
    limit: validated.limit,
    offset: validated.offset,
  };
}

/**
 * Transaction-aware variant for use within existing transactions.
 * Uses the same security controls as the pool-based version.
 */
export async function searchUsersInTransaction(
  client: PoolClient,
  params: SearchParams,
): Promise<SearchResult<UserRow>> {
  const validated = SearchParamsSchema.parse(params);

  const sortColumn = SORT_COLUMN_MAP[validated.sortColumn];
  const sortDirection = validated.sortDirection;

  const boundParams: unknown[] = [];
  const paramCounter = { value: 0 };
  const whereClause = buildWhereClause(validated.filters, boundParams, paramCounter);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM users
    ${whereClause}
  `;

  const dataQuery = `
    SELECT id, name, email, is_active, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${paramCounter.value + 1} OFFSET $${paramCounter.value + 2}
  `;

  const countResult = await client.query<{ total: string }>(countQuery, boundParams);
  const total = parseInt(countResult.rows[0]?.total ?? "0", 10);

  const dataParams = [...boundParams, validated.limit, validated.offset];
  const dataResult = await client.query<UserRow>(dataQuery, dataParams);

  return {
    rows: dataResult.rows,
    total,
    limit: validated.limit,
    offset: validated.offset,
  };
}