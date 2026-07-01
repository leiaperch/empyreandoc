import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const relations = await prisma.pageRelation.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(relations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { pageAId, pageBId, type, color } = await req.json();
  if (!pageAId || !pageBId || pageAId === pageBId) {
    return NextResponse.json({ error: "Deux pages distinctes sont requises." }, { status: 400 });
  }

  const relType = type?.trim() || "Lié";
  const relColor = color || "#16a34a";

  const [rel] = await prisma.$transaction([
    prisma.pageRelation.create({ data: { pageAId, pageBId, type: relType, color: relColor } }),
    prisma.pageRelation.create({ data: { pageAId: pageBId, pageBId: pageAId, type: relType, color: relColor } }),
  ]);

  return NextResponse.json(rel, { status: 201 });
}
