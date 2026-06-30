import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  // Return Tag objects from DB; fall back to mining page tags for any not yet registered
  const [dbTags, pages] = await Promise.all([
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
    prisma.page.findMany({ select: { tags: true } }),
  ]);

  // Compte le nombre de pages portant chaque tag.
  const counts = new Map<string, number>();
  for (const p of pages) {
    for (const t of p.tags.split(",").map((s) => s.trim()).filter(Boolean)) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }

  const dbNames = new Set(dbTags.map((t) => t.name));
  const extraNames = Array.from(counts.keys()).filter((name) => !dbNames.has(name));

  const FALLBACK_COLORS = ["#16a34a","#7c3aed","#2563eb","#d97706","#dc2626","#0891b2","#db2777","#65a30d"];
  const extras = extraNames.map((name, i) => ({
    id: name,
    name,
    color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    icon: null,
    group: null,
  }));

  const withCount = [...dbTags, ...extras].map((t) => ({ ...t, count: counts.get(t.name) ?? 0 }));
  return NextResponse.json(withCount);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { name, color, icon, group } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const tag = await prisma.tag.upsert({
    where: { name: name.trim() },
    update: { ...(color && { color }), ...(icon !== undefined && { icon }), ...(group !== undefined && { group }) },
    create: { name: name.trim(), color: color ?? "#10b981", icon: icon ?? null, group: group ?? null },
  });
  return NextResponse.json(tag, { status: 201 });
}
