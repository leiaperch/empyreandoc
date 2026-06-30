import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Recolore (et/ou renomme) TOUS les liens d'un type donné en une fois.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { type, color, newType } = await req.json();
  if (!type) return NextResponse.json({ error: "type requis." }, { status: 400 });

  const result = await prisma.pageRelation.updateMany({
    where: { type },
    data: {
      ...(color && { color }),
      ...(newType?.trim() && { type: newType.trim() }),
    },
  });

  return NextResponse.json({ updated: result.count });
}
