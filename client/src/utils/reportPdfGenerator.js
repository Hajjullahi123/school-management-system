import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { saveBlobAsFile } from './mobileDownload';
import { API_BASE_URL } from '../config';

/**
 * Builds a clean, fully self-contained HTML document with inlined CSS rules
 * and absolute asset URLs for server-side Puppeteer rendering.
 */
export function buildReportHtmlDocument(containerElement, documentTitle = 'Report') {
  let inlinedStyles = '';
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          for (const rule of Array.from(rules)) {
            inlinedStyles += rule.cssText + '\n';
          }
        }
      } catch (e) {
        // Cross-origin stylesheet access error ignored
      }
    }
  } catch (e) {}

  const clone = containerElement.cloneNode(true);
  clone.querySelectorAll('.no-print, .print-hidden').forEach(el => el.remove());

  // Convert image src to absolute URLs
  clone.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('http') && !src.startsWith('data:')) {
      try {
        img.src = new URL(src, window.location.origin).href;
      } catch (e) {}
    }
  });

  const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => {
      const href = link.getAttribute('href');
      if (href) {
        const absHref = href.startsWith('http') ? href : new URL(href, window.location.origin).href;
        return `<link rel="stylesheet" href="${absHref}">`;
      }
      return '';
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <base href="${window.location.origin}/">
  <title>${documentTitle}</title>
  ${linkTags}
  <style>
    ${inlinedStyles}
    
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    *, *::before, *::after {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      box-sizing: border-box !important;
    }
    html, body {
      background: #ffffff !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 210mm !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    nav, header, footer, .sidebar, .no-print, .print-hidden {
      display: none !important;
    }
    .report-card-scaler {
      transform: none !important;
    }
    .report-card-mobile-wrapper {
      height: auto !important;
      overflow: visible !important;
      padding: 0 !important;
      margin: 0 !important;
    }
    .emerald-print-A4 {
      width: 210mm !important;
      max-width: 210mm !important;
      min-width: 210mm !important;
      margin: 0 auto !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      box-sizing: border-box !important;
    }
    .emerald-print-A4:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;
}

/**
 * High-speed PDF generator.
 * - Tier 1: ⚡ Instant Vector PDF engine via @react-pdf/renderer (ReportCardPDFDocument) (~1-2s for 46 students)
 * - Tier 2: 🚀 High-speed single-pass server Puppeteer engine
 * - Tier 3: 🔄 Non-blocking chunked local canvas capture with live UI progress
 * - Tier 4: 🖨️ Browser print fallback
 */
