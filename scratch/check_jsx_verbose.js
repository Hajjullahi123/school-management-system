const fs = require('fs');

const content = fs.readFileSync('client/src/pages/parent/ParentDashboard.jsx', 'utf8');
const lines = content.split('\n');

let braceStack = 0;
let parenStack = 0;
let inBacktick = false;
let inSingleQuote = false;
let inDoubleQuote = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let lastChar = '';
    
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (lastChar === '\\') {
            lastChar = char;
            continue;
        }

        if (inBacktick) {
            if (char === '`') inBacktick = false;
        } else if (inSingleQuote) {
            if (char === "'") inSingleQuote = false;
        } else if (inDoubleQuote) {
            if (char === '"') inDoubleQuote = false;
        } else {
            if (char === '`') inBacktick = true;
            else if (char === "'") inSingleQuote = true;
            else if (char === '"') inDoubleQuote = true;
            else if (char === '{') braceStack++;
            else if (char === '}') braceStack--;
            else if (char === '(') parenStack++;
            else if (char === ')') parenStack--;
        }
        lastChar = char;
    }
    // Optional: Print state every 100 lines
    if ((i + 1) % 100 === 0) {
        console.log(`Line ${i + 1}: Brace=${braceStack}, Paren=${parenStack}`);
    }
}

console.log('Final State:', { braceStack, parenStack });
