import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { name: oldName } = await params;
  const decoded = decodeURIComponent(oldName);
  const { name: newName, color, icon, group } = await req.json();

  // If renaming, update all pages that reference this tag
  if (newName && newName.trim() !== decoded) {
    const pages = await prisma.page.findMany({ select: { id: true, tags: true } });
    for (const p of pages) {
      const tagList = p.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.includes(decoded)) {
        const updated = tagList.map((t) => t === decoded ? newName.trim() : t).join(",");
        await prisma.page.update({ where: { id: p.id }, data: { tags: updated } });
      }
    }
  }

  const tag = await prisma.tag.upsert({
    where: { name: decoded },
    update: {
      ...(newName?.trim() && { name: newName.trim() }),
      ...(color && { color }),
      ...(icon !== undefined && { icon }),
      ...(group !== undefined && { group }),
    },
    create: {
      name: newName?.trim() ?? decoded,
      color: color ?? "#10b981",
      icon: icon ?? null,
      group: group ?? null,
    },
  });

  return NextResponse.json(tag);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { name } = await params;
  const decoded = decodeURIComponent(name);

  try {
    await prisma.tag.delete({ where: { name: decoded } });
  } catch {
    // Tag might not be in DB yet, that's fine
  }
  return NextResponse.json({ success: true });
}
