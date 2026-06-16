import { prisma } from "@/lib/prisma";

export const DEFAULT_CATEGORIES = [
  {
    name: "Fil rouge",
    slug: "fil-rouge",
    icon: "🔴",
    restricted: true,
    order: 0,
    children: [
      { name: "Venin", slug: "venin", icon: "🐍", restricted: true, order: 0 },
      { name: "Nation du feu", slug: "nation-du-feu", icon: "🔥", restricted: true, order: 1 },
      { name: "Îles", slug: "iles", icon: "🏝️", restricted: false, archived: true, order: 2 },
    ],
  },
  {
    name: "Personnages",
    slug: "personnages",
    icon: "👤",
    restricted: false,
    order: 1,
    children: [],
  },
  {
    name: "Sous trames",
    slug: "sous-trames",
    icon: "🗺️",
    restricted: false,
    order: 2,
    children: [
      { name: "Légions", slug: "legions", icon: "⚔️", restricted: false, order: 0 },
      { name: "Régions", slug: "regions", icon: "🌍", restricted: false, order: 1 },
    ],
  },
  {
    name: "Intrigues",
    slug: "intrigues",
    icon: "🎭",
    restricted: false,
    order: 3,
    children: [
      { name: "Navarre", slug: "navarre", icon: "🏰", restricted: false, order: 0 },
      { name: "La rébellion", slug: "la-rebellion", icon: "⚡", restricted: false, order: 1 },
      { name: "Le peace side", slug: "peace-side", icon: "🕊️", restricted: false, order: 2 },
      { name: "Neutres", slug: "neutres", icon: "⚖️", restricted: false, order: 3 },
    ],
  },
  {
    name: "Sous intrigues",
    slug: "sous-intrigues",
    icon: "📖",
    restricted: false,
    order: 4,
    children: [],
  },
  {
    name: "Plots de personnage",
    slug: "plots-personnage",
    icon: "🎲",
    restricted: false,
    order: 5,
    children: [],
  },
];

export async function seedCategories() {
  const count = await prisma.category.count();
  if (count > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    const { children, ...catData } = cat;
    const parent = await prisma.category.create({
      data: { ...catData, archived: false },
    });
    for (const child of children ?? []) {
      await prisma.category.create({
        data: { ...child, archived: child.archived ?? false, parentId: parent.id },
      });
    }
  }
}
