"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, LogOut, FileText, Clock, Search } from "lucide-react";

interface Page {
  id: string;
  title: string;
  updatedAt: string;
  category: { name: string; icon: string | null };
  author: { name: string };
  _count: { attachments: number };
}

interface NewPageModal {
  open: boolean;
  categoryId: string;
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<NewPageModal>({ open: false, categoryId: "" });
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchPages = useCallback(async () => {
    const res = await fetch("/api/pages");
    if (res.ok) setPages(await res.json());
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const cats = await res.json();
      const flat: { id: string; name: string; icon: string | null }[] = [];
      for (const c of cats) {
        flat.push({ id: c.id, name: c.name, icon: c.icon });
        for (const child of c.children ?? []) flat.push({ id: child.id, name: `${c.name} / ${child.name}`, icon: child.icon });
      }
      setCategories(flat);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPages();
      fetchCategories();
    }
  }, [status, fetchPages, fetchCategories]);

  const openNewPage = (categoryId = "") => {
    setModal({ open: true, categoryId: categoryId || (categories[0]?.id ?? "") });
    setNewTitle("");
  };

  const createPage = async () => {
    if (!newTitle.trim() || !modal.categoryId) return;
    setCreating(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, categoryId: modal.categoryId }),
    });
    setCreating(false);
    if (res.ok) {
      const page = await res.json();
      setModal({ open: false, categoryId: "" });
      router.push(`/doc/${page.id}`);
    }
  };

  const role = (session?.user as { role?: string })?.role;
  const filteredPages = pages.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar onNewPage={(catId) => openNewPage(catId)} />

      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une page…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
            />
          </div>
          {role === "SCENAR" && (
            <button
              onClick={() => openNewPage()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Nouvelle page
            </button>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-colors"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </header>

        <div className="px-6 py-6">
          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour, {session?.user?.name} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {filteredPages.length} page{filteredPages.length !== 1 ? "s" : ""} accessible{filteredPages.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Page grid */}
          {filteredPages.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText size={48} className="mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Aucune page pour l&apos;instant</p>
              {role === "SCENAR" && (
                <p className="text-sm mt-1">Créez votre première page avec le bouton ci-dessus.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPages.map((page) => (
                <a
                  key={page.id}
                  href={`/doc/${page.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-green-300 hover:shadow-md hover:shadow-green-100 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg shrink-0 group-hover:bg-green-100 transition-colors">
                      {page.category.icon ?? "📄"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate text-sm">{page.title}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{page.category.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(page.updatedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                    {page._count.attachments > 0 && (
                      <span>📎 {page._count.attachments}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* New page modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Nouvelle page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titre</label>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createPage()}
                  placeholder="Titre de la page…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rubrique</label>
                <select
                  value={modal.categoryId}
                  onChange={(e) => setModal((m) => ({ ...m, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-400 transition bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon ?? "📄"} {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setModal({ open: false, categoryId: "" })}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={createPage}
                disabled={creating || !newTitle.trim()}
                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {creating ? "Création…" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
