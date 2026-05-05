
import fs from 'fs';
const content = fs.readFileSync('c:/Projects/conference_administrators_web_app/pages/awards/certificates.vue', 'utf8');
const scriptPart = content.split('</script>')[0];
const openBraces = (scriptPart.match(/{/g) || []).length;
const closeBraces = (scriptPart.match(/}/g) || []).length;
console.log('Open:', openBraces, 'Close:', closeBraces);
if (openBraces !== closeBraces) {
  console.log('MISMATCH FOUND');
}
