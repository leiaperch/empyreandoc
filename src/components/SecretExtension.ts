import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    secret: {
      setSecret: () => ReturnType;
      toggleSecret: () => ReturnType;
      unsetSecret: () => ReturnType;
    };
  }
}

/**
 * Bloc secret / MJ-only : contenu réservé aux scénaristes et admins.
 * Rendu comme <div data-type="secret">. Le contenu est retiré côté serveur
 * pour les narrateurs (voir stripSecrets dans l'API des pages).
 */
export const Secret = Node.create({
  name: "secret",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-type="secret"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "secret" }), 0];
  },

  addCommands() {
    return {
      setSecret:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
      toggleSecret:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      unsetSecret:
        () =>
        ({ commands }) =>
          commands.lift(this.name),
    };
  },
});
