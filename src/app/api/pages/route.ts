import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccessCategory(
  category: { restricted: boolean; archived: boolean },
  role: string
): boolean {
  if (role === "SCENAR") return true;
  // Narras can access restricted categories only if archived (accomplished)
  return !category.restricted || category.archived;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const pages = await prisma.page.findMany({
    where: categoryId ? { categoryId } : undefined,
    orderBy: { updatedAt: "desc" },
    include: {
      category: true,
      author: { select: { id: true, name: true, role: true } },
      _count: { select: { attachments: true } },
    },
  });

  const accessible = pages.filter((p) => canAccessCategory(p.category, role));

  return NextResponse.json(accessible);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id: userId, role } = session.user;
  const { title, categoryId, content, tags } = await req.json();

  if (!title || !categoryId) {
    return NextResponse.json({ error: "Titre et rubrique requis." }, { status: 400 });
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) return NextResponse.json({ error: "Rubrique introuvable." }, { status: 404 });

  if (!canAccessCategory(category, role)) {
    return NextResponse.json({ error: "Accès refusé à cette rubrique." }, { status: 403 });
  }

  const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
  const page = await prisma.page.create({
    data: { title, content: content ?? "", slug, categoryId, authorId: userId, tags: tags ?? "" },
    include: { category: true, author: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(page, { status: 201 });
}
