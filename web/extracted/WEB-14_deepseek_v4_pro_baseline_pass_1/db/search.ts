import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Configuration for a single filter criterion.
 */
export interface FilterCriterion {
  /** Column name to filter on (must be a known column — see ALLOWED_FILTER_COLUMNS). */
  column: string;
  /** Operator: =, !=, >, >=, <, <=, LIKE, ILIKE, IN, IS NULL, IS NOT NULL */
  operator: string;
  /** Value(s) for the operator. For IN, pass an array. For IS NULL / IS NOT NULL, omit. */
  value?: string | number | boolean | Date | Array<string | number>;
}

/**
 * Sort direction.
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Options for the search function.
 */
export interface SearchOptions {
  /** Table to search. Must be a known table name (see ALLOWED_TABLES). */
  table: string;
  /** Columns to return. Defaults to '*'. */
  columns?: string[];
  /** Filter criteria. */
  filters?: FilterCriterion[];
  /** Sort column. Must be a known column (see ALLOWED_SORT_COLUMNS). */
  sortColumn?: string;
  /** Sort direction. Defaults to 'ASC'. */
  sortDirection?: SortDirection;
  /** Maximum number of rows to return. */
  limit?: number;
  /** Number of rows to skip. */
  offset?: number;
}

/**
 * Whitelist of allowed table names to prevent SQL injection via table name.
 */
const ALLOWED_TABLES: ReadonlySet<string> = new Set([
  'users',
  'products',
  'orders',
  'order_items',
  'customers',
  'inventory',
]);

/**
 * Whitelist of allowed sort columns.
 */
const ALLOWED_SORT_COLUMNS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'email',
  'created_at',
  'updated_at',
  'price',
  'quantity',
  'status',
  'total',
  'order_date',
]);

/**
 * Whitelist of allowed filter columns.
 */
const ALLOWED_FILTER_COLUMNS: ReadonlySet<string> = new Set([
  'id',
  'name',
  'email',
  'created_at',
  'updated_at',
  'price',
  'quantity',
  'status',
  'total',
  'order_date',
  'customer_id',
  'product_id',
]);

/**
 * Whitelist of allowed operators.
 */
const ALLOWED_OPERATORS: ReadonlySet<string> = new Set([
  '=',
  '!=',
  '>',
  '>=',
  '<',
  '<=',
  'LIKE',
  'ILIKE',
  'IN',
  'IS NULL',
  'IS NOT NULL',
]);

/**
 * Validates that a column name is a safe identifier (letters, digits, underscore,
 * and must not start with a digit). This is a defense-in-depth check in addition
 * to the whitelist.
 */
function isValidIdentifier(identifier: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier);
}

/**
 * Validates the search options and throws if any value is unsafe.
 */
function validateOptions(options: SearchOptions): void {
  if (!options.table || !ALLOWED_TABLES.has(options.table)) {
    throw new Error(`Invalid table name: ${options.table}`);
  }
  if (!isValidIdentifier(options.table)) {
    throw new Error(`Table name failed identifier validation: ${options.table}`);
  }

  if (options.columns) {
    for (const col of options.columns) {
      if (!isValidIdentifier(col)) {
        throw new Error(`Invalid column name in columns list: ${col}`);
      }
    }
  }

  if (options.sortColumn) {
    if (!ALLOWED_SORT_COLUMNS.has(options.sortColumn)) {
      throw new Error(`Invalid sort column: ${options.sortColumn}`);
    }
    if (!isValidIdentifier(options.sortColumn)) {
      throw new Error(`Sort column failed identifier validation: ${options.sortColumn}`);
    }
  }

  if (options.sortDirection && !['ASC', 'DESC'].includes(options.sortDirection)) {
    throw new Error(`Invalid sort direction: ${options.sortDirection}`);
  }

  if (options.filters) {
    for (const filter of options.filters) {
      if (!ALLOWED_FILTER_COLUMNS.has(filter.column)) {
        throw new Error(`Invalid filter column: ${filter.column}`);
      }
      if (!isValidIdentifier(filter.column)) {
        throw new Error(`Filter column failed identifier validation: ${filter.column}`);
      }
      if (!ALLOWED_OPERATORS.has(filter.operator)) {
        throw new Error(`Invalid filter operator: ${filter.operator}`);
      }
      if (
        filter.operator !== 'IS NULL' &&
        filter.operator !== 'IS NOT NULL' &&
        filter.value === undefined
      ) {
        throw new Error(
          `Filter on column "${filter.column}" with operator "${filter.operator}" requires a value.`
        );
      }
      if (
        filter.operator === 'IN' &&
        (!Array.isArray(filter.value) || filter.value.length === 0)
      ) {
        throw new Error(`IN operator requires a non-empty array value.`);
      }
    }
  }

  if (options.limit !== undefined && (options.limit < 0 || !Number.isInteger(options.limit))) {
    throw new Error(`Invalid limit: ${options.limit}`);
  }
  if (options.offset !== undefined && (options.offset < 0 || !Number.isInteger(options.offset))) {
    throw new Error(`Invalid offset: ${options.offset}`);
  }
}

