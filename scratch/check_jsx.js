const fs = require('fs');

const content = fs.readFileSync('client/src/pages/parent/ParentDashboard.jsx', 'utf8');

const stacks = {
    backtick: 0,
    singleQuote: 0,
    doubleQuote: 0,
    brace: 0,
    parenthesis: 0,
    bracket: 0
};

let inBacktick = false;
let inSingleQuote = false;
let inDoubleQuote = false;
let lastChar = '';

for (let i = 0; i < content.length; i++) {
    const char = content[i];
    
    // Ignore escaped characters
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
        else if (char === '{') stacks.brace++;
        else if (char === '}') stacks.brace--;
        else if (char === '(') stacks.parenthesis++;
        else if (char === ')') stacks.parenthesis--;
        else if (char === '[') stacks.bracket++;
        else if (char === ']') stacks.bracket--;
    }
    
    lastChar = char;
}

console.log('Final State:', { inBacktick, inSingleQuote, inDoubleQuote });
console.log('Stacks:', stacks);
