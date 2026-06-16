import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;
  const { name, icon } = await req.json();

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
    },
  });

  return NextResponse.json(category);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id } = await params;

  const category = await prisma.category.findUnique({
    where: { id },
    include: { children: { include: { children: true } } },
  });
  if (!category) return NextResponse.json({ error: "Rubrique introuvable." }, { status: 404 });

  // Delete pages and sub-categories recursively (depth 2)
  for (const child of category.children ?? []) {
    for (const grandchild of child.children ?? []) {
      await prisma.page.deleteMany({ where: { categoryId: grandchild.id } });
      await prisma.category.delete({ where: { id: grandchild.id } });
    }
    await prisma.page.deleteMany({ where: { categoryId: child.id } });
    await prisma.category.delete({ where: { id: child.id } });
  }
  await prisma.page.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
