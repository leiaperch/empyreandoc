import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Compte les lignes d'une table via SQL brut (n'utilise aucune colonne récente,
// donc fonctionne même si le schéma est en décalage avec le client Prisma).
async function countRows(table: string): Promise<number | string> {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT count(*) AS n FROM "${table}"`
    )) as Array<{ n: number | bigint }>;
    return Number(rows[0]?.n ?? 0);
  } catch (e) {
    return `erreur: ${e instanceof Error ? e.message : String(e)}`;
  }
}

// GET : état de la base (pour vérifier que les données sont toujours là).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });

  const [pages, categories, users, tags, timeline] = await Promise.all([
    countRows("Page"),
    countRows("Category"),
    countRows("User"),
    countRows("Tag"),
    countRows("TimelineEvent"),
  ]);

  return NextResponse.json({ pages, categories, users, tags, timeline });
}

// Instructions de migration idempotentes (n'effacent JAMAIS de données).
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#10b981',
    "icon" TEXT,
    "group" TEXT
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_key" ON "Tag"("name")`,
  `ALTER TABLE "Tag" ADD COLUMN "group" TEXT`,
  `CREATE TABLE IF NOT EXISTS "TimelineEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL DEFAULT '',
    "sortKey" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#16a34a',
    "pageId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE "Page" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0`,
];

// POST : applique les migrations manquantes (colonnes/tables récentes).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Réservé aux admins." }, { status: 403 });

  const report: string[] = [];
  for (const sql of STATEMENTS) {
    const label = sql.trim().split("\n")[0].slice(0, 70);
    try {
      await prisma.$executeRawUnsafe(sql);
      report.push(`✅ ${label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // "duplicate column name" = déjà appliqué : sans gravité.
      report.push(`⏭️ ${label} → ${msg}`);
    }
  }

  const pagesAfter = await countRows("Page");
  return NextResponse.json({ report, pagesAfter });
}
