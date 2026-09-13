const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\IT-LAB\\School Mn\\client\\src\\components\\Layout.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('gallery')) {
    console.log(`${i + 1}: ${line}`);
  }
});
