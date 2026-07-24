import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://yauum.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
});
