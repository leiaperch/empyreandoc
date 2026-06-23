import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccessCategory(
  category: { restricted: boolean; archived: boolean },
  role: string
): boolean {
  if (role === "SCENAR" || role === "ADMIN") return true;
  return !category.restricted || category.archived;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const { id: pageId } = await params;

  const page = await prisma.page.findUnique({ where: { id: pageId }, include: { category: true } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (!canAccessCategory(page.category, role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const comments = await prisma.comment.findMany({
    where: { pageId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(comments);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role, id: userId } = session.user;
  const { id: pageId } = await params;
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Contenu requis." }, { status: 400 });

  const page = await prisma.page.findUnique({ where: { id: pageId }, include: { category: true } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (!canAccessCategory(page.category, role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const comment = await prisma.comment.create({
    data: { pageId, authorId: userId, content: content.trim() },
    include: { author: { select: { id: true, name: true, role: true } } },
  });

  return NextResponse.json(comment, { status: 201 });
}
