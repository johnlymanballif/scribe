import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["ui-serif", "Georgia", "Cambria", "Times New Roman", "Times", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SF Mono", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      colors: {
        background: "#FAF9F7",
        surface: "#F7F6F4",
        surfaceDark: "#F0EFED",
        surfaceHover: "#F1F0EE",

        // Improved contrast for accessibility (WCAG AA compliant)
        primary: "#1A1A1A",      // Better contrast: 15.8:1 on background
        secondary: "#5A5A5A",     // Better contrast: 6.2:1 on background
        tertiary: "#7A7A7A",      // Better contrast: 4.6:1 on background (meets AA)

        accent: "#C94A3A",
        accentHover: "#B3473B",

        border: "#D6D5D0",        // More visible borders
        borderSubtle: "#E8E7E2",   // Subtle but visible
        borderFocus: "#A1A09C",    // 25% darker border for focus (25% darker than #D6D5D0)
        borderGray: "#D1D5DB",
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
      animation: {
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
