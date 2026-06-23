import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const pages = await prisma.page.findMany({
    where: { category: { parent: { slug: "personnages" } } },
    select: { id: true, title: true, category: { select: { name: true } } },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(
    pages.map((p) => ({ id: p.id, title: p.title, joueur: p.category.name }))
  );
}
