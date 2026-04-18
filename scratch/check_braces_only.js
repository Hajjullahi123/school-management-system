const fs = require('fs');

const content = fs.readFileSync('client/src/pages/parent/ParentDashboard.jsx', 'utf8');
const lines = content.split('\n');

let braceStack = 0;
let inBacktick = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (inBacktick) {
            if (char === '`') inBacktick = false;
        } else {
            if (char === '`') inBacktick = true;
            else if (char === '{') braceStack++;
            else if (char === '}') braceStack--;
        }
    }
    if (braceStack < 0) console.log(`NEGATIVE BALANCE at line ${i + 1}`);
}
console.log('Final Brace Depth:', braceStack);
