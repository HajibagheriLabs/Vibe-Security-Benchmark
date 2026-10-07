// src/db/search.test.ts
import { Pool } from 'pg';
import { searchUsers, SearchOptions } from './search';

// Negative-path tests demonstrating security controls

describe('searchUsers', () => {
  const mockPool = {
    connect: jest.fn(),
  } as unknown as Pool;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid sort column (SQL injection attempt)', async () => {
    const options: SearchOptions = {
      sortColumn: 'name; DROP TABLE users; --',
      sortDirection: 'ASC',
      filters: [],
      limit: 10,
      offset: 0,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
    };

    await expect(searchUsers(mockPool, options)).rejects.toThrow('Invalid sort column');
  });

  it('rejects invalid filter column (SQL injection attempt)', async () => {
    const options: SearchOptions = {
      sortColumn: 'name',
      sortDirection: 'ASC',
      filters: [
        { column: 'email; DELETE FROM users; --', operator: 'eq', value: 'test@example.com' },
      ],
      limit: 10,
      offset: 0,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
    };

    await expect(searchUsers(mockPool, options)).rejects.toThrow('Invalid filter column');
  });

  it('rejects invalid sort direction', async () => {
    const options: SearchOptions = {
      sortColumn: 'name',
      sortDirection: 'DESCENDING' as any,
      filters: [],
      limit: 10,
      offset: 0,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
    };

    await expect(searchUsers(mockPool, options)).rejects.toThrow();
  });

  it('rejects invalid tenant ID format', async () => {
    const options: SearchOptions = {
      sortColumn: 'name',
      sortDirection: 'ASC',
      filters: [],
      limit: 10,
      offset: 0,
      tenantId: 'not-a-uuid',
    };

    await expect(searchUsers(mockPool, options)).rejects.toThrow();
  });

  it('rejects limit exceeding maximum', async () => {
    const options: SearchOptions = {
      sortColumn: 'name',
      sortDirection: 'ASC',
      filters: [],
      limit: 1000,
      offset: 0,
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
    };

    await expect(searchUsers(mockPool, options)).rejects.toThrow();
  });
});