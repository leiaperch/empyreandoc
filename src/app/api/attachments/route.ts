import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB (GIF compris)

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const pageId = formData.get("pageId") as string | null;

  if (!file || !pageId) {
    return NextResponse.json({ error: "Fichier et pageId requis." }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 8 Mo)." }, { status: 413 });
  }

  const page = await prisma.page.findUnique({ where: { id: pageId } });
  if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;

  const attachment = await prisma.attachment.create({
    data: {
      name: file.name,
      url: dataUrl,
      mimeType: file.type,
      size: file.size,
      pageId,
    },
  });

  // Don't return the full data URL in the list response to save bandwidth;
  // return a lightweight object and keep the full URL only when needed.
  return NextResponse.json({
    id: attachment.id,
    name: attachment.name,
    url: attachment.url,
    mimeType: attachment.mimeType,
    size: attachment.size,
    pageId: attachment.pageId,
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis." }, { status: 400 });

  await prisma.attachment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
