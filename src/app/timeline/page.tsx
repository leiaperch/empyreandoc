"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { CalendarClock, Plus, Pencil, Trash2, X, ExternalLink } from "lucide-react";

interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  sortKey: number;
  description: string;
  color: string;
  pageId: string | null;
}
interface PageOpt { id: string; title: string; }

const COLORS = ["#16a34a","#7c3aed","#2563eb","#d97706","#dc2626","#0891b2","#db2777","#64748b"];

const emptyForm = { title: "", date: "", sortKey: 0, description: "", color: "#16a34a", pageId: "" };

export default function TimelinePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [pages, setPages] = useState<PageOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [pageSearch, setPageSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const canManage = role === "SCENAR" || role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/timeline");
    if (res.ok) setEvents(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetchEvents();
    fetch("/api/pages").then((r) => r.ok ? r.json() : []).then((data: PageOpt[]) =>
      setPages(data.map((p) => ({ id: p.id, title: p.title })))
    );
  }, [status, fetchEvents]);

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm }); setPageSearch(""); setModal(true); };
  const openEdit = (e: TimelineEvent) => {
    setEditId(e.id);
    setForm({ title: e.title, date: e.date, sortKey: e.sortKey, description: e.description, color: e.color, pageId: e.pageId ?? "" });
    setPageSearch(pages.find((p) => p.id === e.pageId)?.title ?? "");
    setModal(true);
  };

  const save = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const body = JSON.stringify({ ...form, sortKey: Number(form.sortKey) || 0 });
    if (editId) {
      await fetch(`/api/timeline/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body });
    } else {
      await fetch("/api/timeline", { method: "POST", headers: { "Content-Type": "application/json" }, body });
    }
    setSaving(false);
    setModal(false);
    fetchEvents();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cet événement ?")) return;
    await fetch(`/api/timeline/${id}`, { method: "DELETE" });
    fetchEvents();
  };

  const pageResults = pageSearch.trim()
    ? pages.filter((p) => p.title.toLowerCase().includes(pageSearch.toLowerCase())).slice(0, 6)
    : [];
  const linkedTitle = (id: string | null) => pages.find((p) => p.id === id)?.title;

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
          <CalendarClock size={18} className="text-green-600" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Chronologie</h1>
            <p className="text-sm text-gray-400">{events.length} événement{events.length !== 1 ? "s" : ""}</p>
          </div>
          {canManage && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Plus size={15} />Nouvel événement
            </button>
          )}
        </header>

        <div className="max-w-3xl mx-auto px-6 py-8">
          {events.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <CalendarClock size={48} className="mx-auto mb-3 opacity-25" />
              <p className="text-lg font-medium text-gray-500">Aucun événement</p>
              {canManage && <p className="text-sm mt-1">Ajoutez le premier événement de l&apos;histoire.</p>}
            </div>
          ) : (
            <ol className="relative border-l-2 border-gray-200 ml-3">
              {events.map((e) => (
                <li key={e.id} className="mb-8 ml-6 group">
                  <span
                    className="absolute -left-[9px] flex items-center justify-center w-4 h-4 rounded-full ring-4 ring-gray-50"
                    style={{ background: e.color }}
                  />
                  <div className="bg-white border border-gray-100 rounded-xl p-4 hover:border-green-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {e.date && (
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1.5"
                            style={{ background: `${e.color}1a`, color: e.color }}>
                            {e.date}
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900">{e.title}</h3>
                        {e.description && <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{e.description}</p>}
                        {e.pageId && linkedTitle(e.pageId) && (
                          <Link href={`/doc/${e.pageId}`}
                            className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 mt-2 font-medium">
                            <ExternalLink size={11} />{linkedTitle(e.pageId)}
                          </Link>
                        )}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={13} /></button>
                          <button onClick={() => remove(e.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editId ? "Modifier l'événement" : "Nouvel événement"}</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Titre</label>
                <input autoFocus value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="ex : La chute de Navarre"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Date (dans l&apos;histoire)</label>
                  <input value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    placeholder="ex : An 1247, 3e lune"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-medium text-gray-500 mb-1" title="Sert à ordonner les événements">Ordre</label>
                  <input type="number" value={form.sortKey} onChange={(e) => setForm((f) => ({ ...f, sortKey: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Ce qui s'est passé…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none" />
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-500 mb-1">Page liée (optionnel)</label>
                {form.pageId ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-green-300 bg-green-50 rounded-lg text-sm">
                    <span className="flex-1 truncate">{linkedTitle(form.pageId) ?? "Page"}</span>
                    <button onClick={() => { setForm((f) => ({ ...f, pageId: "" })); setPageSearch(""); }}><X size={13} className="text-gray-400 hover:text-red-500" /></button>
                  </div>
                ) : (
                  <input value={pageSearch} onChange={(e) => setPageSearch(e.target.value)}
                    placeholder="Rechercher une page…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                )}
                {!form.pageId && pageResults.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
                    {pageResults.map((p) => (
                      <button key={p.id} onClick={() => { setForm((f) => ({ ...f, pageId: p.id })); setPageSearch(""); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 truncate">{p.title}</button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Couleur</label>
                <div className="flex gap-1.5">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${form.color === c ? "border-gray-700 scale-110" : "border-transparent"}`}
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {saving ? "…" : editId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
