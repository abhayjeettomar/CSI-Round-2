import fs from 'fs';
import path from 'path';

const visited = new Set();
const missing = [];

function checkImports(filePath) {
  const normPath = path.normalize(filePath);
  if (visited.has(normPath)) return;
  visited.add(normPath);

  const content = fs.readFileSync(normPath, 'utf-8');
  const importRegex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const dir = path.dirname(normPath);
      let target = path.resolve(dir, importPath);
      if (!fs.existsSync(target) && fs.existsSync(target + '.js')) {
        target = target + '.js';
      }
      if (!fs.existsSync(target)) {
        missing.push({ file: normPath, import: importPath, target });
      } else {
        checkImports(target);
      }
    }
  }
}

checkImports(path.resolve('public/app-shell/shell.js'));

console.log(`Visited ${visited.size} frontend modules.`);
if (missing.length === 0) {
  console.log('>>> PERFECT: Zero missing imports in entire dependency graph! <<<');
} else {
  console.error('MISSING IMPORTS:', missing);
  process.exit(1);
}
