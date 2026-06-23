-- ============================================================
-- EmpyreanDoc — migrations incrémentales (Turso / libSQL / SQLite)
-- À appliquer sur une base DÉJÀ existante.
--
-- Turso CLI :   turso db shell <nom-de-la-base> < migrate.sql
--
-- Note : SQLite ne gère pas "ADD COLUMN IF NOT EXISTS".
-- Si une colonne existe déjà, vous obtiendrez « duplicate column name »
-- — c'est sans danger, passez à la suite.
-- ============================================================

-- ── Table Tag (si absente) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS "Tag" (
  "id"    TEXT NOT NULL PRIMARY KEY,
  "name"  TEXT NOT NULL UNIQUE,
  "color" TEXT NOT NULL DEFAULT '#10b981',
  "icon"  TEXT,
  "group" TEXT
);

-- ── Colonne Tag.group (si la table existait déjà sans) ──────
ALTER TABLE "Tag" ADD COLUMN "group" TEXT;

-- ── Table TimelineEvent (chronologie) ───────────────────────
CREATE TABLE IF NOT EXISTS "TimelineEvent" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "title"       TEXT NOT NULL,
  "date"        TEXT NOT NULL DEFAULT '',
  "sortKey"     INTEGER NOT NULL DEFAULT 0,
  "description" TEXT NOT NULL DEFAULT '',
  "color"       TEXT NOT NULL DEFAULT '#16a34a',
  "pageId"      TEXT,
  "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ── Colonne Page.order (glisser-déposer des pages) ──────────
ALTER TABLE "Page" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
