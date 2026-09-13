import { saveAs } from 'file-saver';
import { safeDocumentDownload } from '../utils/mobileDownload';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePayrollReport = (voucher, schoolSettings) => {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
  const pageWidth = doc.internal.pageSize.width;
  
  // Header Branding
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolSettings?.name?.toUpperCase() || 'SCHOOL MANAGEMENT SYSTEM', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolSettings?.address || 'Official Administrative Document', pageWidth / 2, 26, { align: 'center' });
  doc.text(`${new Date(0, voucher.month - 1).toLocaleString('default', { month: 'long' })} ${voucher.year} - Monthly Payroll Voucher`, pageWidth / 2, 32, { align: 'center' });
  
  // Financial Summary at the top right
  doc.setFontSize(10);
  doc.text(`Total Gross: ₦${voucher.totalGross.toLocaleString()}`, pageWidth - 20, 15, { align: 'right' });
  doc.text(`Total Net: ₦${voucher.totalNet.toLocaleString()}`, pageWidth - 20, 22, { align: 'right' });
  doc.text(`Total Personnel: ${voucher.records?.length || 0}`, pageWidth - 20, 29, { align: 'right' });

  // Main Table
  const tableData = [
    ['S/N', 'Personnel Name', 'Role', 'Base Salary', 'Allowances', 'Deductions', 'Net Pay', 'Status']
  ];

  voucher.records.forEach((r, i) => {
    tableData.push([
      i + 1,
      `${r.staff.firstName} ${r.staff.lastName}`,
      r.staff.role,
      `₦${r.baseSalary.toLocaleString()}`,
      `₦${r.totalAllowances.toLocaleString()}`,
      `₦${r.totalDeductions.toLocaleString()}`,
      `₦${r.netPay.toLocaleString()}`,
      r.status || 'UNPAID'
    ]);
  });
  
  doc.autoTable({
    startY: 50,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center' }
    }
  });
  
  const finalY = doc.lastAutoTable.finalY + 20;
  
  // Signature section
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  doc.text('__________________________', 20, finalY);
  doc.text('Prepared By (Accountant)', 20, finalY + 8);
  
  doc.text('__________________________', pageWidth / 2, finalY, { align: 'center' });
  doc.text('Verified By (HR Manager)', pageWidth / 2, finalY + 8, { align: 'center' });
  
  doc.text('__________________________', pageWidth - 20, finalY, { align: 'right' });
  doc.text('Approved By (Principal)', pageWidth - 20, finalY + 8, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  const footerText = `Payroll Cycle Finalized - ID: #${voucher.id} | Generated on ${new Date().toLocaleString()}`;
  doc.text(footerText, pageWidth / 2, 200, { align: 'center' });
  
  safeDocumentDownload(doc, `Payroll_${new Date(0, voucher.month - 1).toLocaleString('default', { month: 'short' })}_${voucher.year}.pdf`);
};

