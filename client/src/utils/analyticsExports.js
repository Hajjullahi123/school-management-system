import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const exportOverviewPDF = (schoolSettings, subjectComparison, classComparison, atRiskStudents) => {
  const doc = new jsPDF();
  const schoolName = schoolSettings?.schoolName || 'School';

  // Title
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`${schoolName} - Analytics Overview`, 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  // Quick Stats
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Summary Statistics', 14, 38);

  const avgPerformance = subjectComparison.length > 0
    ? (subjectComparison.reduce((sum, s) => sum + parseFloat(s.average), 0) / subjectComparison.length).toFixed(1)
    : 0;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Total Subjects: ${subjectComparison.length}`, 14, 46);
  doc.text(`Total Classes: ${classComparison.length}`, 14, 52);
  doc.text(`At-Risk Students: ${atRiskStudents.length}`, 14, 58);
  doc.text(`Average Performance: ${avgPerformance}%`, 14, 64);

  // Subject Performance Table
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Subject Performance', 14, 74);

  doc.autoTable({
    startY: 78,
    head: [['Subject', 'Students', 'Average', 'Pass Rate', 'Status']],
    body: subjectComparison.map(s => [
      s.subjectName,
      s.students,
      `${s.average}%`,
      `${s.passRate}%`,
      parseFloat(s.average) >= 70 ? 'Excellent' :
        parseFloat(s.average) >= 60 ? 'Good' :
          parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] }
  });

  // Class Performance Table
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Class Performance', 14, finalY);

  doc.autoTable({
    startY: finalY + 4,
    head: [['Class', 'Students', 'Average', 'Pass Rate', 'Rank']],
    body: classComparison.map((c, idx) => [
      c.className,
      c.students,
      `${c.average}%`,
      `${c.passRate}%`,
      `#${idx + 1}`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] }
  });

  doc.save(`${schoolName}_Analytics_Overview_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportSubjectsPDF = (schoolSettings, subjectComparison) => {
  const doc = new jsPDF();
  const schoolName = schoolSettings?.schoolName || 'School';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`${schoolName} - Subject Analysis`, 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  doc.autoTable({
    startY: 35,
    head: [['Subject', 'Students', 'Average', 'Pass Rate', 'Status']],
    body: subjectComparison.map(s => [
      s.subjectName,
      s.students,
      `${s.average}%`,
      `${s.passRate}%`,
      parseFloat(s.average) >= 70 ? 'Excellent' :
        parseFloat(s.average) >= 60 ? 'Good' :
          parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
    ]),
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    bodyStyles: { fontSize: 9 }
  });

  doc.save(`${schoolName}_Subject_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportSubjectsExcel = (schoolSettings, subjectComparison) => {
  const schoolName = schoolSettings?.schoolName || 'School';
  const data = subjectComparison.map(s => ({
    'Subject': s.subjectName,
    'Students': s.students,
    'Average (%)': parseFloat(s.average),
    'Pass Rate (%)': parseFloat(s.passRate),
    'Status': parseFloat(s.average) >= 70 ? 'Excellent' :
      parseFloat(s.average) >= 60 ? 'Good' :
        parseFloat(s.average) >= 50 ? 'Fair' : 'Needs Attention'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Subject Analysis');

  XLSX.writeFile(wb, `${schoolName}_Subject_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportClassesPDF = (schoolSettings, classComparison) => {
  const doc = new jsPDF();
  const schoolName = schoolSettings?.schoolName || 'School';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`${schoolName} - Class Comparison`, 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

  doc.autoTable({
    startY: 35,
    head: [['Rank', 'Class', 'Students', 'Average', 'Pass Rate']],
    body: classComparison.map((c, idx) => [
      `#${idx + 1}`,
      c.className,
      c.students,
      `${c.average}%`,
      `${c.passRate}%`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [16, 185, 129] },
    bodyStyles: { fontSize: 9 }
  });

  doc.save(`${schoolName}_Class_Comparison_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportClassesExcel = (schoolSettings, classComparison) => {
  const schoolName = schoolSettings?.schoolName || 'School';
  const data = classComparison.map((c, idx) => ({
    'Rank': idx + 1,
    'Class': c.className,
    'Students': c.students,
    'Average (%)': parseFloat(c.average),
    'Pass Rate (%)': parseFloat(c.passRate)
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Class Comparison');

  XLSX.writeFile(wb, `${schoolName}_Class_Comparison_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportAtRiskPDF = (schoolSettings, atRiskStudents) => {
  const doc = new jsPDF();
  const schoolName = schoolSettings?.schoolName || 'School';

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(`${schoolName} - At-Risk Students`, 14, 20);

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);
  doc.text(`Total At-Risk: ${atRiskStudents.length}`, 14, 34);

  // Prepare data with recommendations
  const tableData = atRiskStudents.map(s => [
    s.name,
    s.class,
    s.admissionNumber || 'N/A',
    `${s.averageScore}%`,
    s.riskLevel,
    `${s.trend > 0 ? '↑' : '↓'} ${Math.abs(s.trend)}%`,
    s.recommendations ? s.recommendations.join('; ') : 'N/A'
  ]);

  doc.autoTable({
    startY: 40,
    head: [['Name', 'Class', 'Adm. No', 'Average', 'Risk', 'Trend', 'Recommendations']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22] },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      6: { cellWidth: 60 }
    }
  });

  doc.save(`${schoolName}_At_Risk_Students_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportAtRiskExcel = (schoolSettings, atRiskStudents) => {
  const schoolName = schoolSettings?.schoolName || 'School';
  const data = atRiskStudents.map(s => ({
    'Name': s.name,
    'Class': s.class,
    'Admission Number': s.admissionNumber || 'N/A',
    'Average (%)': parseFloat(s.averageScore),
    'Risk Level': s.riskLevel,
    'Trend': `${s.trend > 0 ? '↑' : '↓'} ${Math.abs(s.trend)}%`,
    'Recommendations': s.recommendations ? s.recommendations.join('; ') : 'N/A'
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'At-Risk Students');

  XLSX.writeFile(wb, `${schoolName}_At_Risk_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
};
