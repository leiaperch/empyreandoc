"use client";

import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Sommaire automatique : scanne les titres (h1/h2/h3) rendus dans le conteneur
 * indiqué, leur attribue un id d'ancre, et affiche une table des matières
 * flottante. Masqué en mode édition ou si moins de 3 titres.
 */
export default function TableOfContents({
  containerId,
  content,
  hidden,
}: {
  containerId: string;
  content: string;
  hidden?: boolean;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (hidden) { setHeadings([]); return; }
    const container = document.getElementById(containerId);
    if (!container) return;
    const els = Array.from(container.querySelectorAll(".reading-mode h1, .reading-mode h2, .reading-mode h3")) as HTMLElement[];
    const used = new Set<string>();
    const list: Heading[] = els.map((el, i) => {
      const text = el.textContent?.trim() || `Section ${i + 1}`;
      let slug = "h-" + text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      while (used.has(slug)) slug += "-" + i;
      used.add(slug);
      el.id = slug;
      return { id: slug, text, level: Number(el.tagName[1]) };
    });
    setHeadings(list);
  }, [containerId, content, hidden]);

  useEffect(() => {
    if (headings.length === 0) return;
    const onScroll = () => {
      let current = "";
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el && el.getBoundingClientRect().top < 120) current = h.id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [headings]);

  if (hidden || headings.length < 3) return null;

  return (
    <nav className="hidden xl:block fixed right-6 top-24 w-56 max-h-[70vh] overflow-y-auto bg-white border border-gray-100 rounded-xl p-4 shadow-sm print:hidden">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
        <ListTree size={13} />Sommaire
      </h2>
      <ul className="space-y-1.5 text-sm">
        {headings.map((h) => (
          <li key={h.id} style={{ paddingLeft: (h.level - 1) * 12 }}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`toc-link block truncate border-l-2 pl-2 ${
                active === h.id
                  ? "border-green-500 text-green-700 font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
