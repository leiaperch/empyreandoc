"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronRight, Plus, FileText, Lock, FolderOpen } from "lucide-react";

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

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const data: Category[] = await res.json();
      setCategories(data);
      // Auto-expand top-level
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
      cat.children.forEach((child) => fetchPagesForCategory(child.id));
    });
  }, [categories, fetchPagesForCategory]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderCategory = (cat: Category, depth = 0) => {
    const isOpen = expanded[cat.id];
    const catPages = pages[cat.id] ?? [];
    const hasChildren = cat.children.length > 0 || catPages.length > 0;

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
            <button
              onClick={(e) => { e.stopPropagation(); onNewPage?.(cat.id); }}
              className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 rounded hover:bg-green-600 transition-opacity"
              title="Nouvelle page"
            >
              <Plus size={12} />
            </button>
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
            {cat.children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 shrink-0 bg-green-900 text-green-100 flex flex-col h-screen overflow-y-auto border-r border-green-800">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-green-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center text-white font-bold text-sm">E</div>
          <span className="font-bold text-green-100 text-lg tracking-tight">EmpyreanDoc</span>
        </div>
        <div className="mt-1 text-xs text-green-400">
          {session?.user?.name} · <span className="capitalize">{role?.toLowerCase()}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-green-200 hover:bg-green-700/40 hover:text-green-100 transition-colors"
        >
          <FolderOpen size={15} />
          Tableau de bord
        </Link>

        <div className="mt-2">
          {categories.map((cat) => renderCategory(cat))}
        </div>
      </nav>

      {/* Role badge */}
      <div className="px-4 py-3 border-t border-green-800">
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full
          ${role === "SCENAR" ? "bg-green-700 text-green-100" : "bg-green-800 text-green-300"}`}>
          {role === "SCENAR" ? "🎬 Scénariste" : "📜 Narrateur"}
        </span>
      </div>
    </aside>
  );
}
