import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Create Tag table
await client.execute(`
  CREATE TABLE IF NOT EXISTS "Tag" (
    "id"    TEXT NOT NULL PRIMARY KEY,
    "name"  TEXT NOT NULL UNIQUE,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "icon"  TEXT
  )
`);
console.log("✅ Table Tag créée");

// Collect all existing tags from pages
const pages = await client.execute(`SELECT "tags" FROM "Page" WHERE "tags" != ''`);
const tagSet = new Set();
for (const row of pages.rows) {
  for (const t of row.tags.split(",").map(s => s.trim()).filter(Boolean)) {
    tagSet.add(t);
  }
}

// Insert tags that don't exist yet
const COLORS = ["#16a34a","#7c3aed","#2563eb","#d97706","#dc2626","#0891b2","#db2777","#65a30d"];
let i = 0;
for (const name of tagSet) {
  const id = `tag-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  const color = COLORS[i % COLORS.length];
  await client.execute({
    sql: `INSERT OR IGNORE INTO "Tag" ("id","name","color") VALUES (?,?,?)`,
    args: [id, name, color],
  });
  console.log(`  + tag "${name}" → ${color}`);
  i++;
}

console.log(`✅ ${tagSet.size} tags migrés`);
process.exit(0);
