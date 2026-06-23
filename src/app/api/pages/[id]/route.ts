import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripSecretBlocks } from "@/lib/secrets";

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

  // Les narrateurs ne reçoivent jamais le contenu des blocs secrets (MJ-only).
  if (role === "NARRA") {
    return NextResponse.json({ ...page, content: stripSecretBlocks(page.content) });
  }

  return NextResponse.json(page);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role, id: userId } = session.user;
  const { id } = await params;
  const { title, content, archived, tags, linkedPageIds, createVersion } = await req.json();

  const page = await prisma.page.findUnique({ where: { id }, include: { category: true } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  if (!canAccessCategory(page.category, role)) {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const contentChanged =
    (title !== undefined && title !== page.title) ||
    (content !== undefined && content !== page.content);

  if (createVersion && contentChanged) {
    await prisma.pageVersion.create({
      data: { pageId: id, title: page.title, content: page.content, tags: page.tags, authorId: userId },
    });
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

  if (contentChanged) {
    const followers = await prisma.favorite.findMany({
      where: { pageId: id, userId: { not: userId } },
      select: { userId: true },
    });
    if (followers.length > 0) {
      await prisma.notification.createMany({
        data: followers.map((f) => ({
          userId: f.userId,
          pageId: id,
          message: `« ${updated.title} » a été mise à jour.`,
        })),
      });
    }
  }

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
