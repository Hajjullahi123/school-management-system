const fs = require('fs');

const content = fs.readFileSync('client/src/pages/parent/ParentDashboard.jsx', 'utf8');

let braceStack = 0;
let parenStack = 0;
let inString = null; // '`', "'", or '"'
let inComment = null; // '//' or '/*'

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i+1];
    
    // String handling
    if (inString) {
        if (char === inString && content[i-1] !== '\\') inString = null;
        continue;
    }
    
    // Comment handling
    if (inComment === '//') {
        if (char === '\n') inComment = null;
        continue;
    }
    if (inComment === '/*') {
        if (char === '*' && nextChar === '/') {
            inComment = null;
            i++;
        }
        continue;
    }
    
    // Start string
    if (char === '`' || char === "'" || char === '"') {
        inString = char;
        continue;
    }
    
    // Start comment
    if (char === '/' && nextChar === '/') {
        inComment = '//';
        i++;
        continue;
    }
    if (char === '/' && nextChar === '*') {
        inComment = '/*';
        i++;
        continue;
    }
    
    // Braces and parens
    if (char === '{') braceStack++;
    if (char === '}') braceStack--;
    if (char === '(') parenStack++;
    if (char === ')') parenStack--;
    
    if (braceStack < 0 || parenStack < 0) {
        const line = content.substring(0, i).split('\n').length;
        console.log(`NEGATIVE BALANCE at line ${line}: char='${char}'`);
    }
}

console.log('Final State:', { braceStack, parenStack });
