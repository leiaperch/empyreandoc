import { Mark, mergeAttributes } from "@tiptap/core";

export interface PageLinkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    pageLink: {
      setPageLink: (attrs: { pageId: string; pageTitle: string }) => ReturnType;
      unsetPageLink: () => ReturnType;
    };
  }
}

export const PageLink = Mark.create<PageLinkOptions>({
  name: "pageLink",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      pageTitle: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "a[data-page-link]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-page-link": "",
        class:
          "text-green-600 underline cursor-pointer hover:text-green-800 font-medium",
        href: `/doc/${HTMLAttributes.pageId}`,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setPageLink:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetPageLink:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
