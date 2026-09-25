import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        support: { 50: "#eef7ff", 500: "#1776d2", 700: "#1057a0", 950: "#092d52" },
      },
    },
  },
  plugins: [],
};

export default config;
