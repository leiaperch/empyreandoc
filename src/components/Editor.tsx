"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { PageLink } from "./PageLinkExtension";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, List, ListOrdered, Heading1, Heading2, Heading3,
  FileImage, BookOpen, Undo, Redo, LayoutTemplate,
} from "lucide-react";

interface Page {
  id: string;
  title: string;
}

interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

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

export default function Editor({ content, onChange, editable = true }: EditorProps) {
  const [pageLinkOpen, setPageLinkOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageSearch, setPageSearch] = useState("");
  const imgInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: "Commencez à écrire votre page…" }),
      PageLink,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
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
    editor
      .chain()
      .focus()
      .setPageLink({ pageId: page.id, pageTitle: page.title })
      .insertContent(page.title)
      .unsetPageLink()
      .run();
    setPageLinkOpen(false);
    setPageSearch("");
  };

  const insertTemplate = (templateContent: string) => {
    editor.chain().focus().setContent(templateContent).run();
    setTemplateOpen(false);
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      editor.chain().focus().setImage({ src }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Annuler"><Undo size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Rétablir"><Redo size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Titre 1"><Heading1 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Titre 2"><Heading2 size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Titre 3"><Heading3 size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Gras"><Bold size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italique"><Italic size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Souligné"><UnderlineIcon size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Barré"><Strikethrough size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Gauche"><AlignLeft size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centre"><AlignCenter size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Droite"><AlignRight size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Liste à puces"><List size={15} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Liste numérotée"><ListOrdered size={15} /></ToolbarBtn>
          <div className="w-px h-5 bg-gray-300 mx-1" />

          <ToolbarBtn
            onClick={() => {
              const url = window.prompt("URL :", editor.getAttributes("link").href);
              if (url) editor.chain().focus().setLink({ href: url }).run();
              else editor.chain().focus().unsetLink().run();
            }}
            active={editor.isActive("link")}
            title="Lien externe"
          >
            <LinkIcon size={15} />
          </ToolbarBtn>

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
                {pages.length === 0 && (
                  <p className="text-xs text-gray-400 px-1">Aucune page trouvée</p>
                )}
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

          {/* Image upload depuis fichier */}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageFile}
          />
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
