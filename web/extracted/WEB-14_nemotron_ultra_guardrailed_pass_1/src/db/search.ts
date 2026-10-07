import { db } from './client';
import type { User } from '../types/user';

const ALLOWED_SORT_COLUMNS: ReadonlySet<string> = new Set([
  'id',
  'email',
  'created_at',
  'updated_at',
  'last_login_at',
]);

const ALLOWED_SORT_DIRECTIONS: ReadonlySet<'ASC' | 'DESC'> = new Set(['ASC', 'DESC']);

interface SearchFilters {
  email?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  isActive?: boolean;
}

interface SearchOptions {
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

interface SearchResult {
  users: User[];
  total: number;
}

export async function searchUsers(
  filters: SearchFilters = {},
  options: SearchOptions = {}
): Promise<SearchResult> {
  const sortBy = ALLOWED_SORT_COLUMNS.has(options.sortBy ?? '') ? options.sortBy! : 'created_at';
  const sortDirection = ALLOWED_SORT_DIRECTIONS.has(options.sortDirection ?? '') ? options.sortDirection! : 'DESC';
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const offset = Math.max(options.offset ?? 0, 0);

  const whereClauses: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.email) {
    whereClauses.push(`email ILIKE $${paramIndex++}`);
    params.push(`%${filters.email}%`);
  }

  if (filters.createdAfter) {
    whereClauses.push(`created_at >= $${paramIndex++}`);
    params.push(filters.createdAfter);
  }

  if (filters.createdBefore) {
    whereClauses.push(`created_at <= $${paramIndex++}`);
    params.push(filters.createdBefore);
  }

  if (filters.isActive !== undefined) {
    whereClauses.push(`is_active = $${paramIndex++}`);
    params.push(filters.isActive);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) FROM users ${whereSql}`;
  const countResult = await db.query<{ count: string }>(countSql, params);
  const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

  const dataSql = `
    SELECT id, email, created_at, updated_at, last_login_at, is_active
    FROM users
    ${whereSql}
    ORDER BY ${sortBy} ${sortDirection}
    LIMIT $${paramIndex++} OFFSET $${paramIndex}
  `;
  const dataParams = [...params, limit, offset];
  const dataResult = await db.query<User>(dataSql, dataParams);

  return { users: dataResult.rows, total };
}