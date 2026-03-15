import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to Excel (.xlsx)
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - Name of the file
 * @param {string} sheetName - Name of the worksheet
 */
export const exportToExcel = (data, fileName, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  // Create binary string
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export data to PDF (.pdf)
 * @param {Object} options
 * @param {string} options.title - Document title
 * @param {Array} options.headers - Array of column headers
 * @param {Array} options.data - Array of arrays (data rows)
 * @param {string} options.fileName - Name of the file
 */
export const exportToPDF = ({ title, headers, data, fileName, orientation = 'portrait' }) => {
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4',
  });

  // Add School/System Header
  doc.setFontSize(18);
  doc.setTextColor(15, 118, 110); // Primary Color
  doc.text(title, 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

  // Add Table
  doc.autoTable({
    startY: 35,
    head: [headers],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 35 },
  });

  doc.save(`${fileName}.pdf`);
};
