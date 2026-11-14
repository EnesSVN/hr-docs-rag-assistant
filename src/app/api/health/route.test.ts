import { GET } from "./route";
import { describe, it, expect, vi } from "vitest";
import { pool } from "../../../lib/db";

vi.mock("../../../lib/db", () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe("Health API", () => {
  const mockedQuery = vi.mocked(
    pool.query as unknown as ReturnType<typeof vi.fn>,
  );

  it("should return status ok", async () => {
    mockedQuery.mockResolvedValue({
      rows: [],
      rowCount: 0,
      command: "SELECT 1",
    } as unknown);
    const response = await GET();
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(response.status).toBe(200);
  });

  it("should return status error when database connection fails", async () => {
    mockedQuery.mockRejectedValue(new Error("Database connection failed"));
    const response = await GET();
    const data = await response.json();
    expect(data.status).toBe("error");
    expect(response.status).toBe(500);
  });
});
