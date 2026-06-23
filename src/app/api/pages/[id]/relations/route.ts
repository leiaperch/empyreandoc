import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canAccessCategory(
  category: { restricted: boolean; archived: boolean },
  role: string
): boolean {
  if (role === "SCENAR" || role === "ADMIN") return true;
  return !category.restricted || category.archived;
}

// Renvoie les relations typées (Allié, Ennemi, Amour…) impliquant cette page,
// avec les infos de la page « de l'autre côté » du lien.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const { id } = await params;

  const relations = await prisma.pageRelation.findMany({
    where: { OR: [{ pageAId: id }, { pageBId: id }] },
    orderBy: { createdAt: "asc" },
  });

  const otherIds = Array.from(
    new Set(relations.map((r) => (r.pageAId === id ? r.pageBId : r.pageAId)))
  );

  const others = await prisma.page.findMany({
    where: { id: { in: otherIds } },
    select: {
      id: true,
      title: true,
      category: { select: { icon: true, restricted: true, archived: true } },
    },
  });
  const byId = new Map(others.map((p) => [p.id, p]));

  const result = relations
    .map((r) => {
      const otherId = r.pageAId === id ? r.pageBId : r.pageAId;
      const other = byId.get(otherId);
      if (!other || !canAccessCategory(other.category, role)) return null;
      return {
        relationId: r.id,
        type: r.type,
        color: r.color,
        page: { id: other.id, title: other.title, icon: other.category.icon ?? "📄" },
      };
    })
    .filter(Boolean);

  return NextResponse.json(result);
}
