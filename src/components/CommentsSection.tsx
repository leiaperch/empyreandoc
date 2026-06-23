"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageSquare, Trash2, Send } from "lucide-react";

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string; role: string };
}

export default function CommentsSection({ pageId }: { pageId: string }) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const userId = (session?.user as { id?: string })?.id;
  const [comments, setComments] = useState<CommentData[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchComments = useCallback(async () => {
    const res = await fetch(`/api/pages/${pageId}/comments`);
    if (res.ok) setComments(await res.json());
    setLoading(false);
  }, [pageId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  const send = async () => {
    if (!input.trim()) return;
    setSending(true);
    const res = await fetch(`/api/pages/${pageId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: input.trim() }),
    });
    setSending(false);
    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setInput("");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce commentaire ?")) return;
    await fetch(`/api/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
        <MessageSquare size={15} className="text-green-600" />
        Commentaires {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
      </h2>

      {!loading && comments.length === 0 && (
        <p className="text-sm text-gray-400 italic mb-4">Aucun commentaire pour l&apos;instant.</p>
      )}

      <div className="space-y-3 mb-4">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-3 group">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">
              {c.author.name[0]?.toUpperCase()}
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-800">{c.author.name}</span>
                <span className="text-[11px] text-gray-400">
                  {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                {(c.author.id === userId || role === "ADMIN") && (
                  <button
                    onClick={() => remove(c.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); } }}
          placeholder="Ajouter un commentaire… (Ctrl+Entrée pour envoyer)"
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 transition"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors disabled:opacity-50 shrink-0"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
