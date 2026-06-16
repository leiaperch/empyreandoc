"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronRight, Plus, FileText, Lock, FolderOpen, FolderPlus, Users } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  restricted: boolean;
  archived: boolean;
  order: number;
  children: Category[];
}

interface SidebarProps {
  activePage?: string;
  onNewPage?: (categoryId: string) => void;
}

export default function Sidebar({ activePage, onNewPage }: SidebarProps) {
  const { data: session } = useSession();
  const role = (session?.user as { role?: string })?.role;
  const [categories, setCategories] = useState<Category[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [pages, setPages] = useState<Record<string, { id: string; title: string }[]>>({});

  const [subCatModal, setSubCatModal] = useState<{ open: boolean; parentId: string; parentName: string }>({ open: false, parentId: "", parentName: "" });
  const [subCatName, setSubCatName] = useState("");
  const [subCatIcon, setSubCatIcon] = useState("");
  const [subCreating, setSubCreating] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data: Category[] = await res.json();
      setCategories(data);
      const init: Record<string, boolean> = {};
      data.forEach((c) => { init[c.id] = true; });
      setExpanded((prev) => ({ ...init, ...prev }));
    }
  }, []);

  const fetchPagesForCategory = useCallback(async (categoryId: string) => {
    const res = await fetch(`/api/pages?categoryId=${categoryId}`);
    if (res.ok) {
      const data = await res.json();
      setPages((prev) => ({ ...prev, [categoryId]: data.map((p: { id: string; title: string }) => ({ id: p.id, title: p.title })) }));
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  useEffect(() => {
    categories.forEach((cat) => {
      fetchPagesForCategory(cat.id);
      (cat.children ?? []).forEach((child) => fetchPagesForCategory(child.id));
    });
  }, [categories, fetchPagesForCategory]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const createSubCategory = async () => {
    if (!subCatName.trim()) return;
    setSubCreating(true);
    const slug = `${subCatName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: subCatName.trim(),
        slug,
        icon: subCatIcon.trim() || null,
        parentId: subCatModal.parentId,
      }),
    });
    setSubCreating(false);
    if (res.ok) {
      setSubCatModal({ open: false, parentId: "", parentName: "" });
      setSubCatName("");
      setSubCatIcon("");
      fetchCategories();
    }
  };

  const renderCategory = (cat: Category, depth = 0): React.ReactNode => {
    if (depth === 0 && cat.slug === "personnages") return null;
    const isOpen = expanded[cat.id];
    const catPages = pages[cat.id] ?? [];
    const children = cat.children ?? [];
    const hasChildren = children.length > 0 || catPages.length > 0;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer group transition-colors
            ${depth === 0 ? "text-green-100 font-semibold text-xs uppercase tracking-wide mt-3" : "text-green-200 text-sm hover:bg-green-700/40"}
          `}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={() => toggle(cat.id)}
        >
          {hasChildren ? (
            isOpen ? <ChevronDown size={13} className="shrink-0 text-green-400" /> : <ChevronRight size={13} className="shrink-0 text-green-400" />
          ) : <span className="w-3" />}
          <span className="mr-1">{cat.icon ?? "📄"}</span>
          <span className="truncate flex-1">{cat.name}</span>
          {cat.restricted && !cat.archived && <Lock size={11} className="text-green-500 shrink-0" />}
          {cat.archived && <span className="text-[10px] text-green-500 border border-green-600 rounded px-1">✓</span>}
          {role === "SCENAR" && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-auto">
              {depth === 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSubCatModal({ open: true, parentId: cat.id, parentName: cat.name });
                  }}
                  className="p-0.5 rounded hover:bg-green-600 transition-colors"
                  title="Nouvelle sous-rubrique"
                >
                  <FolderPlus size={12} />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onNewPage?.(cat.id); }}
                className="p-0.5 rounded hover:bg-green-600 transition-colors"
                title="Nouvelle page"
              >
                <Plus size={12} />
              </button>
            </div>
          )}
        </div>

        {isOpen && (
          <div>
            {catPages.map((p) => (
              <Link
                key={p.id}
                href={`/doc/${p.id}`}
                className={`flex items-center gap-2 py-1 rounded-md text-sm transition-colors
                  ${activePage === p.id
                    ? "bg-green-600 text-white"
                    : "text-green-300 hover:bg-green-700/40 hover:text-green-100"
                  }`}
                style={{ paddingLeft: `${24 + depth * 12}px` }}
              >
                <FileText size={12} className="shrink-0" />
                <span className="truncate">{p.title}</span>
              </Link>
            ))}
            {children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 bg-green-900 text-green-100 flex flex-col h-screen overflow-y-auto border-r border-green-800">
      <div className="px-4 py-4 border-b border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="font-bold text-green-100 text-lg tracking-tight">EmpyreanDoc</span>
        </div>
        <div className="mt-1 text-xs text-green-400">
          {session?.user?.name} · <span className="capitalize">{role?.toLowerCase()}</span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-green-200 hover:bg-green-700/40 hover:text-green-100 transition-colors"
        >
          <FolderOpen size={15} />
          Tableau de bord
        </Link>
        <Link
          href="/joueurs"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-green-200 hover:bg-green-700/40 hover:text-green-100 transition-colors"
        >
          <Users size={15} />
          Joueurs
        </Link>

        <div className="mt-2">
          {categories.map((cat) => renderCategory(cat))}
        </div>
      </nav>

      <div className="px-4 py-3 border-t border-green-800">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
          ${role === "SCENAR" ? "bg-green-700 text-green-100" : "bg-green-800 text-green-300"}`}>
          {role === "SCENAR" ? "🎬 Scénariste" : "📜 Narrateur"}
        </span>
      </div>

      {subCatModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 mx-4">
            <h2 className="text-base font-bold text-gray-900 mb-1">Nouvelle sous-rubrique</h2>
            <p className="text-sm text-gray-500 mb-4">Dans : {subCatModal.parentName}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  autoFocus
                  value={subCatName}
                  onChange={(e) => setSubCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createSubCategory()}
                  placeholder="ex : Joueur 1, Saison 2…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Icône (emoji)</label>
                <input
                  value={subCatIcon}
                  onChange={(e) => setSubCatIcon(e.target.value)}
                  placeholder="ex : 🧙 🗡️ 🎲"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setSubCatModal({ open: false, parentId: "", parentName: "" }); setSubCatName(""); setSubCatIcon(""); }}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createSubCategory}
                disabled={subCreating || !subCatName.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {subCreating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
