import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const pages = await prisma.page.findMany({ select: { tags: true } });

  const tagSet = new Set<string>();
  for (const p of pages) {
    for (const t of p.tags.split(",").map((s) => s.trim()).filter(Boolean)) {
      tagSet.add(t);
    }
  }

  return NextResponse.json(Array.from(tagSet).sort());
}
