// src/database/search.ts

import { Pool, PoolClient } from 'pg';

interface SearchOptions {
  tableName: string;
  filters: Record<string, string | number | boolean | null>;
  sortColumn: string;
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

/**
 * Escapes a column name to prevent SQL injection by wrapping in double quotes
 * and escaping any existing double quotes.
 */
function escapeColumnName(columnName: string): string {
  // Basic validation: allow only alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }
  return `"${columnName}"`;
}

/**
 * Escapes a table name similarly.
 */
function escapeTableName(tableName: string): string {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: ${tableName}`);
  }
  return `"${tableName}"`;
}

/**
 * Performs a dynamic database search using raw SQL.
 * 
 * @param pool - The PostgreSQL connection pool.
 * @param options - Search configuration including table, filters, sorting, and pagination.
 * @returns The result set and total count of matching rows.
 */
export async function searchDatabase(
  pool: Pool,
  options: SearchOptions
): Promise<{ rows: any[]; total: number }> {
  const {
    tableName,
    filters,
    sortColumn,
    sortOrder = 'ASC',
    limit = 10,
    offset = 0,
  } = options;

  const safeTable = escapeTableName(tableName);
  const safeSortColumn = escapeColumnName(sortColumn);

  // Build WHERE clause from filters
  const whereClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined) {
      continue;
    }

    const safeColumn = escapeColumnName(key);
    whereClauses.push(`${safeColumn} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}` 
    : '';

  // Construct the main query
  const query = `
    SELECT * FROM ${safeTable}
    ${whereClause}
    ORDER BY ${safeSortColumn} ${sortOrder}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;

  // Construct the count query
  const countQuery = `
    SELECT COUNT(*) AS total FROM ${safeTable}
    ${whereClause}
  `;

  // Add pagination parameters to values
  values.push(limit, offset);

  const client: PoolClient = await pool.connect();
  try {
    // Execute the main query
    const result = await client.query(query, values);
    
    // Execute the count query (reusing the same where clauses and values minus pagination)
    const countValues = values.slice(0, -2); // Remove limit and offset
    const countResult = await client.query(countQuery, countValues);
    
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    return {
      rows: result.rows,
      total,
    };
  } finally {
    client.release();
  }
}