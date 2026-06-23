"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import { Share2 } from "lucide-react";

interface GraphNode {
  id: string;
  title: string;
  icon: string;
  category: string;
}
interface GraphEdge {
  source: string;
  target: string;
}

const COLORS = ["#16a34a","#7c3aed","#2563eb","#d97706","#dc2626","#0891b2","#db2777","#65a30d"];

export default function GraphPage() {
  const { status } = useSession();
  const router = useRouter();
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch("/api/graph")
      .then((r) => r.ok ? r.json() : { nodes: [], edges: [] })
      .then((data) => { setNodes(data.nodes); setEdges(data.edges); setLoading(false); });
  }, [status]);

  const size = 720;
  const center = size / 2;
  const radius = size / 2 - 90;

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(nodes.length, 1) - Math.PI / 2;
      map.set(n.id, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    });
    return map;
  }, [nodes, center, radius]);

  const categoryColor = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const n of nodes) {
      if (!map.has(n.category)) { map.set(n.category, COLORS[i % COLORS.length]); i++; }
    }
    return map;
  }, [nodes]);

  const neighbors = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const e of edges) {
      if (!map.has(e.source)) map.set(e.source, new Set());
      if (!map.has(e.target)) map.set(e.target, new Set());
      map.get(e.source)!.add(e.target);
      map.get(e.target)!.add(e.source);
    }
    return map;
  }, [edges]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <Share2 size={18} className="text-green-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Graphe de liens</h1>
            <p className="text-sm text-gray-400">
              {nodes.length} page{nodes.length !== 1 ? "s" : ""} connectée{nodes.length !== 1 ? "s" : ""} · {edges.length} lien{edges.length !== 1 ? "s" : ""}
            </p>
          </div>
        </header>

        <div className="p-6 flex items-center justify-center">
          {nodes.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Share2 size={48} className="mx-auto mb-3 opacity-25" />
              <p className="text-lg font-medium text-gray-500">Aucune connexion trouvée</p>
              <p className="text-sm mt-1">Ajoutez des liens vers d&apos;autres pages ou des mentions @personnage pour les voir apparaître ici.</p>
            </div>
          ) : (
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="max-w-full">
              {edges.map((e, i) => {
                const a = positions.get(e.source);
                const b = positions.get(e.target);
                if (!a || !b) return null;
                const dimmed = hovered && !(e.source === hovered || e.target === hovered);
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={dimmed ? "#e5e7eb" : "#16a34a"}
                    strokeOpacity={dimmed ? 0.4 : 0.5}
                    strokeWidth={1.5}
                  />
                );
              })}
              {nodes.map((n) => {
                const pos = positions.get(n.id);
                if (!pos) return null;
                const isHovered = hovered === n.id;
                const isNeighbor = hovered && neighbors.get(hovered)?.has(n.id);
                const dimmed = hovered && !isHovered && !isNeighbor;
                return (
                  <g
                    key={n.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => router.push(`/doc/${n.id}`)}
                    style={{ cursor: "pointer", opacity: dimmed ? 0.35 : 1 }}
                  >
                    <circle r={isHovered ? 22 : 18} fill={categoryColor.get(n.category) ?? "#16a34a"} fillOpacity={0.15} stroke={categoryColor.get(n.category) ?? "#16a34a"} strokeWidth={1.5} />
                    <text textAnchor="middle" dominantBaseline="central" fontSize={16}>{n.icon}</text>
                    <text
                      textAnchor="middle"
                      y={34}
                      fontSize={11}
                      fontWeight={isHovered ? 700 : 500}
                      fill={isHovered ? "#14532d" : "#374151"}
                    >
                      {n.title.length > 18 ? n.title.slice(0, 16) + "…" : n.title}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </main>
    </div>
  );
}
