import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const groups = await prisma.pageGroup.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(
    groups.map((g) => ({
      id: g.id,
      name: g.name,
      color: g.color,
      pageIds: g.pageIds.split(",").map((s) => s.trim()).filter(Boolean),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { name, color, pageIds } = await req.json();
  if (!name?.trim() || !Array.isArray(pageIds) || pageIds.length < 2) {
    return NextResponse.json({ error: "Un nom et au moins deux pages sont requis." }, { status: 400 });
  }

  const group = await prisma.pageGroup.create({
    data: { name: name.trim(), color: color || "#16a34a", pageIds: pageIds.join(",") },
  });

  return NextResponse.json(
    { id: group.id, name: group.name, color: group.color, pageIds },
    { status: 201 }
  );
}
