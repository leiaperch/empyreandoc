"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Share2, Plus, X } from "lucide-react";

interface Relation {
  relationId: string;
  type: string;
  color: string;
  page: { id: string; title: string; icon: string };
}
interface PageOpt { id: string; title: string; }

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

export default function RelationsPanel({
  pageId,
  canManage,
}: {
  pageId: string;
  canManage: boolean;
}) {
  const [relations, setRelations] = useState<Relation[]>([]);
  const [adding, setAdding] = useState(false);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<PageOpt | null>(null);
  const [preset, setPreset] = useState(RELATION_PRESETS[0]);
  const [saving, setSaving] = useState(false);

  const fetchRelations = useCallback(async () => {
    const res = await fetch(`/api/pages/${pageId}/relations`);
    if (res.ok) setRelations(await res.json());
  }, [pageId]);

  useEffect(() => { fetchRelations(); }, [fetchRelations]);

  useEffect(() => {
    if (!adding || pages.length) return;
    fetch("/api/pages").then((r) => r.ok ? r.json() : []).then((data: PageOpt[]) =>
      setPages(data.map((p) => ({ id: p.id, title: p.title })))
    );
  }, [adding, pages.length]);

  const results = search.trim()
    ? pages.filter((p) => p.id !== pageId && p.title.toLowerCase().includes(search.toLowerCase())).slice(0, 6)
    : [];

  const save = async () => {
    if (!target) return;
    setSaving(true);
    await fetch("/api/relations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageAId: pageId, pageBId: target.id, type: preset.type, color: preset.color }),
    });
    setSaving(false);
    setAdding(false);
    setTarget(null);
    setSearch("");
    setPreset(RELATION_PRESETS[0]);
    fetchRelations();
  };

  const remove = async (relationId: string) => {
    await fetch(`/api/relations/${relationId}`, { method: "DELETE" });
    fetchRelations();
  };

  if (relations.length === 0 && !canManage) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-100 print:hidden">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
          <Share2 size={13} className="text-green-500" />Relations
        </h2>
        {canManage && !adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium transition-colors">
            <Plus size={13} />Ajouter
          </button>
        )}
      </div>

      {relations.length === 0 && !adding && (
        <p className="text-sm text-gray-400 italic">Aucune relation pour l&apos;instant.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {relations.map((r) => (
          <div key={r.relationId} className="group inline-flex items-center gap-1.5 rounded-full border pl-1 pr-1 py-0.5"
            style={{ borderColor: `${r.color}66` }}>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full text-white" style={{ background: r.color }}>
              {r.type}
            </span>
            <Link href={`/doc/${r.page.id}`} className="text-sm text-gray-700 hover:text-green-700 flex items-center gap-1">
              <span>{r.page.icon}</span>
              <span className="truncate max-w-[160px]">{r.page.title}</span>
            </Link>
            {canManage && (
              <button onClick={() => remove(r.relationId)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all">
                <X size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {adding && (
        <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2.5">
          <div className="relative">
            {target ? (
              <div className="flex items-center gap-2 px-3 py-1.5 border border-green-300 bg-green-50 rounded-lg text-sm">
                <span className="flex-1 truncate">{target.title}</span>
                <button onClick={() => setTarget(null)}><X size={13} className="text-gray-400 hover:text-red-500" /></button>
              </div>
            ) : (
              <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Lier à quelle page…"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            )}
            {!target && results.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                {results.map((p) => (
                  <button key={p.id} onClick={() => { setTarget(p); setSearch(""); }}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-green-50 truncate">{p.title}</button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {RELATION_PRESETS.map((p) => (
              <button key={p.type} onClick={() => setPreset(p)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${preset.type === p.type ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                style={{ background: `${p.color}1a`, color: p.color, borderColor: p.color }}>
                {p.type}
              </button>
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); setTarget(null); setSearch(""); }}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white transition-colors">Annuler</button>
            <button onClick={save} disabled={saving || !target}
              className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-60">
              {saving ? "…" : "Lier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
