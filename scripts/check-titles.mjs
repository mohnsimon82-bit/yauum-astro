// 标题格式门禁：全站 <title> 必须符合「%title% | Yauum」模板——
// 单个分隔符（竖线）且只在品牌前，结尾固定为 " | Yauum"。
// 在 postbuild 自动运行：不合规的页面会让构建失败，防止未来新增页面漏掉品牌后缀。
//
// 约定来源：src/lib/seo.ts 的每页 title（唯一标题来源）；改标题只需改那里。
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIST = "dist";
const SUFFIX = " | Yauum";

function collectHtml(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) collectHtml(full, acc);
    else if (name.endsWith(".html")) acc.push(full);
  }
  return acc;
}

const problems = [];
let total = 0;
for (const file of collectHtml(DIST)) {
  const html = readFileSync(file, "utf8");
  const m = html.match(/<title>(.*?)<\/title>/);
  if (!m) continue;
  total += 1;
  const title = m[1];
  if (!title.endsWith(SUFFIX)) {
    problems.push(`${file}: 未以 "${SUFFIX}" 结尾 → ${title}`);
  } else if ((title.match(/\|/g) || []).length > 1) {
    problems.push(`${file}: 出现多个竖线（只允许品牌前那一个）→ ${title}`);
  }
}

if (problems.length) {
  console.error(`\n❌ 标题格式门禁未通过（${problems.length}/${total} 页）：`);
  for (const p of problems) console.error("  " + p);
  console.error(`\n请在 src/lib/seo.ts 把 title 规范成「关键词短语 [: 修饰词] | Yauum」。\n`);
  process.exit(1);
}
console.log(`✓ 标题格式门禁通过：${total} 个页面全部以 "${SUFFIX}" 结尾。`);
