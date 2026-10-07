// database/search.test.ts
import { Pool } from "pg";
import { searchUsers, SearchParams } from "./search";

/**
 * SECURITY: Negative-path tests verify that invalid sort columns and
 * malicious filter values are rejected before reaching the database.
 */

describe("searchUsers", () => {
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    } as unknown as jest.Mocked<Pool>;
  });

  it("rejects invalid sort column (SQL injection attempt)", async () => {
    const maliciousParams = {
      sortColumn: "id; DROP TABLE users; --",
      sortDirection: "ASC",
      filters: {},
    } as unknown as SearchParams;

    await expect(searchUsers(mockPool, maliciousParams)).rejects.toThrow();
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("rejects invalid sort direction", async () => {
    const maliciousParams = {
      sortColumn: "name",
      sortDirection: "ASC; DROP TABLE users; --",
      filters: {},
    } as unknown as SearchParams;

    await expect(searchUsers(mockPool, maliciousParams)).rejects.toThrow();
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("rejects filter values with SQL injection payloads", async () => {
    const maliciousParams = {
      sortColumn: "name",
      sortDirection: "ASC",
      filters: {
        name: "'; DROP TABLE users; --",
      },
    };

    await expect(searchUsers(mockPool, maliciousParams)).rejects.toThrow();
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("uses bound parameters for all filter values", async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: "0" }] })
      .mockResolvedValueOnce({ rows: [] });

    const params: SearchParams = {
      sortColumn: "name",
      sortDirection: "ASC",
      filters: {
        name: "test",
        isActive: true,
      },
      limit: 10,
      offset: 0,
    };

    await searchUsers(mockPool, params);

    // Verify bound parameters are passed separately, not interpolated
    const [query, boundParams] = mockPool.query.mock.calls[0];
    expect(query).toContain("$1");
    expect(query).toContain("$2");
    expect(boundParams).toContain("%test%");
    expect(boundParams).toContain(true);
    expect(query).not.toContain("'test'");
    expect(query).not.toContain("true");
  });

  it("resolves sort column from allowlist only", async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ total: "0" }] })
      .mockResolvedValueOnce({ rows: [] });

    const params: SearchParams = {
      sortColumn: "created_at",
      sortDirection: "DESC",
      filters: {},
      limit: 20,
      offset: 5,
    };

    await searchUsers(mockPool, params);

    const dataQuery = mockPool.query.mock.calls[1][0] as string;
    expect(dataQuery).toContain("ORDER BY created_at DESC");
    expect(dataQuery).not.toContain("ORDER BY");
    expect(dataQuery).not.toContain("created_at DESC;");
  });
});