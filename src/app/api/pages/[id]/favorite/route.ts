import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id: pageId } = await params;
  const fav = await prisma.favorite.findUnique({
    where: { userId_pageId: { userId: session.user.id, pageId } },
  });
  return NextResponse.json({ favorited: !!fav });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id: pageId } = await params;
  const userId = session.user.id;

  const existing = await prisma.favorite.findUnique({
    where: { userId_pageId: { userId, pageId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId, pageId } });
  return NextResponse.json({ favorited: true });
}
