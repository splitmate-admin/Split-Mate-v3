import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema";

const { Pool } = pkg;

const env = process.env;
const hasSqlConfig = !!env.SQL_HOST;

export const createPool = () => {
  if (!hasSqlConfig) return null;
  return new Pool({
    host: env.SQL_HOST,
    user: env.SQL_USER,
    password: env.SQL_PASSWORD,
    database: env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  });
};

const pool = createPool();

if (pool) {
  pool.on("error", (err) => {
    console.error("Unexpected error on idle SQL pool client:", err);
  });
}

export const db = pool ? drizzle(pool, { schema }) : null;
