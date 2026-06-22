import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e14",
        surface: "#141a24",
        surface2: "#1c2533",
        border: "#27313f",
        accent: "#f97316",
        accent2: "#fb923c",
        muted: "#8b97a8",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
