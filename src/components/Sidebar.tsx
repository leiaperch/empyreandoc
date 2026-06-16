"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronRight, Plus, FileText, Lock, FolderOpen, FolderPlus, Users, Pencil, Check, X } from "lucide-react";
import EmojiPicker from "./EmojiPicker";

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

  // Sub-category creation modal
  const [subCatModal, setSubCatModal] = useState<{ open: boolean; parentId: string; parentName: string }>({ open: false, parentId: "", parentName: "" });
  const [subCatName, setSubCatName] = useState("");
  const [subCatIcon, setSubCatIcon] = useState("");
  const [subCreating, setSubCreating] = useState(false);

  // Rename state for categories
  const [renameCatId, setRenameCatId] = useState<string | null>(null);
  const [renameCatName, setRenameCatName] = useState("");
  const [renameCatIcon, setRenameCatIcon] = useState("");

  // Rename state for pages
  const [renamePageId, setRenamePageId] = useState<string | null>(null);
  const [renamePageTitle, setRenamePageTitle] = useState("");

  const canManage = role === "SCENAR" || role === "ADMIN";

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
      (cat.children ?? []).forEach((child) => {
        fetchPagesForCategory(child.id);
        (child.children ?? []).forEach((grandchild) => fetchPagesForCategory(grandchild.id));
      });
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

  const startRenameCat = (cat: Category, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenameCatId(cat.id);
    setRenameCatName(cat.name);
    setRenameCatIcon(cat.icon ?? "");
    setRenamePageId(null);
  };

  const saveRenameCat = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!renameCatId) return;
    await fetch(`/api/categories/${renameCatId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameCatName.trim(), icon: renameCatIcon.trim() || null }),
    });
    setRenameCatId(null);
    fetchCategories();
  };

  const startRenamePage = (page: { id: string; title: string }, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamePageId(page.id);
    setRenamePageTitle(page.title);
    setRenameCatId(null);
  };

  const saveRenamePage = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!renamePageId || !renamePageTitle.trim()) return;
    await fetch(`/api/pages/${renamePageId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: renamePageTitle.trim() }),
    });
    setRenamePageId(null);
    setPages((prev) => {
      const updated = { ...prev };
      for (const catId in updated) {
        updated[catId] = updated[catId].map((p) =>
          p.id === renamePageId ? { ...p, title: renamePageTitle.trim() } : p
        );
      }
      return updated;
    });
  };

  const cancelRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameCatId(null);
    setRenamePageId(null);
  };

  const renderPages = (catId: string, depth: number) => {
    const catPages = pages[catId] ?? [];
    return catPages.map((p) => {
      const isRenamingThisPage = renamePageId === p.id;
      if (isRenamingThisPage) {
        return (
          <div key={p.id} className="flex items-center gap-1 py-1 rounded-md" style={{ paddingLeft: `${24 + depth * 12}px`, paddingRight: "8px" }}>
            <input
              autoFocus
              value={renamePageTitle}
              onChange={(e) => setRenamePageTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveRenamePage(e); if (e.key === "Escape") cancelRename(); }}
              className="flex-1 min-w-0 bg-green-800 text-green-100 border border-green-600 rounded px-1.5 py-0.5 text-xs outline-none"
            />
            <button onClick={saveRenamePage} className="p-0.5 text-green-300 hover:text-green-100 shrink-0"><Check size={11} /></button>
            <button onClick={cancelRename} className="p-0.5 text-green-400 hover:text-green-200 shrink-0"><X size={11} /></button>
          </div>
        );
      }
      return (
        <div key={p.id} className="group flex items-center rounded-md transition-colors" style={{ paddingLeft: `${24 + depth * 12}px` }}>
          <Link
            href={`/doc/${p.id}`}
            className={`flex items-center gap-2 py-1 flex-1 min-w-0 text-sm transition-colors
              ${activePage === p.id ? "text-white font-medium" : "text-green-300 hover:text-green-100"}`}
          >
            <FileText size={12} className="shrink-0 opacity-60" />
            <span className="truncate">{p.title}</span>
          </Link>
          {canManage && (
            <button
              onClick={(e) => startRenamePage(p, e)}
              className="opacity-0 group-hover:opacity-100 p-0.5 mr-1 rounded hover:bg-green-600 text-green-400 hover:text-green-100 transition-all shrink-0"
              title="Renommer"
            >
              <Pencil size={10} />
            </button>
          )}
        </div>
      );
    });
  };

  const renderCategory = (cat: Category, depth = 0): React.ReactNode => {
    if (depth === 0 && cat.slug === "personnages") return renderPersonnagesSection(cat);
    if (depth === 0 && cat.slug === "plots-personnage") return null;

    const isOpen = expanded[cat.id];
    const children = cat.children ?? [];
    const catPages = pages[cat.id] ?? [];
    const hasChildren = children.length > 0 || catPages.length > 0;
    const isRenamingThisCat = renameCatId === cat.id;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer group transition-colors
            ${depth === 0
              ? "text-green-100 font-semibold text-xs uppercase tracking-wide mt-3"
              : "text-green-200 text-sm hover:bg-green-700/40"
            }`}
          style={{ paddingLeft: `${12 + depth * 12}px` }}
          onClick={() => !isRenamingThisCat && toggle(cat.id)}
        >
          {hasChildren ? (
            isOpen ? <ChevronDown size={13} className="shrink-0 text-green-400" /> : <ChevronRight size={13} className="shrink-0 text-green-400" />
          ) : <span className="w-3" />}

          {isRenamingThisCat ? (
            <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
              <EmojiPicker value={renameCatIcon} onChange={setRenameCatIcon} placeholder="📄" />
              <input
                autoFocus
                value={renameCatName}
                onChange={(e) => setRenameCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveRenameCat(e); if (e.key === "Escape") cancelRename(); }}
                className="flex-1 min-w-0 bg-green-800 text-green-100 border border-green-600 rounded px-1.5 py-0.5 text-xs outline-none"
              />
              <button onClick={saveRenameCat} className="p-0.5 text-green-300 hover:text-green-100 shrink-0"><Check size={11} /></button>
              <button onClick={cancelRename} className="p-0.5 text-green-400 hover:text-green-200 shrink-0"><X size={11} /></button>
            </div>
          ) : (
            <>
              <span className="mr-1">{cat.icon ?? "📄"}</span>
              <span className="truncate flex-1">{cat.name}</span>
              {cat.restricted && !cat.archived && <Lock size={11} className="text-green-500 shrink-0" />}
              {cat.archived && <span className="text-[10px] text-green-500 border border-green-600 rounded px-1">✓</span>}
              {canManage && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-auto shrink-0">
                  {depth >= 1 && (
                    <button onClick={(e) => startRenameCat(cat, e)} className="p-0.5 rounded hover:bg-green-600 transition-colors" title="Renommer">
                      <Pencil size={11} />
                    </button>
                  )}
                  {depth <= 1 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setSubCatModal({ open: true, parentId: cat.id, parentName: cat.name }); }}
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
            </>
          )}
        </div>

        {isOpen && (
          <div>
            {renderPages(cat.id, depth)}
            {children.map((child) => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Special rendering for the "personnages" root category → shows joueurs + their pages
  const renderPersonnagesSection = (cat: Category) => {
    const joueurs = cat.children ?? [];
    const isOpen = expanded[cat.id] ?? true;

    return (
      <div key={cat.id}>
        {/* Section header */}
        <div
          className="flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer group transition-colors text-green-100 font-semibold text-xs uppercase tracking-wide mt-3"
          onClick={() => toggle(cat.id)}
        >
          {isOpen ? <ChevronDown size={13} className="shrink-0 text-green-400" /> : <ChevronRight size={13} className="shrink-0 text-green-400" />}
          <Users size={13} className="mr-1 text-green-400" />
          <span className="truncate flex-1">Joueurs</span>
          {canManage && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 ml-auto shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setSubCatModal({ open: true, parentId: cat.id, parentName: cat.name }); }}
                className="p-0.5 rounded hover:bg-green-600 transition-colors"
                title="Nouveau joueur"
              >
                <FolderPlus size={12} />
              </button>
            </div>
          )}
        </div>

        {isOpen && (
          <div>
            {joueurs.length === 0 && (
              <p className="text-xs text-green-600 italic px-8 py-1">Aucun joueur</p>
            )}
            {joueurs.map((joueur) => {
              const isJoueurOpen = expanded[joueur.id] ?? true;
              const joueurPages = pages[joueur.id] ?? [];
              const isRenamingThisJoueur = renameCatId === joueur.id;

              return (
                <div key={joueur.id}>
                  <div
                    className="flex items-center gap-1 py-1.5 rounded-md cursor-pointer group transition-colors text-green-200 text-sm hover:bg-green-700/40"
                    style={{ paddingLeft: "24px" }}
                    onClick={() => !isRenamingThisJoueur && toggle(joueur.id)}
                  >
                    {joueurPages.length > 0 ? (
                      isJoueurOpen ? <ChevronDown size={12} className="shrink-0 text-green-500" /> : <ChevronRight size={12} className="shrink-0 text-green-500" />
                    ) : <span className="w-3" />}

                    {isRenamingThisJoueur ? (
                      <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <EmojiPicker value={renameCatIcon} onChange={setRenameCatIcon} placeholder="🧙" />
                        <input
                          autoFocus
                          value={renameCatName}
                          onChange={(e) => setRenameCatName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveRenameCat(e); if (e.key === "Escape") cancelRename(); }}
                          className="flex-1 min-w-0 bg-green-800 text-green-100 border border-green-600 rounded px-1.5 py-0.5 text-xs outline-none"
                        />
                        <button onClick={saveRenameCat} className="p-0.5 text-green-300 hover:text-green-100 shrink-0"><Check size={11} /></button>
                        <button onClick={cancelRename} className="p-0.5 text-green-400 hover:text-green-200 shrink-0"><X size={11} /></button>
                      </div>
                    ) : (
                      <>
                        <span className="mr-1 text-base leading-none">{joueur.icon ?? "🧙"}</span>
                        <span className="truncate flex-1 font-medium">{joueur.name}</span>
                        <span className="text-[10px] text-green-600 shrink-0 mr-1">{joueurPages.length}</span>
                        {canManage && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0">
                            <button onClick={(e) => startRenameCat(joueur, e)} className="p-0.5 rounded hover:bg-green-600 transition-colors" title="Renommer">
                              <Pencil size={11} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onNewPage?.(joueur.id); }}
                              className="p-0.5 rounded hover:bg-green-600 transition-colors"
                              title="Nouveau personnage"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {isJoueurOpen && !isRenamingThisJoueur && (
                    <div>
                      {renderPages(joueur.id, 2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const roleBadge = role === "ADMIN"
    ? { label: "👑 Admin", cls: "bg-amber-700 text-amber-100" }
    : role === "SCENAR"
    ? { label: "🎬 Scénariste", cls: "bg-green-700 text-green-100" }
    : { label: "📜 Narrateur", cls: "bg-green-800 text-green-300" };

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
        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${roleBadge.cls}`}>
          {roleBadge.label}
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Icône</label>
                <EmojiPicker value={subCatIcon} onChange={setSubCatIcon} placeholder="Choisir" />
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
