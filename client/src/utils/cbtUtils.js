/**
 * Parses raw CBT question text to extract embedded markdown diagram/image URLs
 * and clean the question text for proper display across CBT components.
 *
 * @param {string} rawText - Raw question text (may contain ![Diagram](url) or ! [Diagram] (url))
 * @param {string|null} fallbackImageUrl - Optional fallback image URL from imageUrl / attachmentUrl fields
 * @returns {{ cleanText: string, diagramUrl: string|null }}
 */
export const parseQuestionContent = (rawText = '', fallbackImageUrl = null) => {
  if (!rawText) {
    return {
      cleanText: '',
      diagramUrl: fallbackImageUrl || null
    };
  }

  let cleanText = String(rawText);
  let extractedUrl = fallbackImageUrl || null;

  // Regex matches markdown image syntax: ![alt](url) or ! [alt] (url) or ![alt] (url)
  // Handles variable spaces between !, [], () and captures http(s) URLs
  const markdownImgRegex = /!\s*\[([^\]]*)\]\s*\((https?:\/\/[^\s\)]+)\)/gi;

  let match;
  while ((match = markdownImgRegex.exec(cleanText)) !== null) {
    if (match[2]) {
      extractedUrl = match[2];
    }
  }

  // Strip all markdown image tags from clean text
  cleanText = cleanText.replace(markdownImgRegex, '').trim();

  return {
    cleanText,
    diagramUrl: extractedUrl
  };
};
