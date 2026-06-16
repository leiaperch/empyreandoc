"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AttachmentPanel from "@/components/AttachmentPanel";
import { ArrowLeft, Save, Check, Loader2, Trash2, Archive, Pencil, Eye, X, Plus, Users, Link2, Search } from "lucide-react";
import Link from "next/link";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface LinkedPage {
  id: string;
  title: string;
  category: { name: string; icon: string | null };
}

interface PageData {
  id: string;
  title: string;
  content: string;
  tags: string;
  linkedPageIds: string;
  archived: boolean;
  category: { id: string; name: string; slug: string; icon: string | null; restricted: boolean };
  author: { id: string; name: string; role: string };
  attachments: Attachment[];
  updatedAt: string;
}

interface SearchablePage {
  id: string;
  title: string;
  category: { name: string; icon: string | null };
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

const TAG_COLORS = [
  "bg-purple-100 text-purple-700 border-purple-200",
  "bg-blue-100 text-blue-700 border-blue-200",
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-rose-100 text-rose-700 border-rose-200",
  "bg-teal-100 text-teal-700 border-teal-200",
  "bg-orange-100 text-orange-700 border-orange-200",
  "bg-indigo-100 text-indigo-700 border-indigo-200",
  "bg-green-100 text-green-700 border-green-200",
];
function tagColor(tag: string) {
  let h = 0;
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xff;
  return TAG_COLORS[h % TAG_COLORS.length];
}

export default function DocPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [allTags, setAllTags] = useState<string[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Linked personnages state
  const [linkedPages, setLinkedPages] = useState<LinkedPage[]>([]);
  const [linkedPageIds, setLinkedPageIds] = useState<string[]>([]);
  const [allPersonnages, setAllPersonnages] = useState<SearchablePage[]>([]);
  const [persoSearch, setPersoSearch] = useState("");
  const [showPersoSearch, setShowPersoSearch] = useState(false);
  const persoSearchRef = useRef<HTMLDivElement>(null);

  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";
  const canEdit = role === "SCENAR" || role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pages/${id}`);
    if (res.status === 403) { router.push("/dashboard"); return; }
    if (res.ok) {
      const data: PageData = await res.json();
      setPage(data);
      setTitle(data.title);
      setContent(data.content);
      setTags(data.tags ? data.tags.split(",").map((t) => t.trim()).filter(Boolean) : []);
      setLinkedPageIds(data.linkedPageIds ? data.linkedPageIds.split(",").filter(Boolean) : []);
      setAttachments(data.attachments);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (status === "authenticated") fetchPage();
  }, [status, fetchPage]);

  // Fetch global tags for autocomplete
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tags").then((r) => r.ok ? r.json() : []).then(setAllTags);
  }, [status]);

  // Fetch all personnages (pages in sub-categories of "personnages") for picker
  useEffect(() => {
    if (status !== "authenticated" || !page) return;
    if (page.category.slug !== "plots-personnage") return;

    fetch("/api/categories")
      .then((r) => r.ok ? r.json() : [])
      .then(async (cats: { slug: string; children?: { id: string }[] }[]) => {
        const personnagesCat = cats.find((c) => c.slug === "personnages");
        if (!personnagesCat) return;
        const joueurs = personnagesCat.children ?? [];
        const pages: SearchablePage[] = [];
        for (const joueur of joueurs) {
          const pr = await fetch(`/api/pages?categoryId=${joueur.id}`);
          if (pr.ok) {
            const ps = await pr.json();
            for (const p of ps) pages.push({ id: p.id, title: p.title, category: p.category });
          }
        }
        setAllPersonnages(pages);
      });
  }, [status, page]);

  // Resolve linked page details when linkedPageIds change
  useEffect(() => {
    if (!linkedPageIds.length) { setLinkedPages([]); return; }
    const fetchLinked = async () => {
      const results: LinkedPage[] = [];
      for (const pid of linkedPageIds) {
        const r = await fetch(`/api/pages/${pid}`);
        if (r.ok) {
          const p = await r.json();
          results.push({ id: p.id, title: p.title, category: p.category });
        }
      }
      setLinkedPages(results);
    };
    fetchLinked();
  }, [linkedPageIds]);

  // Close perso search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (persoSearchRef.current && !persoSearchRef.current.contains(e.target as Node)) {
        setShowPersoSearch(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const save = useCallback(async (t: string, c: string, tgs?: string[], lids?: string[]) => {
    setSaveStatus("saving");
    const res = await fetch(`/api/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        content: c,
        tags: (tgs ?? tags).join(","),
        linkedPageIds: (lids ?? linkedPageIds).join(","),
      }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
  }, [id, tags, linkedPageIds]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    if (saveTimer) clearTimeout(saveTimer);
    setSaveTimer(setTimeout(() => save(title, newContent), 1500));
  }, [save, saveTimer, title]);

  const handleTitleBlur = useCallback(() => {
    if (page && title !== page.title) save(title, content);
  }, [page, title, content, save]);

  const addTag = () => {
    const raw = tagInput.trim().replace(/,+$/, "");
    const newTags = raw.split(",").map((t) => t.trim()).filter((t) => t && !tags.includes(t));
    if (!newTags.length) return;
    const updated = [...tags, ...newTags];
    setTags(updated);
    setTagInput("");
    setTagSuggestions([]);
    save(title, content, updated);
  };

  const addTagDirect = (tag: string) => {
    if (tags.includes(tag)) return;
    const updated = [...tags, tag];
    setTags(updated);
    setTagInput("");
    setTagSuggestions([]);
    save(title, content, updated);
  };

  const removeTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    save(title, content, updated);
  };

  const handleTagInput = (val: string) => {
    setTagInput(val);
    if (val.trim()) {
      setTagSuggestions(allTags.filter((t) => t.toLowerCase().includes(val.toLowerCase()) && !tags.includes(t)));
    } else {
      setTagSuggestions([]);
    }
  };

  const linkPersonnage = (perso: SearchablePage) => {
    if (linkedPageIds.includes(perso.id)) return;
    const newIds = [...linkedPageIds, perso.id];
    setLinkedPageIds(newIds);
    setLinkedPages((prev) => [...prev, { id: perso.id, title: perso.title, category: perso.category }]);
    setPersoSearch("");
    setShowPersoSearch(false);
    save(title, content, tags, newIds);
  };

  const unlinkPersonnage = (persoId: string) => {
    const newIds = linkedPageIds.filter((i) => i !== persoId);
    setLinkedPageIds(newIds);
    setLinkedPages((prev) => prev.filter((p) => p.id !== persoId));
    save(title, content, tags, newIds);
  };

  const handleDelete = async () => {
    if (!confirm("Supprimer cette page définitivement ?")) return;
    await fetch(`/api/pages/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  };

  const handleArchive = async () => {
    const res = await fetch(`/api/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !page?.archived }),
    });
    if (res.ok) setPage((p) => p ? { ...p, archived: !p.archived } : p);
  };

  const isPlotPage = page?.category.slug === "plots-personnage";

  const persoResults = allPersonnages.filter(
    (p) => p.title.toLowerCase().includes(persoSearch.toLowerCase()) && !linkedPageIds.includes(p.id)
  );

  if (loading || status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Page introuvable ou accès refusé.</p>
          <Link href="/dashboard" className="text-green-600 hover:underline">← Retour au tableau de bord</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar activePage={id} />

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{page.category.icon ?? "📄"}</span>
            <span>{page.category.name}</span>
            {page.category.restricted && !page.archived && (
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-500 text-[10px] font-medium">Fil rouge</span>
            )}
            {page.archived && (
              <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-medium">Archivé</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {editing && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {saveStatus === "saving" && <><Loader2 size={12} className="animate-spin" /> Enregistrement…</>}
                {saveStatus === "saved" && <><Check size={12} className="text-green-500" /> Enregistré</>}
                {saveStatus === "error" && <span className="text-red-500">Erreur</span>}
              </span>
            )}

            {editing && (
              <button
                onClick={() => save(title, content)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save size={14} />Sauvegarder
              </button>
            )}

            <button
              onClick={() => setEditing((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                editing
                  ? "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {editing ? <><Eye size={14} />Lecture</> : <><Pencil size={14} />Éditer</>}
            </button>

            {editing && (
              <>
                {canEdit && (
                  <button onClick={handleArchive} title={page.archived ? "Désarchiver" : "Archiver"}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Archive size={16} />
                  </button>
                )}
                {isAdmin && (
                  <button onClick={handleDelete} title="Supprimer"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Titre */}
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Titre de la page…"
              className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 mb-3"
            />
          ) : (
            <h1 className="text-3xl font-bold text-gray-900 mb-3">{title || "Sans titre"}</h1>
          )}

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mb-6 min-h-[28px] relative">
            {tags.map((tag) => (
              <span key={tag} className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${tagColor(tag)}`}>
                {tag}
                {editing && (
                  <button onClick={() => removeTag(tag)} className="hover:opacity-70 transition-opacity ml-0.5">
                    <X size={10} />
                  </button>
                )}
              </span>
            ))}
            {editing && (
              <div className="relative">
                <div className="flex items-center gap-1">
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(e) => handleTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                    onBlur={() => setTimeout(() => setTagSuggestions([]), 150)}
                    placeholder="Ajouter un tag…"
                    className="text-xs px-2 py-1 border border-dashed border-gray-300 rounded-full focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-300 w-32 transition"
                  />
                  <button onClick={addTag} className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                    <Plus size={13} />
                  </button>
                </div>
                {tagSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-44">
                    {tagSuggestions.slice(0, 6).map((s) => (
                      <button key={s} onMouseDown={() => addTagDirect(s)}
                        className={`w-full text-left text-xs px-3 py-2 hover:bg-green-50 flex items-center gap-2 ${tagColor(s)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tagColor(s).split(" ")[0]}`} />
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contenu */}
          {editing ? (
            <Editor content={content} onChange={handleContentChange} />
          ) : (
            <div
              className="prose prose-green max-w-none min-h-[200px] text-gray-800"
              dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400 italic">Aucun contenu — cliquez sur Éditer pour commencer.</p>' }}
            />
          )}

          {/* Personnages liés — only for plots-personnage pages */}
          {isPlotPage && (
            <div className="mt-10 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-green-600" />
                <h2 className="text-sm font-semibold text-gray-700">Personnages liés</h2>
                <span className="text-xs text-gray-400">({linkedPages.length})</span>
              </div>

              {linkedPages.length === 0 && !editing && (
                <p className="text-sm text-gray-400 italic">Aucun personnage lié à cette trame.</p>
              )}

              <div className="flex flex-wrap gap-2 mb-3">
                {linkedPages.map((lp) => (
                  <div key={lp.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-sm">
                    <Link2 size={12} className="text-green-500 shrink-0" />
                    <Link href={`/doc/${lp.id}`} className="text-green-700 hover:text-green-900 font-medium transition-colors">
                      {lp.title}
                    </Link>
                    <span className="text-xs text-gray-400">{lp.category.icon ?? ""}</span>
                    {editing && (
                      <button onClick={() => unlinkPersonnage(lp.id)}
                        className="ml-1 text-gray-400 hover:text-red-500 transition-colors">
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {editing && (
                <div className="relative" ref={persoSearchRef}>
                  <div className="flex items-center gap-2 w-full max-w-xs border border-dashed border-gray-300 rounded-lg px-2.5 py-1.5 focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-300 transition bg-white">
                    <Search size={12} className="text-gray-400 shrink-0" />
                    <input
                      value={persoSearch}
                      onChange={(e) => setPersoSearch(e.target.value)}
                      onFocus={() => setShowPersoSearch(true)}
                      placeholder="Lier un personnage…"
                      className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                    />
                  </div>
                  {showPersoSearch && persoResults.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-64">
                      {persoResults.slice(0, 8).map((p) => (
                        <button key={p.id} onMouseDown={() => linkPersonnage(p)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center gap-2 transition-colors">
                          <span className="text-base">{p.category.icon ?? "👤"}</span>
                          <span className="text-gray-700">{p.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showPersoSearch && persoSearch && persoResults.length === 0 && (
                    <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden w-64">
                      <p className="text-xs text-gray-400 px-3 py-2">Aucun personnage trouvé.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pièces jointes */}
          <AttachmentPanel
            pageId={id}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />

          {/* Métadonnées */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-4">
            <span>Auteur : {page.author.name}</span>
            <span>·</span>
            <span>
              Dernière modification :{" "}
              {new Date(page.updatedAt).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
