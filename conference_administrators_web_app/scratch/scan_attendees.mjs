import fs from 'fs';

const path = 'c:/Projects/conference_web_app/conference_administrators_web_app/pages/attendees.vue';
if (fs.existsSync(path)) {
  const lines = fs.readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('user_documents')) {
      console.log(`${idx + 1}: ${line}`);
    }
  });
}
