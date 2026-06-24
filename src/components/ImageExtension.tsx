"use client";

import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { useRef } from "react";
import { AlignLeft, AlignCenter, AlignRight, Maximize2 } from "lucide-react";

/* ─── NodeView : image redimensionnable + barre d'alignement ──────────────── */
function ImageNodeView({ node, updateAttributes, selected, editor }: NodeViewProps) {
  const align = (node.attrs["data-align"] as string) ?? "center";
  const width = node.attrs.width as string | null;
  const imgRef = useRef<HTMLImageElement>(null);

  const setAlign = (a: string) => updateAttributes({ "data-align": a });

  const onResizeStart = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = imgRef.current?.offsetWidth ?? 200;
    const onMove = (ev: PointerEvent) => {
      const newW = Math.max(60, Math.round(startW + (ev.clientX - startX)));
      updateAttributes({ width: `${newW}px` });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const editable = editor.isEditable;

  return (
    <NodeViewWrapper
      className={`img-wrapper${selected && editable ? " selected" : ""}`}
      data-align={align}
      style={width ? { width } : undefined}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={imgRef} src={node.attrs.src} alt={node.attrs.alt ?? ""} draggable={false} />

      {editable && selected && (
        <div className="img-toolbar" contentEditable={false}>
          <button type="button" title="À gauche" className={align === "left" ? "on" : ""}
            onMouseDown={(e) => { e.preventDefault(); setAlign("left"); }}><AlignLeft size={14} /></button>
          <button type="button" title="Centrer" className={align === "center" ? "on" : ""}
            onMouseDown={(e) => { e.preventDefault(); setAlign("center"); }}><AlignCenter size={14} /></button>
          <button type="button" title="À droite" className={align === "right" ? "on" : ""}
            onMouseDown={(e) => { e.preventDefault(); setAlign("right"); }}><AlignRight size={14} /></button>
          <span className="sep" />
          <button type="button" title="Taille d'origine"
            onMouseDown={(e) => { e.preventDefault(); updateAttributes({ width: null }); }}><Maximize2 size={14} /></button>
        </div>
      )}

      {editable && selected && (
        <span className="img-resize-handle" onPointerDown={onResizeStart} contentEditable={false} />
      )}
    </NodeViewWrapper>
  );
}

/* Image étendue : attribut d'alignement + largeur, persistés dans le HTML
   (data-align + style="width:…") pour un rendu identique en lecture. */
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-align": {
        default: "center",
        parseHTML: (el: HTMLElement) => el.getAttribute("data-align") ?? "center",
        renderHTML: (attrs: Record<string, string>) => ({ "data-align": attrs["data-align"] ?? "center" }),
      },
      width: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.width || el.getAttribute("width") || null,
        renderHTML: (attrs: Record<string, string | null>) =>
          attrs.width ? { style: `width: ${attrs.width}` } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
