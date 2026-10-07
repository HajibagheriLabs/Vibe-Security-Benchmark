import { Pool } from 'pg';
import { searchDatabase, createDatabasePool, SearchParams, FilterCriterion, SortSpec } from './search';

/**
 * Example usage of the database search function
 */
async function exampleUsage(): Promise<void> {
  // Create a connection pool
  const pool: Pool = createDatabasePool({
    host: 'localhost',
    port: 5432,
    database: 'myapp',
    user: 'app_user',
    password: 'secret',
  });

  try {
    // Example 1: Basic search with filters and dynamic sort
    const filters: FilterCriterion[] = [
      { column: 'status', operator: 'eq', value: 'active' },
      { column: 'age', operator: 'gte', value: 18 },
      { column: 'name', operator: 'like', value: '%John%' },
      { column: 'department', operator: 'in', value: ['Engineering', 'Sales'] },
    ];

    const sort: SortSpec = { column: 'created_at', direction: 'DESC' };

    const params: SearchParams = {
      table: 'users',
      filters,
      sort,
      limit: 25,
      offset: 0,
      columns: ['id', 'name', 'email', 'age', 'status', 'created_at'],
    };

    const result = await searchDatabase(pool, params);
    console.log(`Found ${result.totalCount} users`);
    console.log(`Page ${result.page} of ${result.totalPages}`);
    console.log(result.rows);

    // Example 2: Search with null filter and no sort
    const nullFilterParams: SearchParams = {
      table: 'orders',
      filters: [
        { column: 'shipped_at', operator: 'isNull' },
        { column: 'total_amount', operator: 'gt', value: 100 },
      ],
      limit: 10,
      offset: 0,
    };

    const nullFilterResult = await searchDatabase(pool, nullFilterParams);
    console.log(`Unshipped orders over $100: ${nullFilterResult.totalCount}`);

    // Example 3: Dynamic sort column from user input (validated internally)
    const userProvidedSortColumn = 'last_login'; // Could come from request query params
    const dynamicSortParams: SearchParams = {
      table: 'users',
      sort: { column: userProvidedSortColumn, direction: 'ASC' },
      limit: 50,
      offset: 0,
    };

    const dynamicSortResult = await searchDatabase(pool, dynamicSortParams);
    console.log(`Users sorted by ${userProvidedSortColumn}:`, dynamicSortResult.rows);
  } finally {
    await pool.end();
  }
}

// Run the example (commented out to avoid accidental execution)
// exampleUsage().catch(console.error);