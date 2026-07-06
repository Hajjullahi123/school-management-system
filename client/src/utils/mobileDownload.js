import { saveAs } from 'file-saver';

export const safeDocumentDownload = (doc, fileName) => {
  try {
    // Get arraybuffer directly and construct a clean non-nested Blob
    const buffer = doc.output('arraybuffer');
    const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
    
    if (pdfBlob.size === 0) {
      console.error("PDF generation resulted in a 0-byte file");
      return;
    }
    
    // Check if we are on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Web Share API is the most robust way on mobile (iOS/Android)
    if (isMobile && navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
      if (navigator.canShare({ files: [file] })) {
        navigator.share({
          title: fileName,
          files: [file]
        }).catch(err => {
           console.log("Share API cancelled or failed, falling back...", err);
           fallbackDownload(pdfBlob, fileName, isMobile);
        });
        return;
      }
    }
    
    // Fallback for desktop or unsupported mobile
    fallbackDownload(pdfBlob, fileName, isMobile);
  } catch(e) {
    console.error("PDF Download error", e);
  }
};

function fallbackDownload(blob, fileName, isMobile) {
    if (isMobile) {
      try {
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        if (newWindow) {
          return;
        }
      } catch (e) {
        console.error("Failed to open PDF in new tab", e);
      }
    }

    // Default download fallback
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
