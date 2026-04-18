const fs = require('fs');
const content = fs.readFileSync('client/src/pages/parent/ParentDashboard.jsx', 'utf8');
let braceStack = 0; let parenStack = 0; let inString = null; let inComment = null;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j]; const nextChar = line[j+1];
        if (inString) { if (char === inString && line[j-1] !== '\\') inString = null; continue; }
        if (char === '`' || char === "'" || char === '"') { inString = char; continue; }
        if (char === '{') braceStack++; if (char === '}') braceStack--;
        if (char === '(') parenStack++; if (char === ')') parenStack--;
    }
}
console.log('Final State:', { braceStack, parenStack });
