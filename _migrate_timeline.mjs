import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

await client.execute(`
  CREATE TABLE IF NOT EXISTS "TimelineEvent" (
    "id"          TEXT NOT NULL PRIMARY KEY,
    "title"       TEXT NOT NULL,
    "date"        TEXT NOT NULL DEFAULT '',
    "sortKey"     INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "color"       TEXT NOT NULL DEFAULT '#16a34a',
    "pageId"      TEXT,
    "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);
console.log("✅ Table TimelineEvent créée");
process.exit(0);
