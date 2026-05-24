import fs from 'fs';
import path from 'path';

function searchInDir(dir, pattern) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.nuxt' || file === '.output') continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchInDir(fullPath, pattern);
    } else if (stat.isFile()) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(pattern)) {
          console.log(`Found pattern in file: ${fullPath}`);
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

searchInDir('c:/Projects/conference_web_app', 'articleRef');
searchInDir('c:/Projects/conference_web_app', 'article_ref');
