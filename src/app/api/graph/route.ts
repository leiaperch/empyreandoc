import { NextResponse } from "next/server";
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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;

  const pages = await prisma.page.findMany({
    select: {
      id: true,
      title: true,
      content: true,
      linkedPageIds: true,
      category: { select: { name: true, icon: true, restricted: true, archived: true } },
    },
  });

  const accessible = pages.filter((p) => canAccessCategory(p.category, role));
  const idSet = new Set(accessible.map((p) => p.id));

  const nodes = accessible.map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.category.icon ?? "📄",
    category: p.category.name,
  }));

  const edgeSet = new Set<string>();
  const edges: { source: string; target: string }[] = [];

  const addEdge = (source: string, target: string) => {
    if (source === target) return;
    if (!idSet.has(source) || !idSet.has(target)) return;
    const key = [source, target].sort().join("::");
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ source, target });
  };

  for (const p of accessible) {
    for (const linkedId of p.linkedPageIds.split(",").map((s) => s.trim()).filter(Boolean)) {
      addEdge(p.id, linkedId);
    }
    const hrefMatches = Array.from(p.content.matchAll(/href="\/doc\/([a-zA-Z0-9]+)"/g));
    for (const m of hrefMatches) addEdge(p.id, m[1]);
    const mentionMatches = Array.from(p.content.matchAll(/data-mention-id="([a-zA-Z0-9]+)"/g));
    for (const m of mentionMatches) addEdge(p.id, m[1]);
  }

  // Keep only nodes that have at least one connection to avoid clutter
  const connected = new Set<string>();
  for (const e of edges) { connected.add(e.source); connected.add(e.target); }

  return NextResponse.json({
    nodes: nodes.filter((n) => connected.has(n.id)),
    edges,
  });
}
