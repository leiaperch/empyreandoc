"use client";

import { useState, useCallback, useRef } from "react";
import { Paperclip, Trash2, Download, Image as ImageIcon, FileText, File } from "lucide-react";

interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

interface AttachmentPanelProps {
  pageId: string;
  attachments: Attachment[];
  onAttachmentsChange: (attachments: Attachment[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function AttachmentIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <ImageIcon size={16} className="text-green-600" />;
  if (mimeType === "application/pdf") return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-500" />;
}

export default function AttachmentPanel({ pageId, attachments, onAttachmentsChange }: AttachmentPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");

    const newAttachments: Attachment[] = [...attachments];

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pageId", pageId);

      const res = await fetch("/api/attachments", { method: "POST", body: formData });
      if (res.ok) {
        const att: Attachment = await res.json();
        newAttachments.push(att);
      } else {
        const err = await res.json();
        setError(err.error ?? "Erreur lors de l'upload");
      }
    }

    onAttachmentsChange(newAttachments);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [pageId, attachments, onAttachmentsChange]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch("/api/attachments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      onAttachmentsChange(attachments.filter((a) => a.id !== id));
    }
  }, [attachments, onAttachmentsChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Paperclip size={15} />
        Pièces jointes ({attachments.length})
      </h3>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-green-200 rounded-lg p-4 text-center cursor-pointer
          hover:border-green-400 hover:bg-green-50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.doc,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        {uploading ? (
          <p className="text-sm text-green-600 animate-pulse">Envoi en cours…</p>
        ) : (
          <p className="text-sm text-gray-400">
            Glissez vos fichiers ici ou <span className="text-green-600 underline">parcourez</span>
            <br />
            <span className="text-xs">Images, PDF, documents — max 10 Mo</span>
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <ul className="mt-3 space-y-1">
          {attachments.map((att) => (
            <li
              key={att.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-green-50 group transition-colors"
            >
              <AttachmentIcon mimeType={att.mimeType} />
              <span className="text-sm text-gray-700 truncate flex-1">{att.name}</span>
              <span className="text-xs text-gray-400 shrink-0">{formatSize(att.size)}</span>
              <a
                href={att.url}
                download={att.name}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-green-100 transition-opacity"
                title="Télécharger"
              >
                <Download size={13} className="text-green-600" />
              </a>
              <button
                onClick={() => handleDelete(att.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 transition-opacity"
                title="Supprimer"
              >
                <Trash2 size={13} className="text-red-500" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
