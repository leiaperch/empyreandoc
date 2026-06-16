"use client";

import { useEffect, useRef, useState } from "react";
import { Smile } from "lucide-react";

const EMOJI_GROUPS = [
  {
    label: "Personnages",
    emojis: ["🧙","🧝","🧛","🧟","🧜","🧚","🧞","🏹","⚔️","🛡️","🗡️","🪄","👑","🎭","🤺","🧑‍🎤","🦸","🦹","🧑‍⚕️","🧑‍🔬","🕵️","🧑‍🚀","🥷","🫅","👸","🤴","🧓","👼","🤡","👹","👺","👻","💀","☠️"],
  },
  {
    label: "Lieux",
    emojis: ["🏰","🏯","⛩️","🗼","🏛️","⛺","🌲","🌳","🏔️","🗻","🌋","🏝️","🗺️","🌊","🌾","🏕️","🕌","⛪","🏟️","🌃","🌆","🌉","🏜️","🌌","🔭","🧭"],
  },
  {
    label: "Magie & Mystère",
    emojis: ["✨","💫","⭐","🌟","🔮","🪬","🧿","💎","🔵","🟣","🌀","🌈","☄️","🌙","🌑","☀️","⚡","🔥","💧","🌿","❄️","🌪️","🌊","🩸","💀","👁️","🫀","🧠","🦋","🌸"],
  },
  {
    label: "Objets & Armes",
    emojis: ["⚔️","🗡️","🏹","🪃","🛡️","🪄","📜","📚","🗝️","🔑","💍","📿","🧪","⚗️","🔭","🪙","💰","🎯","🎲","🎴","🃏","♟️","⚙️","🔩","🧲","🪝","🪤","🗺️","🧶","🪡"],
  },
  {
    label: "Animaux & Créatures",
    emojis: ["🐉","🦄","🦅","🐺","🦊","🐍","🦁","🐻","🐗","🦌","🦉","🦇","🐦","🦅","🦋","🐛","🕷️","🦂","🐊","🦖","🦕","🐙","🦑","🐋","🦈","🦂","🐲","🦎","🐉"],
  },
  {
    label: "Symboles",
    emojis: ["⚜️","🔱","☯️","✝️","☪️","🔯","🌐","⚪","⚫","🟤","🔴","🟠","🟡","🟢","🔵","🟣","🏴","🏳️","⚑","🎌","🏁","⛔","🚫","❌","✅","❓","❗","💠","🔷","🔶","🔸","🔹","🔺","🔻"],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  placeholder?: string;
}

export default function EmojiPicker({ value, onChange, placeholder = "😀" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const allEmojis = EMOJI_GROUPS.flatMap((g) => g.emojis);
  const filtered = search
    ? allEmojis.filter((_, i) => {
        const label = EMOJI_GROUPS.flatMap((g) => g.emojis.map((e, j) => ({ e, group: g.label, j })))
          .find((x) => x.e === allEmojis[i])?.group ?? "";
        return label.toLowerCase().includes(search.toLowerCase());
      })
    : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-base leading-none min-w-[44px] justify-center"
        title="Choisir une icône"
      >
        {value ? (
          <span>{value}</span>
        ) : (
          <>
            <Smile size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400">{placeholder}</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl w-72 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une catégorie…"
              className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-400"
            />
          </div>
          <div className="overflow-y-auto max-h-72 p-2">
            {(filtered ? [{ label: "Résultats", emojis: filtered }] : EMOJI_GROUPS).map((group) => (
              <div key={group.label} className="mb-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-1">{group.label}</p>
                <div className="flex flex-wrap gap-0.5">
                  {group.emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { onChange(emoji); setOpen(false); setSearch(""); }}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-green-100 transition-colors ${value === emoji ? "bg-green-100 ring-1 ring-green-400" : ""}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {value && (
            <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">Sélectionné : <span className="text-base">{value}</span></span>
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                Effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
