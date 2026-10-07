import { Pool, PoolClient, QueryResult } from 'pg';

/**
 * Configuration for database connection
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

/**
 * Sort direction for query results
 */
export type SortDirection = 'ASC' | 'DESC';

/**
 * Filter operator types supported by the search function
 */
export type FilterOperator = 
  | 'eq'    // equals
  | 'neq'   // not equals
  | 'gt'    // greater than
  | 'gte'   // greater than or equal
  | 'lt'    // less than
  | 'lte'   // less than or equal
  | 'like'  // pattern match
  | 'in'    // in list
  | 'isNull' // is null
  | 'isNotNull'; // is not null

/**
 * Individual filter criterion
 */
export interface FilterCriterion {
  column: string;
  operator: FilterOperator;
  value?: string | number | boolean | Array<string | number>;
}

/**
 * Sort specification
 */
export interface SortSpec {
  column: string;
  direction: SortDirection;
}

/**
 * Search query parameters
 */
export interface SearchParams {
  table: string;
  filters?: FilterCriterion[];
  sort?: SortSpec;
  limit?: number;
  offset?: number;
  columns?: string[];
}

/**
 * Search result wrapper
 */
export interface SearchResult<T = Record<string, unknown>> {
  rows: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Allowed column name pattern to prevent SQL injection via identifiers
 */
const COLUMN_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Allowed table name pattern
 */
const TABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;

/**
 * Validates that a column or table name is safe to use in SQL
 */
function validateIdentifier(name: string, pattern: RegExp, context: string): void {
  if (!pattern.test(name)) {
    throw new Error(`Invalid ${context} name: "${name}". Only alphanumeric characters and underscores are allowed.`);
  }
}

/**
 * Maps a filter operator to its SQL equivalent
 */
function operatorToSql(operator: FilterOperator): string {
  const operatorMap: Record<FilterOperator, string> = {
    eq: '=',
    neq: '!=',
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
    like: 'LIKE',
    in: 'IN',
    isNull: 'IS NULL',
    isNotNull: 'IS NOT NULL',
  };
  return operatorMap[operator];
}

/**
 * Builds the WHERE clause and parameter array from filter criteria
 */
function buildWhereClause(filters: FilterCriterion[]): { whereClause: string; params: unknown[] } {
  if (!filters || filters.length === 0) {
    return { whereClause: '', params: [] };
  }

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  for (const filter of filters) {
    validateIdentifier(filter.column, COLUMN_NAME_PATTERN, 'column');

    const sqlOperator = operatorToSql(filter.operator);

    if (filter.operator === 'isNull' || filter.operator === 'isNotNull') {
      conditions.push(`"${filter.column}" ${sqlOperator}`);
    } else if (filter.operator === 'in') {
      if (!Array.isArray(filter.value) || filter.value.length === 0) {
        throw new Error(`Filter on column "${filter.column}" with operator "in" requires a non-empty array value.`);
      }
      const placeholders = filter.value.map(() => `$${paramIndex++}`).join(', ');
      conditions.push(`"${filter.column}" ${sqlOperator} (${placeholders})`);
      params.push(...filter.value);
    } else {
      if (filter.value === undefined || filter.value === null) {
        throw new Error(`Filter on column "${filter.column}" with operator "${filter.operator}" requires a value.`);
      }
      conditions.push(`"${filter.column}" ${sqlOperator} $${paramIndex++}`);
      params.push(filter.value);
    }
  }

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Builds the ORDER BY clause from sort specification
 */
function buildOrderByClause(sort?: SortSpec): string {
  if (!sort) {
    return '';
  }

  validateIdentifier(sort.column, COLUMN_NAME_PATTERN, 'sort column');

  const direction = sort.direction === 'DESC' ? 'DESC' : 'ASC';
  return `ORDER BY "${sort.column}" ${direction}`;
}

/**
 * Database search function with dynamic sort column and filter criteria.
 * 
 * Uses parameterized queries for values to prevent SQL injection,
 * and validates identifiers (table/column names) against a strict pattern.
 * 
 * @param pool - PostgreSQL connection pool
 * @param params - Search parameters
 * @returns Search results with pagination metadata
 */
export async function searchDatabase<T = Record<string, unknown>>(
  pool: Pool,
  params: SearchParams
): Promise<SearchResult<T>> {
  const {
    table,
    filters = [],
    sort,
    limit = 50,
    offset = 0,
    columns = ['*'],
  } = params;

  // Validate table name
  validateIdentifier(table, TABLE_NAME_PATTERN, 'table');

  // Validate column selections
  const selectColumns = columns.map((col) => {
    if (col === '*') return '*';
    validateIdentifier(col, COLUMN_NAME_PATTERN, 'column');
    return `"${col}"`;
  }).join(', ');

  // Validate pagination parameters
  if (limit < 1 || limit > 1000) {
    throw new Error('Limit must be between 1 and 1000.');
  }
  if (offset < 0) {
    throw new Error('Offset must be non-negative.');
  }

  // Build query components
  const { whereClause, params: whereParams } = buildWhereClause(filters);
  const orderByClause = buildOrderByClause(sort);

  // Build the main query
  const dataQuery = `
    SELECT ${selectColumns}
    FROM "${table}"
    ${whereClause}
    ${orderByClause}
    LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
  `;

  // Build the count query
  const countQuery = `
    SELECT COUNT(*) AS total_count
    FROM "${table}"
    ${whereClause}
  `;

  const dataParams = [...whereParams, limit, offset];

  // Execute queries in a transaction for consistency
  const client: PoolClient = await pool.connect();

  try {
    await client.query('BEGIN');

    const dataResult: QueryResult<T> = await client.query(dataQuery, dataParams);
    const countResult: QueryResult<{ total_count: string }> = await client.query(countQuery, whereParams);

    await client.query('COMMIT');

    const totalCount = parseInt(countResult.rows[0]?.total_count ?? '0', 10);
    const pageSize = limit;
    const totalPages = Math.ceil(totalCount / pageSize);
    const page = Math.floor(offset / pageSize) + 1;

    return {
      rows: dataResult.rows,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Convenience function to create a PostgreSQL connection pool
 */
export function createDatabasePool(config: DatabaseConfig): Pool {
  return new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}