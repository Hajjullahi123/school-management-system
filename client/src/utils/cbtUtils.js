/**
 * Parses raw CBT question text to extract embedded markdown diagram/image URLs and size metadata,
 * and cleans the question text for proper display across CBT components.
 *
 * @param {string} rawText - Raw question text (may contain ![Diagram#xs](url) or ![Diagram](url#size=xs))
 * @param {string|null} fallbackImageUrl - Optional fallback image URL from imageUrl / attachmentUrl fields
 * @returns {{ cleanText: string, diagramUrl: string|null, imageSize: string }}
 */
export const parseQuestionContent = (rawText = '', fallbackImageUrl = null) => {
  if (!rawText) {
    return {
      cleanText: '',
      diagramUrl: fallbackImageUrl || null,
      imageSize: 'medium'
    };
  }

  let cleanText = String(rawText);
  let extractedUrl = fallbackImageUrl || null;
  let extractedSize = 'medium';

  // Regex matches markdown image syntax: ![alt](url) or ! [alt] (url)
  const markdownImgRegex = /!\s*\[([^\]]*)\]\s*\((https?:\/\/[^\s\)]+)\)/gi;

  let match;
  while ((match = markdownImgRegex.exec(cleanText)) !== null) {
    const altText = match[1] || '';
    const fullUrl = match[2] || '';

    if (fullUrl) {
      const combinedMeta = `${altText} ${fullUrl}`.toLowerCase();
      if (combinedMeta.includes('#xs') || combinedMeta.includes('size=xs') || combinedMeta.includes('|xs')) {
        extractedSize = 'xs';
      } else if (combinedMeta.includes('#sm') || combinedMeta.includes('#small') || combinedMeta.includes('size=sm') || combinedMeta.includes('|sm')) {
        extractedSize = 'small';
      } else if (combinedMeta.includes('#md') || combinedMeta.includes('#medium') || combinedMeta.includes('size=md') || combinedMeta.includes('|md')) {
        extractedSize = 'medium';
      } else if (combinedMeta.includes('#lg') || combinedMeta.includes('#large') || combinedMeta.includes('size=lg') || combinedMeta.includes('|lg')) {
        extractedSize = 'large';
      } else if (combinedMeta.includes('#full') || combinedMeta.includes('size=full') || combinedMeta.includes('|full')) {
        extractedSize = 'full';
      }

      extractedUrl = fullUrl.split('#')[0];
    }
  }

  // Strip all markdown image tags from clean text
  cleanText = cleanText.replace(markdownImgRegex, '').trim();

  return {
    cleanText,
    diagramUrl: extractedUrl,
    imageSize: extractedSize
  };
};

export const IMAGE_SIZE_CLASSES = {
  xs: { maxH: 'max-h-[80px]', printMaxH: '80px', label: 'XS (80px)' },
  small: { maxH: 'max-h-[140px]', printMaxH: '140px', label: 'S (140px)' },
  medium: { maxH: 'max-h-[240px]', printMaxH: '240px', label: 'M (240px)' },
  large: { maxH: 'max-h-[380px]', printMaxH: '380px', label: 'L (380px)' },
  full: { maxH: 'max-h-[500px]', printMaxH: '500px', label: 'Full' }
};
