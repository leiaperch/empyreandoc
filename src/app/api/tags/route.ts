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

  const dbNames = new Set(dbTags.map((t) => t.name));
  const extraNames: string[] = [];
  for (const p of pages) {
    for (const t of p.tags.split(",").map((s) => s.trim()).filter(Boolean)) {
      if (!dbNames.has(t)) extraNames.push(t);
    }
  }

  const FALLBACK_COLORS = ["#16a34a","#7c3aed","#2563eb","#d97706","#dc2626","#0891b2","#db2777","#65a30d"];
  const extras = Array.from(new Set(extraNames)).map((name, i) => ({
    id: name,
    name,
    color: FALLBACK_COLORS[i % FALLBACK_COLORS.length],
    icon: null,
  }));

  return NextResponse.json([...dbTags, ...extras]);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { name, color, icon } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const tag = await prisma.tag.upsert({
    where: { name: name.trim() },
    update: { ...(color && { color }), ...(icon !== undefined && { icon }) },
    create: { name: name.trim(), color: color ?? "#10b981", icon: icon ?? null },
  });
  return NextResponse.json(tag, { status: 201 });
}
