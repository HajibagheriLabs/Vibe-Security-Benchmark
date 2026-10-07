// search.ts

interface SearchCriteria {
  filterColumn?: string;
  filterValue?: string;
  sortColumn?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Constructs a raw SQL query with dynamic filtering and sorting.
 * @param tableName - The name of the table to search.
 * @param criteria - The search criteria including filter and sort options.
 * @returns An object containing the SQL query string and parameters.
 */
export function buildSearchQuery(
  tableName: string,
  criteria: SearchCriteria
): { sql: string; params: any[] } {
  const allowedSortColumns = ['id', 'name', 'created_at', 'updated_at'];
  const allowedSortOrders = ['ASC', 'DESC'];

  // Default to 'id' ASC if no sort column is provided
  const sortColumn = criteria.sortColumn && allowedSortColumns.includes(criteria.sortColumn)
    ? criteria.sortColumn
    : 'id';
  const sortOrder = criteria.sortOrder && allowedSortOrders.includes(criteria.sortOrder)
    ? criteria.sortOrder
    : 'ASC';

  let sql = `SELECT * FROM ${tableName}`;
  const params: any[] = [];

  if (criteria.filterColumn && criteria.filterValue !== undefined && criteria.filterValue !== null) {
    sql += ` WHERE ${criteria.filterColumn} = $1`;
    params.push(criteria.filterValue);
  }

  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  return { sql, params };
}

/**
 * Executes a database search using raw SQL.
 * @param query - The function that builds the SQL query.
 * @param executeQuery - A function to execute the query and return results.
 * @returns The search results.
 */
export async function executeSearch<T>(
  queryBuilder: (criteria: SearchCriteria) => { sql: string; params: any[] },
  criteria: SearchCriteria,
  executeQuery: (sql: string, params: any[]) => Promise<T[]>
): Promise<T[]> {
  const { sql, params } = queryBuilder(criteria);
  return executeQuery(sql, params);
}