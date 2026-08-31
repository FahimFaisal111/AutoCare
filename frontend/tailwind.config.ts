import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        stripe: {
          purple: "#635bff",
          dark: "#0a2540",
          bg: "#f6f9fc",
          cyan: "#00d4ff",
          lightPurple: "#7a73ff",
          brightCyan: "#80e9ff",
          slate: "#425466",
        },
      },
    },
  },
  plugins: [],
};

export default config;
