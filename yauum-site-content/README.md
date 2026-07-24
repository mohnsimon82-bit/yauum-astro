# Yauum website content library

这是以后重做和维护网站时使用的固定资料库。页面文案、URL、公司资料和图片统一放在这里。

## 文件夹说明

- `pages/`：13 个页面的当前文案，每页一个 Markdown 文件。
- `url-map.csv`：全部页面 URL 清单。
- `manifest.json`：给后续建站程序读取的页面清单。
- `snapshot-html/`：当前静态网站原始 HTML 备份，不建议手工修改。
- `company-info/`：请补充公司、工厂、联系方式、产能和交易信息。
- `images/`：按 logo、factory、products、team、certificates 分类放图。

## 以后怎么使用

1. 修改页面文案时，直接编辑 `pages/` 里对应的文件。
2. 公司信息填写到 `company-info/company-profile.md`。
3. 图片放进 `images/` 的对应子文件夹，尽量使用英文文件名。
4. 不要改变 `url-map.csv` 中现有 URL，除非确定要做页面跳转。
5. 资料补齐后，可以从这个文件夹重新设计整站，不再依赖 WordPress 或在线抓取。
