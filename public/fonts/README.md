# 自托管字体

这里的 woff2 文件由 `scripts/fetch-fonts.mjs` 从 Google Fonts 下载，**不再从 Google CDN 加载**。

## 为什么自托管

1. **中国大陆不可直连** `fonts.googleapis.com` / `fonts.gstatic.com` → 中国访客与团队只能看到回退字体，品牌字形丢失。
2. **欧盟合规**：Google Fonts CDN 已被判定存在 GDPR 风险（访客 IP 在未获同意的情况下传给 Google）。
3. **性能**：减少两个跨源来源（DNS + TLS 握手），字体改为同源加载。

## 文件清单

| 字体 | 字重 | 子集 | 文件 |
| --- | --- | --- | --- |
| Archivo（标题 `--display`） | 500 / 600 / 700 | latin | `archivo-*-latin.woff2` |
| IBM Plex Mono（等宽 `--mono`） | 400 / 500 | latin | `ibm-plex-mono-*-latin.woff2` |
| Inter（正文 `--body`） | 400 / 500 / 600 | latin | `inter-*-latin.woff2` |

只保留 **latin** 子集（U+0000-00FF，已覆盖德语的 ä/ü/ß、法语的 é/ç、西语的 ñ 等变音字母）。
未包含 latin-ext（波兰语/捷克语/土耳其语字形）与 cyrillic/greek/vietnamese 子集——英文站用不到，包含它们会让体积翻倍以上。
**如果以后做德语/法语站点并需要完整本地化字形，把 `fetch-fonts.mjs` 里的 `subsetOf()` 加上 `latin-ext` 分支重新生成即可。**

## 许可

Archivo、IBM Plex Mono、Inter 均为 **SIL Open Font License 1.1**，允许自托管与再分发。
许可全文见各字体官方仓库：
- Archivo — https://github.com/Omnibus-Type/Archivo
- IBM Plex — https://github.com/IBM/plex
- Inter — https://github.com/rsms/inter

## 重新生成

```bash
node scripts/fetch-fonts.mjs
```

脚本会重新拉取 Google 的 CSS（用 Chrome UA 以获取 woff2）、下载文件、并覆写 `src/styles/fonts.css`，
字体名与 Google 版本保持一致，所以站点 CSS 里的 `var(--display)` / `var(--body)` / `var(--mono)` 不需要改动。
