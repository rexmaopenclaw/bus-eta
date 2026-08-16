// ============================================================
// Build changelog.json from CHANGELOG.md
// 每次 deploy 前執行：node build-changelog.js
// 輸出: dist/changelog.json（app 版本 modal 顯示用）
// ============================================================
const fs = require('fs');
const path = require('path');

const root = __dirname;
const mdPath = path.join(root, 'CHANGELOG.md');
const outPath = path.join(root, 'dist', 'changelog.json');

const md = fs.readFileSync(mdPath, 'utf8');
const lines = md.split(/\r?\n/);

const entries = [];
let current = null;
let currentSection = null;

for (const line of lines) {
  // 版本 header: ## 2026-08-16 — v34ccb73
  const versionMatch = line.match(/^##\s+(\d{4}-\d{2}-\d{2})\s+[—-]\s*v?([0-9a-f]{7,})/i);
  if (versionMatch) {
    current = {
      date: versionMatch[1],
      version: versionMatch[2],
      title: '',
      changes: [],
    };
    entries.push(current);
    currentSection = null;
    continue;
  }
  if (!current) continue;

  // 分類 header: ### 🐛 Fix: xxx
  const sectionMatch = line.match(/^###\s+(.+)$/);
  if (sectionMatch) {
    currentSection = {
      category: sectionMatch[1].trim(),
      items: [],
    };
    current.changes.push(currentSection);
    continue;
  }

  // 第一行標題（版本 header 之後第一個非空、非 header 行）當 title
  if (!current.title && line.trim() && !line.startsWith('#')) {
    current.title = line.trim().replace(/^#+\s*/, '');
    continue;
  }

  // bullet: - xxx
  const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
  if (bulletMatch && currentSection) {
    currentSection.items.push(bulletMatch[1].trim());
  }
}

fs.writeFileSync(outPath, JSON.stringify(entries, null, 2), 'utf8');
console.log(`changelog.json: ${entries.length} entries -> ${outPath}`);
