import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        green: {
          css: {
            "--tw-prose-links": "#16a34a",
            "--tw-prose-headings": "#14532d",
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
export default config;
