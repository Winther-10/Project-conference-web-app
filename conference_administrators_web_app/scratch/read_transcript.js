const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\dacha\\.gemini\\antigravity\\brain\\340fb22d-b894-4dec-8799-63cb4b6cbd41\\.system_generated\\logs\\transcript.jsonl';

async function parseLogs() {
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let step = 0;
  for await (const line of rl) {
    step++;
    try {
      const obj = JSON.parse(line);
      // Let's find user inputs
      if (obj.type === 'USER_INPUT') {
        console.log(`\n--- STEP ${step} (USER) ---`);
        console.log(obj.content);
      } else if (obj.type === 'PLANNER_RESPONSE' || obj.type === 'MODEL_RESPONSE') {
        // If content has certain keywords
        if (obj.content && (obj.content.includes('ประเภท') || obj.content.includes('4 ไฟล์') || obj.content.includes('advisor'))) {
          console.log(`\n--- STEP ${step} (MODEL) ---`);
          console.log(obj.content.slice(0, 500) + '...');
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

parseLogs();
