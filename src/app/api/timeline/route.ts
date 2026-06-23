import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const events = await prisma.timelineEvent.findMany({
    orderBy: [{ sortKey: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;
  if (role !== "SCENAR" && role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
  }

  const { title, date, sortKey, description, color, pageId } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "Titre requis." }, { status: 400 });

  const event = await prisma.timelineEvent.create({
    data: {
      title: title.trim(),
      date: date ?? "",
      sortKey: Number.isFinite(sortKey) ? sortKey : 0,
      description: description ?? "",
      color: color ?? "#16a34a",
      pageId: pageId || null,
    },
  });
  return NextResponse.json(event, { status: 201 });
}
