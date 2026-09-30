#!/usr/bin/env node
/**
 * 构建前补齐 git 历史。
 *
 * 背景：Cloudflare Pages 使用浅克隆（--depth 1），git 历史里只有 1 个提交。
 * 这种情况下 `git log -1 -- <file>` 对任何文件都会返回那个唯一提交的时间，
 * 使 sitemap 里 13 条 URL 的 lastmod 全部变成构建时间 —— 正是 Google 会忽略的
 * 「不可信 lastmod」。仓库是公开的，构建阶段补齐历史即可拿到真实的逐文件提交时间。
 *
 * 这个脚本永远不会让构建失败：拿不到历史时，astro.config.mjs 会退回到文件时间。
 */

import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    ...options,
  });
}

try {
  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  if (!shallow) {
    console.log('[git-history] 已经是完整历史，无需补齐');
    process.exit(0);
  }

  console.log('[git-history] 检测到浅克隆（Cloudflare Pages 默认），正在补齐历史…');
  git(['fetch', '--unshallow', '--quiet'], { stdio: ['ignore', 'ignore', 'ignore'], timeout: 180_000 });

  const stillShallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  console.log(stillShallow
    ? '[git-history] 补齐未生效，lastmod 将退回到文件时间'
    : '[git-history] 历史已补齐，sitemap lastmod 将使用真实的逐文件提交时间');
} catch (err) {
  console.log(`[git-history] 跳过（${err instanceof Error ? err.message.split('\n')[0] : String(err)}），lastmod 将退回到文件时间`);
}

process.exit(0);
