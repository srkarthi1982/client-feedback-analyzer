// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import tailwindcss from "@tailwindcss/vite";
import alpinejs from "@astrojs/alpinejs";

export default defineConfig({
  adapter: vercel(),
  output: "server",
  vite: {
    // @ts-ignore
    plugins: [tailwindcss()],
  },
  integrations: [alpinejs({ entrypoint: "/src/alpine.ts" })],
});
