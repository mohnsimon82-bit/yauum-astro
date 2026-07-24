# Yauum Astro website

新的 Yauum 静态网站项目。Astro 负责生成页面，Cloudflare Workers Static Assets 负责托管，网站资料来自相邻的 `yauum-site-content` 文件夹。

## Content source

- Page copy and URLs: `../yauum-site-content/pages/` and `../yauum-site-content/manifest.json`
- Company information: `../yauum-site-content/company-info/`
- Images: `../yauum-site-content/images/`

不要在 Astro 页面组件里复制一份文案。修改资料库后重新构建即可。

## Local commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

The static build is generated in `dist/`.

## Cloudflare deployment

The Wrangler project name is `yauum-static`. Confirm that this matches the existing Worker name in Cloudflare before the first CLI deployment.

```bash
npx wrangler login
npm run deploy
```

Deploying creates a new Worker version and replaces the assets currently served by the Worker. It does not remove the custom domain or DNS record. The previous deployment remains available for rollback in Cloudflare's deployment history.
