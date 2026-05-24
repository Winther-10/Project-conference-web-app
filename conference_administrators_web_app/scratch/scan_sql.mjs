import fs from 'fs';

const sqlPath = 'c:/Projects/conference_web_app/supabase_notifications_schema.sql';
if (fs.existsSync(sqlPath)) {
  const content = fs.readFileSync(sqlPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines in sql file: ${lines.length}`);
  lines.forEach((line, idx) => {
    if (line.toLowerCase().includes('user_documents') || line.toLowerCase().includes('downloads')) {
      console.log(`${idx + 1}: ${line}`);
    }
  });
} else {
  console.log('SQL file not found at:', sqlPath);
}
