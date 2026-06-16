"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import EmojiPicker from "@/components/EmojiPicker";
import Link from "next/link";
import { Plus, UserPlus, FileText, ChevronRight, Trash2, Tag, X, Pencil } from "lucide-react";

interface Personnage {
  id: string;
  title: string;
  tags: string;
}

interface Joueur {
  id: string;
  name: string;
  icon: string | null;
  personnages: Personnage[];
}

const TAG_COLORS = [
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
  "bg-green-100 text-green-700",
];
function tagColor(tag: string) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff;
  return TAG_COLORS[h % TAG_COLORS.length];
}
function parseTags(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter(Boolean);
}

interface TagEditorProps {
  personnage: Personnage;
  allTags: string[];
  onSaved: (id: string, newTags: string) => void;
  onClose: () => void;
}
function TagEditor({ personnage, allTags, onSaved, onClose }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(parseTags(personnage.tags));
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const suggestions = allTags.filter(
    (t) => t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  );

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setInput("");
  };

  const save = async () => {
    setSaving(true);
    await fetch(`/api/pages/${personnage.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags: tags.join(",") }),
    });
    onSaved(personnage.id, tags.join(","));
    setSaving(false);
    onClose();
  };

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-3">
      <p className="text-xs font-medium text-gray-500 mb-2 truncate">{personnage.title}</p>
      <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(t)}`}>
            {t}
            <button onClick={() => setTags((prev) => prev.filter((x) => x !== t))} className="hover:opacity-70"><X size={9} /></button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(input); } }}
        placeholder="Ajouter un tag…"
        className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400 mb-1"
      />
      {suggestions.length > 0 && (
        <div className="border border-gray-100 rounded-lg overflow-hidden mb-2">
          {suggestions.slice(0, 5).map((s) => (
            <button key={s} onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className={`w-full text-left text-xs px-2 py-1.5 hover:bg-green-50 flex items-center gap-1.5 ${tagColor(s)}`}>
              <span className={`w-2 h-2 rounded-full inline-block ${tagColor(s).split(" ")[0]}`} />
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <button onClick={onClose} className="flex-1 text-xs py-1 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Annuler</button>
        <button onClick={save} disabled={saving} className="flex-1 text-xs py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60">
          {saving ? "…" : "Sauvegarder"}
        </button>
      </div>
    </div>
  );
}

export default function JoueursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [joueurs, setJoueurs] = useState<Joueur[]>([]);
  const [personnagesCatId, setPersonnagesCatId] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [tagEditorPersoId, setTagEditorPersoId] = useState<string | null>(null);

  const [createModal, setCreateModal] = useState(false);
  const [joueurName, setJoueurName] = useState("");
  const [joueurIcon, setJoueurIcon] = useState("");
  const [personnageNames, setPersonnageNames] = useState<string[]>([""]);
  const [creating, setCreating] = useState(false);
  const [deletingJoueurId, setDeletingJoueurId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; joueurId: string; name: string; icon: string } | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addPersoModal, setAddPersoModal] = useState<{ open: boolean; joueurId: string; joueurName: string }>({ open: false, joueurId: "", joueurName: "" });
  const [newPersoName, setNewPersoName] = useState("");
  const [addingPerso, setAddingPerso] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const canManage = role === "SCENAR" || role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchTags = useCallback(async () => {
    const res = await fetch("/api/tags");
    if (res.ok) setAllTags(await res.json());
  }, []);

  const fetchJoueurs = useCallback(async () => {
    setLoading(true);
    const catRes = await fetch("/api/categories");
    if (!catRes.ok) { setLoading(false); return; }

    const cats = await catRes.json();
    const personnagesCat = cats.find((c: { slug: string }) => c.slug === "personnages");

    if (!personnagesCat) { setLoading(false); return; }
    setPersonnagesCatId(personnagesCat.id);

    const joueursData: Joueur[] = [];
    for (const joueur of personnagesCat.children ?? []) {
      const pagesRes = await fetch(`/api/pages?categoryId=${joueur.id}`);
      const pages = pagesRes.ok ? await pagesRes.json() : [];
      joueursData.push({
        id: joueur.id,
        name: joueur.name,
        icon: joueur.icon,
        personnages: pages.map((p: { id: string; title: string; tags: string }) => ({
          id: p.id, title: p.title, tags: p.tags ?? "",
        })),
      });
    }
    setJoueurs(joueursData);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") { fetchJoueurs(); fetchTags(); }
  }, [status, fetchJoueurs, fetchTags]);

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    for (const j of joueurs)
      for (const p of j.personnages)
        for (const t of parseTags(p.tags)) set.add(t);
    return Array.from(set).sort();
  }, [joueurs]);

  const createPersonnagePage = async (name: string, categoryId: string) => {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: name.trim(), categoryId }),
    });
    return res.ok ? await res.json() : null;
  };

  const createJoueur = async () => {
    if (!joueurName.trim() || !personnagesCatId) return;
    setCreating(true);
    const slug = `joueur-${joueurName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const catRes = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joueurName.trim(), slug, icon: joueurIcon.trim() || "🧙", parentId: personnagesCatId }),
    });
    if (!catRes.ok) { setCreating(false); return; }
    const newCat = await catRes.json();
    for (const name of personnageNames.filter((n) => n.trim())) {
      await createPersonnagePage(name, newCat.id);
    }
    setCreating(false);
    setCreateModal(false);
    setJoueurName(""); setJoueurIcon(""); setPersonnageNames([""]);
    fetchJoueurs(); fetchTags();
  };

  const saveEditJoueur = async () => {
    if (!editModal || !editModal.name.trim()) return;
    setEditSaving(true);
    await fetch(`/api/categories/${editModal.joueurId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editModal.name.trim(), icon: editModal.icon || null }),
    });
    setEditSaving(false);
    setEditModal(null);
    fetchJoueurs();
  };

  const deleteJoueur = async (joueurId: string) => {
    if (!confirm("Supprimer ce joueur et tous ses personnages définitivement ?")) return;
    setDeletingJoueurId(joueurId);
    await fetch(`/api/categories/${joueurId}`, { method: "DELETE" });
    setDeletingJoueurId(null);
    fetchJoueurs();
  };

  const addPersonnage = async () => {
    if (!newPersoName.trim() || !addPersoModal.joueurId) return;
    setAddingPerso(true);
    const page = await createPersonnagePage(newPersoName, addPersoModal.joueurId);
    setAddingPerso(false);
    if (page) {
      setAddPersoModal({ open: false, joueurId: "", joueurName: "" });
      setNewPersoName("");
      router.push(`/doc/${page.id}`);
    }
  };

  const handleTagSaved = (persoId: string, newTags: string) => {
    setJoueurs((prev) => prev.map((j) => ({
      ...j,
      personnages: j.personnages.map((p) => p.id === persoId ? { ...p, tags: newTags } : p),
    })));
    fetchTags();
  };

  const filteredJoueurs = useMemo(() => {
    if (!activeTag) return joueurs;
    return joueurs.map((j) => ({
      ...j,
      personnages: j.personnages.filter((p) => parseTags(p.tags).includes(activeTag)),
    })).filter((j) => j.personnages.length > 0);
  }, [joueurs, activeTag]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" onClick={() => setTagEditorPersoId(null)}>
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Joueurs</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {joueurs.length} joueur{joueurs.length !== 1 ? "s" : ""} · {joueurs.reduce((a, j) => a + j.personnages.length, 0)} personnage{joueurs.reduce((a, j) => a + j.personnages.length, 0) !== 1 ? "s" : ""}
            </p>
          </div>
          {canManage && (
            <button onClick={() => setCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
              <UserPlus size={16} />Nouveau joueur
            </button>
          )}
        </header>

        {uniqueTags.length > 0 && (
          <div className="px-6 pt-4 flex items-center gap-2 flex-wrap">
            <Tag size={13} className="text-gray-400 shrink-0" />
            {uniqueTags.map((tag) => (
              <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
                  activeTag === tag ? "border-green-500 bg-green-600 text-white" : `${tagColor(tag)} border-transparent hover:border-current`
                }`}>
                {tag}{activeTag === tag && <X size={10} />}
              </button>
            ))}
            {activeTag && (
              <button onClick={() => setActiveTag(null)} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Tout afficher</button>
            )}
          </div>
        )}

        <div className="px-6 py-5">
          {joueurs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <UserPlus size={52} className="mx-auto mb-4 opacity-25" />
              <p className="text-lg font-medium text-gray-500">Aucun joueur pour l&apos;instant</p>
              {canManage && <p className="text-sm mt-2">Créez le premier joueur avec le bouton ci-dessus.</p>}
            </div>
          ) : filteredJoueurs.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">Aucun personnage avec le tag <strong>&quot;{activeTag}&quot;</strong>.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredJoueurs.map((joueur) => (
                <div key={joueur.id} className={`bg-white rounded-xl border border-gray-100 overflow-hidden hover:border-green-200 hover:shadow-lg hover:shadow-green-50 transition-all flex flex-col ${deletingJoueurId === joueur.id ? "opacity-50" : ""}`}>
                  <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-50">
                    <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center text-2xl shrink-0">{joueur.icon ?? "🧙"}</div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-semibold text-gray-900 truncate">{joueur.name}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{joueur.personnages.length} personnage{joueur.personnages.length !== 1 ? "s" : ""}</p>
                    </div>
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setAddPersoModal({ open: true, joueurId: joueur.id, joueurName: joueur.name })}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Nouveau personnage">
                          <Plus size={15} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditModal({ open: true, joueurId: joueur.id, name: joueur.name, icon: joueur.icon ?? "" }); }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Modifier le joueur">
                          <Pencil size={14} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteJoueur(joueur.id); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Supprimer le joueur">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 divide-y divide-gray-50">
                    {joueur.personnages.length === 0 ? (
                      <p className="text-sm text-gray-400 px-5 py-4 italic">Aucun personnage</p>
                    ) : (
                      joueur.personnages.map((p) => {
                        const ptags = parseTags(p.tags);
                        return (
                          <div key={p.id} className="flex items-start gap-3 px-5 py-3 hover:bg-green-50 group transition-colors relative">
                            <Link href={`/doc/${p.id}`} className="flex items-start gap-3 flex-1 min-w-0">
                              <FileText size={13} className="text-gray-300 group-hover:text-green-400 shrink-0 transition-colors mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm text-gray-700 group-hover:text-gray-900 block truncate">{p.title}</span>
                                {ptags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {ptags.map((t) => (
                                      <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tagColor(t)}`}>{t}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-1 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setTagEditorPersoId(tagEditorPersoId === p.id ? null : p.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded transition-all"
                                title="Gérer les tags"
                              >
                                <Tag size={12} />
                              </button>
                              <Link href={`/doc/${p.id}`}>
                                <ChevronRight size={13} className="text-gray-300 group-hover:text-green-400 transition-colors" />
                              </Link>
                              {tagEditorPersoId === p.id && (
                                <TagEditor
                                  personnage={p}
                                  allTags={allTags}
                                  onSaved={handleTagSaved}
                                  onClose={() => setTagEditorPersoId(null)}
                                />
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Nouveau joueur</h2>
            <p className="text-sm text-gray-500 mb-5">Crée le joueur et ses personnages en une seule étape.</p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom du joueur</label>
                  <input autoFocus value={joueurName} onChange={(e) => setJoueurName(e.target.value)} placeholder="ex : Alice, Bob…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icône</label>
                  <EmojiPicker value={joueurIcon} onChange={setJoueurIcon} placeholder="🧙" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Personnages <span className="font-normal text-gray-400">(optionnel)</span></label>
                <div className="space-y-2">
                  {personnageNames.map((name, i) => (
                    <div key={i} className="flex gap-2">
                      <input value={name}
                        onChange={(e) => setPersonnageNames((prev) => prev.map((n, idx) => idx === i ? e.target.value : n))}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPersonnageNames((p) => [...p, ""]); } }}
                        placeholder={`Personnage ${i + 1}…`}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition" />
                      {personnageNames.length > 1 && (
                        <button onClick={() => setPersonnageNames((p) => p.filter((_, idx) => idx !== i))}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={() => setPersonnageNames((p) => [...p, ""])}
                  className="mt-2 flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition-colors">
                  <Plus size={14} />Ajouter un personnage
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCreateModal(false); setJoueurName(""); setJoueurIcon(""); setPersonnageNames([""]); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
              <button onClick={createJoueur} disabled={creating || !joueurName.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal?.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-1">Modifier le joueur</h2>
            <p className="text-sm text-gray-500 mb-5">Nom et icône affichés sur la carte et dans la sidebar.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom du joueur</label>
                <input
                  autoFocus
                  value={editModal.name}
                  onChange={(e) => setEditModal((m) => m ? { ...m, name: e.target.value } : m)}
                  onKeyDown={(e) => e.key === "Enter" && saveEditJoueur()}
                  placeholder="Nom du joueur…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icône</label>
                <EmojiPicker
                  value={editModal.icon}
                  onChange={(emoji) => setEditModal((m) => m ? { ...m, icon: emoji } : m)}
                  placeholder="🧙"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveEditJoueur}
                disabled={editSaving || !editModal.name.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {editSaving ? "Enregistrement…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      {addPersoModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-1">Nouveau personnage</h2>
            <p className="text-sm text-gray-500 mb-4">Pour {addPersoModal.joueurName}</p>
            <input autoFocus value={newPersoName} onChange={(e) => setNewPersoName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPersonnage()} placeholder="Nom du personnage…"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setAddPersoModal({ open: false, joueurId: "", joueurName: "" }); setNewPersoName(""); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">Annuler</button>
              <button onClick={addPersonnage} disabled={addingPerso || !newPersoName.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                {addingPerso ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
