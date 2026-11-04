import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-overlay": "var(--surface-overlay)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        divider: "var(--divider)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        
        status: {
          neutral: {
            bg: "var(--status-neutral-bg)",
            text: "var(--status-neutral-text)",
          },
          blue: {
            bg: "var(--status-blue-bg)",
            text: "var(--status-blue-text)",
          },
          green: {
            bg: "var(--status-green-bg)",
            text: "var(--status-green-text)",
          },
          red: {
            bg: "var(--status-red-bg)",
            text: "var(--status-red-text)",
          },
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Text"',
          '"SF Pro Display"',
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
