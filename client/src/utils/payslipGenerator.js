import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generatePayslip = (record, schoolSettings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header Branding
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(schoolSettings?.name?.toUpperCase() || 'SCHOOL MANAGEMENT SYSTEM', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(schoolSettings?.address || 'Official Personnel Document', pageWidth / 2, 28, { align: 'center' });
  
  // Title
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('MONTHLY PAYSLIP', 20, 55);
  
  // Metadata Section
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('STAFF NAME:', 20, 65);
  doc.text('DEPARTMENT:', 20, 72);
  doc.text('PAY PERIOD:', 20, 79);
  
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(`${record.staff.firstName} ${record.staff.lastName}`, 60, 65);
  doc.text(record.staff.department?.name || 'Academic Staff', 60, 72);
  doc.text(`${new Date(0, record.voucher.month - 1).toLocaleString('default', { month: 'long' })} ${record.voucher.year}`, 60, 79);
  
  // Financial Breakdown Table
  const tableData = [
    ['Description', 'Type', 'Amount (₦)'],
    ['Base Monthly Salary', 'Credit', record.baseSalary.toLocaleString()],
    ...record.allowances.map(a => [a.type, 'Allowance', `+${a.amount.toLocaleString()}`]),
    ...record.deductions.map(d => [d.reason, 'Deduction', `-${d.amount.toLocaleString()}`]),
  ];
  
  doc.autoTable({
    startY: 90,
    head: [tableData[0]],
    body: tableData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right', fontStyle: 'bold' }
    }
  });
  
  const finalY = doc.lastAutoTable.finalY + 10;
  
  // Summary Section
  doc.setFillColor(248, 250, 252); // Gray 50
  doc.rect(120, finalY, 70, 35, 'F');
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Total Gross:', 125, finalY + 10);
  doc.text('Total Deductions:', 125, finalY + 18);
  
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('NET DISBURSEMENT:', 125, finalY + 28);
  
  doc.setFontSize(9);
  doc.text(`₦${(record.baseSalary + record.totalAllowances).toLocaleString()}`, 185, finalY + 10, { align: 'right' });
  doc.text(`₦${record.totalDeductions.toLocaleString()}`, 185, finalY + 18, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(`₦${record.netPay.toLocaleString()}`, 185, finalY + 28, { align: 'right' });
  
  // Footer / Verification
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'italic');
  const footerText = `This is a computer-generated document. Generated on ${new Date().toLocaleString()}.`;
  doc.text(footerText, pageWidth / 2, 280, { align: 'center' });
  
  doc.save(`Payslip_${record.staff.lastName}_${record.voucher.month}_${record.voucher.year}.pdf`);
};
