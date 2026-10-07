import { Pool, PoolClient, QueryResult } from 'pg';

export interface SearchFilters {
  name?: string;
  email?: string;
  status?: 'active' | 'inactive' | 'pending';
  createdAfter?: Date;
  createdBefore?: Date;
  minAge?: number;
  maxAge?: number;
}

export interface SortOptions {
  column: string;
  direction: 'ASC' | 'DESC';
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UserRecord {
  id: number;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
  age: number;
  created_at: Date;
  updated_at: Date;
}

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'name',
  'email',
  'status',
  'age',
  'created_at',
  'updated_at',
]);

const ALLOWED_FILTER_COLUMNS = new Set([
  'name',
  'email',
  'status',
  'created_at',
  'age',
]);

function validateSortColumn(column: string): string {
  const normalized = column.toLowerCase();
  if (!ALLOWED_SORT_COLUMNS.has(normalized)) {
    throw new Error(`Invalid sort column: ${column}. Allowed: ${Array.from(ALLOWED_SORT_COLUMNS).join(', ')}`);
  }
  return normalized;
}

function validateFilterColumns(filters: SearchFilters): void {
  for (const key of Object.keys(filters)) {
    if (!ALLOWED_FILTER_COLUMNS.has(key)) {
      throw new Error(`Invalid filter column: ${key}. Allowed: ${Array.from(ALLOWED_FILTER_COLUMNS).join(', ')}`);
    }
  }
}

function buildWhereClause(filters: SearchFilters): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.name) {
    conditions.push(`name ILIKE $${paramIndex++}`);
    params.push(`%${filters.name}%`);
  }

  if (filters.email) {
    conditions.push(`email ILIKE $${paramIndex++}`);
    params.push(`%${filters.email}%`);
  }

  if (filters.status) {
    conditions.push(`status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters.createdAfter) {
    conditions.push(`created_at >= $${paramIndex++}`);
    params.push(filters.createdAfter);
  }

  if (filters.createdBefore) {
    conditions.push(`created_at <= $${paramIndex++}`);
    params.push(filters.createdBefore);
  }

  if (filters.minAge !== undefined) {
    conditions.push(`age >= $${paramIndex++}`);
    params.push(filters.minAge);
  }

  if (filters.maxAge !== undefined) {
    conditions.push(`age <= $${paramIndex++}`);
    params.push(filters.maxAge);
  }

  const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { clause, params };
}

export async function searchUsers(
  pool: Pool,
  filters: SearchFilters = {},
  sort: SortOptions = { column: 'created_at', direction: 'DESC' },
  pagination: PaginationOptions = { limit: 20, offset: 0 }
): Promise<SearchResult<UserRecord>> {
  validateFilterColumns(filters);
  const sortColumn = validateSortColumn(sort.column);
  const sortDirection = sort.direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);

  const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
  const countResult: QueryResult<{ count: string }> = await pool.query(countQuery, whereParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const selectParams = [...whereParams, pagination.limit, pagination.offset];
  const selectQuery = `
    SELECT id, name, email, status, age, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${selectParams.length - 1} OFFSET $${selectParams.length}
  `;

  const selectResult: QueryResult<UserRecord> = await pool.query(selectQuery, selectParams);

  return {
    data: selectResult.rows,
    total,
    page: Math.floor(pagination.offset / pagination.limit) + 1,
    pageSize: pagination.limit,
  };
}

export async function searchUsersWithClient(
  client: PoolClient,
  filters: SearchFilters = {},
  sort: SortOptions = { column: 'created_at', direction: 'DESC' },
  pagination: PaginationOptions = { limit: 20, offset: 0 }
): Promise<SearchResult<UserRecord>> {
  validateFilterColumns(filters);
  const sortColumn = validateSortColumn(sort.column);
  const sortDirection = sort.direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const { clause: whereClause, params: whereParams } = buildWhereClause(filters);

  const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
  const countResult = await client.query<{ count: string }>(countQuery, whereParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const selectParams = [...whereParams, pagination.limit, pagination.offset];
  const selectQuery = `
    SELECT id, name, email, status, age, created_at, updated_at
    FROM users
    ${whereClause}
    ORDER BY ${sortColumn} ${sortDirection}
    LIMIT $${selectParams.length - 1} OFFSET $${selectParams.length}
  `;

  const selectResult = await client.query<UserRecord>(selectQuery, selectParams);

  return {
    data: selectResult.rows,
    total,
    page: Math.floor(pagination.offset / pagination.limit) + 1,
    pageSize: pagination.limit,
  };
}