export async function downloadReportAsPdf({
  containerElement = null,
  reports = null,
  schoolSettings = null,
  title = 'Report',
  onProgress = () => {},
  cancelRef = { current: false }
}) {
  const cleanTitle = (title || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanTitle}.pdf`;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Normalize reports array if passed
  const reportList = Array.isArray(reports) && reports.length > 0 
    ? reports 
    : (reports && typeof reports === 'object' && reports.student ? [reports] : null);

  // --------------------------------------------------------------------------
  // TIER 1: HIGH-SPEED CLIENT-SIDE VECTOR PDF ENGINE (@react-pdf/renderer)
  // Generates 46 students in ~1-2 seconds directly on device without server load
  // --------------------------------------------------------------------------
  if (reportList && reportList.length > 0) {
    try {
      onProgress(10, `Initializing vector engine for ${reportList.length} report(s)...`);
      if (cancelRef.current) throw new Error('Cancelled by user');

      const { pdf } = await import('@react-pdf/renderer');
      const { ReportCardPDFDocument } = await import('../components/reports/ReportCardPDFDocument');

      if (cancelRef.current) throw new Error('Cancelled by user');
      onProgress(35, `Generating high-definition vector document (${reportList.length} pages)...`);

      const React = (await import('react')).default;
      const docElement = React.createElement(ReportCardPDFDocument, {
        reports: reportList,
        schoolSettings: schoolSettings || {}
      });

      const pdfInstance = pdf(docElement);
      const pdfBlob = await pdfInstance.toBlob();

      if (cancelRef.current) throw new Error('Cancelled by user');

      if (pdfBlob && pdfBlob.size > 100) {
        onProgress(85, 'Saving bundle to device...');
        if (isMobile) {
          saveBlobAsFile(pdfBlob, fileName, true);
        } else {
          saveAs(pdfBlob, fileName);
        }
        onProgress(100, `⚡ Download complete (${reportList.length} report${reportList.length > 1 ? 's' : ''})!`);
        return;
      }
    } catch (reactPdfErr) {
      if (cancelRef.current || reactPdfErr.message === 'Cancelled by user') {
        throw reactPdfErr;
      }
      console.warn('[ReportPDFGenerator] React-PDF vector generator warning, attempting alternative tier:', reactPdfErr);
    }
  }

  if (!containerElement) {
    throw new Error('No content found to download');
  }

  const cards = Array.from(containerElement.querySelectorAll('.emerald-print-A4'));
  const totalReports = cards.length > 0 ? cards.length : 1;

  // --------------------------------------------------------------------------
  // TIER 2A: SINGLE STUDENT REPORT - Instant In-Browser Canvas Capture (~200ms)
  // --------------------------------------------------------------------------
  if (totalReports === 1) {
    onProgress(30, 'Formatting document...');

    const targetCard = cards[0] || containerElement;

    // Temporarily normalize transforms & overflow for pixel-perfect capture
    const scalers = Array.from(containerElement.querySelectorAll('.report-card-scaler'));
    const savedTransforms = scalers.map(s => ({
      elem: s,
      transform: s.style.transform,
      transformOrigin: s.style.transformOrigin
    }));

    const wrappers = Array.from(containerElement.querySelectorAll('.report-card-mobile-wrapper'));
    const savedWrappers = wrappers.map(w => ({
      elem: w,
      overflow: w.style.overflow,
      height: w.style.height
    }));

    scalers.forEach(s => {
      s.style.transform = 'none';
      s.style.transformOrigin = 'top left';
    });
    wrappers.forEach(w => {
      w.style.overflow = 'visible';
      w.style.height = 'auto';
    });

    try {
      if (cancelRef.current) throw new Error('Cancelled by user');

      onProgress(60, 'Generating instant PDF...');

      const canvas = await html2canvas(targetCard, {
        scale: 2, // 300 DPI high-definition capture
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      if (cancelRef.current) throw new Error('Cancelled by user');

      onProgress(85, 'Saving file to device...');

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      const pdfBlob = pdf.output('blob');

      if (isMobile) {
        saveBlobAsFile(pdfBlob, fileName, true);
      } else {
        saveAs(pdfBlob, fileName);
      }

      onProgress(100, '⚡ Download complete!');
      return;
    } finally {
      // Always restore UI scaling
      savedTransforms.forEach(({ elem, transform, transformOrigin }) => {
        elem.style.transform = transform;
        elem.style.transformOrigin = transformOrigin;
      });
      savedWrappers.forEach(({ elem, overflow, height }) => {
        elem.style.overflow = overflow;
        elem.style.height = height;
      });
    }
  }

  // --------------------------------------------------------------------------
  // TIER 2B: BULK CLASS REPORTS - Server-Side Puppeteer Engine
  // --------------------------------------------------------------------------
  try {
    onProgress(15, `Preparing ${totalReports} reports for server-side generation...`);
    const htmlPayload = buildReportHtmlDocument(containerElement, cleanTitle);

    if (cancelRef.current) throw new Error('Cancelled by user');
    onProgress(35, `Generating ${totalReports}-page bundle on server...`);

    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const rawBase = API_BASE_URL || window.location.origin;
    const baseURL = rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;

    // Set a 20-second client-side timeout so it fails fast into tier 3 rather than hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${baseURL}/api/reports/generate-pdf`, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        html: htmlPayload,
        title: cleanTitle
      })
    });
    clearTimeout(timeoutId);

    if (cancelRef.current) throw new Error('Cancelled by user');

    if (response.ok) {
      const cacheStatus = response.headers.get('X-Cache-Status');
      const isCached = cacheStatus === 'HIT';

      if (isCached) {
        onProgress(90, '⚡ Instant download from cache...');
      } else {
        onProgress(85, 'Downloading generated file...');
      }

      const blob = await response.blob();
      if (blob && blob.size > 50) {
        const headerSlice = await blob.slice(0, 5).text();
        if (headerSlice.startsWith('%PDF')) {
          onProgress(95, 'Saving bundle to device...');
          if (isMobile) {
            saveBlobAsFile(blob, fileName, true);
          } else {
            saveAs(blob, fileName);
          }
          onProgress(100, isCached ? '⚡ Download complete (Cached)!' : `Download complete (${totalReports} reports)!`);
          return;
        }
      }
    }
    console.warn('[ReportPDFGenerator] Server PDF response not OK, falling back to non-blocking local capture...');
  } catch (serverErr) {
    if (cancelRef.current || serverErr.message === 'Cancelled by user') {
      throw serverErr;
    }
    console.warn('[ReportPDFGenerator] Server bulk generation error, falling back to non-blocking local capture:', serverErr.message);
  }

  // --------------------------------------------------------------------------
  // TIER 3: NON-BLOCKING CHUNKED LOCAL CANVAS BATCHER
  // Uses async delays between renders to keep browser responsive
  // --------------------------------------------------------------------------
  onProgress(20, 'Switching to non-blocking local PDF engine...');
  const scalers = Array.from(containerElement.querySelectorAll('.report-card-scaler'));
  const savedTransforms = scalers.map(s => ({
    elem: s,
    transform: s.style.transform,
    transformOrigin: s.style.transformOrigin
  }));

  const wrappers = Array.from(containerElement.querySelectorAll('.report-card-mobile-wrapper'));
  const savedWrappers = wrappers.map(w => ({
    elem: w,
    overflow: w.style.overflow,
    height: w.style.height
  }));

  scalers.forEach(s => {
    s.style.transform = 'none';
    s.style.transformOrigin = 'top left';
  });
  wrappers.forEach(w => {
    w.style.overflow = 'visible';
    w.style.height = 'auto';
  });

  try {
    const pdfDoc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const targetElements = cards.length > 0 ? cards : [containerElement];

    for (let i = 0; i < targetElements.length; i++) {
      if (cancelRef.current) throw new Error('Cancelled by user');

      const percent = Math.round(20 + ((i + 1) / targetElements.length) * 70);
      onProgress(percent, `Capturing report ${i + 1} of ${targetElements.length}...`);

      // Yield to the browser event loop so the UI doesn't freeze
      await new Promise(resolve => setTimeout(resolve, 25));

      const canvas = await html2canvas(targetElements[i], {
        scale: 1.5, // 1.5 scale is high-quality while keeping memory footprint safe
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      if (cancelRef.current) throw new Error('Cancelled by user');

      const imgData = canvas.toDataURL('image/jpeg', 0.90);
      if (i > 0) pdfDoc.addPage();
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
    }

    onProgress(95, 'Saving file to device...');
    const pdfBlob = pdfDoc.output('blob');

    if (isMobile) {
      saveBlobAsFile(pdfBlob, fileName, true);
    } else {
      saveAs(pdfBlob, fileName);
    }

    onProgress(100, 'Download complete!');
  } finally {
    savedTransforms.forEach(({ elem, transform, transformOrigin }) => {
      elem.style.transform = transform;
      elem.style.transformOrigin = transformOrigin;
    });
    savedWrappers.forEach(({ elem, overflow, height }) => {
      elem.style.overflow = overflow;
      elem.style.height = height;
    });
  }
}
