import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;

  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { order: "asc" },
    include: {
      children: {
        orderBy: { order: "asc" },
      },
    },
  });

  // Narras cannot see restricted categories unless archived (accomplished)
  const filtered = categories
    .map((cat) => ({
      ...cat,
      children: cat.children.filter(
        (c) => role === "SCENAR" || !c.restricted || c.archived
      ),
    }))
    .filter((cat) => role === "SCENAR" || !cat.restricted || cat.archived);

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR") {
    return NextResponse.json({ error: "Seuls les scénaristes peuvent créer des rubriques." }, { status: 403 });
  }

  const { name, slug, icon, restricted, parentId, order } = await req.json();
  if (!name || !slug) {
    return NextResponse.json({ error: "Nom et slug requis." }, { status: 400 });
  }

  const category = await prisma.category.create({
    data: { name, slug, icon, restricted: !!restricted, parentId: parentId ?? null, order: order ?? 0 },
  });

  return NextResponse.json(category, { status: 201 });
}
