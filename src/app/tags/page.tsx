"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import Sidebar from "@/components/Sidebar";
import EmojiPicker from "@/components/EmojiPicker";
import { Tag, Pencil, Trash2, Check, X, Plus } from "lucide-react";

interface TagObj {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  group: string | null;
}

const PRESET_COLORS = [
  "#16a34a","#7c3aed","#2563eb","#d97706","#dc2626",
  "#0891b2","#db2777","#65a30d","#ea580c","#0d9488",
  "#6366f1","#854d0e","#1e3a5f","#7f1d1d","#374151",
];

const NO_GROUP = "__none__";

export default function TagsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tags, setTags] = useState<TagObj[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#16a34a");
  const [newIcon, setNewIcon] = useState("");
  const [newGroup, setNewGroup] = useState("");
  const [creating, setCreating] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const canManage = role === "SCENAR" || role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/tags");
    if (res.ok) setTags(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchTags();
  }, [status, fetchTags]);

  const existingGroups = useMemo(
    () => Array.from(new Set(tags.map((t) => t.group).filter(Boolean))).sort() as string[],
    [tags]
  );

  const groupedTags = useMemo(() => {
    const groups = new Map<string, TagObj[]>();
    for (const t of tags) {
      const key = t.group?.trim() || NO_GROUP;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === NO_GROUP) return 1;
      if (b === NO_GROUP) return -1;
      return a.localeCompare(b);
    });
  }, [tags]);

  const startEdit = (tag: TagObj) => {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditIcon(tag.icon ?? "");
    setEditGroup(tag.group ?? "");
  };

  const saveEdit = async (oldName: string) => {
    setSaving(true);
    await fetch(`/api/tags/${encodeURIComponent(oldName)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor, icon: editIcon || null, group: editGroup.trim() || null }),
    });
    setSaving(false);
    setEditId(null);
    fetchTags();
  };

  const deleteTag = async (name: string) => {
    if (!confirm(`Supprimer le tag "${name}" ?`)) return;
    await fetch(`/api/tags/${encodeURIComponent(name)}`, { method: "DELETE" });
    fetchTags();
  };

  const createTag = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor, icon: newIcon || null, group: newGroup.trim() || null }),
    });
    setCreating(false);
    setNewName("");
    setNewIcon("");
    setNewGroup("");
    fetchTags();
  };

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
          <Tag size={18} className="text-green-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Gestion des tags</h1>
            <p className="text-sm text-gray-400">{tags.length} tag{tags.length !== 1 ? "s" : ""}</p>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-8 space-y-3">
          <datalist id="tag-groups">
            {existingGroups.map((g) => <option key={g} value={g} />)}
          </datalist>

          {/* Create new tag */}
          {canManage && (
            <div className="bg-white border border-dashed border-green-300 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-3">
                <EmojiPicker value={newIcon} onChange={setNewIcon} placeholder="🏷️" />
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createTag()}
                  placeholder="Nouveau tag…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                    className="w-8 h-8 border-none rounded cursor-pointer p-0" />
                  <button onClick={createTag} disabled={creating || !newName.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                    <Plus size={14} />Créer
                  </button>
                </div>
              </div>
              <input
                value={newGroup}
                onChange={(e) => setNewGroup(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTag()}
                placeholder="Catégorie (ex : race, faction, lieu…) — optionnel"
                list="tag-groups"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
          )}

          {tags.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Tag size={40} className="mx-auto mb-3 opacity-30" />
              <p>Aucun tag pour l&apos;instant.</p>
            </div>
          )}

          {groupedTags.map(([group, groupTags]) => (
            <div key={group} className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-3 first:pt-0">
                {group === NO_GROUP ? "Sans catégorie" : group}
              </h2>
              {groupTags.map((tag) => {
                const isEditing = editId === tag.id;
                return (
                  <div key={tag.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-green-200 transition-colors">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <EmojiPicker value={editIcon} onChange={setEditIcon} placeholder="🏷️" />
                          <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(tag.name); if (e.key === "Escape") setEditId(null); }}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
                          <input type="color" value={editColor} onChange={(e) => setEditColor(e.target.value)}
                            className="w-8 h-8 border-none rounded cursor-pointer p-0 shrink-0" />
                          <div className="flex gap-1 shrink-0">
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {PRESET_COLORS.map((c) => (
                                <button key={c} onClick={() => setEditColor(c)}
                                  className={`w-5 h-5 rounded-full border-2 transition-all ${editColor === c ? "border-gray-700 scale-110" : "border-transparent"}`}
                                  style={{ background: c }} />
                              ))}
                            </div>
                            <button onClick={() => saveEdit(tag.name)} disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"><Check size={15} /></button>
                            <button onClick={() => setEditId(null)}
                              className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><X size={15} /></button>
                          </div>
                        </div>
                        <input
                          value={editGroup}
                          onChange={(e) => setEditGroup(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(tag.name); }}
                          placeholder="Catégorie — optionnel"
                          list="tag-groups"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ background: tag.color }}>
                          {tag.icon ?? tag.name[0]?.toUpperCase()}
                        </div>
                        <span className="flex-1 text-sm font-medium text-gray-800">{tag.name}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white shrink-0" style={{ background: tag.color }}>
                          {tag.icon ? `${tag.icon} ` : ""}{tag.name}
                        </span>
                        {canManage && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => startEdit(tag)}
                              className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteTag(tag.name)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