/**
 * Builds the WHERE clause and parameter array from filter criteria.
 */
function buildWhereClause(filters: FilterCriterion[] | undefined): {
  whereClause: string;
  params: Array<string | number | boolean | Date>;
} {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }

  const conditions: string[] = [];
  const params: Array<string | number | boolean | Date> = [];

  for (const filter of filters) {
    const column = filter.column; // already validated

    switch (filter.operator) {
      case 'IS NULL':
        conditions.push(`${column} IS NULL`);
        break;
      case 'IS NOT NULL':
        conditions.push(`${column} IS NOT NULL`);
        break;
      case 'IN': {
        const values = filter.value as Array<string | number>;
        const placeholders = values.map(() => `$${params.length + 1}`).join(', ');
        params.push(...values);
        conditions.push(`${column} IN (${placeholders})`);
        break;
      }
      case 'LIKE':
      case 'ILIKE':
        params.push(filter.value as string);
        conditions.push(`${column} ${filter.operator} $${params.length}`);
        break;
      default:
        // =, !=, >, >=, <, <=
        params.push(filter.value as string | number | boolean | Date);
        conditions.push(`${column} ${filter.operator} $${params.length}`);
        break;
    }
  }

  return {
    whereClause: `WHERE ${conditions.join(' AND ')}`,
    params,
  };
}

/**
 * Builds the ORDER BY clause.
 */
function buildOrderByClause(
  sortColumn: string | undefined,
  sortDirection: SortDirection | undefined
): string {
  if (!sortColumn) {
    return '';
  }
  const direction = sortDirection ?? 'ASC';
  return `ORDER BY ${sortColumn} ${direction}`;
}

/**
 * Builds the LIMIT / OFFSET clause.
 */
function buildLimitOffsetClause(limit?: number, offset?: number): string {
  const parts: string[] = [];
  if (limit !== undefined) {
    parts.push(`LIMIT ${limit}`);
  }
  if (offset !== undefined) {
    parts.push(`OFFSET ${offset}`);
  }
  return parts.join(' ');
}

/**
 * Builds the complete SQL query string and parameter array.
 */
export function buildSearchQuery(options: SearchOptions): {
  sql: string;
  params: Array<string | number | boolean | Date>;
} {
  validateOptions(options);

  const columns = options.columns && options.columns.length > 0 ? options.columns.join(', ') : '*';
  const { whereClause, params } = buildWhereClause(options.filters);
  const orderByClause = buildOrderByClause(options.sortColumn, options.sortDirection);
  const limitOffsetClause = buildLimitOffsetClause(options.limit, options.offset);

  const clauses = [
    `SELECT ${columns}`,
    `FROM ${options.table}`,
    whereClause,
    orderByClause,
    limitOffsetClause,
  ].filter((clause) => clause.length > 0);

  return {
    sql: clauses.join(' '),
    params,
  };
}

/**
 * Executes a parameterized search query against the database.
 *
 * @param pool - A pg Pool instance (or any compatible pool with a `query` method).
 * @param options - Search options (table, filters, sort, pagination).
 * @returns The query result rows.
 */
export async function searchDatabase<T = Record<string, unknown>>(
  pool: Pool,
  options: SearchOptions
): Promise<T[]> {
  const { sql, params } = buildSearchQuery(options);
  const result: QueryResult<T> = await pool.query(sql, params);
  return result.rows;
}

/**
 * Executes a parameterized search query using an existing client (for transactions).
 *
 * @param client - A pg PoolClient instance.
 * @param options - Search options.
 * @returns The query result rows.
 */
export async function searchDatabaseWithClient<T = Record<string, unknown>>(
  client: PoolClient,
  options: SearchOptions
): Promise<T[]> {
  const { sql, params } = buildSearchQuery(options);
  const result: QueryResult<T> = await client.query(sql, params);
  return result.rows;
}