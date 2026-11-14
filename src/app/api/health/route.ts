import { NextResponse } from "next/server";
import { createLogger } from "../../../lib/logger";

const logger = createLogger("health");

export async function GET() {
  try {
    const { pool } = await import("../../../lib/db");
    await pool.query("SELECT 1");
    return NextResponse.json({
      status: "ok",
      message: "Database connection successful",
    });
  } catch (error) {
    logger.error({ err: error }, "Health check failed");
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
