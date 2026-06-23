import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import { MentionList, type MentionListRef, type Personnage } from "./MentionList";

export function createPersonnageMention(personnagesRef: { current: Personnage[] }) {
  return Mention.configure({
    HTMLAttributes: {
      class: "mention text-green-600 underline font-medium cursor-pointer hover:text-green-800",
    },
    renderHTML({ node }) {
      return [
        "a",
        { href: `/doc/${node.attrs.id}`, "data-mention-id": node.attrs.id, class: "mention text-green-600 underline font-medium cursor-pointer hover:text-green-800" },
        `@${node.attrs.label ?? node.attrs.id}`,
      ];
    },
    suggestion: {
      char: "@",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: ({ query }: any) =>
        personnagesRef.current
          .filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 8),
      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: HTMLDivElement | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatePosition = (props: any) => {
          const rect = props.clientRect?.();
          if (!rect || !popup) return;
          popup.style.left = `${rect.left}px`;
          popup.style.top = `${rect.bottom + 6}px`;
        };

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStart: (props: any) => {
            component = new ReactRenderer(MentionList, {
              props: { items: props.items, command: props.command },
              editor: props.editor,
            });
            popup = document.createElement("div");
            popup.style.position = "fixed";
            popup.style.zIndex = "9999";
            document.body.appendChild(popup);
            popup.appendChild(component.element);
            updatePosition(props);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onUpdate: (props: any) => {
            component?.updateProps({ items: props.items, command: props.command });
            updatePosition(props);
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onKeyDown: (props: any) => {
            if (props.event.key === "Escape") {
              popup?.remove();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit: () => {
            popup?.remove();
            component?.destroy();
            popup = null;
            component = null;
          },
        };
      },
    },
  });
}
