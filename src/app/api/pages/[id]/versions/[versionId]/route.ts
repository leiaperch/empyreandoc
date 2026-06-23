import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role, id: userId } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { id: pageId, versionId } = await params;

  const [page, version] = await Promise.all([
    prisma.page.findUnique({ where: { id: pageId } }),
    prisma.pageVersion.findUnique({ where: { id: versionId } }),
  ]);
  if (!page || !version || version.pageId !== pageId) {
    return NextResponse.json({ error: "Version introuvable." }, { status: 404 });
  }

  // Snapshot current state before restoring, so it isn't lost
  await prisma.pageVersion.create({
    data: { pageId, title: page.title, content: page.content, tags: page.tags, authorId: userId },
  });

  const updated = await prisma.page.update({
    where: { id: pageId },
    data: { title: version.title, content: version.content, tags: version.tags },
    include: {
      category: true,
      author: { select: { id: true, name: true, role: true } },
      attachments: true,
    },
  });

  return NextResponse.json(updated);
}
