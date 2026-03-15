const XLSX = require('xlsx');

// Create a workbook with empty cells
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
  ['Name', 'Score1', 'Score2'],
  ['Alice', 5, undefined],
  ['Bob', null, ''],
  ['Charlie', , 10]
]);

XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const out = XLSX.utils.sheet_to_json(ws, { header: 1 });
console.log(JSON.stringify(out));
