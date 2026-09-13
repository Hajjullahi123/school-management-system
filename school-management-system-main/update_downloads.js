const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'client/src/pages/ReportCard.jsx',
  'client/src/components/PrintReceiptModal.jsx',
  'client/src/components/PrintScholarshipModal.jsx',
  'client/src/pages/admin/StudentManagement.jsx',
  'client/src/pages/teacher/BulkReportDownload.jsx',
  'client/src/pages/accountant/FeeManagement.jsx',
  'client/src/pages/admin/MiscFeePayments.jsx',
  'client/src/pages/Analytics.jsx',
  'client/src/utils/payrollReportGenerator.js',
  'client/src/utils/payslipGenerator.js',
  'client/src/utils/analyticsExports.js',
  'client/src/pages/teacher/LessonWorkspace.jsx'
];

filesToUpdate.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (content.includes("saveAs(") && content.includes(".output('blob')")) {
      // Find depth to utils
      const dirDepth = file.split('/').length - 3; // client/src = 0
      let relativePath = '';
      if (dirDepth === 0) relativePath = './utils/mobileDownload';
      else if (dirDepth === 1) relativePath = '../utils/mobileDownload';
      else if (dirDepth === 2) relativePath = '../../utils/mobileDownload';
      else relativePath = '../../../utils/mobileDownload';

      // Insert import
      if (!content.includes('safeDocumentDownload')) {
        content = content.replace(
          "import { saveAs } from 'file-saver';", 
          `import { saveAs } from 'file-saver';\nimport { safeDocumentDownload } from '${relativePath}';`
        );
      }

      // Replace saveAs(pdf.output('blob'), ...) with safeDocumentDownload(pdf, ...)
      // We need a regex that captures the doc variable and filename
      content = content.replace(/saveAs\s*\(\s*(\w+)\.output\('blob'\)\s*,\s*(.*?)\);/g, "safeDocumentDownload($1, $2);");

      fs.writeFileSync(fullPath, content);
      console.log('Updated:', file);
    }
  }
});
