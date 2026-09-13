import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';

const addLetterhead = (doc, settings, pageNumber, totalPages) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // Header Background
  doc.setFillColor(settings.primaryColor || '#0f766e');
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // School Info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.schoolName || 'School Management', pageWidth / 2, 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const motto = settings.schoolMotto || 'In Pursuit of Excellence';
  doc.text(motto, pageWidth / 2, 25, { align: 'center' });
  
  doc.setFontSize(9);
  const contactInfo = [settings.schoolAddress, settings.schoolPhone, settings.schoolEmail]
    .filter(Boolean).join('  |  ');
  if (contactInfo) {
    doc.text(contactInfo, pageWidth / 2, 32, { align: 'center' });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.height;
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.text(`Generated on ${format(new Date(), 'PPpp')}`, 14, pageHeight - 10);
  doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
};

const generateLetterheads = async (doc, settings) => {
  const totalPages = doc.internal.getNumberOfPages();
  
  let imgData = null;
  if (settings.logoUrl) {
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.src = settings.logoUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve; // Continue even if logo fails
      });
      
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      imgData = canvas.toDataURL('image/png');
    } catch (e) {
      console.warn("Failed to load logo for PDF", e);
    }
  }

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addLetterhead(doc, settings, i, totalPages);
    if (imgData) {
      try {
        doc.addImage(imgData, 'PNG', 15, 8, 24, 24);
      } catch (e) {}
    }
  }
};

export const generateSubjectReportPDF = async (data, settings) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Process Data
  const classMap = new Map();
  const teacherMap = new Map();
  const subjectMap = new Map();

  data.forEach(item => {
    if (!item.class || !item.subject) return;
    
    const className = `${item.class.name} ${item.class.arm || ''}`.trim();
    const subjectName = item.subject.name;
    const teacherName = item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : 'Unassigned';

    // Group by Class
    if (!classMap.has(className)) classMap.set(className, []);
    classMap.get(className).push([subjectName, teacherName, item.periodsPerWeek || '-']);

    // Group by Teacher
    if (!teacherMap.has(teacherName)) teacherMap.set(teacherName, []);
    teacherMap.get(teacherName).push([className, subjectName, item.periodsPerWeek || '-']);

    // Unique Subjects
    if (!subjectMap.has(subjectName)) subjectMap.set(subjectName, { classes: 0, teachers: new Set() });
    subjectMap.get(subjectName).classes += 1;
    if (teacherName !== 'Unassigned') subjectMap.get(subjectName).teachers.add(teacherName);
  });

  let startY = 50;

  // Title
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Comprehensive Subject Allocation Report', pageWidth / 2, startY, { align: 'center' });
  startY += 15;

  // Section 1: By Class
  doc.setFontSize(14);
  doc.setTextColor(settings.primaryColor || '#0f766e');
  doc.text('1. Allocation by Class', 14, startY);
  startY += 5;

  Array.from(classMap.entries()).sort().forEach(([className, subjects]) => {
    doc.autoTable({
      startY: startY,
      head: [[`${className} - Subjects`, 'Assigned Teacher', 'Periods/Wk']],
      body: subjects.sort((a,b) => a[0].localeCompare(b[0])),
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { top: 45 }
    });
    startY = doc.lastAutoTable.finalY + 10;
  });

  // Section 2: By Teacher
  doc.addPage();
  startY = 50;
  doc.setFontSize(14);
  doc.setTextColor(settings.primaryColor || '#0f766e');
  doc.text('2. Allocation by Teacher', 14, startY);
  startY += 5;

  Array.from(teacherMap.entries()).sort().forEach(([teacherName, assignments]) => {
    doc.autoTable({
      startY: startY,
      head: [[`Teacher: ${teacherName}`, 'Subject', 'Periods/Wk']],
      body: assignments.sort((a,b) => a[0].localeCompare(b[0])),
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [40, 40, 40], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      margin: { top: 45 }
    });
    startY = doc.lastAutoTable.finalY + 10;
  });

  // Section 3: Master Subject List
  doc.addPage();
  startY = 50;
  doc.setFontSize(14);
  doc.setTextColor(settings.primaryColor || '#0f766e');
  doc.text('3. Master Subject Overview', 14, startY);
  startY += 5;

  const subjectData = Array.from(subjectMap.entries())
    .sort((a,b) => a[0].localeCompare(b[0]))
    .map(([name, data]) => [name, data.classes, Array.from(data.teachers).join(', ') || 'None']);

  doc.autoTable({
    startY: startY,
    head: [['Subject Name', 'Total Classes Offering', 'Assigned Teachers']],
    body: subjectData,
    theme: 'grid',
    headStyles: { fillColor: settings.primaryColor || '#0f766e', textColor: [255, 255, 255] },
    styles: { fontSize: 9 },
    margin: { top: 45 }
  });

  await generateLetterheads(doc, settings);
  doc.save(`Subject_Allocation_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
};

export const generateSubjectReportCSV = (data) => {
  const flatData = data.map(item => ({
    'Class Name': item.class ? `${item.class.name} ${item.class.arm || ''}`.trim() : 'N/A',
    'Subject': item.subject?.name || 'N/A',
    'Subject Code': item.subject?.code || 'N/A',
    'Teacher': item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : 'Unassigned',
    'Periods Per Week': item.periodsPerWeek || '-'
  })).sort((a, b) => {
    const classCompare = a['Class Name'].localeCompare(b['Class Name']);
    return classCompare !== 0 ? classCompare : a['Subject'].localeCompare(b['Subject']);
  });

  const csv = Papa.unparse(flatData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `Subject_Allocations_${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
