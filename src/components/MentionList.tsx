"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export interface Personnage {
  id: string;
  title: string;
  joueur: string;
}

interface MentionListProps {
  items: Personnage[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selected, setSelected] = useState(0);

    useEffect(() => setSelected(0), [items]);

    const select = (index: number) => {
      const item = items[index];
      if (item) command({ id: item.id, label: item.title });
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowDown") {
          setSelected((i) => (i + 1) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "ArrowUp") {
          setSelected((i) => (i - 1 + Math.max(items.length, 1)) % Math.max(items.length, 1));
          return true;
        }
        if (event.key === "Enter") {
          select(selected);
          return true;
        }
        return false;
      },
    }), [items, selected]);

    if (items.length === 0) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs text-gray-400">
          Aucun personnage trouvé
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-56 max-h-64 overflow-y-auto">
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onMouseDown={(e) => { e.preventDefault(); select(i); }}
            onMouseEnter={() => setSelected(i)}
            className={`w-full text-left px-3 py-2 text-sm flex flex-col transition-colors ${
              i === selected ? "bg-green-50" : "hover:bg-gray-50"
            }`}
          >
            <span className="font-medium text-gray-800 truncate">{item.title}</span>
            <span className="text-xs text-gray-400 truncate">{item.joueur}</span>
          </button>
        ))}
      </div>
    );
  }
);
MentionList.displayName = "MentionList";
