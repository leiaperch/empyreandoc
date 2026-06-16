"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import AttachmentPanel from "@/components/AttachmentPanel";
import { ArrowLeft, Save, Check, Loader2, Trash2, Archive } from "lucide-react";
import Link from "next/link";

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
  archived: boolean;
  category: { id: string; name: string; icon: string | null; restricted: boolean };
  author: { id: string; name: string; role: string };
  attachments: Attachment[];
  updatedAt: string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loading, setLoading] = useState(true);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const role = (session?.user as { role?: string })?.role;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/pages/${id}`);
    if (res.status === 403) {
      router.push("/dashboard");
      return;
    }
    if (res.ok) {
      const data: PageData = await res.json();
      setPage(data);
      setTitle(data.title);
      setContent(data.content);
      setAttachments(data.attachments);
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    if (status === "authenticated") fetchPage();
  }, [status, fetchPage]);

  const save = useCallback(async (t: string, c: string) => {
    setSaveStatus("saving");
    const res = await fetch(`/api/pages/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: t, content: c }),
    });
    setSaveStatus(res.ok ? "saved" : "error");
    if (res.ok) setTimeout(() => setSaveStatus("idle"), 2000);
  }, [id]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    if (saveTimer) clearTimeout(saveTimer);
    setSaveTimer(setTimeout(() => save(title, newContent), 1500));
  }, [save, saveTimer, title]);

  const handleTitleBlur = useCallback(() => {
    if (page && title !== page.title) save(title, content);
  }, [page, title, content, save]);

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
        {/* Toolbar */}
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
            {/* Save status */}
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {saveStatus === "saving" && <><Loader2 size={12} className="animate-spin" /> Enregistrement…</>}
              {saveStatus === "saved" && <><Check size={12} className="text-green-500" /> Enregistré</>}
              {saveStatus === "error" && <span className="text-red-500">Erreur d&apos;enregistrement</span>}
            </span>

            <button
              onClick={() => save(title, content)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={14} />
              Sauvegarder
            </button>

            {role === "SCENAR" && (
              <>
                <button
                  onClick={handleArchive}
                  title={page.archived ? "Désarchiver" : "Archiver"}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Archive size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  title="Supprimer"
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Document */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Titre de la page…"
            className="w-full text-3xl font-bold text-gray-900 bg-transparent border-none outline-none placeholder-gray-300 mb-6"
          />

          {/* Editor */}
          <Editor
            content={content}
            onChange={handleContentChange}
          />

          {/* Attachments */}
          <AttachmentPanel
            pageId={id}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />

          {/* Metadata */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-xs text-gray-400 flex items-center gap-4">
            <span>Auteur : {page.author.name}</span>
            <span>·</span>
            <span>
              Dernière modification :{" "}
              {new Date(page.updatedAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
