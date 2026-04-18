const fs = require('fs');
const content = fs.readFileSync('client/src/pages/student/QuranProgress.jsx', 'utf8');
let braceStack = 0; let parenStack = 0;
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '{') braceStack++; if (char === '}') braceStack--;
        if (char === '(') parenStack++; if (char === ')') parenStack--;
    }
}
console.log('Final', braceStack, parenStack);
