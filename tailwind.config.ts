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
        border: "var(--border)",
        divider: "var(--divider)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        
        // Semantic states - subtle backgrounds
        status: {
          neutral: {
            bg: "var(--status-neutral-bg)",
            text: "var(--status-neutral-text)",
            border: "var(--status-neutral-border)",
          },
          blue: {
            bg: "var(--status-blue-bg)",
            text: "var(--status-blue-text)",
            border: "var(--status-blue-border)",
          },
          green: {
            bg: "var(--status-green-bg)",
            text: "var(--status-green-text)",
            border: "var(--status-green-border)",
          },
          red: {
            bg: "var(--status-red-bg)",
            text: "var(--status-red-text)",
            border: "var(--status-red-border)",
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
