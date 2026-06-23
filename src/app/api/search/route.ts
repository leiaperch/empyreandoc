import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripSecretBlocks } from "@/lib/secrets";

function canAccessCategory(
  category: { restricted: boolean; archived: boolean },
  role: string
): boolean {
  if (role === "SCENAR" || role === "ADMIN") return true;
  return !category.restricted || category.archived;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json([]);

  const pages = await prisma.page.findMany({
    where: {
      OR: [
        { title: { contains: q } },
        { content: { contains: q } },
        { tags: { contains: q } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      content: true,
      tags: true,
      category: { select: { name: true, icon: true, restricted: true, archived: true } },
    },
  });

  const accessible = pages
    .filter((p) => canAccessCategory(p.category, role))
    .slice(0, 20)
    .map((p) => {
      const rawContent = role === "NARRA" ? stripSecretBlocks(p.content) : p.content;
      const plain = rawContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const idx = plain.toLowerCase().indexOf(q.toLowerCase());
      const snippet =
        idx >= 0
          ? `…${plain.slice(Math.max(0, idx - 40), idx + 80)}…`
          : plain.slice(0, 100);
      return {
        id: p.id,
        title: p.title,
        category: { name: p.category.name, icon: p.category.icon },
        snippet,
      };
    });

  return NextResponse.json(accessible);
}
