import { saveAs } from 'file-saver';

export const safeDocumentDownload = (doc, fileName) => {
  try {
    let pdfBlob;
    // Standard jsPDF output('blob') retrieves a native Blob directly
    if (doc && typeof doc.output === 'function') {
      try {
        pdfBlob = doc.output('blob');
      } catch (err) {
        console.warn("doc.output('blob') failed, falling back to arraybuffer", err);
      }
    }

    // Fallback if native blob retrieval failed or resulted in a 0-byte size
    if (!pdfBlob || pdfBlob.size === 0) {
      const buffer = doc.output('arraybuffer');
      pdfBlob = new Blob([buffer], { type: 'application/pdf' });
    }
    
    if (pdfBlob.size === 0) {
      console.error("PDF generation resulted in a 0-byte file");
      return;
    }
    
    // Check if we are on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Fallback for desktop or mobile (direct download instead of sharing intent)
    fallbackDownload(pdfBlob, fileName, isMobile);
  } catch(e) {
    console.error("PDF Download error", e);
  }
};

function fallbackDownload(blob, fileName, isMobile) {
    if (isMobile) {
      try {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.target = '_self'; // Must be _self to preserve context in mobile Safari/Chrome
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        return;
      } catch (e) {
        console.error("Failed to download PDF on mobile", e);
      }
    }

    // Default download fallback for desktop
    try {
        saveAs(blob, fileName);
    } catch (e) {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => window.URL.revokeObjectURL(url), 500);
    }
}

