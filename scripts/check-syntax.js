import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  });
  return results;
}

const jsFiles = walk('public');
console.log('Found', jsFiles.length, 'JS files in public/');
let errors = 0;
jsFiles.forEach(file => {
  try {
    execSync(`node --check "${file}"`);
    console.log('✓', file);
  } catch (err) {
    console.error('✗ Syntax error in:', file);
    errors++;
  }
});

if (errors === 0) {
  console.log('\n>>> ALL JS FILES PASSED SYNTAX CHECK! <<<');
} else {
  process.exit(1);
}
