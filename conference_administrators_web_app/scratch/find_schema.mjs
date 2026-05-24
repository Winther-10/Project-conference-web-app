import fs from 'fs';
import path from 'path';

const searchDir = 'c:/Projects';

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === '.nuxt' || file === '.output') continue;
    
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      search(fullPath);
    } else if (file.endsWith('.sql') || file.endsWith('.vue') || file.endsWith('.js') || file.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('user_documents') && (file.endsWith('.sql') || file.endsWith('schema.sql'))) {
        console.log(`Found in: ${fullPath}`);
        // print snippet around it
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (line.includes('user_documents')) {
            console.log(`  L${idx+1}: ${line.trim()}`);
          }
        });
      }
    }
  }
}

search(searchDir);
console.log('Search complete.');
