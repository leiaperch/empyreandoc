"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AttachmentPanel from "@/components/AttachmentPanel";
import { ArrowLeft, Save, Check, Loader2, Trash2, Archive, Pencil, Eye, X, Plus, Star, History, Printer } from "lucide-react";
import Link from "next/link";
import VersionsModal from "@/components/VersionsModal";
import CommentsSection from "@/components/CommentsSection";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface PageData {
  id: string;
  title: string;
  content: string;
  tags: string;
  archived: boolean;
  category: { id: string; name: string; slug: string; icon: string | null; restricted: boolean };
  author: { id: string; name: string; role: string };
  attachments: Attachment[];
  updatedAt: string;
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
  const [favorited, setFavorited] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const role = (session?.user as { role?: string })?.role;
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
      setAttachments(data.attachments);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (status === "authenticated") fetchPage();
  }, [status, fetchPage]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/pages/${id}/favorite`).then((r) => r.ok ? r.json() : { favorited: false }).then((d) => setFavorited(d.favorited));
  }, [status, id]);

  const toggleFavorite = async () => {
    const res = await fetch(`/api/pages/${id}/favorite`, { method: "POST" });
    if (res.ok) {
      const { favorited: fav } = await res.json();
      setFavorited(fav);
      window.dispatchEvent(new Event("favorites-changed"));
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/tags").then((r) => r.ok ? r.json() : []).then((data) =>
      setAllTags(Array.isArray(data) ? data.map((t: { name: string } | string) => typeof t === "string" ? t : t.name) : [])
    );
  }, [status]);

  const save = useCallback(async (t: string, c: string, tgs?: string[], opts?: { createVersion?: boolean }) => {
    setSaveStatus("saving");
    const res = await fetch(`/api/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: t,
        content: c,
        tags: (tgs ?? tags).join(","),
        createVersion: opts?.createVersion ?? false,
      }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
  }, [id, tags]);

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
            <button
              onClick={toggleFavorite}
              title={favorited ? "Retirer des favoris" : "Ajouter aux favoris"}
              className="p-1.5 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded-lg transition-colors"
            >
              <Star size={16} className={favorited ? "text-yellow-400 fill-yellow-400" : ""} />
            </button>

            {editing && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                {saveStatus === "saving" && <><Loader2 size={12} className="animate-spin" /> Enregistrement…</>}
                {saveStatus === "saved" && <><Check size={12} className="text-green-500" /> Enregistré</>}
                {saveStatus === "error" && <span className="text-red-500">Erreur</span>}
              </span>
            )}

            {editing && (
              <button
                onClick={() => save(title, content, undefined, { createVersion: true })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save size={14} />Sauvegarder
              </button>
            )}

            <button
              onClick={() => {
                if (editing) save(title, content, undefined, { createVersion: true });
                setEditing((v) => !v);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                editing
                  ? "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {editing ? <><Eye size={14} />Lecture</> : <><Pencil size={14} />Éditer</>}
            </button>

            {canEdit && (
              <button onClick={() => setVersionsOpen(true)} title="Historique des versions"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <History size={16} />
              </button>
            )}

            {!editing && (
              <button onClick={() => window.print()} title="Exporter en PDF"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Printer size={16} />
              </button>
            )}

            {editing && (
              <>
                {canEdit && (
                  <button onClick={handleArchive} title={page.archived ? "Désarchiver" : "Archiver"}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                    <Archive size={16} />
                  </button>
                )}
                {canEdit && (
                  <button onClick={handleDelete} title="Supprimer"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
              </>
            )}
          </div>
        </header>

        <div id="printable-content" className="max-w-4xl mx-auto px-6 py-8">
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

          {editing ? (
            <Editor content={content} onChange={handleContentChange} />
          ) : (
            <div
              className="reading-mode prose prose-green max-w-none min-h-[200px] text-gray-800"
              dangerouslySetInnerHTML={{ __html: content || '<p class="text-gray-400 italic">Aucun contenu — cliquez sur Éditer pour commencer.</p>' }}
            />
          )}

          <AttachmentPanel
            pageId={id}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />

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

          <div className="print:hidden">
            <CommentsSection pageId={id} />
          </div>
        </div>
      </main>

      {versionsOpen && (
        <VersionsModal
          pageId={id}
          onClose={() => setVersionsOpen(false)}
          onRestored={fetchPage}
        />
      )}
    </div>
  );
}
