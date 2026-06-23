"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Share2, Plus, X, Trash2, Check, ArrowLeft } from "lucide-react";

interface GraphNode {
  id: string;
  title: string;
  icon: string;
  category: string;
}
interface GraphEdge {
  id: string | null;
  source: string;
  target: string;
  type: string;
  color: string;
  editable: boolean;
}

const RELATION_PRESETS = [
  { type: "Allié", color: "#16a34a" },
  { type: "Ennemi", color: "#dc2626" },
  { type: "Famille", color: "#2563eb" },
  { type: "Amour", color: "#db2777" },
  { type: "Mentor", color: "#7c3aed" },
  { type: "Rival", color: "#d97706" },
  { type: "Secret", color: "#0891b2" },
  { type: "Autre", color: "#6b7280" },
];

export default function GraphPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as { role?: string })?.role;
  const canManage = role === "SCENAR" || role === "ADMIN";

  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [searchA, setSearchA] = useState("");
  const [searchB, setSearchB] = useState("");
  const [pageA, setPageA] = useState<GraphNode | null>(null);
  const [pageB, setPageB] = useState<GraphNode | null>(null);
  const [newType, setNewType] = useState("Allié");
  const [newColor, setNewColor] = useState("#16a34a");
  const [creating, setCreating] = useState(false);

  const [editEdge, setEditEdge] = useState<{ id: string | null; source: string; target: string; type: string; color: string; x: number; y: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchGraph = useCallback(() => {
    setLoading(true);
    fetch("/api/graph")
      .then((r) => r.ok ? r.json() : { nodes: [], edges: [] })
      .then((data) => { setNodes(data.nodes); setEdges(data.edges); setLoading(false); });
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchGraph();
  }, [status, fetchGraph]);

  // For creating relations, search among ALL pages, not just already-connected ones
  const [allPages, setAllPages] = useState<GraphNode[]>([]);
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/pages").then((r) => r.ok ? r.json() : []).then((data) =>
      setAllPages(data.map((p: { id: string; title: string; category: { name: string; icon: string | null } }) => ({
        id: p.id, title: p.title, icon: p.category.icon ?? "📄", category: p.category.name,
      })))
    );
  }, [status]);

  const size = 720;
  const center = size / 2;
  const radius = size / 2 - 90;

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

  const focusedNode = focusedNodeId ? nodes.find((n) => n.id === focusedNodeId) ?? null : null;

  // Reset focus if the focused node disappeared (e.g. its last relation was deleted)
  useEffect(() => {
    if (focusedNodeId && !focusedNode) setFocusedNodeId(null);
  }, [focusedNodeId, focusedNode]);

  const displayNodes = useMemo(() => {
    if (!focusedNode) return nodes;
    const ids = neighbors.get(focusedNode.id) ?? new Set<string>();
    return nodes.filter((n) => n.id === focusedNode.id || ids.has(n.id));
  }, [nodes, focusedNode, neighbors]);

  const displayEdges = useMemo(() => {
    if (!focusedNode) return edges;
    return edges.filter((e) => e.source === focusedNode.id || e.target === focusedNode.id);
  }, [edges, focusedNode]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    if (focusedNode) {
      map.set(focusedNode.id, { x: center, y: center });
      const others = displayNodes.filter((n) => n.id !== focusedNode.id);
      const innerRadius = radius * 0.62;
      others.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / Math.max(others.length, 1) - Math.PI / 2;
        map.set(n.id, {
          x: center + innerRadius * Math.cos(angle),
          y: center + innerRadius * Math.sin(angle),
        });
      });
      return map;
    }
    displayNodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / Math.max(displayNodes.length, 1) - Math.PI / 2;
      map.set(n.id, {
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
      });
    });
    return map;
  }, [displayNodes, focusedNode, center, radius]);

  const legend = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of displayEdges) if (!map.has(e.type)) map.set(e.type, e.color);
    return Array.from(map.entries());
  }, [displayEdges]);

  // Any type already used anywhere in the full graph (not just the focused view) becomes selectable again afterwards.
  const availableTypes = useMemo(() => {
    const merged = [...RELATION_PRESETS];
    const known = new Set(RELATION_PRESETS.map((p) => p.type));
    for (const e of edges) {
      if (e.type === "Référence" || known.has(e.type)) continue;
      known.add(e.type);
      merged.push({ type: e.type, color: e.color });
    }
    return merged;
  }, [edges]);

  const resultsA = searchA.trim()
    ? allPages.filter((p) => p.title.toLowerCase().includes(searchA.toLowerCase())).slice(0, 6)
    : [];
  const resultsB = searchB.trim()
    ? allPages.filter((p) => p.title.toLowerCase().includes(searchB.toLowerCase()) && p.id !== pageA?.id).slice(0, 6)
    : [];

  const applyPreset = (preset: { type: string; color: string }) => {
    setNewType(preset.type);
    setNewColor(preset.color);
  };

  const createRelation = async () => {
    if (!pageA || !pageB || !newType.trim()) return;
    setCreating(true);
    const res = await fetch("/api/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageAId: pageA.id, pageBId: pageB.id, type: newType.trim(), color: newColor }),
    });
    setCreating(false);
    if (res.ok) {
      setCreateOpen(false);
      setPageA(null); setPageB(null); setSearchA(""); setSearchB("");
      setNewType("Allié"); setNewColor("#16a34a");
      fetchGraph();
    }
  };

  const openEdgeEditor = (e: React.MouseEvent, edge: GraphEdge) => {
    if (!edge.editable || !canManage) return;
    setEditEdge({ id: edge.id, source: edge.source, target: edge.target, type: edge.type, color: edge.color, x: e.clientX, y: e.clientY });
  };

  const saveEdgeEdit = async () => {
    if (!editEdge) return;
    setSaving(true);
    if (editEdge.id) {
      // Existing relation: update it in place
      await fetch(`/api/relations/${editEdge.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: editEdge.type, color: editEdge.color }),
      });
    } else {
      // Auto-detected reference: promote it into a real, editable relation
      await fetch("/api/relations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageAId: editEdge.source, pageBId: editEdge.target, type: editEdge.type, color: editEdge.color }),
      });
    }
    setSaving(false);
    setEditEdge(null);
    fetchGraph();
  };

  const deleteEdge = async () => {
    if (!editEdge?.id) { setEditEdge(null); return; }
    await fetch(`/api/relations/${editEdge.id}`, { method: "DELETE" });
    setEditEdge(null);
    fetchGraph();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" onClick={() => setEditEdge(null)}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <Share2 size={18} className="text-green-600" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {focusedNode ? (
                <>
                  <span>{focusedNode.icon}</span>
                  <span>{focusedNode.title}</span>
                </>
              ) : (
                "Graphe de liens"
              )}
            </h1>
            <p className="text-sm text-gray-400">
              {displayNodes.length} page{displayNodes.length !== 1 ? "s" : ""} connectée{displayNodes.length !== 1 ? "s" : ""} · {displayEdges.length} lien{displayEdges.length !== 1 ? "s" : ""}
            </p>
          </div>
          {focusedNode && (
            <button
              onClick={() => setFocusedNodeId(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={14} />Tout le graphe
            </button>
          )}
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={15} />Nouveau lien
            </button>
          )}
        </header>

        <div className="p-6 flex items-start gap-6">
          <div className="flex-1 flex items-center justify-center">
            {nodes.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Share2 size={48} className="mx-auto mb-3 opacity-25" />
                <p className="text-lg font-medium text-gray-500">Aucune connexion trouvée</p>
                <p className="text-sm mt-1">Ajoutez des liens, des mentions @personnage, ou créez un lien typé manuellement.</p>
              </div>
            ) : (
              <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="max-w-full">
                {displayEdges.map((e, i) => {
                  const a = positions.get(e.source);
                  const b = positions.get(e.target);
                  if (!a || !b) return null;
                  const dimmed = hovered && !(e.source === hovered || e.target === hovered);
                  const isPromoted = e.id !== null;
                  return (
                    <line
                      key={e.id ?? `ref-${i}`}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={dimmed ? "#e5e7eb" : e.color}
                      strokeOpacity={dimmed ? 0.4 : 0.7}
                      strokeWidth={isPromoted ? 2.5 : 1.5}
                      strokeDasharray={isPromoted ? undefined : "4 3"}
                      style={{ cursor: e.editable && canManage ? "pointer" : "default" }}
                      onClick={(ev) => { ev.stopPropagation(); openEdgeEditor(ev, e); }}
                    />
                  );
                })}
                {displayNodes.map((n) => {
                  const pos = positions.get(n.id);
                  if (!pos) return null;
                  const isHovered = hovered === n.id;
                  const isNeighbor = hovered && neighbors.get(hovered)?.has(n.id);
                  const dimmed = hovered && !isHovered && !isNeighbor;
                  const isFocused = focusedNode?.id === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      onMouseEnter={() => setHovered(n.id)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={(ev) => {
                        ev.stopPropagation();
                        setFocusedNodeId((current) => (current === n.id ? null : n.id));
                      }}
                      onDoubleClick={(ev) => { ev.stopPropagation(); router.push(`/doc/${n.id}`); }}
                      style={{ cursor: "pointer", opacity: dimmed ? 0.35 : 1 }}
                    >
                      <circle
                        r={isFocused ? 26 : isHovered ? 22 : 18}
                        fill="#16a34a"
                        fillOpacity={isFocused ? 0.22 : 0.15}
                        stroke="#16a34a"
                        strokeWidth={isFocused ? 2.5 : 1.5}
                      />
                      <text textAnchor="middle" dominantBaseline="central" fontSize={isFocused ? 19 : 16}>{n.icon}</text>
                      <text
                        textAnchor="middle"
                        y={isFocused ? 40 : 34}
                        fontSize={11}
                        fontWeight={isHovered || isFocused ? 700 : 500}
                        fill={isHovered || isFocused ? "#14532d" : "#374151"}
                      >
                        {n.title.length > 18 ? n.title.slice(0, 16) + "…" : n.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {legend.length > 0 && (
            <div className="w-48 shrink-0 bg-white border border-gray-100 rounded-xl p-4 sticky top-20">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Légende</h2>
              <div className="space-y-2">
                {legend.map(([type, color]) => (
                  <div key={type} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
                    <span className="truncate">{type}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-3 pt-3 border-t border-gray-100">
                Clic sur une page : centrer le graphe sur ses liens. Double-clic : ouvrir la page.
                {canManage && " Clic sur un lien : le modifier (les pointillés sont des références automatiques)."}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Create relation modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Nouveau lien</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={16} /></button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Page A</label>
                {pageA ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm">
                    <span>{pageA.icon}</span><span className="flex-1 truncate">{pageA.title}</span>
                    <button onClick={() => setPageA(null)}><X size={13} className="text-gray-400 hover:text-red-500" /></button>
                  </div>
                ) : (
                  <input
                    value={searchA}
                    onChange={(e) => setSearchA(e.target.value)}
                    placeholder="Rechercher une page…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                )}
                {!pageA && resultsA.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    {resultsA.map((p) => (
                      <button key={p.id} onClick={() => { setPageA(p); setSearchA(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2">
                        <span>{p.icon}</span><span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Page B</label>
                {pageB ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm">
                    <span>{pageB.icon}</span><span className="flex-1 truncate">{pageB.title}</span>
                    <button onClick={() => setPageB(null)}><X size={13} className="text-gray-400 hover:text-red-500" /></button>
                  </div>
                ) : (
                  <input
                    value={searchB}
                    onChange={(e) => setSearchB(e.target.value)}
                    placeholder="Rechercher une page…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                )}
                {!pageB && resultsB.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    {resultsB.map((p) => (
                      <button key={p.id} onClick={() => { setPageB(p); setSearchB(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2">
                        <span>{p.icon}</span><span className="truncate">{p.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Type de lien</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {availableTypes.map((p) => (
                    <button
                      key={p.type}
                      onClick={() => applyPreset(p)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                        newType === p.type ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"
                      }`}
                      style={{ background: `${p.color}1a`, color: p.color, borderColor: p.color }}
                    >
                      {p.type}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Type personnalisé…"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                    className="w-9 h-9 border-none rounded cursor-pointer p-0 shrink-0" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setCreateOpen(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={createRelation}
                disabled={creating || !pageA || !pageB || !newType.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {creating ? "Création…" : "Créer le lien"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edge edit popover */}
      {editEdge && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-2xl p-3 w-64"
          style={{ left: Math.min(editEdge.x, window.innerWidth - 280), top: Math.min(editEdge.y, window.innerHeight - 180) }}
          onClick={(e) => e.stopPropagation()}
        >
          {!editEdge.id && (
            <p className="text-[11px] text-gray-400 mb-2">Référence automatique — modifiez-la pour en faire un lien narratif dédié.</p>
          )}
          <div className="flex flex-wrap gap-1 mb-2">
            {availableTypes.map((p) => (
              <button
                key={p.type}
                onClick={() => setEditEdge((s) => s ? { ...s, type: p.type, color: p.color } : s)}
                className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
                  editEdge.type === p.type ? "ring-1 ring-offset-1" : "opacity-80 hover:opacity-100"
                }`}
                style={{ background: `${p.color}1a`, color: p.color, borderColor: p.color }}
              >
                {p.type}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <input
              value={editEdge.type}
              onChange={(e) => setEditEdge((s) => s ? { ...s, type: e.target.value } : s)}
              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <input
              type="color"
              value={editEdge.color}
              onChange={(e) => setEditEdge((s) => s ? { ...s, color: e.target.value } : s)}
              className="w-8 h-8 border-none rounded cursor-pointer p-0 shrink-0"
            />
          </div>
          <div className="flex gap-2">
            {editEdge.id && (
              <button onClick={deleteEdge} className="flex items-center gap-1 px-2.5 py-1.5 text-red-500 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors">
                <Trash2 size={12} />Supprimer
              </button>
            )}
            <button onClick={saveEdgeEdit} disabled={saving} className="ml-auto flex items-center gap-1 px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
              <Check size={12} />{saving ? "…" : "Sauvegarder"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
