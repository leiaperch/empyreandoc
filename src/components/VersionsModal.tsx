"use client";

import { useEffect, useState } from "react";
import { History, X, RotateCcw } from "lucide-react";

interface Version {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: { name: string };
}

interface VersionsModalProps {
  pageId: string;
  onClose: () => void;
  onRestored: () => void;
}

export default function VersionsModal({ pageId, onClose, onRestored }: VersionsModalProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pages/${pageId}/versions`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setVersions(data); setLoading(false); });
  }, [pageId]);

  const restore = async (versionId: string) => {
    if (!confirm("Restaurer cette version ? L'état actuel sera conservé dans l'historique.")) return;
    setRestoringId(versionId);
    const res = await fetch(`/api/pages/${pageId}/versions/${versionId}`, { method: "POST" });
    setRestoringId(null);
    if (res.ok) {
      onRestored();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <History size={16} className="text-green-600" />
          <h2 className="text-base font-bold text-gray-900 flex-1">Historique des versions</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {loading && <p className="text-xs text-gray-400 text-center py-6">Chargement…</p>}
          {!loading && versions.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-10">
              Aucune version archivée pour l&apos;instant.<br />
              Une version est créée à chaque sauvegarde manuelle.
            </p>
          )}
          {versions.map((v) => {
            const plain = v.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            const isPreview = previewId === v.id;
            return (
              <div key={v.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setPreviewId(isPreview ? null : v.id)}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{v.title}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); restore(v.id); }}
                      disabled={restoringId === v.id}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                    >
                      <RotateCcw size={11} />{restoringId === v.id ? "…" : "Restaurer"}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {v.author.name} · {new Date(v.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </button>
                {isPreview && (
                  <p className="text-xs text-gray-500 px-3.5 pb-3 border-t border-gray-50 pt-2 line-clamp-4">
                    {plain.slice(0, 280)}{plain.length > 280 ? "…" : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
