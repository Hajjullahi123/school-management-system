const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\IT-LAB\\School Mn\\client\\src\\components\\Layout.jsx', 'utf8');
const regex = /path:\s*['"]([^'"]+)['"].*?label:\s*['"]([^'"]+)['"]/gs;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log(`Path: ${match[1]}, Label: ${match[2]}`);
}
const regex2 = /label:\s*['"]([^'"]+)['"].*?path:\s*['"]([^'"]+)['"]/gs;
while ((match = regex2.exec(content)) !== null) {
  console.log(`Label: ${match[1]}, Path: ${match[2]}`);
}
