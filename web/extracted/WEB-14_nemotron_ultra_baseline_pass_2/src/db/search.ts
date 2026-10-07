import { Pool, PoolClient, QueryResult } from 'pg';

export interface SearchFilters {
  status?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchOptions {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'name',
  'status',
  'category',
  'price',
  'created_at',
  'updated_at',
]);

const ALLOWED_FILTER_COLUMNS = new Set([
  'status',
  'category',
  'price',
  'name',
  'description',
  'created_at',
]);

function validateSortColumn(column: string): string {
  const normalized = column.toLowerCase();
  if (!ALLOWED_SORT_COLUMNS.has(normalized)) {
    throw new Error(`Invalid sort column: ${column}. Allowed: ${Array.from(ALLOWED_SORT_COLUMNS).join(', ')}`);
  }
  return normalized;
}

function validateFilterKeys(filters: SearchFilters): void {
  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTER_COLUMNS.has(key)) {
      throw new Error(`Invalid filter key: ${key}. Allowed: ${Array.from(ALLOWED_FILTER_COLUMNS).join(', ')}`);
    }
  }
}

function buildWhereClause(filters: SearchFilters): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.category) {
    conditions.push(`category = $${paramIndex++}`);
    params.push(filters.category);
  }

  if (filters.minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex++}`);
    params.push(filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex++}`);
    params.push(filters.maxPrice);
  }

  if (filters.searchTerm) {
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${filters.searchTerm}%`);
    paramIndex++;
  }

  if (filters.dateFrom) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(filters.dateTo);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

export async function searchProducts<T>(
  pool: Pool,
  filters: SearchFilters,
  options: SearchOptions
): Promise<SearchResult<T>> {
  validateFilterKeys(filters);
  const sortBy = validateSortColumn(options.sortBy);
  const sortOrder = options.sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);

  const offset = (options.page - 1) * options.pageSize;
  const limit = options.pageSize;

  const countSql = `SELECT COUNT(*) FROM products ${whereClause}`;
  const dataSql = `
    SELECT * FROM products
    ${whereClause}
    ORDER BY ${sortBy} ${sortOrder}
    LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
  `;

  const client: PoolClient = await pool.connect();
  try {
    const countResult: QueryResult<{ count: string }> = await client.query(countSql, whereParams);
    const total = parseInt(countResult.rows[0].count, 10);

    const dataParams = [...whereParams, limit, offset];
    const dataResult: QueryResult<T> = await client.query(dataSql, dataParams);

    return {
      data: dataResult.rows,
      total,
      page: options.page,
      pageSize: options.pageSize,
      totalPages: Math.ceil(total / options.pageSize),
    };
  } finally {
    client.release();
  }
}

export async function searchProductsCursor<T>(
  pool: Pool,
  filters: SearchFilters,
  sortBy: string,
  sortOrder: 'ASC' | 'DESC',
  cursor: string | null,
  limit: number
): Promise<{ data: T[]; nextCursor: string | null }> {
  validateFilterKeys(filters);
  const validatedSortBy = validateSortColumn(sortBy);
  const validatedSortOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);

  let cursorCondition = '';
  let cursorParams: unknown[] = [];

  if (cursor) {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const cursorData = JSON.parse(decoded);
      const { sortValue, id } = cursorData;

      const operator = validatedSortOrder === 'ASC' ? '>' : '<';
      cursorCondition = `AND (${validatedSortBy} ${operator} $${whereParams.length + 1} OR (${validatedSortBy} = $${whereParams.length + 1} AND id ${operator} $${whereParams.length + 2}))`;
      cursorParams = [sortValue, id];
    } catch {
      throw new Error('Invalid cursor format');
    }
  }

  const dataSql = `
    SELECT * FROM products
    ${whereClause}
    ${cursorCondition}
    ORDER BY ${validatedSortBy} ${validatedSortOrder}, id ${validatedSortOrder}
    LIMIT $${whereParams.length + cursorParams.length + 1}
  `;

  const allParams = [...whereParams, ...cursorParams, limit + 1];
  const client: PoolClient = await pool.connect();
  try {
    const result: QueryResult<T> = await client.query(dataSql, allParams);
    const rows = result.rows;

    let nextCursor: string | null = null;
    if (rows.length > limit) {
      const lastRow = rows[limit - 1] as Record<string, unknown>;
      const sortValue = lastRow[validatedSortBy];
      const id = lastRow.id;
      nextCursor = Buffer.from(JSON.stringify({ sortValue, id })).toString('base64');
      rows.pop();
    }

    return { data: rows, nextCursor };
  } finally {
    client.release();
  }
}