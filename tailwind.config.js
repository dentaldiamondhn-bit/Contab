/**
 * Tailwind CSS Configuration
 *
 * Este es el archivo que Tailwind carga realmente (tiene prioridad sobre
 * `tailwind.config.ts`). Antes solo extendía `fontFamily`, así que utilidades
 * como `bg-primary-50`, `text-primary-600` o `border-border` no se generaban.
 * Los tokens ahora replican el build desplegado en app.contabhn.com.
 */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "Inter Fallback",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      colors: {
        border: "hsl(var(--border, 187 20% 90%))",
        input: "hsl(var(--input, 187 20% 90%))",
        ring: "hsl(var(--ring, 187 100% 42%))",
        background: "hsl(var(--background, 0 0% 100%))",
        foreground: "hsl(var(--foreground, 187 100% 42%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 187 100% 42%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 100%))",
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 83 48% 51%))",
          foreground: "hsl(var(--secondary-foreground, 0 0% 100%))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive, 0 84.2% 60.2%))",
          foreground: "hsl(var(--destructive-foreground, 210 40% 98%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 210 40% 96%))",
          foreground: "hsl(var(--muted-foreground, 215.4 16.3% 46.9%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 83 48% 51%))",
          foreground: "hsl(var(--accent-foreground, 0 0% 100%))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover, 0 0% 100%))",
          foreground: "hsl(var(--popover-foreground, 187 100% 42%))",
        },
        card: {
          DEFAULT: "hsl(var(--card, 0 0% 100%))",
          foreground: "hsl(var(--card-foreground, 187 100% 42%))",
        },
      },
      borderRadius: {
        lg: "var(--radius, 0.5rem)",
        md: "calc(var(--radius, 0.5rem) - 2px)",
        sm: "calc(var(--radius, 0.5rem) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
