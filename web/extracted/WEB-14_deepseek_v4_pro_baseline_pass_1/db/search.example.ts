import { Pool } from 'pg';
import { searchDatabase, SearchOptions } from './search';

async function example(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const options: SearchOptions = {
    table: 'users',
    columns: ['id', 'name', 'email', 'created_at'],
    filters: [
      { column: 'status', operator: '=', value: 'active' },
      { column: 'created_at', operator: '>=', value: '2024-01-01' },
      { column: 'email', operator: 'ILIKE', value: '%@example.com' },
      { column: 'id', operator: 'IN', value: [1, 2, 3, 4, 5] },
      { column: 'deleted_at', operator: 'IS NULL' },
    ],
    sortColumn: 'created_at',
    sortDirection: 'DESC',
    limit: 50,
    offset: 0,
  };

  const users = await searchDatabase<{
    id: number;
    name: string;
    email: string;
    created_at: Date;
  }>(pool, options);

  console.log(`Found ${users.length} users`);
  for (const user of users) {
    console.log(`${user.id}: ${user.name} <${user.email}>`);
  }

  await pool.end();
}