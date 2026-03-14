const XLSX = require('xlsx');

const workbook = XLSX.readFile('test_excel.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
console.log(rows);
