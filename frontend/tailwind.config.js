/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // High-Contrast Tactical CS2 Dark Palette
        "surface-bg": "#0b0f14",
        "surface-panel": "#11161f",
        "surface-card": "#161d27",
        "surface-card-hover": "#1c2533",
        "surface-muted": "#1e2736",
        "border-subtle": "#222c3c",
        "border-highlight": "#2f3e54",

        // CS2 Tournament Status Tints
        "cs-orange": "#ff682b",
        "cs-orange-hover": "#ff7a00",
        "cs-amber": "#f59e0b",
        "cs-red": "#ef4444",
        "cs-green": "#10b981",
        "cs-blue": "#38bdf8",
        "cs-ct": "#5b92e5",
        "cs-t": "#e5a83b",

        // High Legibility Font Colors
        "text-primary": "#f0f4f8",
        "text-secondary": "#94a3b8",
        "text-tertiary": "#5d6d82",

        // Backward compatibility mappings
        "surface": "#0b0f14",
        "on-surface": "#f0f4f8",
        "on-surface-variant": "#94a3b8",
        "surface-container-lowest": "#0b0f14",
        "surface-container-low": "#11161f",
        "surface-container": "#161d27",
        "surface-container-high": "#1c2533",
        "surface-container-highest": "#1e2736",
        "outline-variant": "#222c3c",
        "outline": "#2f3e54",
        "primary": "#ff682b",
        "on-primary": "#0b0f14",
        "primary-container": "rgba(255, 104, 43, 0.15)",
        "on-primary-container": "#ff682b",
        "secondary": "#10b981",
        "secondary-container": "rgba(16, 185, 129, 0.15)",
        "on-secondary-container": "#10b981",
        "error": "#ef4444",
        "error-container": "rgba(239, 68, 68, 0.15)",
        "on-error-container": "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
}
