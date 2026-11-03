/**
 * 相关文章选配逻辑（内部链接优化用）。
 *
 * 依据：2026-11-03 内链审计——34 篇里 30 篇入度只有 2（列表页+分类页各 1），
 * 文章互链全站仅 9 条。本模块给每篇文章稳定输出 3 条同簇链接：
 *   - 同簇按发布日期倒序成环，取当前文章之后的 3 篇 → 簇内入链均匀分布，不偏袒最新文章
 *   - 簇内不足 3 篇时，按相邻簇顺序补齐（不跨到无关品类）
 */
import { articles } from "./articles";

type Cluster =
  | "hoodie"
  | "tshirt"
  | "jacket"
  | "pants"
  | "streetwear"
  | "sourcing";

const CLUSTERS: Record<Cluster, string[]> = {
  hoodie: [
    "/best-400-gsm-hoodie-manufacturers-china/",
    "/cotton-hoodie-manufacturer-types-china/",
    "/fleece-hoodie-manufacturer-types-china/",
    "/oversized-hoodie-manufacturer-types-china/",
    "/top-8-zip-up-hoodie-manufacturers-china/",
    "/top-10-embroidered-hoodie-manufacturers-china/",
    "/top-puff-print-hoodie-manufacturers-china/",
    "/where-are-hoodies-manufactured/",
    "/how-to-find-a-hoodie-manufacturer/",
    "/how-to-find-alibaba-hoodie-manufacturers/",
  ],
  tshirt: [
    "/custom-t-shirt-manufacturer-guide/",
    "/top-10-t-shirt-manufacturers-china/",
    "/oversized-t-shirt-suppliers-china-guide/",
    "/where-are-t-shirts-manufactured/",
  ],
  jacket: [
    "/custom-jacket-manufacturer-guide/",
    "/top-10-leather-jacket-manufacturers-china/",
    "/top-10-varsity-jacket-manufacturers-china/",
    "/top-10-windbreaker-manufacturers-china/",
    "/bomber-jacket-manufacturers-china-factory-types/",
    "/jacket-manufacturers-china-types-vetting/",
  ],
  pants: [
    "/top-10-pant-manufacturers-in-china/",
    "/top-10-cargo-pants-manufacturers-in-china/",
    "/top-10-casual-pants-manufacturers-in-china/",
    "/top-10-jogger-pants-manufacturers-in-china/",
    "/top-10-leather-pants-manufacturers-in-china/",
  ],
  streetwear: [
    "/streetwear-business-guide/",
    "/how-to-start-a-streetwear-brand/",
    "/how-to-find-a-streetwear-factory/",
    "/how-to-find-custom-streetwear-manufacturer/",
    "/how-to-find-the-best-streetwear-cut-and-sew-manufacturers/",
    "/top-10-streetwear-manufacturers-china/",
  ],
  sourcing: [
    "/best-fabric-for-streetwear/",
    "/china-apparel-manufacturing-costs-ppi-2026/",
  ],
};

/** 相邻簇的补齐顺序（同簇不足 3 篇时使用） */
const NEIGHBORS: Record<Cluster, Cluster[]> = {
  hoodie: ["streetwear", "tshirt", "sourcing", "jacket", "pants"],
  tshirt: ["streetwear", "hoodie", "sourcing", "jacket", "pants"],
  jacket: ["streetwear", "pants", "hoodie", "sourcing", "tshirt"],
  pants: ["streetwear", "jacket", "hoodie", "sourcing", "tshirt"],
  streetwear: ["hoodie", "tshirt", "pants", "jacket", "sourcing"],
  sourcing: ["hoodie", "tshirt", "streetwear", "jacket", "pants"],
};

const routeToCluster: Map<string, Cluster> = (() => {
  const m = new Map<string, Cluster>();
  (Object.keys(CLUSTERS) as Cluster[]).forEach((c) => {
    CLUSTERS[c].forEach((r) => m.set(r, c));
  });
  return m;
})();

const byRoute = new Map(articles.map((a) => [a.route, a]));
/** 簇内排序：发布日期倒序（articles.ts 本身已是倒序，这里显式再排一次保证稳定） */
const ordered = new Map<Cluster, string[]>();
(Object.keys(CLUSTERS) as Cluster[]).forEach((c) => {
  ordered.set(
    c,
    [...CLUSTERS[c]].sort((a, b) => {
      const da = byRoute.get(a)?.date ?? "";
      const db = byRoute.get(b)?.date ?? "";
      return db.localeCompare(da);
    }),
  );
});

export function getRelated(current: string, n = 3): string[] {
  const cluster = routeToCluster.get(current);
  const picked: string[] = [];
  const seen = new Set<string>([current]);

  const takeFrom = (routes: string[]) => {
    for (const r of routes) {
      if (picked.length >= n) return;
      if (!seen.has(r) && byRoute.has(r)) {
        seen.add(r);
        picked.push(r);
      }
    }
  };

  if (cluster) {
    const ring = ordered.get(cluster)!;
    const idx = ring.indexOf(current);
    if (idx >= 0 && ring.length > 1) {
      // 环形取后 3 篇：簇内每篇都能拿到 3 条入链，且雨露均沾
      const rotated = [...ring.slice(idx + 1), ...ring.slice(0, idx)];
      takeFrom(rotated);
    }
    for (const nb of NEIGHBORS[cluster]) {
      if (picked.length >= n) break;
      takeFrom(ordered.get(nb)!);
    }
  }

  // 兜底：任意文章（按全局日期倒序），保证永远输出 n 条
  if (picked.length < n) {
    takeFrom(articles.map((a) => a.route));
  }
  return picked.slice(0, n);
}
