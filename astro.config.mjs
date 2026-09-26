import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import compress from "astro-compress";
import mdx from "@astrojs/mdx";


export default defineConfig({
  site: "https://yauum.com",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
  // 站内跳转预取：prefetchAll 才会对站内链接全部生效（仅 prefetch: true 时
  // 需要链接自带 data-astro-prefetch 属性，站内并未添加）
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  integrations: [
    sitemap(),
    compress(),
    mdx(),
  ],
});
