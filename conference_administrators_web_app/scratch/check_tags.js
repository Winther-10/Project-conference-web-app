
import fs from 'fs';
const content = fs.readFileSync('c:/Projects/conference_administrators_web_app/pages/awards/certificates.vue', 'utf8');
const templatePart = content.split('<template>')[1].split('</template>')[0];
const openDivs = (templatePart.match(/<div/g) || []).length;
const closeDivs = (templatePart.match(/<\/div>/g) || []).length;
const openTemplates = (templatePart.match(/<template/g) || []).length;
const closeTemplates = (templatePart.match(/<\/template>/g) || []).length;

console.log('Divs - Open:', openDivs, 'Close:', closeDivs);
console.log('Templates - Open:', openTemplates, 'Close:', closeTemplates);
