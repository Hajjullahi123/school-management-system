import { saveAs } from 'file-saver';

export const safeDocumentDownload = (doc, fileName) => {
  try {
    const blob = doc.output('blob');
    // Ensure the blob has the correct type
    const pdfBlob = new Blob([blob], { type: 'application/pdf' });
    
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
           fallbackDownload(pdfBlob, fileName);
        });
        return;
      }
    }
    
    // Fallback for desktop or unsupported mobile
    fallbackDownload(pdfBlob, fileName);
  } catch(e) {
    console.error("PDF Download error", e);
  }
};

function fallbackDownload(blob, fileName) {
    // If file-saver fails, this is a clean vanilla fallback
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
