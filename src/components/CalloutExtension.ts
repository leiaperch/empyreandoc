import { Node, mergeAttributes } from "@tiptap/core";

export type CalloutVariant = "info" | "warning" | "quote" | "mj";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (variant: CalloutVariant) => ReturnType;
      toggleCallout: (variant: CalloutVariant) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

/**
 * Encadré stylé (callout) : « Note du MJ », « Rumeur », « Avertissement », « Citation ».
 * Rendu comme <div data-type="callout" data-variant="…"> avec un contenu de blocs.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "info",
        parseHTML: (el) => el.getAttribute("data-variant") ?? "info",
        renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (variant) =>
        ({ commands }) =>
          commands.wrapIn(this.name, { variant }),
      toggleCallout:
        (variant) =>
        ({ commands }) =>
          commands.toggleWrap(this.name, { variant }),
      unsetCallout:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
