"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  category: { name: string; icon: string | null };
  snippet: string;
}

/** Met en gras les occurrences de `q` dans `text`. */
function highlight(text: string, q: string): React.ReactNode {
  const term = q.trim();
  if (!term) return text;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((part, i) =>
    part.toLowerCase() === term.toLowerCase()
      ? <mark key={i} className="bg-green-200 text-green-900 rounded px-0.5">{part}</mark>
      : part
  );
}

export default function SearchModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) setResults(await res.json());
      setActiveIndex(0);
      setLoading(false);
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const select = useCallback((r: SearchResult) => {
    router.push(`/doc/${r.id}`);
    close();
  }, [router, close]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh]"
      onMouseDown={close}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Search size={16} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher une page, un personnage, un tag…"
            className="flex-1 text-sm outline-none placeholder-gray-400"
          />
          <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {loading && (
            <p className="text-xs text-gray-400 text-center py-6">Recherche…</p>
          )}
          {!loading && query.trim() && results.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">Aucun résultat pour &quot;{query}&quot;.</p>
          )}
          {!loading && results.map((r, i) => (
            <button
              key={r.id}
              onMouseDown={(e) => { e.preventDefault(); select(r); }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                i === activeIndex ? "bg-green-50" : "hover:bg-gray-50"
              }`}
            >
              <span className="text-lg shrink-0 mt-0.5">{r.category.icon ?? <FileText size={16} className="text-gray-300" />}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{highlight(r.title, query)}</p>
                <p className="text-xs text-gray-400 truncate">{r.category.name}</p>
                {r.snippet && <p className="text-xs text-gray-500 truncate mt-0.5">{highlight(r.snippet, query)}</p>}
              </div>
            </button>
          ))}
        </div>

        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded">↑↓</kbd> naviguer</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded">↵</kbd> ouvrir</span>
          <span><kbd className="px-1 py-0.5 bg-gray-100 rounded">esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}
