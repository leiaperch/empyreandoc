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
  const { id } = await params;

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      category: true,
      author: { select: { id: true, name: true, role: true } },
      attachments: true,
    },
  });

  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (!canAccessCategory(page.category, role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  return NextResponse.json(page);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const { id } = await params;
  const { title, content, archived, tags, linkedPageIds } = await req.json();

  const page = await prisma.page.findUnique({ where: { id }, include: { category: true } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (!canAccessCategory(page.category, role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const updated = await prisma.page.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(archived !== undefined && { archived }),
      ...(tags !== undefined && { tags }),
      ...(linkedPageIds !== undefined && { linkedPageIds }),
    },
    include: {
      category: true,
      author: { select: { id: true, name: true, role: true } },
      attachments: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const { id } = await params;

  if (role !== "ADMIN" && role !== "SCENAR") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });

  await prisma.page.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
