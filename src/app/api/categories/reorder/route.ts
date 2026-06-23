import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Reçoit une liste ordonnée d'ids de catégories (mêmes frères) et écrit leur "order".
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { ids } = await req.json();
  if (!Array.isArray(ids)) return NextResponse.json({ error: "ids requis." }, { status: 400 });

  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.category.update({ where: { id }, data: { order: index } })
    )
  );

  return NextResponse.json({ success: true });
}
