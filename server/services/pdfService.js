const { puppeteerPool } = require('./puppeteerPool');
const { pdfCache } = require('./pdfCacheManager');
const { PDFDocument } = require('pdf-lib');

class PDFService {
  /**
   * Generates or retrieves cached PDF from HTML payload
   */
  async generatePdf({ html, title = 'report', cacheKey = null, forceRefresh = false }) {
    if (!html || typeof html !== 'string') {
      throw new Error('HTML content is required for PDF generation');
    }

    // 1. Calculate cache key if not explicitly provided
    const key = cacheKey || pdfCache.generateKey(html, 'report');

    // 2. Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = await pdfCache.get(key);
      if (cached && cached.length > 0) {
        return {
          buffer: cached,
          fromCache: true,
          cacheKey: key
        };
      }
    }

    // 3. Render PDF via warm Puppeteer Pool
    const buffer = await puppeteerPool.renderHtmlToPdf(html);

    // 4. Save to multi-tiered cache
    await pdfCache.set(key, buffer);

    return {
      buffer,
      fromCache: false,
      cacheKey: key
    };
  }

  /**
   * Stitches multiple PDF buffers into a single combined multi-page PDF bundle
   * using pdf-lib in milliseconds
   */
  async mergePdfs(pdfBuffers) {
    if (!Array.isArray(pdfBuffers) || pdfBuffers.length === 0) {
      throw new Error('No PDF buffers provided for merging');
    }

    if (pdfBuffers.length === 1) {
      return pdfBuffers[0];
    }

    const mergedDoc = await PDFDocument.create();

    for (const buf of pdfBuffers) {
      if (!buf || buf.length === 0) continue;
      const doc = await PDFDocument.load(buf);
      const copiedPages = await mergedDoc.copyPages(doc, doc.getPageIndices());
      copiedPages.forEach((page) => mergedDoc.addPage(page));
    }

    const mergedBytes = await mergedDoc.save();
    return Buffer.from(mergedBytes);
  }

  getCacheStats() {
    return pdfCache.getStats();
  }

  async invalidateCache(keyPattern) {
    return await pdfCache.invalidate(keyPattern);
  }
}

const pdfService = new PDFService();
module.exports = { PDFService, pdfService };
