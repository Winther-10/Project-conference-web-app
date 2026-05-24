const fs = require('fs');
const readline = require('readline');

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
      // Look for subagent messages or status updates
      if (obj.content && (obj.content.includes('finished') || obj.content.includes('completed') || obj.content.includes('afc6f971') || obj.content.includes('da6fdafc'))) {
        console.log(`\n================ STEP ${step} (${obj.source} - ${obj.type}) ================`);
        console.log(obj.content.slice(0, 1000));
      }
    } catch (e) {
      // ignore
    }
  }
}

parseLogs();
