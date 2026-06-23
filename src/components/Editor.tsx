"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, Color, FontFamily, FontSize } from "@tiptap/extension-text-style";
import Highlight from "@tiptap/extension-highlight";
import { PageLink } from "./PageLinkExtension";
import { createPersonnageMention } from "./PersonnageMention";
import type { Personnage } from "./MentionList";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, List, ListOrdered, Heading1, Heading2, Heading3,
  FileImage, BookOpen, Undo, Redo, LayoutTemplate, Highlighter, Minus,
} from "lucide-react";

/* ─── Custom Image extension with data-align ────────────────────────────── */
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-align": {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs: Record<string, string>) => ({
          "data-align": attrs["data-align"] ?? "center",
        }),
      },
    };
  },
});

/* ─── Constants ──────────────────────────────────────────────────────────── */
const FONTS = [
  { label: "Défaut", value: "" },
  { label: "Cinzel", value: "Cinzel, serif" },
  { label: "Lora", value: "Lora, serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
  { label: "Raleway", value: "Raleway, sans-serif" },
  { label: "IM Fell English", value: "'IM Fell English', serif" },
];

const FONT_SIZES = ["10px","12px","14px","16px","18px","20px","24px","28px","32px","36px","48px","64px"];

const HIGHLIGHT_COLORS = [
  "#fef08a","#bbf7d0","#bfdbfe","#fecaca","#f9a8d4","#ddd6fe","#fed7aa","#d1fae5",
];

const TEMPLATES = [
  {
    label: "Fiche personnage",
    icon: "👤",
    content: `<h1>Nom du personnage</h1>
<h2>Identité</h2>
<p><strong>Joueur :</strong> </p>
<p><strong>Race / Origine :</strong> </p>
<p><strong>Âge :</strong> </p>
<p><strong>Rôle dans l'histoire :</strong> </p>
<h2>Description</h2>
<p></p>
<h2>Personnalité</h2>
<p></p>
<h2>Objectifs &amp; motivations</h2>
<p></p>
<h2>Liens avec les autres personnages</h2>
<p></p>
<h2>Notes du MJ</h2>
<p></p>`,
  },
  {
    label: "Résumé de session",
    icon: "📋",
    content: `<h1>Session — [Date]</h1>
<h2>Présents</h2>
<p></p>
<h2>Résumé</h2>
<p></p>
<h2>Points clés</h2>
<ul><li></li><li></li></ul>
<h2>Conséquences &amp; suites</h2>
<p></p>
<h2>Notes pour la prochaine session</h2>
<p></p>`,
  },
  {
    label: "Description de lieu",
    icon: "🗺️",
    content: `<h1>Nom du lieu</h1>
<h2>Description générale</h2>
<p></p>
<h2>Atmosphère</h2>
<p></p>
<h2>Habitants &amp; factions</h2>
<p></p>
<h2>Secrets &amp; rumeurs</h2>
<ul><li></li><li></li></ul>
<h2>Points d'intérêt</h2>
<p></p>`,
  },
  {
    label: "Fil d'intrigue",
    icon: "🎭",
    content: `<h1>Titre de l'intrigue</h1>
<h2>Contexte</h2>
<p></p>
<h2>Personnages impliqués</h2>
<p></p>
<h2>Acte 1 — Mise en place</h2>
<p></p>
<h2>Acte 2 — Développement</h2>
<p></p>
<h2>Acte 3 — Résolution possible</h2>
<p></p>
<h2>Hooks &amp; rebondissements</h2>
<ul><li></li><li></li></ul>`,
  },
];

/* ─── Toolbar button ─────────────────────────────────────────────────────── */
function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        active ? "bg-green-600 text-white" : "text-gray-600 hover:bg-green-100 hover:text-green-800"
      }`}
    >
      {children}
    </button>
  );
}

/* ─── Editor ─────────────────────────────────────────────────────────────── */
interface Page { id: string; title: string; }
interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

export default function Editor({ content, onChange, editable = true }: EditorProps) {
  const [pageLinkOpen, setPageLinkOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [highlightOpen, setHighlightOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageSearch, setPageSearch] = useState("");
  const [fontColor, setFontColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("#fef08a");
  const imgInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const personnagesRef = useRef<Personnage[]>([]);
  const [mentionExtension] = useState(() => createPersonnageMention(personnagesRef));

  useEffect(() => {
    fetch("/api/personnages").then((r) => r.ok ? r.json() : []).then((data) => {
      personnagesRef.current = data;
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      CustomImage.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Commencez à écrire votre page…" }),
      PageLink,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontFamily,
      FontSize,
      mentionExtension,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content]);

  const fetchPages = useCallback(async (q: string) => {
    const res = await fetch("/api/pages");
    if (res.ok) {
      const all: Page[] = await res.json();
      setPages(all.filter((p) => p.title.toLowerCase().includes(q.toLowerCase())).slice(0, 10));
    }
  }, []);

  useEffect(() => {
    if (pageLinkOpen) fetchPages(pageSearch);
  }, [pageLinkOpen, pageSearch, fetchPages]);

  if (!editor) return null;

  const insertPageLink = (page: Page) => {
    editor.chain().focus().setPageLink({ pageId: page.id, pageTitle: page.title }).insertContent(page.title).unsetPageLink().run();
    setPageLinkOpen(false);
    setPageSearch("");
  };

  const insertTemplate = (tplContent: string) => {
    editor.chain().focus().setContent(tplContent).run();
    setTemplateOpen(false);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.chain().focus().setImage({ src: reader.result as string }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyColor = (color: string) => {
    setFontColor(color);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).setColor(color).run();
  };

  const applyHighlight = (color: string) => {
    setHighlightColor(color);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).setHighlight({ color }).run();
    setHighlightOpen(false);
  };

  const currentFontSize = (editor.getAttributes("textStyle") as Record<string, string>).fontSize ?? "";
  const currentFont = (editor.getAttributes("textStyle") as Record<string, string>).fontFamily ?? "";
  const imgActive = editor.isActive("image");
  const currentImgAlign = imgActive ? (editor.getAttributes("image") as Record<string, string>)["data-align"] ?? "center" : null;

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50">

          {/* Undo / Redo */}
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Annuler"><Undo size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Rétablir"><Redo size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Headings */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titre 1"><Heading1 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre 2"><Heading2 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titre 3"><Heading3 size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Basic marks */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras"><Bold size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique"><Italic size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligné"><UnderlineIcon size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barré"><Strikethrough size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Font color */}
          <div className="relative flex items-center gap-0.5">
            <button
              type="button"
              title="Couleur de police"
              onMouseDown={(e) => { e.preventDefault(); colorInputRef.current?.click(); }}
              className="flex flex-col items-center justify-center p-1 rounded hover:bg-green-100 transition-colors"
            >
              <span className="text-[11px] font-bold text-gray-700 leading-none">A</span>
              <span className="block h-1 w-4 rounded-sm mt-0.5" style={{ background: fontColor }} />
            </button>
            <input
              ref={colorInputRef}
              type="color"
              value={fontColor}
              onChange={(e) => applyColor(e.target.value)}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
            />
            <button
              type="button"
              title="Réinitialiser la couleur"
              onMouseDown={(e) => {
                e.preventDefault();
                setFontColor("#000000");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (editor.chain().focus() as any).unsetColor().run();
              }}
              className="text-[9px] text-gray-400 hover:text-red-500 transition-colors leading-none"
            >✕</button>
          </div>

          {/* Highlight */}
          <div className="relative">
            <button
              type="button"
              title="Surligner"
              onMouseDown={(e) => { e.preventDefault(); setHighlightOpen((v) => !v); }}
              className={`flex items-center gap-0.5 p-1.5 rounded transition-colors ${editor.isActive("highlight") ? "bg-yellow-300 text-gray-800" : "text-gray-600 hover:bg-green-100"}`}
            >
              <Highlighter size={15} />
              <span className="w-2.5 h-1.5 rounded-sm" style={{ background: highlightColor }} />
            </button>
            {highlightOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-36">
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c}
                      onMouseDown={(e) => { e.preventDefault(); applyHighlight(c); }}
                      className={`w-6 h-6 rounded border-2 transition-all ${highlightColor === c ? "border-gray-600 scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (editor.chain().focus() as any).unsetHighlight().run();
                    setHighlightOpen(false);
                  }}
                  className="w-full text-xs text-center text-gray-400 hover:text-red-500 transition-colors py-0.5"
                >Supprimer</button>
              </div>
            )}
          </div>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Font family */}
          <select
            value={currentFont}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (!val) (editor.chain().focus() as any).unsetFontFamily().run();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              else (editor.chain().focus() as any).setFontFamily(val).run();
            }}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400 max-w-[110px]"
            title="Police"
          >
            {FONTS.map((f) => (
              <option key={f.value} value={f.value} style={{ fontFamily: f.value || "inherit" }}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Font size */}
          <select
            value={currentFontSize}
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => {
              const val = e.target.value;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              if (!val) (editor.chain().focus() as any).unsetFontSize().run();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              else (editor.chain().focus() as any).setFontSize(val).run();
            }}
            className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-green-400 w-[68px]"
            title="Taille de police"
          >
            <option value="">Taille</option>
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Alignment */}
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Gauche"><AlignLeft size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centre"><AlignCenter size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Droite"><AlignRight size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Lists */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces"><List size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée"><ListOrdered size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Séparateur de section"><Minus size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          {/* Image alignment (contextual) */}
          {imgActive && (
            <>
              <ToolbarBtn
                onClick={() => editor.chain().focus().updateAttributes("image", { "data-align": "left" }).run()}
                active={currentImgAlign === "left"}
                title="Image à gauche"
              ><AlignLeft size={15} /></ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().updateAttributes("image", { "data-align": "center" }).run()}
                active={currentImgAlign === "center"}
                title="Image centrée"
              ><AlignCenter size={15} /></ToolbarBtn>
              <ToolbarBtn
                onClick={() => editor.chain().focus().updateAttributes("image", { "data-align": "right" }).run()}
                active={currentImgAlign === "right"}
                title="Image à droite"
              ><AlignRight size={15} /></ToolbarBtn>
              <div className="w-px h-5 bg-gray-300 mx-1" />
            </>
          )}

          {/* External link */}
          <ToolbarBtn
            onClick={() => {
              const url = window.prompt("URL :", editor.getAttributes("link").href as string);
              if (url) editor.chain().focus().setLink({ href: url }).run();
              else editor.chain().focus().unsetLink().run();
            }}
            active={editor.isActive("link")}
            title="Lien externe"
          ><LinkIcon size={15} /></ToolbarBtn>

          {/* Page link */}
          <div className="relative">
            <ToolbarBtn onClick={() => setPageLinkOpen((v) => !v)} active={pageLinkOpen} title="Lien vers une page">
              <BookOpen size={15} />
            </ToolbarBtn>
            {pageLinkOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-2">
                <input
                  autoFocus
                  value={pageSearch}
                  onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Rechercher une page…"
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-green-400"
                />
                {pages.length === 0 && <p className="text-xs text-gray-400 px-1">Aucune page trouvée</p>}
                {pages.map((p) => (
                  <button
                    key={p.id}
                    onMouseDown={(e) => { e.preventDefault(); insertPageLink(p); }}
                    className="w-full text-left text-sm px-2 py-1 rounded hover:bg-green-50 hover:text-green-800 truncate"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image */}
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          <ToolbarBtn onClick={() => imgInputRef.current?.click()} title="Insérer une image">
            <FileImage size={15} />
          </ToolbarBtn>

          {/* Templates */}
          <div className="relative">
            <ToolbarBtn onClick={() => setTemplateOpen((v) => !v)} active={templateOpen} title="Insérer un template">
              <LayoutTemplate size={15} />
            </ToolbarBtn>
            {templateOpen && (
              <div className="absolute top-full right-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
                <p className="text-xs text-gray-400 px-3 py-1.5 border-b border-gray-100">Templates</p>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onMouseDown={(e) => { e.preventDefault(); insertTemplate(t.content); }}
                    className="w-full text-left text-sm px-3 py-2 hover:bg-green-50 hover:text-green-800 flex items-center gap-2 transition-colors"
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <EditorContent
        editor={editor}
        className="prose prose-green max-w-none px-8 py-6 min-h-[420px] focus:outline-none text-gray-800"
      />
    </div>
  );
}
