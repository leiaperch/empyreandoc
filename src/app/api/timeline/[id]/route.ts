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
  const { title, date, sortKey, description, color, pageId } = await req.json();

  const event = await prisma.timelineEvent.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(date !== undefined && { date }),
      ...(sortKey !== undefined && Number.isFinite(sortKey) && { sortKey }),
      ...(description !== undefined && { description }),
      ...(color !== undefined && { color }),
      ...(pageId !== undefined && { pageId: pageId || null }),
    },
  });
  return NextResponse.json(event);
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
  await prisma.timelineEvent.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
