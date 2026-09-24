# Yauum Astro website

新的 Yauum 静态网站项目。Astro 负责生成页面，GitHub 连接 Cloudflare Pages 自动构建和托管，网站资料保存在仓库内的 `yauum-site-content` 文件夹。

## Content source

- Page copy and URLs: `./yauum-site-content/pages/` and `./yauum-site-content/manifest.json`
- Company information: `./yauum-site-content/company-info/`
- Images: `./yauum-site-content/images/`
- Product knowledge: `./yauum-site-content/rag-knowledge-base/`

不要在 Astro 页面组件里复制一份文案。修改资料库后重新构建即可。

## Local commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

The static build is generated in `dist/`.

## Cloudflare Pages deployment

```bash
git add .
git commit -m "Update Yauum website"
git push
```

Pushing `main` triggers a Cloudflare Pages build using `npm run build` and publishes the result from `dist/` to the temporary preview domain.
