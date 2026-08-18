import { saveAs } from 'file-saver';
import { saveBlobAsFile } from './mobileDownload';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { api } from '../api';

/**
 * Prepares a self-contained HTML document string from a DOM container element
 * including all stylesheets, inline styles, and converted image URLs.
 */
export function buildReportHtmlDocument(containerElement, documentTitle = 'Report') {
  // 1. Collect all CSS rules from document.styleSheets for 100% style inlining
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
        // Fallback for cross-origin sheets
      }
    }
  } catch (e) {}

  // 2. Also collect all stylesheet link tags with absolute URLs
  const linkTags = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => {
      try {
        const absHref = new URL(link.getAttribute('href'), window.location.origin).href;
        return `<link rel="stylesheet" href="${absHref}">`;
      } catch (e) {
        return link.outerHTML;
      }
    })
    .join('\n');

  // 3. Collect inline style tags
  document.querySelectorAll('style').forEach(tag => {
    inlinedStyles += tag.innerHTML + '\n';
  });

  // 4. Clone the container element
  const clone = containerElement.cloneNode(true);

  // 5. Remove elements marked for print hiding
  clone.querySelectorAll('.no-print, .print-hidden').forEach(el => el.remove());

  // 6. Reset transforms and mobile wrapper constraints on the clone
  clone.querySelectorAll('.report-card-scaler').forEach(scaler => {
    scaler.style.transform = 'none';
    scaler.classList.remove('scale-[0.45]', 'scale-[0.55]');
  });
  clone.querySelectorAll('.report-card-mobile-wrapper').forEach(wrapper => {
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'visible';
    wrapper.style.padding = '0';
    wrapper.style.margin = '0';
  });

  // 7. Ensure all image URLs are absolute so Puppeteer can load them
  const originalImages = Array.from(containerElement.querySelectorAll('img'));
  const cloneImages = Array.from(clone.querySelectorAll('img'));
  cloneImages.forEach((img, idx) => {
    const orig = originalImages[idx];
    if (orig && orig.currentSrc) {
      img.src = orig.currentSrc;
    } else if (img.src && !img.src.startsWith('data:') && !img.src.startsWith('http')) {
      try {
        img.src = new URL(img.getAttribute('src'), window.location.origin).href;
      } catch (e) {}
    }
  });

  // 8. Construct complete HTML string with print-optimized CSS
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
 * Tries server-side Puppeteer first (~2-5 seconds for bulk).
 * Falls back to client-side html2canvas + jsPDF if server endpoint fails.
 */
export async function downloadReportAsPdf({
  containerElement,
  title = 'Report',
  onProgress = () => {},
  cancelRef = { current: false }
}) {
  if (!containerElement) {
    throw new Error('No content found to download');
  }

  const cleanTitle = (title || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanTitle}.pdf`;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // -------------------------------------------------------------
  // ATTEMPT 1: Server-Side Puppeteer Generation (Fastest & Identical)
  // -------------------------------------------------------------
  try {
    onProgress(15, 'Preparing document for high-speed export...');
    const htmlPayload = buildReportHtmlDocument(containerElement, cleanTitle);

    if (cancelRef.current) throw new Error('Cancelled by user');

    onProgress(35, 'Generating PDF on server...');

    const response = await api.post('/api/reports/generate-pdf', {
      html: htmlPayload,
      title: cleanTitle
    });

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
        // Verify it starts with standard %PDF magic header
        const headerSlice = await blob.slice(0, 5).text();
        if (headerSlice.startsWith('%PDF')) {
          onProgress(95, 'Saving file to device...');
          if (isMobile) {
            saveBlobAsFile(blob, fileName, true);
          } else {
            saveAs(blob, fileName);
          }
          onProgress(100, isCached ? '⚡ Download complete (Cached)!' : 'Download complete!');
          return;
        } else {
          console.warn('Server response was not a valid binary PDF (%PDF header missing), falling back:', headerSlice);
        }
      }
    }
    console.warn('Server PDF response not OK, falling back to client-side generation...');
  } catch (serverErr) {
    if (cancelRef.current || serverErr.message === 'Cancelled by user') {
      throw serverErr;
    }
    console.warn('Server PDF generation failed, falling back to client-side capture:', serverErr.message);
  }

  // -------------------------------------------------------------
  // ATTEMPT 2: Client-Side html2canvas + jsPDF Fallback
  // -------------------------------------------------------------
  onProgress(20, 'Switching to local PDF engine...');
  const cards = Array.from(containerElement.querySelectorAll('.emerald-print-A4'));
  const totalCards = cards.length > 0 ? cards.length : 1;

  // Temporarily normalize transforms for capture
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

      onProgress(
        Math.round(20 + ((i + 1) / targetElements.length) * 70),
        `Capturing report ${i + 1} of ${targetElements.length}...`
      );

      // Brief delay for UI rendering
      await new Promise(resolve => setTimeout(resolve, 20));

      const card = targetElements[i];
      const canvas = await html2canvas(card, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      if (cancelRef.current) {
        canvas.width = 0;
        canvas.height = 0;
        throw new Error('Cancelled by user');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      if (i > 0) pdfDoc.addPage();
      pdfDoc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      // Free canvas memory
      canvas.width = 0;
      canvas.height = 0;
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
    // Always restore transforms
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
