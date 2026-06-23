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

const REFERENCE_TYPE = "Référence";
const REFERENCE_COLOR = "#9ca3af";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Non autorisé." }, { status: 401 });

  const { role } = session.user;

  const [pages, relations] = await Promise.all([
    prisma.page.findMany({
      select: {
        id: true,
        title: true,
        content: true,
        linkedPageIds: true,
        category: { select: { name: true, icon: true, restricted: true, archived: true } },
      },
    }),
    prisma.pageRelation.findMany(),
  ]);

  const accessible = pages.filter((p) => canAccessCategory(p.category, role));
  const idSet = new Set(accessible.map((p) => p.id));

  const nodes = accessible.map((p) => ({
    id: p.id,
    title: p.title,
    icon: p.category.icon ?? "📄",
    category: p.category.name,
  }));

  interface Edge {
    id: string | null;
    source: string;
    target: string;
    type: string;
    color: string;
    editable: boolean;
  }

  const edges: Edge[] = [];
  const refSeen = new Set<string>();

  const addReference = (source: string, target: string) => {
    if (source === target) return;
    if (!idSet.has(source) || !idSet.has(target)) return;
    const key = [source, target].sort().join("::");
    if (refSeen.has(key)) return;
    refSeen.add(key);
    edges.push({ id: null, source, target, type: REFERENCE_TYPE, color: REFERENCE_COLOR, editable: false });
  };

  for (const p of accessible) {
    for (const linkedId of p.linkedPageIds.split(",").map((s) => s.trim()).filter(Boolean)) {
      addReference(p.id, linkedId);
    }
    const hrefMatches = Array.from(p.content.matchAll(/href="\/doc\/([a-zA-Z0-9]+)"/g));
    for (const m of hrefMatches) addReference(p.id, m[1]);
    const mentionMatches = Array.from(p.content.matchAll(/data-mention-id="([a-zA-Z0-9]+)"/g));
    for (const m of mentionMatches) addReference(p.id, m[1]);
  }

  for (const r of relations) {
    if (!idSet.has(r.pageAId) || !idSet.has(r.pageBId)) continue;
    edges.push({
      id: r.id,
      source: r.pageAId,
      target: r.pageBId,
      type: r.type,
      color: r.color,
      editable: true,
    });
  }

  // Keep only nodes that have at least one connection to avoid clutter
  const connected = new Set<string>();
  for (const e of edges) { connected.add(e.source); connected.add(e.target); }

  return NextResponse.json({
    nodes: nodes.filter((n) => connected.has(n.id)),
    edges,
  });
}
