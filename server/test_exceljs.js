const ExcelJS = require('exceljs');

async function test() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  worksheet.addRow([1, 'John', null, undefined, '', 0]);

  await workbook.xlsx.writeFile('test_excel.xlsx');

  const workbook2 = new ExcelJS.Workbook();
  await workbook2.xlsx.readFile('test_excel.xlsx');
  const ws2 = workbook2.getWorksheet(1);
  const row = ws2.getRow(1);
  console.log('Read back values:', row.values);
}

test();
