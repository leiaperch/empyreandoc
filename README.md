# EmpyreanDoc

Outil de documentation collaboratif pour narras et scénaristes — clone de Google Docs avec un design moderne vert 🌿

## Fonctionnalités

- ✍️ **Éditeur de texte riche** (TipTap) — titres, gras, italique, listes, alignement, etc.
- 🔗 **Liens inter-pages** — insérez des liens vers d'autres pages directement dans le texte
- 📎 **Pièces jointes** — glissez-déposez images, PDF, cartes et documents (max 10 Mo)
- 🗂️ **Rubriques hiérarchiques** — Fil rouge, Personnages, Sous trames, Intrigues, Sous intrigues, Plots de personnage
- 🔐 **Rôles utilisateur** :
  - **Scénariste (Scénar)** — accès total, création de pages et rubriques
  - **Narrateur (Narra)** — accès à tout sauf les rubriques Fil rouge restreintes (accès accordé une fois archivées/accomplies)
- 💾 **Sauvegarde automatique** avec indicateur de statut

## Structure des rubriques

```
🔴 Fil rouge (restreint aux Scénar)
   ├── 🐍 Venin
   ├── 🔥 Nation du feu
   └── 🏝️ Îles (archivé — accessible à tous)
👤 Personnages
🗺️ Sous trames
   ├── ⚔️ Légions
   └── 🌍 Régions
🎭 Intrigues
   ├── 🏰 Navarre
   ├── ⚡ La rébellion
   ├── 🕊️ Le peace side
   └── ⚖️ Neutres
📖 Sous intrigues
🎲 Plots de personnage
```

## Stack technique

- **Next.js 14** (App Router) + TypeScript
- **TipTap** — éditeur de texte riche
- **Prisma 7** + SQLite (libsql)
- **NextAuth v4** — authentification par email/mot de passe
- **Tailwind CSS** + `@tailwindcss/typography`
- **Lucide React** — icônes

## Installation

```bash
# 1. Cloner le dépôt
git clone <repo-url>
cd empyreandoc

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditez .env et changez NEXTAUTH_SECRET

# 4. Initialiser la base de données
npx prisma migrate dev

# 5. Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000), inscrivez-vous (le premier compte déclenche la création des rubriques par défaut), puis commencez à écrire.

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Serveur de production |
| `npm run lint` | Lint ESLint |
| `npx prisma migrate dev` | Appliquer les migrations |
| `npx prisma studio` | Interface Prisma Studio |
