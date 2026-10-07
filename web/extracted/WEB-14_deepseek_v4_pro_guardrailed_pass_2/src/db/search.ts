// src/db/search.ts
import { Pool, PoolClient, QueryResult } from 'pg';
import { z } from 'zod';

/**
 * Database search function with dynamic sort column and filter criteria.
 * 
 * Security notes:
 * - Sort column/direction resolved through fixed allowlist maps (never interpolated).
 * - All filter values use bound parameters ($1, $2, ...).
 * - Filter operators are validated against an allowlist.
 * - Ownership predicate is included in the WHERE clause for tenant isolation.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type SortDirection = 'ASC' | 'DESC';

export interface SearchOptions {
  sortColumn: string;
  sortDirection: SortDirection;
  filters: SearchFilter[];
  limit: number;
  offset: number;
  tenantId: string; // verified server-side, never from client input
}

export interface SearchFilter {
  column: string;
  operator: FilterOperator;
  value: string | number | boolean | null;
}

export type FilterOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'isNull' | 'isNotNull';

// ─── Allowlists (identifiers cannot be parameterized) ─────────────────────

const SORTABLE_COLUMNS = new Set<string>([
  'id',
  'name',
  'email',
  'created_at',
  'updated_at',
  'status',
  'amount',
]);

const FILTERABLE_COLUMNS = new Set<string>([
  'id',
  'name',
  'email',
  'status',
  'amount',
  'created_at',
  'updated_at',
]);

const OPERATOR_SQL: Record<FilterOperator, string> = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'ILIKE',
  isNull: 'IS NULL',
  isNotNull: 'IS NOT NULL',
};

const SORT_DIRECTIONS = new Set<SortDirection>(['ASC', 'DESC']);

// ─── Validation schemas ───────────────────────────────────────────────────

const searchOptionsSchema = z.object({
  sortColumn: z.string().min(1).max(64),
  sortDirection: z.enum(['ASC', 'DESC']),
  filters: z.array(
    z.object({
      column: z.string().min(1).max(64),
      operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'isNull', 'isNotNull']),
      value: z.union([z.string().max(255), z.number(), z.boolean(), z.null()]),
    })
  ).max(20),
  limit: z.number().int().min(1).max(100),
  offset: z.number().int().min(0),
  tenantId: z.string().uuid(),
});

// ─── Query builder ────────────────────────────────────────────────────────

interface BuiltQuery {
  sql: string;
  params: unknown[];
}

function buildSearchQuery(options: SearchOptions): BuiltQuery {
  const parsed = searchOptionsSchema.parse(options);

  // Validate identifiers against allowlists
  if (!SORTABLE_COLUMNS.has(parsed.sortColumn)) {
    throw new Error(`Invalid sort column: ${parsed.sortColumn}`);
  }
  if (!SORT_DIRECTIONS.has(parsed.sortDirection)) {
    throw new Error(`Invalid sort direction: ${parsed.sortDirection}`);
  }

  const conditions: string[] = [];
  const params: unknown[] = [];

  // Tenant isolation — always enforced, never from client input
  conditions.push(`tenant_id = $${params.length + 1}`);
  params.push(parsed.tenantId);

  // Build filter conditions with bound parameters
  for (const filter of parsed.filters) {
    if (!FILTERABLE_COLUMNS.has(filter.column)) {
      throw new Error(`Invalid filter column: ${filter.column}`);
    }

    const operatorSql = OPERATOR_SQL[filter.operator];

    if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
      conditions.push(`${filter.column} ${operatorSql}`);
    } else {
      conditions.push(`${filter.column} ${operatorSql} $${params.length + 1}`);
      params.push(filter.value);
    }
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Sort column and direction are from allowlists — safe to interpolate
  const sql = `
    SELECT id, name, email, status, amount, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY ${parsed.sortColumn} ${parsed.sortDirection}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  params.push(parsed.limit, parsed.offset);

  return { sql, params };
}

// ─── Main search function ─────────────────────────────────────────────────

export interface SearchResult<T> {
  rows: T[];
  totalCount: number;
}

export async function searchUsers<T = Record<string, unknown>>(
  pool: Pool,
  options: SearchOptions
): Promise<SearchResult<T>> {
  const client: PoolClient = await pool.connect();

  try {
    const { sql, params } = buildSearchQuery(options);

    // Execute data query
    const dataResult: QueryResult<T> = await client.query(sql, params);

    // Execute count query (same filters, no limit/offset)
    const countSql = buildCountQuery(options);
    const countResult = await client.query(countSql.sql, countSql.params);

    return {
      rows: dataResult.rows,
      totalCount: parseInt(countResult.rows[0]?.count ?? '0', 10),
    };
  } finally {
    client.release();
  }
}

function buildCountQuery(options: SearchOptions): BuiltQuery {
  const parsed = searchOptionsSchema.parse(options);

  const conditions: string[] = [];
  const params: unknown[] = [];

  conditions.push(`tenant_id = $${params.length + 1}`);
  params.push(parsed.tenantId);

  for (const filter of parsed.filters) {
    if (!FILTERABLE_COLUMNS.has(filter.column)) {
      throw new Error(`Invalid filter column: ${filter.column}`);
    }

    const operatorSql = OPERATOR_SQL[filter.operator];

    if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
      conditions.push(`${filter.column} ${operatorSql}`);
    } else {
      conditions.push(`${filter.column} ${operatorSql} $${params.length + 1}`);
      params.push(filter.value);
    }
  }

  const whereClause = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `
    SELECT COUNT(*) AS count
    FROM users
    ${whereClause}
  `;

  return { sql, params };
}