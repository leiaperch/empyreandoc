import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const pageId = formData.get("pageId") as string | null;

  if (!file || !pageId) {
    return NextResponse.json({ error: "Fichier et pageId requis." }, { status: 400 });
  }

  // Validate file size (max 10 MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)." }, { status: 413 });
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });

  const uploadDir = path.join(process.cwd(), "public", "uploads", pageId);
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = path.join(uploadDir, fileName);
  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const url = `/uploads/${pageId}/${fileName}`;
  const attachment = await prisma.attachment.create({
    data: {
      name: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      pageId,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
