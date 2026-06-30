"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import Link from "next/link";
import { Tag as TagIcon, FileText, ArrowLeft } from "lucide-react";

interface PageItem {
  id: string;
  title: string;
  tags: string;
  category: { name: string; icon: string | null };
}
interface TagMeta { name: string; color: string; icon: string | null }

function parseTags(raw: string): string[] {
  return (raw ?? "").split(",").map((t) => t.trim()).filter(Boolean);
}

export default function TagPage({ params }: { params: { name: string } }) {
  const tagName = decodeURIComponent(params.name);
  const { status } = useSession();
  const router = useRouter();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [meta, setMeta] = useState<TagMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, tRes] = await Promise.all([fetch("/api/pages"), fetch("/api/tags")]);
    if (pRes.ok) {
      const all: PageItem[] = await pRes.json();
      setPages(all.filter((p) => parseTags(p.tags).includes(tagName)));
    }
    if (tRes.ok) {
      const tags: TagMeta[] = await tRes.json();
      setMeta(tags.find((t) => t.name === tagName) ?? { name: tagName, color: "#16a34a", icon: null });
    }
    setLoading(false);
  }, [tagName]);

  useEffect(() => {
    if (status === "authenticated") fetchData();
  }, [status, fetchData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const color = meta?.color ?? "#16a34a";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-base font-bold shrink-0" style={{ background: color }}>
            {meta?.icon ?? <TagIcon size={16} />}
          </span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{tagName}</h1>
            <p className="text-sm text-gray-400">{pages.length} page{pages.length !== 1 ? "s" : ""} avec ce tag</p>
          </div>
        </header>

        <div className="px-6 py-6">
          {pages.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <TagIcon size={48} className="mx-auto mb-3 opacity-25" />
              <p className="text-lg font-medium text-gray-500">Aucune page avec le tag « {tagName} »</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pages.map((p) => (
                <Link key={p.id} href={`/doc/${p.id}`}
                  className="bg-white rounded-xl border border-gray-100 p-4 hover:border-green-300 hover:shadow-md hover:shadow-green-100 transition-all group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center text-lg shrink-0">{p.category.icon ?? "📄"}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-900 truncate text-sm">{p.title}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{p.category.name}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {parseTags(p.tags).map((t) => (
                      <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${t === tagName ? "text-white" : "bg-gray-100 text-gray-500"}`}
                        style={t === tagName ? { background: color } : undefined}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                    <FileText size={11} />Ouvrir
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
