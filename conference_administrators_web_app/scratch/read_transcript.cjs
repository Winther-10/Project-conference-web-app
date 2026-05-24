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
    if (step > 286) {
      try {
        const obj = JSON.parse(line);
        console.log(`\n================ STEP ${step} (${obj.source} - ${obj.type}) ================`);
        if (obj.content) {
          console.log(obj.content.slice(0, 1500));
        }
        if (obj.tool_calls) {
          console.log("Tool Calls:", JSON.stringify(obj.tool_calls, null, 2));
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

parseLogs();
